import EventsHome from '@/components/events/events-home';
export default function HomePage({searchParams}:{searchParams:Promise<{next?:string}>}){return <EventsHome searchParams={searchParams}/>;}
