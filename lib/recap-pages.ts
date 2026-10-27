import type {RecapSnapshot} from './recap';
/** One pagination contract for the preview, print, and PNG export. */
export function recapPages(snapshot:RecapSnapshot){
 const blocks:string[][]=[];
 for(let i=0;i<snapshot.lines.length;i++){
  const block=[snapshot.lines[i]];
  // Keep each player's four format records together, and headings with their first row.
  while(i+1<snapshot.lines.length&&snapshot.lines[i+1].startsWith('  '))block.push(snapshot.lines[++i]);
  if(block.length===1&&/^[A-Z][A-Z /·–]+$/.test(block[0])&&snapshot.lines[i+1])block.push(snapshot.lines[++i]);
  const wrapped:string[]=[];
  for(const line of block){let rest=line;while(rest.length>68){let at=rest.lastIndexOf(' ',68);if(at<20)at=68;wrapped.push(rest.slice(0,at));rest=rest.slice(at).trimStart();}wrapped.push(rest);}
  blocks.push(wrapped);
 }
 const pages:string[][]=[];let page:string[]=[];
 for(const block of blocks){if(page.length&&page.length+block.length>28){pages.push(page);page=[];}for(const line of block){if(page.length===28){pages.push(page);page=[];}page.push(line);}}
 if(page.length)pages.push(page);return pages;
}
