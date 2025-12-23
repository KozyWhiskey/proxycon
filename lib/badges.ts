import { createClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { searchCard } from '@/lib/scryfall';
import { generateCommanderBadge } from '@/lib/ai-director';
import { slugify } from '@/lib/utils';

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_url: string;
}

type BadgeStrategy = (
  supabase: SupabaseClient,
  userId: string,
  eventId: string | null
) => Promise<boolean>;

const strategies: Record<string, BadgeStrategy> = {
  'hot-hand': async (supabase, userId, eventId) => {
    // Check last 3 matches for wins
    const { data: recentMatches } = await supabase
      .from('match_participants')
      .select('result, created_at')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!recentMatches || recentMatches.length < 3) return false;

    // Check if all are wins
    return recentMatches.every((m) => m.result === 'win');
  },
  'iron-man': async (supabase, userId, eventId) => {
    if (!eventId) return false; // Event specific
    
    // Count matches in this event
    const { count } = await supabase
      .from('match_participants')
      .select('match_id!inner(event_id)', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .eq('match_id.event_id', eventId);
    
    return (count || 0) >= 10;
  },
  'participation': async (supabase, userId, eventId) => {
    if (!eventId) return false; // Event specific

    // Just check if they have played at least one match in this event
    const { count } = await supabase
      .from('match_participants')
      .select('match_id!inner(event_id)', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .eq('match_id.event_id', eventId);

    return (count || 0) >= 1;
  }
};

/**
 * Checks and awards badges based on match results.
 * @param userId The user to check badges for
 * @param eventId The event context (optional)
 */
export async function checkAndAwardBadges(
  userId: string,
  eventId: string | null = null
): Promise<Badge[]> {
  const supabase = await createClient();
  const awardedBadges: Badge[] = [];

  // Iterate over all defined strategies
  for (const [slug, strategy] of Object.entries(strategies)) {
    try {
      // 1. Check if user already has the badge (in this context)
      const owned = await hasBadge(supabase, userId, slug, eventId);
      if (owned) continue;

      // 2. Run strategy check
      const shouldAward = await strategy(supabase, userId, eventId);
      
      if (shouldAward) {
        const badge = await awardBadge(supabase, userId, slug, eventId);
        if (badge) awardedBadges.push(badge);
      }
    } catch (err) {
      console.error(`Error checking badge ${slug}:`, err);
    }
  }

  return awardedBadges;
}

/**
 * Checks if the winner used a specific Commander and awards a generated badge.
 */
export async function checkAndAwardCommanderBadge(
  userId: string,
  deckId: string | null
): Promise<Badge | null> {
  if (!deckId) return null;

  const supabase = await createClient();

  // 1. Get Deck & Commander Name
  const { data: deck } = await supabase
    .from('decks')
    .select('commander_name')
    .eq('id', deckId)
    .single();

  if (!deck || !deck.commander_name) return null;

  const commanderName = deck.commander_name;

  // 2. Check if a badge already exists for this Commander
  // We use the metadata column: metadata->>'commander_name'
  const { data: existingBadge } = await supabase
    .from('badges')
    .select('*')
    .eq('metadata->>commander_name', commanderName)
    .single();

  let badgeToAward = existingBadge;

  // 3. If NO badge exists, generate one
  if (!badgeToAward) {
    // A. Fetch from Scryfall
    const card = await searchCard(commanderName);
    if (!card) return null;

    // B. Generate with AI
    const aiBadge = await generateCommanderBadge(card);
    if (!aiBadge) return null;

    // C. Create Badge in DB
    const slug = `cmd-${slugify(commanderName)}`;
    
    // Use card art crop as icon, fallback to trophy
    const iconUrl = card.image_uris?.art_crop || card.image_uris?.normal || '🏆';

    const { data: newBadge, error } = await supabase
      .from('badges')
      .insert({
        slug: slug,
        name: aiBadge.name,
        description: aiBadge.description,
        icon_url: iconUrl,
        category: 'automated',
        generated_by: 'ai',
        metadata: {
          commander_name: commanderName,
          rarity: aiBadge.rarity
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating AI badge:', error);
      // If error is duplicate slug (race condition), try fetching again
      if (error.code === '23505') {
         const { data: retryBadge } = await supabase
          .from('badges')
          .select('*')
          .eq('slug', slug)
          .single();
         badgeToAward = retryBadge;
      } else {
        return null;
      }
    } else {
      badgeToAward = newBadge;
    }
  }

  if (!badgeToAward) return null;

  // 4. Award the badge to the user
  // Check if they already have it
  const { data: owned } = await supabase
    .from('profile_badges')
    .select('id')
    .eq('profile_id', userId)
    .eq('badge_id', badgeToAward.id)
    .maybeSingle();

  if (owned) return null; // Already have it

  const { error: awardError } = await supabase.from('profile_badges').insert({
    profile_id: userId,
    badge_id: badgeToAward.id,
    event_id: null // Commander badges are global
  });

  if (awardError) {
    console.error('Error awarding commander badge:', awardError);
    return null;
  }

  return badgeToAward;
}

async function hasBadge(
  supabase: SupabaseClient,
  userId: string,
  badgeSlug: string,
  eventId: string | null
): Promise<boolean> {
  // First get badge ID
  const { data: badge } = await supabase.from('badges').select('id').eq('slug', badgeSlug).single();
  if (!badge) return false; // Badge doesn't exist in DB

  let query = supabase
    .from('profile_badges')
    .select('id')
    .eq('profile_id', userId)
    .eq('badge_id', badge.id);

  if (eventId) {
    query = query.eq('event_id', eventId);
  } else {
    query = query.is('event_id', null);
  }

  const { data: owned } = await query.maybeSingle();
  return !!owned;
}

export async function awardBadge(
  supabase: SupabaseClient,
  userId: string,
  badgeSlug: string,
  eventId: string | null
): Promise<Badge | null> {
  // Get badge details
  const { data: badge } = await supabase.from('badges').select('*').eq('slug', badgeSlug).single();
  
  if (!badge) return null;

  const { error } = await supabase.from('profile_badges').insert({
    profile_id: userId,
    badge_id: badge.id,
    event_id: eventId,
  });

  if (error) {
    // Ignore duplicate key errors (race conditions)
    if (error.code !== '23505') {
       console.error('Error awarding badge:', error);
    }
    return null;
  }

  return badge;
}