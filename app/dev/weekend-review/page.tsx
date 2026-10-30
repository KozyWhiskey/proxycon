import {notFound} from 'next/navigation';
import NewEventForm from '@/components/events/new-event-form';
import DeckForm from '@/components/decks/deck-form';
import {NamePicker} from '@/components/who/name-picker';
import {FinishForm} from '@/components/weekend/finish-form';
import {weekendFixture} from '@/scripts/fixtures/weekend-preview';

/** Disposable rendering fixtures only; never enabled in production. */
export default async function Page({searchParams}:{searchParams:Promise<{screen?:string}>}){
 if(process.env.NODE_ENV!=='development'||process.env.WEEKEND_UX_PREVIEW!=='true')notFound();
 const q=await searchParams;
 const board=weekendFixture('playing');
 if(q.screen==='names')return <NamePicker players={[...board.members,{id:'fixture-long',name:'A very long play name that wraps on the smallest phone',color:null}]} eventName="ProxyCon House Weekend with a long invitation name"/>;
 if(q.screen==='deck')return <main className="page form-page task-page"><h1>Create Commander deck</h1><DeckForm/></main>;
 if(q.screen==='finish')return <main className="page form-page task-page"><h1>Review places and finish</h1><FinishForm tournamentId={board.tournaments[0].id} ranked={board.members.slice(0,4)} tieGroups={[board.members.slice(0,3).map(m=>m.id)]} allowFinal/></main>;
 return <main className="page form-page task-page"><h1>Create event</h1><NewEventForm/></main>;
}
