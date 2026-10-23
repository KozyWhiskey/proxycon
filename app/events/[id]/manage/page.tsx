import { createClient } from '@/utils/supabase/server';
import { AddPlayers } from '@/components/events/add-players';
import { addEventMember } from '@/app/events/actions';
import { notFound } from 'next/navigation';
import { loadEventBoard, matchPlayers } from '@/lib/event-board';
import { MatchReporter } from '@/components/weekend/match-reporter';
import ShareCode from '@/components/join/share-code';
import { houseOrigin } from '@/lib/house-url';
import { PageIntro, FeaturePanel } from '@/components/layout/page-intro';
export default async function ManageEventPage({ params }: { params: Promise<{id:string}> }) {
 const {id}=await params; const board=await loadEventBoard(id); if(!board) notFound();
 const db = await createClient();
 const canAdd = board.canManage;
 const { data: profiles, error: profilesError } = canAdd ? await db.from('profiles').select('id,display_name,username').order('display_name') : { data: [], error: null };
 const accounts = (profiles || []).map(p => ({id:p.id,name:p.display_name || p.username || 'Player',username:p.username}));
 const completed=board.matches.filter(m=>{ const players=matchPlayers(board,m.id); return players.length>1 && players.every(p=>p.result); });
 return <main className="page collection-page event-management"><PageIntro compact eyebrow={board.event.name} title="Event tools" description="Add players, share the invite, and correct results." />
 <div className="event-columns"><div className="stack">{canAdd && (profilesError ? <section className="panel"><h2 className="text-2xl mb-4">Add players</h2><p role="alert">Could not load platform accounts. Refresh to try again.</p></section> : <AddPlayers inline players={accounts} memberIds={board.members.map(member => member.id)} action={addEventMember.bind(null,id)} kind="event" />)}<FeaturePanel icon="room" eyebrow="THE HOUSE SCREEN" title="Take a seat. Run the room." description="Seat the draft, post pairings, start the round, and keep an eye on every table." href={`/events/${id}/room`} action="Open tournament room" />
 <section className="panel"><div className="section-heading"><h2>Correct a result</h2></div><p className="subtle mb-5">Select a game to replace its result. Standings update with your correction.</p>
 {board.canManage ? completed.map(m=>{const players=matchPlayers(board,m.id);return <details className="disclosure mb-3" key={m.id}><summary>{m.tournament_id ? board.tournaments.find(t=>t.id===m.tournament_id)?.name : m.format_label || m.game_type}{m.round_number ? ` · Round ${m.round_number}` : ''}<span className="block subtle mt-1">{players.map(p=>`${p.name}: ${p.result}${p.games_won != null ? ` (${p.games_won})` : ''}`).join(' · ')}</span></summary><div><MatchReporter matchId={m.id} showGamesWon={Boolean(m.tournament_id)} players={players.filter(p=>p.profile_id).map(p=>({id:p.profile_id!,name:p.name,team:p.team,result:p.result,gamesWon:p.games_won}))} teams={players.some(p=>Boolean(p.team))} /></div></details>;}) : <p className="subtle">Join the event to manage results.</p>}
 {!completed.length && <p className="subtle">Completed games will appear here.</p>}</section></div>
 <aside className="stack"><section className="panel"><h2 className="text-2xl mb-5">Invite the playgroup</h2>{board.event.invite_code ? <ShareCode path={`/invite/${board.event.invite_code}`} code={board.event.invite_code} label="Event invite" houseOrigin={houseOrigin()} /> : <p className="subtle">Friends can find and join this event from the events page.</p>}</section><section className="panel"><h2 className="text-2xl mb-4">Players · {board.members.length}</h2>{board.members.map(m=><div className="game-row" key={m.id}><strong>{m.name}</strong><span className="subtle">{m.id===board.userId ? 'You' : 'Joined'}</span></div>)}<p className="subtle mt-5">Any event member can manage games. Account roles are managed in Administration.</p></section></aside></div></main>;
}
