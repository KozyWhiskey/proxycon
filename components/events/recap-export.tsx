'use client';
import { useState,useSyncExternalStore } from 'react';
import {refreshRecap} from '@/app/events/recap-actions';
import type { RecapSnapshot } from '@/lib/recap';
import { recapPages, recapHeading, wrapRecapLine } from '@/lib/recap-pages';
import { Button } from '@/components/ui/button';
function recordParts(line:string){return /^  (.+): (\d+ \/ \d+ \/ \d+)$/.exec(line);}
export function RecapExport({ snapshot }: {
    snapshot: RecapSnapshot;
}) {
    const ready=useSyncExternalStore(()=>()=>{},()=>true,()=>false);
    const [current, setCurrent] = useState(snapshot);
    const [images, setImages] = useState(false);
    const [error, setError] = useState('');
    const [downloading,setDownloading]=useState<number|null>(null);
    const [refreshing,setRefreshing]=useState(false);
    const pages = recapPages(current);
    const stamp = new Date(current.generatedAt).toLocaleString('en-US', { timeZone: 'America/Chicago' });
    async function download(index: number) { setDownloading(index);setError('');try {
        // Export uses system fonts, so unrelated page-font requests cannot delay a download.
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 1600;
        const c = canvas.getContext('2d');
        if (!c)
            throw Error();
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, 1200, 1600);
        c.fillStyle = '#a84209';c.fillRect(64,44,80,6);
        c.font = '600 20px Arial';c.fillText('PROXYCON / WEEKEND NOTEBOOK',64,82);
        c.fillStyle = '#1b222a';c.font = '600 32px Georgia';
        wrapRecapLine(current.name,58).slice(0,3).forEach((line,i)=>c.fillText(line,64,130+i*36));
        pages[index].forEach((line,i)=>{c.fillStyle=recapHeading(line)?'#a84209':'#1b222a';c.font=recapHeading(line)?'600 24px Arial':'24px Arial';const record=recordParts(line);if(record){c.fillText(record[1],80,260+i*40);c.textAlign='right';c.fillText(record[2],1136,260+i*40);c.textAlign='left';}else c.fillText(line,64,260+i*40);});
        c.fillStyle='#1b222a';c.font = '20px Arial';
        c.fillText('Generated ' + stamp + ' America/Chicago · Page ' + (index + 1) + ' / ' + pages.length, 64, 1536, 1072);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob)
            throw Error();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'proxycon-recap-' + String(index + 1).padStart(2, '0') + '.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    catch {
        setError('Could not create this image. Try again or use Print / Save as PDF.');
    } finally {setDownloading(null);} }
    return <><div className="recap-controls action-row" aria-busy={!ready}><Button disabled={!ready} onClick={() => window.print()}>Print / Save as PDF</Button><Button variant="outline" disabled={!ready} onClick={() => setImages(!images)} aria-expanded={images}>Choose PNG pages</Button><Button variant="outline" disabled={!ready||refreshing} onClick={async () => {setRefreshing(true);setError('');try{setCurrent(await refreshRecap(current.eventId));setImages(false);}catch{setError('Could not refresh the recap. The previous snapshot is still here.');}finally{setRefreshing(false);}}}>{refreshing?'Refreshing…':'Refresh recap'}</Button></div>{snapshot.version !== current.version && Date.parse(snapshot.generatedAt)>Date.parse(current.generatedAt) && <p className="recap-controls" role="status">Newer results are available. Refresh recap to include them.</p>}{error && <p role="alert">{error}</p>}{images && <div className="recap-controls panel"><p>Download each numbered PNG page below. All pages use the same snapshot.</p><div className="action-row">{pages.map((_, i) => <Button variant="outline" key={i} disabled={downloading!==null} onClick={() => download(i)}>{downloading===i?'Preparing image…':'Download page '+(i+1)}</Button>)}</div></div>}<div className="recap-pages">{pages.map((lines, i) => <article className="recap-sheet" key={i}><header><small className="recap-brand">ProxyCon / Weekend notebook</small><h2>{current.name}</h2></header>{lines.map((line,n)=>{const record=recordParts(line);return <p className={record?'recap-record-line':recapHeading(line)?'recap-section-title':undefined} key={n}>{record?<><span>{record[1]}</span><span>{record[2]}</span></>:line||' '}</p>;})}<footer>Generated {stamp} America/Chicago · Page {i + 1} / {pages.length}</footer></article>)}</div></>;
}
