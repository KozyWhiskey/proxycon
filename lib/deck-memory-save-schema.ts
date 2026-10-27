import { z } from 'zod';

const automaticNames: Record<string,string> = {'type-creatures':'Creatures','type-instants':'Instants','type-sorceries':'Sorceries','type-artifacts':'Artifacts','type-enchantments':'Enchantments','type-planeswalkers':'Planeswalkers','type-lands':'Lands','type-other':'Other'};
const isAutomatic=(id:string)=>Object.prototype.hasOwnProperty.call(automaticNames,id);
const categoryId=z.string().max(80).refine(id=>id==='sideboard'||isAutomatic(id)||(id===id.toLowerCase()&&z.string().uuid().safeParse(id).success),'Invalid category identity.');
const categorySchema=z.object({id:categoryId,name:z.string().trim().min(1).max(48),zone:z.enum(['main','sideboard']),order:z.number().int().min(0).max(10000)});
const allocationSchema=z.object({categoryId,count:z.number().int().min(1).max(250)});
const cardSchema=z.object({
  key:z.string().max(200),name:z.string().trim().min(1).max(200),count:z.number().int().min(1).max(250),
  oracleId:z.string().uuid().nullable(),printingId:z.string().uuid().nullable(),
  imageUrl:z.string().url().nullable().refine(v=>!v||new URL(v).hostname==='cards.scryfall.io'),
  typeLine:z.string().max(300),verified:z.boolean(),edited:z.boolean(),sources:z.array(z.string().uuid()).max(4),
  allocations:z.array(allocationSchema).max(32).optional(),
  showcase:z.boolean().optional(),
});
export const deckSaveSchema=z.object({revision:z.number().int().min(0),title:z.string().trim().min(1).max(120),note:z.string().max(2000),
  cards:z.array(cardSchema).max(200),categories:z.array(categorySchema).max(32).optional(),decisions:z.record(z.string(),z.enum(['accepted','dismissed'])),
  confirm:z.boolean(),incomplete:z.boolean(),acknowledged:z.boolean(),
}).superRefine((value,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:'custom',message});
  if(value.cards.filter(card=>card.showcase).length>1) fail('Choose one showcase card for this deck.');
  if(value.cards.some(card=>card.showcase&&!card.imageUrl)) fail('Choose a showcase card with available artwork.');
  const categories=new Map<string,{name:string;zone:string}>(Object.entries(automaticNames).map(([id,name])=>[id,{name,zone:'main'}]));
  categories.set('sideboard',{name:'Sideboard',zone:'sideboard'});
  const ids=new Set<string>();
  for(const category of value.categories||[]) {
    if(ids.has(category.id)) fail('Category identities must be unique.');
    ids.add(category.id);
    if(isAutomatic(category.id) && (category.name!==automaticNames[category.id]||category.zone!=='main')) fail('Automatic card types keep their name and Main deck section.');
    if(category.id==='sideboard'&&category.zone!=='sideboard') fail('Sideboard must remain in the Sideboard section.');
    categories.set(category.id,category);
  }
  const names=new Set<string>();
  for(const category of categories.values()) {
    const key=category.zone+':'+category.name.toLowerCase();
    if(names.has(key)) fail('Use unique category names within each section.');
    names.add(key);
  }
  for(const card of value.cards) {
    const assigned=new Set<string>();let total=0;
    for(const allocation of card.allocations||[]) {
      if(!categories.has(allocation.categoryId)) fail('A card refers to a missing category.');
      if(assigned.has(allocation.categoryId)) fail('Combine duplicate category allocations.');
      assigned.add(allocation.categoryId);total+=allocation.count;
    }
    if(total>card.count) fail('Allocated copies cannot exceed the recorded quantity.');
  }
});
