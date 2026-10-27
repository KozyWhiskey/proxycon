'use client';
/* eslint-disable @next/next/no-img-element */
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Layers} from 'lucide-react';

export type LimitedMemoryCardProps={id:string;title:string;status:string;shared:boolean;created_at:string;is_current:boolean;main:number;sideboard:number;showcaseName:string|null;artUrl:string|null};
export function LimitedMemoryCard(memory:LimitedMemoryCardProps) {
  const [failed,setFailed]=useState(false);
  return <Link href={`/decks/limited/${memory.id}`} className="deck-gallery-card limited-gallery-card" aria-label={`Open ${memory.title}`}>
    {memory.artUrl&&!failed?<div className="deck-gallery-art"><img src={memory.artUrl} alt="" loading="lazy" ref={image=>{if(image?.complete&&!image.naturalWidth)setFailed(true);}} onError={()=>setFailed(true)}/></div>:<div className="deck-gallery-art no-art"><Layers size={48} aria-hidden="true"/><span>No showcase artwork</span></div>}
    <span className="deck-inspect-cue" aria-hidden="true"><ArrowUpRight size={17}/></span>
    <div className="deck-gallery-content">
      <div className="deck-gallery-heading"><span className="eyebrow">Limited</span><h3 className="deck-gallery-title">{memory.title}</h3></div>
      <div className="limited-gallery-details"><p>{memory.main} main{memory.sideboard>0?` · ${memory.sideboard} sideboard`:''}</p>
        {memory.showcaseName&&<p className="limited-showcase-name">Showcase · {memory.showcaseName}</p>}
        <p>{new Date(memory.created_at).toLocaleDateString('en-US',{timeZone:'America/Chicago'})} · {memory.status==='pending'?'Draft':'Saved'} · {memory.shared?'Shared':'Private'}{!memory.is_current?' · Earlier memory':''}</p>
      </div>
    </div>
  </Link>;
}
