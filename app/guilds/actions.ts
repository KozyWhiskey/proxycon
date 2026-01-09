'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase(); // 8 chars for Guilds
}

export interface GuildActionResult {
  success: boolean;
  message?: string;
  guildId?: string;
  slug?: string;
}

export async function createGuild(
  name: string,
  slug: string,
  themeColor: string = 'gold'
): Promise<GuildActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Not authenticated' };
  }

  const inviteCode = generateInviteCode();

  // 1. Create the Guild
  const { data: guild, error: guildError } = await supabase
    .from('organizations')
    .insert({
      owner_id: user.id,
      name,
      slug,
      theme_color: themeColor,
      invite_code: inviteCode,
      is_public: true, // Default to true for now to test directory
    })
    .select()
    .single();

  if (guildError || !guild) {
    console.error('Error creating guild:', guildError);
    if (guildError?.code === '23505') {
       return { success: false, message: 'Guild handle (slug) is already taken.' };
    }
    return { success: false, message: guildError?.message || 'Failed to create guild' };
  }

  // 2. Add creator as Owner
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: guild.id,
      profile_id: user.id,
      role: 'owner',
      status: 'active',
      title: 'Guildmaster'
    });

  if (memberError) {
    console.error('Error adding owner to guild:', memberError);
    return { success: false, message: 'Guild created but failed to join as owner.' };
  }

  revalidatePath('/');
  return { success: true, guildId: guild.id, slug: guild.slug };
}

export async function joinGuild(inviteCode: string): Promise<GuildActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Not authenticated' };
  }

  // 1. Find guild by code
  const { data: guild, error: findError } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('invite_code', inviteCode.toUpperCase())
    .single();

  if (findError || !guild) {
    return { success: false, message: 'Invalid invite code' };
  }

  // 2. Check if already joined
  const { data: existing } = await supabase
    .from('organization_members')
    .select('organization_id, status')
    .eq('organization_id', guild.id)
    .eq('profile_id', user.id)
    .single();

  if (existing) {
    if (existing.status === 'invited') {
       // Auto-accept if they were invited and used the code (edge case, but safe)
       await supabase.from('organization_members').update({ status: 'active' }).eq('organization_id', guild.id).eq('profile_id', user.id);
       return { success: true, guildId: guild.id, slug: guild.slug, message: 'Invite accepted!' };
    }
    return { success: true, guildId: guild.id, slug: guild.slug, message: 'Already a member' };
  }

  // 3. Join (Active immediately via Code)
  const { error: joinError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: guild.id,
      profile_id: user.id,
      role: 'member',
      status: 'active', // Code grants immediate access
      title: 'Initiate'
    });

  if (joinError) {
    return { success: false, message: joinError.message };
  }

  revalidatePath('/');
  return { success: true, guildId: guild.id, slug: guild.slug };
}

export async function requestToJoin(guildId: string): Promise<GuildActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: 'Not authenticated' };

  // Check if exists
  const { data: existing } = await supabase
    .from('organization_members')
    .select('status')
    .eq('organization_id', guildId)
    .eq('profile_id', user.id)
    .single();

  if (existing) {
    return { success: false, message: `You are already ${existing.status} in this guild.` };
  }

  const { error } = await supabase.from('organization_members').insert({
    organization_id: guildId,
    profile_id: user.id,
    role: 'member',
    status: 'requested',
    title: 'Applicant'
  });

  if (error) return { success: false, message: error.message };

  revalidatePath('/guilds');
  return { success: true, message: 'Request sent.' };
}

export async function inviteUser(guildId: string, userId: string): Promise<GuildActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: 'Not authenticated' };
  
  // Verify inviter permissions (handled by RLS mostly, but good to be explicit or trust RLS)
  // RLS "Admins can add members" should cover INSERT.
  
  const { error } = await supabase.from('organization_members').insert({
    organization_id: guildId,
    profile_id: userId,
    role: 'member',
    status: 'invited',
    title: 'Invited',
    invited_by: user.id
  });

  if (error) {
    // Check for duplicate key
    if (error.code === '23505') return { success: false, message: 'User is already a member or invited.' };
    return { success: false, message: error.message };
  }

  revalidatePath(`/guilds`);
  return { success: true, message: 'Invite sent.' };
}

export async function acceptGuildInvite(guildId: string): Promise<GuildActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: 'Not authenticated' };

  // Only update status to active. Do not allow role changes.
  const { error } = await supabase
    .from('organization_members')
    .update({ status: 'active' })
    .eq('organization_id', guildId)
    .eq('profile_id', user.id);

  if (error) return { success: false, message: error.message };

  revalidatePath('/');
  revalidatePath('/guilds');
  return { success: true };
}

