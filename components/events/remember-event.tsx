'use client';
import {useEffect} from 'react';
import {rememberEvent} from '@/app/events/preference-actions';
/** Effects run on visited pages only, never on Next's link prefetch. */
export function RememberEvent({eventId,identity}:{eventId:string;identity:string}){
 useEffect(()=>{let cancelled=false;let timer:ReturnType<typeof setTimeout>|undefined;
 const save=async()=>{if(document.hidden){timer=setTimeout(save,1000);return;}try{const result=await rememberEvent(eventId,identity);if(!result.success&&!cancelled)timer=setTimeout(save,20000);}catch{if(!cancelled)timer=setTimeout(save,20000);}};
 void save();return()=>{cancelled=true;clearTimeout(timer);};
 },[eventId,identity]);return null;
}
