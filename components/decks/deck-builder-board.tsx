'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cardKey, deckCardGroup, type MemoryCard, type DeckCategory } from '@/lib/deck-memory';
import { allocationCount, automaticCategory, categoryNameError, deckCategories, deckTotals, deleteCategory, moveCopies, setAllocationCount } from '@/lib/deck-builder';
import { chooseMemoryShowcase } from '@/lib/deck-memory-showcase';

type Props={cards:MemoryCard[];categories:DeckCategory[];owner:boolean;busy:boolean;view:'list'|'stacks';onChange:(cards:MemoryCard[],categories:DeckCategory[])=>void;onReplace:(card:MemoryCard,categoryId:string)=>void};
function CardFace({card}:{card:MemoryCard}) {
  const [failed,setFailed]=useState(false);
  return card.imageUrl&&!failed?<img src={card.imageUrl} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<span className="builder-missing-art">{card.name}<small>Artwork unavailable · {!card.verified?'Unverified':'Matched card'}</small></span>;
}
type BuilderGroup={id:string;name:string;zone:'main'|'sideboard';items:Placement[];editable:boolean;order?:number};
type Placement={card:MemoryCard;categoryId:string;count:number};
export function DeckBuilderBoard({cards,categories,owner,busy,view,onChange,onReplace}:Props) {
  const all=deckCategories(categories),totals=deckTotals(cards,categories);
  const board=useRef<HTMLDivElement>(null),[boardWidth,setBoardWidth]=useState(0);
  useEffect(()=>{const target=board.current;if(!target)return;const observer=new ResizeObserver(()=>setBoardWidth(target.clientWidth));observer.observe(target);return ()=>observer.disconnect();},[]);
  function packedGroups(zone:'main'|'sideboard'){const entries=groups(zone),count=view==='list'?1:Math.max(1,Math.min(entries.length,Math.floor((boardWidth+16)/240)));const columns:BuilderGroup[][]=Array.from({length:count},()=>[]),heights=columns.map(()=>0);entries.forEach(group=>{const index=heights.indexOf(Math.min(...heights));columns[index].push(group);heights[index]+=group.items.length?346+Math.max(0,group.items.length-1)*44:112;});return columns;}
  const [grouping,setGrouping]=useState<'categories'|'type'>('categories');
  const [selected,setSelected]=useState<{key:string;categoryId:string}|null>(null);
  const [manage,setManage]=useState<string|null>(null);
  const [form,setForm]=useState<{id?:string;name:string;zone:'main'|'sideboard'}|null>(null);
  const [removeConfirm,setRemoveConfirm]=useState(false);
  const [error,setError]=useState(''),[status,setStatus]=useState('');
  const [destination,setDestination]=useState('sideboard'),[moveCount,setMoveCount]=useState(1);
  const focusReturn=useRef<HTMLElement|null>(null),modalActive=useRef(false);
  modalActive.current=!!selected||!!manage||!!form;
  const remember=()=>{focusReturn.current=document.activeElement as HTMLElement;setError('');};
  const restore=(event:Event)=>{event.preventDefault();if(modalActive.current)return; if(focusReturn.current?.isConnected) focusReturn.current.focus(); else document.getElementById('add-deck-category')?.focus();};
  const active=selected?cards.find(c=>cardKey(c)===selected.key):undefined;
  const activeCategory=all.find(c=>c.id===selected?.categoryId);
  const activeCount=active&&selected?allocationCount(active,selected.categoryId):0;
  const managed=all.find(c=>c.id===manage);
  const updateCard=(card:MemoryCard)=>onChange(cards.map(c=>cardKey(c)===cardKey(card)?card:c).filter(c=>c.count>0),categories);
  const placements=(zone:'main'|'sideboard')=>all.filter(c=>c.zone===zone).flatMap(c=>cards.map(card=>({card,categoryId:c.id,count:allocationCount(card,c.id)})).filter(p=>p.count));
  function groups(zone:'main'|'sideboard'):BuilderGroup[] {
    const entries=placements(zone);
    if(grouping==='type') return [...new Set(entries.map(p=>deckCardGroup(p.card)))].map(name=>({id:zone+'-'+name,name,zone,items:entries.filter(p=>deckCardGroup(p.card)===name),editable:false}));
    return all.filter(c=>c.zone===zone).map(c=>({...c,items:entries.filter(p=>p.categoryId===c.id),editable:true})).filter(c=>c.items.length||!c.id.startsWith('type-'));
  }
  function openCard(p:Placement) {remember();setSelected({key:cardKey(p.card),categoryId:p.categoryId});setDestination(p.categoryId==='sideboard'?automaticCategory(p.card):'sideboard');setMoveCount(1);}
  function saveCategory() {
    if(!form)return;
    const failure=categoryNameError(form.name,form.zone,categories,form.id);
    if(failure){setError(failure);return;}
    if(!form.id&&all.length>=32){setError('You can have up to 32 categories.');return;}
    const next={id:form.id||crypto.randomUUID(),name:form.name.trim(),zone:form.zone,order:form.id?(all.find(c=>c.id===form.id)?.order||0):Math.max(-1,...all.filter(c=>c.zone===form.zone).map(c=>c.order))+1};
    onChange(cards,[...categories.filter(c=>c.id!==next.id),next]);setStatus(`${next.name} ${form.id?'renamed':'created'}.`);setForm(null);if(selected)setDestination(next.id);
  }
  function visibleSection(zone:'main'|'sideboard'){return all.filter(c=>c.zone===zone&&(cards.some(card=>allocationCount(card,c.id)>0)||!c.id.startsWith('type-')));}
  function reorder(direction:number) {
    if(!managed)return;const section=all.filter(c=>c.zone===managed.zone),visible=visibleSection(managed.zone),position=visible.findIndex(c=>c.id===managed.id),neighbor=visible[position+direction];if(!neighbor)return;const index=section.findIndex(c=>c.id===managed.id),target=section.findIndex(c=>c.id===neighbor.id);section.splice(index,1);section.splice(target,0,managed);
    const ids=new Set(section.map(c=>c.id));onChange(cards,[...categories.filter(c=>!ids.has(c.id)),...section.map((c,order)=>({...c,order}))]);setStatus(`${managed.name} moved ${direction<0?'earlier':'later'}.`);
  }
  function renderGroup(group:ReturnType<typeof groups>[number]) {return <section className="builder-category" key={group.id} aria-label={group.name}>
    <header><h4>{group.name}<span> · {group.items.reduce((s,p)=>s+p.count,0)}</span></h4>{owner&&group.editable&&<Button variant="ghost" size="icon" aria-label={`Manage ${group.name}`} onClick={()=>{remember();setManage(group.id);setRemoveConfirm(false);}}><MoreHorizontal size={18}/></Button>}</header>
    {!group.items.length?<p className="builder-empty">No cards yet</p>:<ul className={view==='stacks'?'builder-image-stack':'builder-card-list'}>{group.items.sort((a,b)=>a.card.name.localeCompare(b.card.name)).map((p,index)=>{const last=index===group.items.length-1;return <li key={cardKey(p.card)+p.categoryId} className={last?'is-last':''}>
      <button className="builder-card" aria-label={`View ${p.card.name}, ${p.count} copies, ${all.find(c=>c.id===p.categoryId)?.name}, ${group.zone==='main'?'main deck':'sideboard'}`} onClick={()=>openCard(p)}>
        <span className="builder-copy-count" aria-hidden="true">{p.count}</span><span className="builder-card-face"><CardFace card={p.card}/></span>
        <span className={view==='stacks'?'sr-only':'builder-list-name'}>{p.card.name}{!p.card.verified&&<small> · Unverified</small>}</span>
      </button>
    </li>;})}</ul>}
  </section>;}
  return <div className="builder-board" ref={board}>
    <div className="builder-controls"><label>Group <select aria-label="Group deck by" value={grouping} onChange={e=>setGrouping(e.target.value as typeof grouping)}><option value="categories">Categories</option><option value="type">Card type</option></select></label>{owner&&<Button id="add-deck-category" variant="outline" onClick={()=>{remember();setForm({name:'',zone:'main'});}}><Plus size={16}/>Category</Button>}</div>
    <p className="builder-deck-summary">Main deck {totals.main} · {totals.lands} lands · {totals.nonlands} nonlands</p>
    {(['main','sideboard'] as const).map(zone=><section className={`builder-zone is-${view}`} key={zone} aria-label={zone==='main'?'Main deck cards':'Sideboard cards'}><h3>{zone==='main'?'Main deck':'Sideboard'} <span>· {zone==='main'?totals.main:totals.sideboard}</span></h3><div className="builder-groups">{packedGroups(zone).map((column,index)=><div className="builder-column" key={index}>{column.map(renderGroup)}</div>)}</div></section>)}
    <div role="status" aria-live="polite" className="sr-only">{status}</div>
    <Dialog open={!!selected&&!form} onOpenChange={open=>{if(!open)setSelected(null);}}><DialogContent className="review-inspector" onCloseAutoFocus={restore}><DialogTitle>{active?.name||'Card details'}</DialogTitle><DialogDescription>{activeCount} copies in {activeCategory?.name} · {activeCategory?.zone==='sideboard'?'Sideboard':'Main deck'}</DialogDescription>
      {active&&selected&&<><div className="review-inspector-art"><CardFace key={cardKey(active)} card={active}/></div><p className="text-sm text-muted-foreground">{active.typeLine||'Unverified card type'}</p>{owner&&<>
        <div className="review-inspector-quantity"><Button variant="outline" size="icon" aria-label={`Remove one ${active.name}`} disabled={busy||activeCount<=1} onClick={()=>updateCard(setAllocationCount(active,selected.categoryId,activeCount-1))}>−</Button><label>Copies here<Input aria-label="Copies in this category" type="number" min={1} max={250} value={activeCount} onChange={e=>{const count=Number(e.target.value);if(Number.isInteger(count)&&count>=1&&count<=250&&active.count+count-activeCount<=250)updateCard(setAllocationCount(active,selected.categoryId,count));}}/></label><Button variant="outline" size="icon" aria-label={`Add one ${active.name}`} disabled={busy||active.count>=250} onClick={()=>updateCard(setAllocationCount(active,selected.categoryId,activeCount+1))}>+</Button></div>
        <fieldset className="builder-move"><legend>Move copies</legend><label>Copies<Input aria-label="Copies to move" type="number" min={1} max={activeCount} value={moveCount} onChange={e=>setMoveCount(Number(e.target.value))}/></label><label>Destination<select aria-label="Move destination" value={destination} onChange={e=>{if(e.target.value==='new'){setForm({name:'',zone:activeCategory?.zone||'main'});}else setDestination(e.target.value);}}>{(['main','sideboard'] as const).map(zone=><optgroup key={zone} label={zone==='main'?'Main deck':'Sideboard'}>{all.filter(c=>c.zone===zone&&(c.id===automaticCategory(active)||!c.id.startsWith('type-'))&&c.id!==selected.categoryId).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</optgroup>)}<option value="new">New category…</option></select></label><Button disabled={busy} onClick={()=>{try{if(!all.some(c=>c.id===destination))throw new Error('Choose a destination.');updateCard(moveCopies(active,selected.categoryId,destination,moveCount));setStatus(`Moved ${moveCount} ${active.name} to ${all.find(c=>c.id===destination)?.name}.`);setSelected(null);setError('');}catch(e){setError((e as Error).message);}}}>Move</Button></fieldset>
        <div className="builder-showcase-control"><Button variant="outline" disabled={busy||!active.imageUrl} aria-pressed={!!active.showcase} onClick={()=>{onChange(chooseMemoryShowcase(cards,active.showcase?null:cardKey(active)),categories);setStatus(active.showcase?'Automatic showcase restored.':`${active.name} selected as showcase.`);}}>{active.showcase?'Use automatic showcase':'Use as showcase'}</Button><p className="text-sm text-muted-foreground">{active.showcase?'Showcase card for My decks.':'Choose the artwork shown for this deck in My decks.'}</p></div>
        {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>{onReplace(active,selected.categoryId);setSelected(null);}}>Replace these copies</Button><Button variant="ghost" disabled={busy} onClick={()=>{updateCard(setAllocationCount(active,selected.categoryId,0));setSelected(null);setStatus(`Removed ${activeCount} ${active.name} from ${activeCategory?.name}.`);}}>Remove from this category</Button></div>
      </>}</>}
    </DialogContent></Dialog>
    <Dialog open={!!manage&&!form} onOpenChange={open=>{if(!open)setManage(null);}}><DialogContent className="builder-category-dialog" onCloseAutoFocus={restore}><DialogTitle>Manage {managed?.name}</DialogTitle><DialogDescription>{managed?.zone==='sideboard'?'Sideboard':'Main deck'} category</DialogDescription>{managed&&<div className="space-y-3">
      {!managed.id.startsWith('type-')&&<Button variant="outline" onClick={()=>{setForm({id:managed.id,name:managed.name,zone:managed.zone});setManage(null);}}>Rename</Button>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={visibleSection(managed.zone)[0]?.id===managed.id} onClick={()=>reorder(-1)}>Move earlier</Button><Button variant="outline" disabled={visibleSection(managed.zone).at(-1)?.id===managed.id} onClick={()=>reorder(1)}>Move later</Button></div>
      {!managed.id.startsWith('type-')&&managed.id!=='sideboard'&&(removeConfirm?<><p>Move {cards.reduce((sum,c)=>sum+allocationCount(c,managed.id),0)} copies to {managed.zone==='main'?'their default main-deck groups':'Sideboard'} and delete {managed.name}? Cards are preserved.</p><Button variant="destructive" disabled={busy} onClick={()=>{onChange(deleteCategory(cards,managed),categories.filter(c=>c.id!==managed.id));setStatus(`${managed.name} deleted. Cards preserved.`);setManage(null);}}>Delete category and preserve cards</Button></>:<Button variant="ghost" onClick={()=>setRemoveConfirm(true)}>Delete category</Button>)}
    </div>}</DialogContent></Dialog>
    <Dialog open={!!form} onOpenChange={open=>{if(!open)setForm(null);}}><DialogContent className="builder-category-dialog" onCloseAutoFocus={restore}><DialogTitle>{form?.id?'Rename category':'New category'}</DialogTitle><DialogDescription>Organize copies without changing the cards recorded.</DialogDescription>{form&&<form className="space-y-4" onSubmit={e=>{e.preventDefault();saveCategory();}}><label className="block space-y-1">Name<Input autoFocus aria-label="Category name" maxLength={48} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label className="block space-y-1">Section<select aria-label="Category section" disabled={!!form.id} value={form.zone} onChange={e=>setForm({...form,zone:e.target.value as 'main'|'sideboard'})}><option value="main">Main deck</option><option value="sideboard">Sideboard</option></select></label>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy} type="submit">{form.id?'Save name':'Create category'}</Button></form>}</DialogContent></Dialog>
  </div>;
}