export async function updateMemberStatus(guildId: string, userId: string, status: 'active' | 'invited' | 'requested', role?: 'admin' | 'member'): Promise<GuildActionResult> {
  const supabase = await createClient();
  
  // Note: If accepting an invite (User action), they update their own row status to 'active'.
  // If Approving a request (Admin action), they update the user's row.
  
  const updateData: any = { status };
  if (role) updateData.role = role;

  const { error } = await supabase
    .from('organization_members')
    .update(updateData)
    .eq('organization_id', guildId)
    .eq('profile_id', userId);

  if (error) return { success: false, message: error.message };

  revalidatePath('/guilds');
  return { success: true };
}

export async function removeMember(guildId: string, userId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', guildId)
    .eq('profile_id', userId);

  if (error) return { success: false, message: error.message };
  
  revalidatePath('/guilds');
  return { success: true };
}

export async function getUserGuilds(userId: string) {
  const supabase = await createClient();

  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select(`
      role,
      status,
      invited_by_profile:profiles!organization_members_invited_by_fkey (
        display_name
      ),
      organization:organizations (
        id, name, slug, theme_color, logo_url
      )
    `)
    .eq('profile_id', userId);

  if (error) {
    console.error('Error fetching user guilds:', error);
    return [];
  }

  return memberships.map((m: any) => ({
    ...m.organization,
    role: m.role,
    status: m.status,
    invited_by_name: m.invited_by_profile?.display_name
  }));
}

export async function getGuildMembers(guildId: string) {
  const supabase = await createClient();

  // Admins need to see ALL members (active, invited, requested)
  // RLS "Members can view roster" allows viewing if you are a member.
  // But wait, my RLS policy "Members can view roster" uses get_guild_role which requires status='active'.
  // So 'active' members can see 'invited'/'requested' rows? 
  // Yes, because SELECT policy is `get_guild_role(org_id) IS NOT NULL`.
  // `get_guild_role` returns valid role for active members.
  // So an active member can Select * from members.
  
  const { data: members, error } = await supabase
    .from('organization_members')
    .select(`
      role,
      title,
      status,
      joined_at,
      profile:profiles!organization_members_profile_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('organization_id', guildId)
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('Error fetching guild members:', error);
    return [];
  }

  return members.map((m: any) => {
    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
    return {
      id: profile?.id,
      username: profile?.username,
      display_name: profile?.display_name,
      avatar_url: profile?.avatar_url,
      role: m.role,
      status: m.status,
      title: m.title,
      joined_at: m.joined_at,
    };
  });
}

export async function searchUsers(query: string, excludeGuildId?: string) {
  const supabase = await createClient();
  
  if (!query || query.length < 2) return [];

  let profileQuery = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(10);

  if (excludeGuildId) {
    // Filter out users already in the guild
    // This requires a "not in" subquery which Supabase JS supports via filter modifiers
    // simpler to fetch and filter in JS for small sets, or use rpc.
    // For now, let's just fetch and let UI show "Joined".
  }

  const { data, error } = await profileQuery;
  
  if (error) return [];
  return data;
}

export async function getPublicGuilds() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, theme_color, description, created_at, owner:profiles!owner_id(display_name)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return [];
  return data;
}

// Helpers for Dashboard/Page data (Read-Only wrappers)
export async function getGuildBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('organizations').select('*').eq('slug', slug).single();
  if (error) return null;
  return data;
}

export async function getGuildEvents(guildId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('events').select('*').eq('organization_id', guildId).order('start_date', { ascending: false });
  if (error) return [];
  return data;
}

// ... existing imports
export async function getGuildFeed(guildId: string) {
  const supabase = await createClient();
  const { data: events } = await supabase.from('events').select('id').eq('organization_id', guildId);
  if (!events?.length) return [];
  const eventIds = events.map(e => e.id);
  const { data: matches, error } = await supabase.from('matches').select(`
      id, tournament_id, round_number, game_type, created_at,
      participants:match_participants(id, player_id:profile_id, result, player:profiles(display_name, username)),
      event:events(name)
    `).in('event_id', eventIds).order('created_at', { ascending: false }).limit(10);
  if (error) return [];
  return matches;
}

export async function deleteGuild(guildId: string): Promise<GuildActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Not authenticated' };
  }

  // 1. Verify Ownership
  const { data: guild, error: fetchError } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', guildId)
    .single();

  if (fetchError || !guild) {
    return { success: false, message: 'Guild not found' };
  }

  if (guild.owner_id !== user.id) {
    return { success: false, message: 'Only the Guildmaster can delete the guild.' };
  }

  // 2. Delete
  const { error: deleteError } = await supabase
    .from('organizations')
    .delete()
    .eq('id', guildId);

  if (deleteError) {
    console.error('Error deleting guild:', deleteError);
    return { success: false, message: deleteError.message };
  }

  return { success: true, message: 'Guild disbanded successfully.' };
}