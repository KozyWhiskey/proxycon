'use client';
import { useState } from 'react';
import {refreshRecap} from '@/app/events/recap-actions';
import type { RecapSnapshot } from '@/lib/recap';
import { recapPages } from '@/lib/recap-pages';
import { Button } from '@/components/ui/button';
export function RecapExport({ snapshot }: {
    snapshot: RecapSnapshot;
}) {
    const [current, setCurrent] = useState(snapshot);
    const [images, setImages] = useState(false);
    const [error, setError] = useState('');
    const [refreshing,setRefreshing]=useState(false);
    const pages = recapPages(current);
    const stamp = new Date(current.generatedAt).toLocaleString('en-US', { timeZone: 'America/Chicago' });
    async function download(index: number) { try {
        await document.fonts.ready;
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 1600;
        const c = canvas.getContext('2d');
        if (!c)
            throw Error();
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, 1200, 1600);
        c.fillStyle = '#1b222a';
        c.font = '600 36px Georgia';
        c.fillText('ProxyCon · ' + current.name, 64, 76, 1072);
        c.font = '24px Arial';
        pages[index].forEach((line, i) => c.fillText(line, 64, 150 + i * 46, 1072));
        c.font = '20px Arial';
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
    } }
    return <><div className="recap-controls action-row"><Button onClick={() => window.print()}>Print / Save as PDF</Button><Button variant="outline" onClick={() => setImages(!images)}>Download images</Button><Button variant="outline" disabled={refreshing} onClick={async () => {setRefreshing(true);setError('');try{setCurrent(await refreshRecap(current.eventId));}catch{setError('Could not refresh the recap. The previous snapshot is still here.');}finally{setRefreshing(false);}}}>{refreshing?'Refreshing…':'Refresh recap'}</Button></div>{snapshot.version !== current.version && <p className="recap-controls" role="status">Newer results are available. Refresh recap to include them.</p>}{error && <p role="alert">{error}</p>}{images && <div className="recap-controls panel"><p>Save each numbered image. All pages use the same snapshot.</p><div className="action-row">{pages.map((_, i) => <Button variant="outline" key={i} onClick={() => download(i)}>Download page {i + 1}</Button>)}</div></div>}<div className="recap-pages">{pages.map((lines, i) => <article className="recap-sheet" key={i}><h2>ProxyCon · {current.name}</h2>{lines.map((line, n) => <p key={n}>{line || ' '}</p>)}<footer>Generated {stamp} America/Chicago · Page {i + 1} / {pages.length}</footer></article>)}</div></>;
}
