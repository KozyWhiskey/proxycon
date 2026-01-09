
import { createClient } from '@supabase/supabase-js';
import { calculateStandings, convertDbMatchToMatchResult, sortStandings } from '../lib/swiss-pairing';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Using anon key is fine for read-only if RLS allows, or service role if needed.
// Note: In a real script we might need SERVICE_ROLE_KEY if RLS blocks anon read of these tables.
// Assuming anon can read for now as the app uses it.

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTournament(tournamentId: string) {
  console.log(`Debugging Tournament: ${tournamentId}`);

  // 1. Fetch Tournament
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();
  
  if (tErr) { console.error('Error fetching tournament:', tErr); return; }
  console.log('Tournament:', tournament.name, tournament.status);

  // 2. Fetch Participants (Profile IDs)
  const { data: participants, error: pErr } = await supabase
    .from('tournament_participants')
    .select('profile_id')
    .eq('tournament_id', tournamentId);

  if (pErr) { console.error('Error fetching participants:', pErr); return; }
  const profileIds = participants.map(p => p.profile_id);
  console.log(`Found ${profileIds.length} participants.`);

  // 3. Fetch Matches
  const { data: matches, error: mErr } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_number');

  if (mErr) { console.error('Error fetching matches:', mErr); return; }
  console.log(`Found ${matches.length} matches.`);

  // 4. Fetch Match Participants
  const matchIds = matches.map(m => m.id);
  const { data: matchParticipants, error: mpErr } = await supabase
    .from('match_participants')
    .select('*')
    .in('match_id', matchIds);

  if (mpErr) { console.error('Error fetching match participants:', mpErr); return; }
  console.log(`Found ${matchParticipants.length} match participant records.`);

  // 5. Build Match History (Replicating logic from BigScreenDashboard)
  const participantsByMatch = new Map();
  matchParticipants.forEach(p => {
    if (!participantsByMatch.has(p.match_id)) participantsByMatch.set(p.match_id, []);
    participantsByMatch.get(p.match_id).push(p);
  });

  const matchHistory: any[] = [];
  matches.forEach(match => {
    const parts = participantsByMatch.get(match.id) || [];
    if (parts.length > 0) {
      matchHistory.push(convertDbMatchToMatchResult(
        match.id, 
        match.round_number || 1, 
        parts.map((p: any) => ({playerId: p.profile_id, result: p.result }))
      ));
    }
  });

  console.log(`Built ${matchHistory.length} history records.`);
  if (matchHistory.length > 0) {
    console.log('Sample Match History Item:', JSON.stringify(matchHistory[0], null, 2));
  }

  // 6. Calculate Standings
  const standingsMap = calculateStandings(profileIds, matchHistory);
  const standings = sortStandings(Array.from(standingsMap.values()));

  console.log('\n--- STANDINGS ---');
  standings.forEach((s, i) => {
    console.log(`${i+1}. Player ${s.playerId.substring(0,8)} - Pts: ${s.points} - W/L/D: ${s.matchWins}/${s.matchLosses}/${s.matchDraws}`);
  });

  // Check if 0s
  const totalPoints = standings.reduce((sum, s) => sum + s.points, 0);
  console.log(`\nTotal Points Distributed: ${totalPoints}`);

  if (totalPoints === 0 && matches.length > 0) {
    console.warn('WARNING: Matches exist but 0 points distributed!');
    // Deep dive into why
    // Check if player IDs match
    const matchPlayerIds = new Set();
    matchHistory.forEach(m => {
      matchPlayerIds.add(m.player1Id);
      if (m.player2Id) matchPlayerIds.add(m.player2Id);
    });

    const registeredPlayerIds = new Set(profileIds);
    
    console.log('\nID Mismatch Check:');
    matchPlayerIds.forEach(mpId => {
      if (!registeredPlayerIds.has(mpId)) {
        console.error(`Mismatch: Player ${mpId} played a match but is NOT in tournament_participants!`);
      }
    });
  }
}

const targetId = '3753f427-f3a7-44f4-8ea2-06b2a36ebe68';
debugTournament(targetId);
