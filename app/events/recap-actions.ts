'use server';
import {loadEventBoard} from '@/lib/event-board';
import {makeRecap} from '@/lib/recap';
export async function refreshRecap(eventId:string){const board=await loadEventBoard(eventId);if(!board)throw new Error('Event unavailable.');return makeRecap(board);}
