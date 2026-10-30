import { withLiveSnapshot } from '@/lib/live-page';
import {notFound} from 'next/navigation';import {loadRoomBoard} from '@/lib/event-board';import {TournamentRoom} from '@/components/events/tournament-room';async function RoomPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{tournament?:string}>}){const {id}=await params;const board=await loadRoomBoard(id);if(!board)notFound();return <TournamentRoom board={board} selected={(await searchParams).tournament}/>;}
export default withLiveSnapshot(RoomPage);
