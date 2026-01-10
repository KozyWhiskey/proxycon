import { createClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { searchCard } from '@/lib/scryfall';
import { generateCommanderBadge, generateSetBadge, generateMatchFeat } from '@/lib/ai-director';
import { slugify } from '@/lib/utils';

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_url: string;
  metadata?: any;
}

type BadgeStrategy = (
  supabase: SupabaseClient,
  userId: string,
  eventId: string | null
) => Promise<boolean>;

const strategies: Record<string, BadgeStrategy> = {
  // --------------------------------------------------------------------------
  // 1. HOT HAND (Win Streaks)
  // --------------------------------------------------------------------------
  'hot-hand': async (supabase, userId, eventId) => {
    // Fetch last 10 matches to determine current streak
    const { data: recentMatches } = await supabase
      .from('match_participants')
      .select('result, created_at')
      .eq('profile_id', userId)
      .neq('result', 'draw') // Ignore draws for streak purposes? Or break streak? Usually ignore or break.
                             // Let's say draws break streaks or just check 'win' status.
                             // We'll fetch raw results and calculate.
      .order('created_at', { ascending: false })
      .limit(20);

    if (!recentMatches || recentMatches.length === 0) return false;

    let currentStreak = 0;
    for (const match of recentMatches) {
      if (match.result === 'win') {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }

    // Check thresholds
    const tiers = [
      { slug: 'hot-hand-3', threshold: 10 },
      { slug: 'hot-hand-2', threshold: 5 },
      { slug: 'hot-hand-1', threshold: 3 },
    ];

    for (const tier of tiers) {
      if (currentStreak >= tier.threshold) {
        // Attempt to award. If they already have it, awardBadge returns null/false internally or we check first.
        // We'll return true if we *should* award at least one.
        // The checkAndAwardBadges main loop handles the actual "check if owned" logic usually,
        // but here we are dealing with multiple potential badges in one strategy.
        // So we will modify the strategy signature or handle it inside.
        
        // For this refactor, we will rely on the main function to handle "one-off" simple strategies,
        // but since this is a family, we might want to move this logic into the main loop or make the strategy return an array of slugs to award.
        // To keep it compatible with the existing `checkAndAwardBadges` loop which expects a boolean for a SINGLE slug key...
        // We need to change how `checkAndAwardBadges` works or cheat a bit.
        
        // BETTER APPROACH: The strategy returns TRUE if the *specific* slug passed in the loop is earned.
        // But we iterate over keys.
        // Let's redefine strategies to be "Checkers" that award badges directly.
      }
    }
    return false; // Placeholder, see logic update below
  }
};

// Define thresholds
const BADGE_MILESTONES = {
  'hot-hand': [
    { slug: 'hot-hand-1', threshold: 3 },
    { slug: 'hot-hand-2', threshold: 5 },
    { slug: 'hot-hand-3', threshold: 10 },
  ],
  'participation': [
    { slug: 'veteran-1', threshold: 5 },
    { slug: 'veteran-2', threshold: 10 },
    { slug: 'veteran-3', threshold: 20 },
  ],
  'championship': [
    { slug: 'victor-1', threshold: 3 },
    { slug: 'victor-2', threshold: 5 },
    { slug: 'victor-3', threshold: 10 },
  ]
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

  // 1. Calculate Stats
  
  // A. Win Streak
  const { data: recentMatches } = await supabase
    .from('match_participants')
    .select('result')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
    
  let winStreak = 0;
  if (recentMatches) {
    for (const m of recentMatches) {
      if (m.result === 'win') winStreak++;
      else if (m.result === 'loss') break; 
      // Draws don't break streak? Or do they? Let's say Loss breaks it. 
      // If we want strict "Win Streak", Draw breaks it too. Let's assume strict.
      else break;
    }
  }

  // B. Event Participation
  // Count unique event_ids in match_participants
  const { data: eventIds } = await supabase
    .from('match_participants')
    .select('match_id!inner(event_id)')
    .eq('profile_id', userId);
    
  // Use Set to count unique events
  const uniqueEvents = new Set(eventIds?.map((row: any) => row.match_id?.event_id).filter(Boolean)).size;

  // C. Championships
  // Count 'champion' badges owned
  // First find the 'champion' badge ID
  const { data: championBadge } = await supabase
    .from('badges')
    .select('id')
    .eq('slug', 'champion')
    .maybeSingle();
    
  let championCount = 0;
  if (championBadge) {
     const { count } = await supabase
       .from('profile_badges')
       .select('*', { count: 'exact', head: true })
       .eq('profile_id', userId)
       .eq('badge_id', championBadge.id);
     championCount = count || 0;
  }

  // 2. Check Milestones
  const stats = {
    'hot-hand': winStreak,
    'participation': uniqueEvents,
    'championship': championCount
  };

  for (const [family, milestones] of Object.entries(BADGE_MILESTONES)) {
    const currentStat = stats[family as keyof typeof stats] || 0;
    
    for (const tier of milestones) {
      if (currentStat >= tier.threshold) {
        // Check if already owned
        const hasIt = await hasBadge(supabase, userId, tier.slug, null); // Global badges, no event_id needed usually
        if (!hasIt) {
          const badge = await awardBadge(supabase, userId, tier.slug, eventId); // Link to current event for context
          if (badge) awardedBadges.push(badge);
        }
      }
    }
  }

  return awardedBadges;
}

/**
 * Checks if the winner used a specific Commander and awards a generated badge.
 */
export async function checkAndAwardCommanderBadge(
  userId: string,
  deckId: string | null,
  eventId?: string
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
          rarity: 'rare'
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
    event_id: eventId || null // Link to event if provided
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

/**
 * Checks if the winner won a Limited tournament of a specific Set and awards a generated badge.
 */
export async function checkAndAwardSetBadge(
  userId: string,
  setCode: string,
  setName: string,
  eventId?: string,
  rank?: number
): Promise<Badge | null> {
  if (!setCode || !setName) return null;

  const supabase = await createClient();

  // 1. Determine Slug based on rank
  // If rank is provided, we want unique badges for 1st, 2nd, 3rd.
  // If no rank, fallback to generic (or maybe we shouldn't use generic anymore?)
  const slug = rank ? `set-${setCode}-rank-${rank}` : `set-${setCode}`;

  // 2. Check if a badge already exists with this SLUG
  const { data: existingBadge } = await supabase
    .from('badges')
    .select('*')
    .eq('slug', slug)
    .single();

  let badgeToAward = existingBadge;

  // 3. If NO badge exists, generate one
  if (!badgeToAward) {
    // A. Generate with AI
    const aiBadge = await generateSetBadge(setCode, setName, rank);
    if (!aiBadge) return null;

    // B. Create Badge in DB
    // Fetch Set Icon
    let iconUrl = '🏆';
    try {
        const res = await fetch(`https://api.scryfall.com/sets/${setCode}`);
        if (res.ok) {
            const json = await res.json();
            if (json.icon_svg_uri) iconUrl = json.icon_svg_uri;
        }
    } catch (e) {
        console.error('Error fetching set icon:', e);
    }

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
          set_code: setCode,
          set_name: setName,
          rarity: aiBadge.rarity,
          rank: rank
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating Set badge:', error);
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
    event_id: eventId || null
  });

  if (awardError) {
    console.error('Error awarding set badge:', awardError);
    return null;
  }

  return badgeToAward;
}

export async function checkAndAwardMatchFeats(
  matchId: string,
  winnerId: string,
  loserId: string
): Promise<Badge | null> {
  const supabase = await createClient();

  // Fetch match details
  const { data: match } = await supabase
    .from('matches')
    .select('started_at, completed_at, tournament_id, event_id')
    .eq('id', matchId)
    .single();

  if (!match) return null;

  // Fetch participants (for scores and decks)
  const { data: participants } = await supabase
    .from('match_participants')
    .select('profile_id, result, games_won, deck_id, decks(colors, name)')
    .eq('match_id', matchId);

  if (!participants || participants.length !== 2) return null;

  const winner = participants.find(p => p.profile_id === winnerId);
  const loser = participants.find(p => p.profile_id === loserId);

  if (!winner || !loser) return null;

  // 1. Check "The Stomp" (2-0 win < 15 mins)
  if (winner.games_won === 2 && loser.games_won === 0 && match.started_at) {
    const start = new Date(match.started_at);
    const end = new Date(); // approx now
    const durationMinutes = (end.getTime() - start.getTime()) / 1000 / 60;
    
    if (durationMinutes < 15) {
       const feat = await generateMatchFeat('stomp', {
         winnerName: 'Winner', // We'd need to fetch names to be precise, skipping for speed
         score: '2-0'
       });
       
       if (feat) {
         return awardUniqueFeat(supabase, winnerId, feat, matchId, match.event_id);
       }
    }
  }

  // 2. Check "The Mirror" (Same Colors)
  // Only if both used decks
  const winnerDeck = Array.isArray(winner.decks) ? winner.decks[0] : winner.decks;
  const loserDeck = Array.isArray(loser.decks) ? loser.decks[0] : loser.decks;

  if (winnerDeck?.colors && loserDeck?.colors) {
    const c1 = winnerDeck.colors.sort().join('');
    const c2 = loserDeck.colors.sort().join('');
    
    if (c1 === c2 && c1.length > 0) {
       const feat = await generateMatchFeat('mirror', {
         winnerDeck: winnerDeck.name,
         loserDeck: loserDeck.name
       });
       
       if (feat) {
         return awardUniqueFeat(supabase, winnerId, feat, matchId, match.event_id);
       }
    }
  }

  return null;
}

async function awardUniqueFeat(
  supabase: SupabaseClient, 
  userId: string, 
  feat: { name: string, description: string, rarity: string },
  contextId: string,
  eventId?: string
): Promise<Badge | null> {
  // Create a unique badge for this specific moment
  const slug = `feat-${contextId}-${Date.now()}`;
  
  const { data: badge, error } = await supabase
    .from('badges')
    .insert({
      slug,
      name: feat.name,
      description: feat.description,
      icon_url: '⚡', // Generic feat icon
      category: 'automated',
      generated_by: 'ai',
      metadata: { rarity: feat.rarity, context_id: contextId }
    })
    .select()
    .single();

  if (error || !badge) return null;

  await supabase.from('profile_badges').insert({
    profile_id: userId,
    badge_id: badge.id,
    event_id: eventId || null,
    is_unique: true,
    custom_title: feat.name,
    custom_description: feat.description
  });

  return badge;
}