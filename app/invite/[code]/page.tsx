import Link from 'next/link';import {Button} from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { resolvePlayer } from '@/lib/player-session';
import { joinEvent } from '@/app/events/actions';
import { NamePicker } from '@/components/who/name-picker';
import { eventDates } from '@/lib/display';
export default async function InvitePage({params}: {params: Promise<{code:string}>}) {
 const {code}=await params; const ctx=await resolvePlayer();
 const {data:event}=await ctx.supabase.from('events').select('id,name,start_date,end_date').eq('invite_code',code.toUpperCase()).maybeSingle();
 if(!event) return <main className="page form-page task-page utility-page"><h1>Invitation unavailable</h1><p>Check the code with your playgroup or choose an event.</p><form action="/invite-code"><label htmlFor="invite-code">Invite code</label><input className="input" id="invite-code" name="code" required maxLength={20}/><Button>Try code</Button></form><Link href="/events">Choose an event</Link></main>;
 if(ctx.mode==='house') redirect('/events/'+event.id+'/room');
 if(!ctx.playerId) {
 const {data:roster}=await ctx.supabase.from('profiles').select('id,display_name,color').eq('selectable',true).not('display_name','is',null).order('display_name');
 return <><p className="page form-page subtle">{event.name} · {eventDates(event.start_date,event.end_date)}</p><NamePicker players={(roster||[]).map(p=>({id:p.id,name:p.display_name||'Player',color:p.color}))} eventName={event.name} next={'/invite/'+encodeURIComponent(code)} houseNext={'/events/'+event.id+'/room'}/></>;
 }
 if(ctx.authUser&&!ctx.authUser.is_anonymous){const {data:p}=await ctx.supabase.from('profiles').select('display_name').eq('id',ctx.playerId).maybeSingle();if(!p?.display_name)redirect('/onboarding?next='+encodeURIComponent('/invite/'+code));}
 const result=await joinEvent(code);
 if(result.success&&result.eventId) redirect('/events/'+result.eventId);
 return <main className="page form-page task-page utility-page"><h1>Could not join {event.name}</h1><p role="alert">{result.message}</p><Link href={'/invite/'+encodeURIComponent(code)}>Try again</Link><Link href="/events">Choose an event</Link></main>;
}