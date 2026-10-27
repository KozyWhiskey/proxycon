'use server';
import {resolvePlayer} from '@/lib/player-session';
export async function rememberEvent(eventId:string,expectedIdentity:string){
 const ctx=await resolvePlayer();if(!ctx.authUser||(!ctx.playerId&&ctx.mode!=='house'))return {success:false};
 if(expectedIdentity!==(ctx.mode==='house'?'house':ctx.playerId))return {success:false};
 const {error}=await ctx.supabase.rpc('remember_weekend_event',{p_event:eventId});return {success:!error};
}
