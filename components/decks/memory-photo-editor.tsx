'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PhotoPurpose } from '@/lib/deck-memory';

export function MemoryPhotoEditor({ file, initial, onCancel, onUpload }: {
  file: File; initial: boolean; onCancel: () => void; onUpload: (file: File, purpose: PhotoPurpose) => Promise<void>;
}) {
  const [url, setUrl] = useState('');
  const [rotation, setRotation] = useState(0);
  const [preview, setPreview] = useState('');
  const [crop, setCrop] = useState({ left: 0, top: 0, right: 0, bottom: 0 });
  const [readable, setReadable] = useState(true);
  const [purpose, setPurpose] = useState<PhotoPurpose>(initial ? 'initial' : 'check');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const objectUrl=URL.createObjectURL(file);
    const image=new Image();
    image.onload=()=>{setUrl(objectUrl);setReadable(true);};
    image.onerror=()=>{setUrl(objectUrl);setReadable(false);};
    image.src=objectUrl;
    return ()=>{image.onload=null;image.onerror=null;URL.revokeObjectURL(objectUrl);};
  },[file]);
  useEffect(() => {
    if (!url) return;
    let active = true;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const sideways = rotation % 180 !== 0;
      canvas.width = sideways ? image.height : image.width; canvas.height = sideways ? image.width : image.height;
      const context = canvas.getContext('2d')!;
      context.translate(canvas.width/2,canvas.height/2); context.rotate(rotation*Math.PI/180);
      context.drawImage(image,-image.width/2,-image.height/2);
      if (active) setPreview(canvas.toDataURL('image/jpeg',0.94));
    };
    image.src = url;
    return () => { active = false; };
  }, [url,rotation]);
  async function upload() {
    setPending(true); setError('');
    try {
      let output = file;
      if (readable && (rotation || Object.values(crop).some(Boolean))) {
        const image = new Image(); image.src = url; await image.decode();
        const rotated = document.createElement('canvas');
        const sideways = rotation % 180 !== 0;
        rotated.width = sideways ? image.height : image.width; rotated.height = sideways ? image.width : image.height;
        const context = rotated.getContext('2d')!;
        context.translate(rotated.width / 2, rotated.height / 2); context.rotate(rotation * Math.PI / 180);
        context.drawImage(image, -image.width / 2, -image.height / 2);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(rotated.width * (100 - crop.left - crop.right) / 100));
        canvas.height = Math.max(1, Math.round(rotated.height * (100 - crop.top - crop.bottom) / 100));
        canvas.getContext('2d')!.drawImage(rotated, rotated.width * crop.left / 100, rotated.height * crop.top / 100, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not prepare this crop.')), 'image/jpeg', 0.96));
        output = new File([blob], 'deck-photo.jpg', { type: 'image/jpeg' });
      }
      await onUpload(output, purpose);
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not upload this photo.'); setPending(false); }
  }
  return <section className="panel space-y-4" aria-label="Prepare photo">
    <h2 className="font-sans text-xl font-semibold">Check your photo</h2>
    <p className="subtle text-sm">Expose card titles and crop out cards that aren’t in this deck.</p>
    {readable && url ? <div className="relative overflow-hidden rounded-md bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview || url} alt="Selected deck photo" onError={() => setReadable(false)} className="mx-auto max-h-96 max-w-full object-contain" style={{ clipPath: `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)` }} />
    </div> : <p className="text-sm">{url ? 'Preview unavailable. We’ll convert this photo when you upload it.' : 'Preparing preview…'}</p>}
    {readable && <details className="disclosure"><summary>Rotate or crop</summary><div className="space-y-3">
      <Button variant="outline" onClick={() => setRotation(r => (r + 90) % 360)}>Rotate 90°</Button>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="text-sm mb-2">Trim photo edges</legend>
        {(['left','top','right','bottom'] as const).map(edge => <label key={edge} className="text-sm capitalize">{edge}: {crop[edge]}%
          <input aria-label={`Crop ${edge} edge`} type="range" min="0" max="40" value={crop[edge]} className="block min-h-11 w-full" onChange={e => setCrop(c => ({ ...c, [edge]: Number(e.target.value) }))} />
        </label>)}
      </fieldset>
    </div></details>}
    {!initial && <label className="block space-y-1 text-sm">This photo shows
      <select className="h-11 w-full rounded-md border border-border bg-card px-3 text-base" value={purpose} onChange={e => setPurpose(e.target.value as PhotoPurpose)}>
        <option value="check">The same deck · check my list</option><option value="additional">Additional cards not photographed yet</option>
      </select>
    </label>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={pending} onClick={upload}>{pending ? 'Uploading…' : 'Use photo'}</Button><Button variant="outline" disabled={pending} onClick={onCancel}>Choose another photo</Button></div>
  </section>;
}
