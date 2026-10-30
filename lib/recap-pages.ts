import type {RecapSnapshot} from './recap';
export const recapHeading=(line:string)=>/^[A-Z][A-Z /·–]+$/.test(line);
export function wrapRecapLine(line:string,width=68):string[]{
 const result:string[]=[];let rest=line;
 while(rest.length>width){let at=rest.lastIndexOf(' ',width);if(at<20)at=width;result.push(rest.slice(0,at));rest=rest.slice(at).trimStart();}
 return [...result,rest];
}
/** Shared pagination preserves a heading together with the first complete record. */
export function recapPages(snapshot:RecapSnapshot){
 const blocks:string[][]=[];
 for(let i=0;i<snapshot.lines.length;i++){
  const block=[snapshot.lines[i]];
  while(i+1<snapshot.lines.length&&snapshot.lines[i+1].startsWith('  '))block.push(snapshot.lines[++i]);
  blocks.push(block);
 }
 const grouped:string[][]=[];
 for(let i=0;i<blocks.length;i++){
  let block=blocks[i];
  if(recapHeading(block[0])&&blocks[i+1]?.[0])block=[...block,...blocks[++i]];
  grouped.push(block.flatMap(line=>wrapRecapLine(line)));
 }
 const pages:string[][]=[];let page:string[]=[];
 for(const block of grouped){
  if(page.length&&page.length+block.length>28){while(page.at(-1)==='')page.pop();if(page.length)pages.push(page);page=[];}
  for(const line of block){if(page.length===28){pages.push(page);page=[];}if(line||page.length)page.push(line);}
 }
 if(page.length)pages.push(page);return pages;
}
