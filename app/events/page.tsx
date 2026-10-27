import HomePage from '@/components/events/events-home';
/** Explicit event chooser bypasses the remembered-event entry redirect. */
export default async function EventsPage({searchParams}:{searchParams:Promise<{next?:string}>}){return <HomePage eventListOnly searchParams={searchParams}/>;}
