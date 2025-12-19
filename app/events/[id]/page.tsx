import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { redirect } from 'next/navigation';
import MyStats from '@/components/dashboard/my-stats';
import ActiveTournament from '@/components/dashboard/active-tournament';
import Feed from '@/components/dashboard/feed';
import UserHeader from '@/components/dashboard/user-header';
import QuickActions from '@/components/dashboard/quick-actions';
import {
  calculateStandings,
  sortStandings,
  convertDbMatchToMatchResult,
} from '@/lib/swiss-pairing';
import { Button } from '@/components/ui/button';
import { Trophy, Plus } from 'lucide-react';
import Link from 'next/link';

interface EventDashboardProps {
  params: Promise<{ id: string }>;
}

export default async function EventDashboard({ params }: EventDashboardProps) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  
  // Auth Check
  const authData = await getCurrentUser();
  if (!authData || !authData.user) {
    redirect('/login');
  }

  const { user, profile } = authData;

  // Ensure profile is complete (V3 Onboarding)
  if (!profile || !profile.username || !profile.display_name) {
    redirect('/onboarding');
  }

  // Check if user is a member of this event (V3: event_members)
  const { data: eventMember, error: eventMemberError } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', eventId)
    .eq('profile_id', user.id)
    .single();

  if (eventMemberError || !eventMember) {
    // User not a member of event -> redirect to global landing or show "Join"
    redirect('/');
  }
  
  const currentProfile = profile;
  const currentProfileId = user.id;

  // Fetch Event Details
  const { data: event } = await supabase
    .from('events')
    .select('name')
    .eq('id', eventId)
    .single();

  // Fetch active tournaments FOR THIS EVENT
  const { data: activeTournaments } = await supabase
    .from('tournaments')
    .select('id, name, format, status') // Select relevant tournament fields
    .eq('event_id', eventId)
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false });

  // Fetch current user's match for each active tournament
  const tournamentsWithMatches = await Promise.all(
    (activeTournaments || []).map(async (tournament) => {
      // Get all matches for this tournament
      const { data: allMatches } = await supabase
        .from('matches')
        .select('id, round_number, tournament_id, game_type, started_at, completed_at, ai_commentary, created_at') // Select all match fields
        .eq('tournament_id', tournament.id)
        .order('round_number', { ascending: false });

      let currentMatch = null;
      if (allMatches && allMatches.length > 0) {
        // Find matches where the current user is a participant
        for (const match of allMatches) {
          const { data: participants } = await supabase
            .from('match_participants')
            .select('id, profile_id, result') // V3: profile_id
            .eq('match_id', match.id);

          if (participants?.some((p) => p.profile_id === currentProfileId)) {
            // Fetch profile details for all participants
            const profileIds = participants.map((p) => p.profile_id);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, display_name, username') // V3: profiles
              .in('id', profileIds);

            const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

            // Construct currentMatch to match ActiveTournament's Match interface
            currentMatch = {
              id: match.id,
              round_number: match.round_number,
              // Other match properties are not directly used by ActiveTournament, but included for completeness.
              // We need to ensure that the participants array structure is correct.
              participants: participants.map((p) => ({
                id: p.id, // match_participant_id
                profile_id: p.profile_id,
                result: p.result,
                profile: profilesMap.get(p.profile_id) || { id: p.profile_id, display_name: 'Unknown', username: null }, // Ensure profile object is always there
              })),
            };
            break;
          }
        }
      }

      return {
        tournament,
        currentMatch,
      };
    })
  );

  // Calculate user stats FOR THIS EVENT (Simplified for V3)
  const casualWins = 0; // Will re-implement later with V3 match_participants
  const casualWinDetails: any[] = []; // Placeholder
  const tournamentFirstPlace = 0; // Placeholder
  const tournamentSecondPlace = 0; // Placeholder
  const tournamentThirdPlace = 0; // Placeholder
  const tournamentWins = 0; // Placeholder
  const tournamentLosses = 0; // Placeholder
  const tournamentDraws = 0; // Placeholder
  const tournamentWinRate = '0.0'; // Placeholder
  
  // Recent Matches for Feed - Filtered by EVENT_ID (Simplified for V3)
  const formattedMatches: any[] = []; // Will re-implement later with V3 match_participants

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      {/* User Header */}
      <div className="sticky top-0 z-10">
        <UserHeader
          displayName={currentProfile.display_name || 'Player'}
          username={currentProfile.username}
          avatarUrl={currentProfile.avatar_url}
        />
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-100 mb-2">{event?.name || 'Event Dashboard'}</h1>
            <p className="text-slate-400 text-sm">ProxyCon Platform</p>
          </div>
        </div>
        
        {/* MyStats will need to be refactored to use V3 schema */}
        <MyStats
          casualWins={casualWins}
          casualWinDetails={casualWinDetails}
          tournamentFirstPlace={tournamentFirstPlace}
          tournamentSecondPlace={tournamentSecondPlace}
          tournamentThirdPlace={tournamentThirdPlace}
          tournamentWins={tournamentWins}
          tournamentLosses={tournamentLosses}
          tournamentDraws={tournamentDraws}
          tournamentWinRate={tournamentWinRate}
        />
        
        <QuickActions eventId={eventId} />
        
        {tournamentsWithMatches.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-100">Active Tournaments</h2>
            {tournamentsWithMatches.map(({ tournament, currentMatch }) => (
              <ActiveTournament
                key={tournament.id}
                tournament={tournament}
                currentMatch={currentMatch}
                currentProfileId={currentProfileId} // Use currentProfileId
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
             <h2 className="text-2xl font-bold text-slate-100">Active Tournaments</h2>
             <ActiveTournament
                tournament={null}
                currentMatch={null}
                currentProfileId={currentProfileId} // Use currentProfileId
              />
          </div>
        )}
        
        <Feed matches={formattedMatches} /> {/* Feed needs V3 data */}
      </div>
    </main>
  );
}
