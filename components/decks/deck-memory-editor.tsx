'use client';
/* Private signed photo URLs deliberately bypass the public image optimizer. */
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ImagePlus, RotateCcw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/client';
import { applySuggestion, BASIC_NAMES, cardKey, sameCard, normalizedName, comparePhoto, manualCard,
  undoReviewCards, type DeckMemory, type MemoryCard, type MemoryPhoto, type PhotoPurpose, type ProviderAttempt, type ReaderChoice, type Region, type Suggestion } from '@/lib/deck-memory';
import { automaticCategory, builderText, deckTotals, mainCards, replaceAllocation, setAllocationCount, sideboardCount } from '@/lib/deck-builder';
import { deckReaderFailureMessage } from '@/lib/deck-memory-errors';
import { DeckReviewWorkspace, type ReviewEntry } from './deck-review-workspace';
import { MemoryPhotoEditor } from './memory-photo-editor';

type Attempt = ProviderAttempt & { selection: ReaderChoice; purpose: PhotoPurpose; baseline_revision: number; region: Region | null; warnings?: string[] };
export type MemoryPayload = {
  memory: DeckMemory; owner: boolean; photos: MemoryPhoto[]; attempts: Attempt[];
  tournament: { name: string; status: string } | null;
  readers: Record<'google' | 'openai', { name: string; model: string; available: boolean }>;
  photoProcessing: boolean;
};

async function api(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(path, { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not complete this action.');
  return result;
}

export function DeckMemoryEditor({ initial }: { initial: MemoryPayload }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [draft, setDraft] = useState(initial.memory);
  const [choice, setChoice] = useState<ReaderChoice>('both');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [consent, setConsent] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [readingSeconds, setReadingSeconds] = useState(0);
  useEffect(() => {
    if (busy !== 'Reading photo…') return;
    const start = Date.now();
    const timer = setInterval(() => setReadingSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<MemoryCard | null>(null);
  const [replaceCategory,setReplaceCategory]=useState<string|null>(null);
  const [replaceKey, setReplaceKey] = useState<string | null>(null);
  const [undo, setUndo] = useState<{before:DeckMemory;after:DeckMemory;label:string} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const sequence = useRef(0);
  const saving = useRef(false);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const [toolbarHeight,setToolbarHeight] = useState(0);
  useEffect(() => { const target=toolbar.current; if (!target) return; const observer=new ResizeObserver(() => setToolbarHeight(Math.ceil(target.offsetHeight))); observer.observe(target); return () => observer.disconnect(); }, []);
  const base = `/api/deck-memories/${draft.id}`;
  useEffect(() => {
    try {
      const value = localStorage.getItem('proxycon-deck-reader');
      if (value === 'both' || value === 'google' || value === 'openai') setChoice(value);
    } catch { /* Browser preferences are optional. */ }
  }, []);
  const edit = useCallback((update: (current: DeckMemory) => DeckMemory) => {
    sequence.current++; setDraft(update); setDirty(true); setMessage('');
  }, []);
  const save = useCallback(async (confirm = false) => {
    if (saving.current) return false;
    saving.current = true; setPersisting(true); const version = sequence.current;
    try {
      const result: MemoryPayload = await api(base, 'PATCH', { revision: draft.revision, title: draft.title, note: draft.note,
        cards: draft.cards, categories:draft.categories||[], decisions: draft.decisions, confirm, incomplete: draft.incomplete, acknowledged });
      setData(result);
      setDraft(current => sequence.current === version ? result.memory : { ...current, revision: result.memory.revision, status: result.memory.status });
      if (sequence.current === version) setDirty(false);
      if (confirm) setMessage('Deck memory confirmed. Only you can see it until you share.');
      setError(''); return true;
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not save your changes.'); return false; }
    finally { saving.current = false; setPersisting(false); }
  }, [base, draft, acknowledged]);
  useEffect(() => {
    if (!dirty || busy || !data.owner) return;
    const timer = setTimeout(() => { void save(); }, 1100);
    return () => clearTimeout(timer);
  }, [dirty, busy, data.owner, save]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const suggestions = useMemo(() => {
    const result: Suggestion[] = [];
    for (const photo of data.photos) {
      const attempts = data.attempts.filter(a => a.photo_id === photo.id);
      const latest = attempts.at(-1);
      if (latest) result.push(...comparePhoto(attempts, draft.cards, latest.purpose, photo.id, latest.analysis_key, latest.selection,draft.categories)
        .filter(s => !draft.decisions[s.id]));
    }
    return result;
  }, [data.photos, data.attempts, draft.cards, draft.decisions,draft.categories]);
  const reviews = useMemo(() => {
    const pending = new Map(suggestions.map(s => [s.id,s]));
    const result: ReviewEntry[] = [];
    for (const photo of data.photos) {
      const attempts = data.attempts.filter(a => a.photo_id === photo.id);
      const latest = attempts.at(-1);
      if (!latest) continue;
      for (const candidate of comparePhoto(attempts, [], latest.purpose, photo.id, latest.analysis_key, latest.selection,draft.categories)) {
        const decision = draft.decisions[candidate.id];
        const actual = pending.get(candidate.id);
        if (actual || decision) result.push({suggestion:actual || candidate,decision});
      }
    }
    return result;
  }, [data.photos,data.attempts,draft.decisions,suggestions,draft.categories]);
  const totals=deckTotals(draft.cards,draft.categories);
  const total=totals.main,lands=totals.lands;
  const available = choice === 'both' ? data.readers.google.available && data.readers.openai.available : data.readers[choice].available;
  const hasUnverified = draft.cards.some(c => !c.verified);

  function selectFile(next?: File) {
    setError('');
    if (!next) return;
    if (next.size > 20 * 1024 * 1024) { setError('Choose a photo smaller than 20 MB.'); return; }
    if (data.photos.length >= 4) { setError('Remove one of your four photos before adding another.'); return; }
    setFile(next);
  }
  async function upload(next: File, purpose: PhotoPurpose) {
    setBusy('Uploading photo…');
    let photoId: string | null = null;
    try {
      const authorization = await api(`${base}/photos`, 'POST', { purpose }); photoId = authorization.photoId;
      const uploaded = await createClient().storage.from('deck-photos').uploadToSignedUrl(authorization.path, authorization.token, next, { contentType: next.type || 'application/octet-stream' });
      if (uploaded.error) throw new Error('Upload interrupted. Choose the photo again.');
      await api(`${base}/photos`, 'POST', { photoId, purpose });
      setData(await api(base)); setFile(null); setMessage('Photo ready. Choose Read photo, or keep entering cards manually.');
    } catch(e) {
      if (photoId) await api(`${base}/photos`, 'DELETE', { photoId }).catch(() => undefined);
      throw e;
    } finally { setBusy(''); }
  }
  async function analyze(photo: MemoryPhoto, region?: Region, retry?: Attempt) {
    if (!available && !retry) return;
    setReadingSeconds(0); setBusy('Reading photo…'); setError(''); setMessage('');
    try {
      if (dirty && !(await save())) return;
      const latest = await api(base) as MemoryPayload;
      const result = await api(`${base}/analyze`, 'POST', { photoId: photo.id, choice: retry?.selection || choice,
        key: crypto.randomUUID(), purpose: region ? 'recheck' : photo.purpose === 'initial' && draft.cards.length ? 'recheck' : photo.purpose,
        revision: latest.memory.revision, ...(region ? { region } : {}), ...(retry ? { retryOf: retry.id } : {}) });
      setData(result); setCaptureOpen(false);
      const errors = result.outcomes.filter((o: { error?: string }) => o.error);
      setMessage(errors.length ? errors.map((outcome: { provider: 'google' | 'openai'; error: string }) => `${data.readers[outcome.provider].name}: ${outcome.error}`).join(' ') + ' Successful readings are kept.' : 'Photo checked. Review suggested changes below.');
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not read this photo.'); }
    finally { setBusy(''); }
  }
  function decide(s: Suggestion, accept: boolean, additional = false) {
    if (draft.decisions[s.id]) return;
    try {
    const next = { ...draft, cards: accept ? applySuggestion(draft.cards,s,additional ? 'additional' : 'observed',draft.categories) : draft.cards,
      decisions: { ...draft.decisions, ...(accept ? Object.fromEntries(suggestions.filter(other => other.photoId === s.photoId && s.alternatives.some(name => normalizedName(name) === normalizedName(other.card.name))).map(other => [other.id,'dismissed' as const])) : {}), [s.id]:accept ? 'accepted' as const : 'dismissed' as const } };
    setUndo({before:draft,after:next,label:accept ? `Added or updated ${s.card.name}` : `Skipped ${s.card.name}`});
    edit(current => ({...current,cards:next.cards,decisions:next.decisions}));
    setMessage(accept ? `${s.card.name} added or updated in your deck.` : `${s.card.name} skipped.`);
    } catch(e) {setError((e as Error).message);}
  }
  function bulkAdd(entries: Suggestion[]) {
    const eligible = entries.filter(s => !draft.decisions[s.id] && s.kind === 'add' && !draft.cards.some(c => sameCard(c,s.card)));
    const next = {...draft,cards:eligible.reduce((cards,s) => applySuggestion(cards,s,'observed',draft.categories),draft.cards),decisions:{...draft.decisions,...Object.fromEntries(eligible.map(s => [s.id,'accepted' as const]))}};
    setUndo({before:draft,after:next,label:`Added ${eligible.length} entries to your deck`});
    edit(current => ({...current,cards:next.cards,decisions:next.decisions}));
  }
  function undoReview() {
    if (!undo) return;
    const cards = undoReviewCards(draft.cards,undo.before.cards,undo.after.cards);
    const changed = [...new Set([...Object.keys(undo.before.decisions),...Object.keys(undo.after.decisions)])].filter(key => undo.before.decisions[key] !== undo.after.decisions[key]);
    if (JSON.stringify(draft.categories||[])!==JSON.stringify(undo.after.categories||[]) || !cards || changed.some(key => draft.decisions[key] !== undo.after.decisions[key])) { setError('This card changed after review. Your edits were kept. Adjust it in Your deck instead.'); setUndo(null); return; }
    edit(current => { const decisions={...current.decisions}; for (const key of changed) { if (undo.before.decisions[key]) decisions[key]=undo.before.decisions[key]; else delete decisions[key]; } return {...current,cards,decisions}; });
    setUndo(null); setMessage('Last review change undone.');
  }
  function addCard(card: MemoryCard) {
    edit(current => {
      if(replaceKey&&replaceCategory){const source=current.cards.find(c=>cardKey(c)===replaceKey);if(source)return {...current,cards:replaceAllocation(current.cards,source,replaceCategory,card)};}
      const cards = replaceKey ? current.cards.filter(c => cardKey(c) !== replaceKey) : current.cards;
      const existing = cards.find(c => sameCard(c, card));
      return { ...current, cards: existing ? cards.map(c => c === existing ? { ...c, count: c.count + (replaceKey ? 0 : card.count), edited: true } : c) : [...cards, { ...card, edited: true }] };
    });
    setQuery(''); setFound(null); setReplaceKey(null);setReplaceCategory(null);
  }
  async function search() {
    setBusy('Finding card…'); setError('');
    try { const result = await api(`${base}/search?q=${encodeURIComponent(query.trim())}`); setFound(result.card); }
    catch(e) { setError(e instanceof Error ? e.message : 'Search unavailable.'); }
    finally { setBusy(''); }
  }
  async function share() {
    setBusy('Updating sharing…');
    try { if (dirty && !(await save())) return; const result = await api(base, 'PATCH', { operation: 'share', shared: !draft.shared }); setData(result); setDraft(result.memory); setMessage(result.memory.shared ? 'Deck and photos shared with the playgroup.' : 'Deck and photos are private.'); }
    catch(e) { setError(e instanceof Error ? e.message : 'Could not update sharing.'); }
    finally { setBusy(''); }
  }
  function download() {
    const blob = new Blob([builderText(draft.cards,draft.categories)], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${draft.title.replace(/[^a-z0-9-]/gi, '-').slice(0,80)}.txt`; a.click(); URL.revokeObjectURL(url);
  }
  const confirmationCurrent=!dirty&&draft.status==='confirmed'&&(!draft.confirmed_revision||draft.confirmed_revision===draft.revision);
  const saveLabel=persisting?'Saving draft…':dirty?'Draft not saved':confirmationCurrent?'Confirmed memory':draft.confirmed_revision?'Changes awaiting confirmation':'Draft saved automatically';
  return <div className="deck-memory-workspace" aria-busy={Boolean(busy)} style={{ accentColor:'var(--link)', '--review-toolbar-height':toolbarHeight+'px' } as CSSProperties}>
    <div className="review-toolbar" ref={toolbar}>
      <span className="text-sm text-muted-foreground">Main {total} · Sideboard {totals.sideboard} · {lands} lands · {total-lands} nonlands · {draft.shared ? 'Shared' : 'Private'} · <span className="review-save-indicator" >{saveLabel}</span></span>
      {data.owner && <><Button variant="outline" aria-label="Photos & readers" title="Photos & readers" aria-expanded={captureOpen} aria-controls="memory-capture" onClick={() => setCaptureOpen(value => !value)}>Photos</Button><Button variant="ghost" disabled={!undo || Boolean(busy)} title={undo?.label || 'No review change to undo'} onClick={undoReview}>Undo</Button><Button asChild><a href="#memory-confirmation" onClick={()=>document.getElementById('memory-confirmation')?.focus()}>{confirmationCurrent?'View confirmation':'Finish review'}</a></Button></>}
      {draft.cards.length>0 && <details className="review-export"><summary>Export</summary><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(builderText(draft.cards,draft.categories)); setMessage('Decklist copied.'); } catch { setError('Copy unavailable. Use Download instead.'); } }}>Copy list</Button><Button variant="outline" onClick={async()=>{try{await navigator.clipboard.writeText(builderText(draft.cards,draft.categories,true));setMessage('Main deck copied.');}catch{setError('Copy unavailable. Use Download instead.');}}}>Copy main deck</Button><Button variant="outline" onClick={download}><Download size={16} aria-hidden="true" />Download</Button></div></details>}
    <div role="status" aria-live="polite" className="sr-only">{busy || message || saveLabel}</div>
    </div>

    {busy === 'Reading photo…' && <p className="text-sm text-muted-foreground" aria-hidden="true">{readingSeconds}s elapsed · readings usually take 30–60 seconds. Your current list stays unchanged.</p>}
    {error && <div role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}<div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" onClick={() => void save()}>Retry saving</Button><Button variant="outline" onClick={() => { if (!dirty || window.confirm('Reload and discard unsaved changes?')) window.location.reload(); }}>Reload saved deck</Button></div></div>}
    {data.owner&&<div className="action-row memory-entry-actions"><Button variant="outline" aria-expanded={captureOpen} onClick={()=>{setCaptureOpen(true);setTimeout(()=>document.getElementById('memory-capture')?.scrollIntoView({block:'start'}),0);}}>Read a photo</Button><Button variant="outline" onClick={()=>{setCaptureOpen(false);document.getElementById('deck-tab')?.click();setTimeout(()=>{const input=document.getElementById('memory-card-name');const details=input?.closest('details');if(details)details.open=true;input?.focus();},0);}}>Enter cards by name</Button></div>}
    {data.owner && <details id="memory-capture" className="memory-capture space-y-4" open={captureOpen} onToggle={event => setCaptureOpen(event.currentTarget.open)}><summary className="sr-only">Photos & recognition · {data.photos.length}/4 photos</summary><section className="space-y-4" aria-label="Deck photos">
      <h2 className="font-sans text-xl font-semibold">{data.attempts.length ? 'Check with another photo' : 'Read your deck photo'}</h2>
      <p className="text-sm text-muted-foreground">Show each card’s title. Enter hidden land counts below. A second view checks your list without adding duplicate copies.</p>
      <div className="flex flex-wrap gap-2">
        <input ref={camera} className="sr-only" tabIndex={-1} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" capture="environment" onChange={e => { selectFile(e.target.files?.[0]); e.target.value=''; }} />
        <input ref={gallery} className="sr-only" tabIndex={-1} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" onChange={e => { selectFile(e.target.files?.[0]); e.target.value=''; }} />
        <Button variant="outline" disabled={Boolean(busy) || !data.photoProcessing || data.photos.length>=4} onClick={() => camera.current?.click()}><Camera size={18} aria-hidden="true" />Take photo</Button>
        <Button variant="outline" disabled={Boolean(busy) || !data.photoProcessing || data.photos.length>=4} onClick={() => gallery.current?.click()}><ImagePlus size={18} aria-hidden="true" />Choose photos</Button>
      </div>
      {!data.photoProcessing && <p className="text-sm">Photo processing is unavailable. You can still enter cards and save your deck.</p>}
      <label className="block space-y-1 text-sm">Read with
        <select className="h-11 w-full rounded-md border border-border bg-card px-3 text-base sm:max-w-sm" value={choice} onChange={e => { const value = e.target.value as ReaderChoice; setChoice(value); try { localStorage.setItem('proxycon-deck-reader',value); } catch {} }}>
          <option value="both" disabled={!data.readers.google.available || !data.readers.openai.available}>Both · compare{!data.readers.google.available || !data.readers.openai.available ? ' · unavailable' : ''}</option>
          {(['google','openai'] as const).map(p => <option key={p} value={p} disabled={!data.readers[p].available}>{data.readers[p].name}{!data.readers[p].available ? ' · unavailable' : ''}</option>)}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">{choice === 'both' ? `${data.readers.google.model} + ${data.readers.openai.model}` : data.readers[choice].model}</p>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-5 shrink-0" checked={consent} onChange={e => setConsent(e.target.checked)} />Send selected photos to {choice === 'both' ? 'Google and OpenAI for independent readings. This may take longer.' : choice === 'google' ? 'Google for card recognition.' : 'OpenAI for card recognition.'}</label>
      {!available && <p className="text-sm">This selection is unavailable. Choose an available reader, or enter cards below.</p>}
    </section>
    {data.photos.length > 0 && <div className="memory-photos">
      {data.photos.map((photo, index) => {
        const attempts = data.attempts.filter(a => a.photo_id === photo.id);
        const latest = attempts.at(-1);
        const latestGroup = latest ? [...new Map(attempts.filter(a => a.analysis_key === latest.analysis_key).map(a=>[a.provider,a])).values()] : [];
        return <article key={photo.id} id={`photo-${photo.id}`} className="panel memory-photo space-y-3">
          <h3 className="font-sans font-semibold">Photo {index+1}</h3>
          {photo.url ? <a href={photo.url} target="_blank" rel="noreferrer" className="block" aria-label={`Open photo ${index+1}`}>
            <img src={photo.url} alt={`Deck layout, photo ${index+1}`} className="max-h-36 w-full rounded-md object-contain" />
          </a> : <p className="text-sm text-muted-foreground">Photo preview unavailable. Reload to refresh access.</p>}
          {data.owner && <><div className="flex flex-wrap gap-2">
            <Button disabled={Boolean(busy) || persisting || !available || !consent || photo.status!=='ready'} onClick={() => void analyze(photo)}><RotateCcw size={16} aria-hidden="true" />{latest ? 'Check this photo again' : 'Read photo'}</Button>
            {!consent && photo.status === 'ready' && <p className="w-full text-sm text-muted-foreground">Open Photos & recognition above to choose a reader and allow sending this photo.</p>}
            {photo.status !== 'ready' && <Button variant="outline" disabled={Boolean(busy)} onClick={async () => { setBusy('Preparing photo…'); try { await api(`${base}/photos`,'POST',{photoId:photo.id}); setData(await api(base)); } catch(e) {setError(e instanceof Error?e.message:'Could not prepare photo.');} finally {setBusy('');} }}>Finish upload</Button>}
            <Button variant="ghost" disabled={Boolean(busy)} onClick={async () => { if (!window.confirm('Remove this photo? Cards already saved stay in your list.')) return; setBusy('Removing photo…'); try { await api(`${base}/photos`,'DELETE',{photoId:photo.id}); setData(await api(base)); } catch {setError('Could not remove photo.');} finally {setBusy('');} }}>Remove photo</Button>
          </div>
          {latestGroup.map(attempt => <div key={attempt.id} className="text-xs text-muted-foreground">{data.readers[attempt.provider].name}: {attempt.status === 'ready' ? 'Read' : attempt.status === 'failed' ? 'Could not finish' : 'Interrupted or still processing'}
            {attempt.status === 'failed' && <p className="mt-2 text-sm">{deckReaderFailureMessage(attempt.error_category)}</p>}
            {!!attempt.warnings?.length && <details className="mt-2"><summary className="cursor-pointer text-sm">Reading notes</summary>{attempt.warnings.map((warning,i) => <p key={i} className="mt-2">{warning}</p>)}</details>}
          </div>)}
          </>}
        </article>;
      })}
    </div>}

    </details>}
    {file && <MemoryPhotoEditor key={`${file.name}-${file.lastModified}`} file={file} initial={!data.photos.length && !draft.cards.length} onCancel={() => setFile(null)} onUpload={upload} />}


    {data.owner && data.photos.map((photo,index) => {
      const attempts=data.attempts.filter(a => a.photo_id===photo.id); const latest=attempts.at(-1);
      if (!latest) return null;
      const group=[...new Map(attempts.filter(a => a.analysis_key===latest.analysis_key).map(a => [a.provider,a])).values()];
      if (group.every(a => a.status==='ready')) return null;
      const incomplete=latest.selection==='both' && new Set(group.filter(a => a.status==='ready').map(a=>a.provider)).size<2;
      return <div className="review-provider-status" key={photo.id}>
        {data.photos.length>1 && <strong>Photo {index+1}</strong>}
        {group.map(a => <span key={a.id}>{data.readers[a.provider].name} {a.status==='ready' ? 'finished' : a.status==='failed' ? 'failed' : 'processing'}</span>)}
        {incomplete && <span className="sr-only">Comparison incomplete. Successful readings are kept.</span>}
        {group.filter(a => a.status!=='ready').map(a => <div key={a.id}><span className="sr-only">Retry sends this photo only to {data.readers[a.provider].name}. Successful readings are kept.</span><Button variant="outline" disabled={Boolean(busy)||persisting||photo.status!=='ready'||!data.readers[a.provider].available} onClick={() => void analyze(photo,undefined,a)}>Retry {data.readers[a.provider].name}</Button></div>)}
      </div>;
    })}
    <DeckReviewWorkspace categories={draft.categories||[]} onBuilderChange={(cards,categories)=>edit(d=>({...d,cards,categories}))}
      onBuilderReplace={(card,categoryId)=>{setReplaceKey(cardKey(card));setReplaceCategory(categoryId);setQuery(card.name);setFound(null);setTimeout(()=>{const input=document.getElementById('memory-card-name');const details=input?.closest('details');if(details)details.open=true;input?.focus();},0);}} cards={draft.cards} reviews={reviews} photos={data.photos} owner={data.owner} busy={Boolean(busy)} canLookCloser={consent && available}
      onDecide={decide} onBulk={bulkAdd} onShowPhoto={id => { setCaptureOpen(true); setTimeout(() => document.getElementById('photo-'+id)?.scrollIntoView({block:'nearest'}),0); }}
      onQuantity={(card,count) => edit(d => ({...d,cards:d.cards.map(c => sameCard(c,card) ? {...c,count,edited:true} : c)}))}
      onRemove={card => edit(d => ({...d,cards:d.cards.filter(c => !sameCard(c,card))}))}
      onReplace={(card,existing) => { setReplaceKey(existing ? cardKey(card) : null); setQuery(card.name); setFound(null); setTimeout(() => { const input=document.getElementById('memory-card-name'); const details=input?.closest('details'); if (details) details.open=true; input?.focus(); },0); }}
      onLookCloser={(photo,suggestion) => void analyze(photo,suggestion.region)}
      manualControls={<div className="space-y-4 pt-4">      {data.owner && <><fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-5"><legend className="mb-2 text-sm font-semibold">Main-deck basic lands</legend>{BASIC_NAMES.map(name=>{
        const existing=mainCards(draft.cards,draft.categories).find(c=>normalizedName(c.name)===normalizedName(name));
        return <label key={name} className="space-y-1 text-sm">{name}<Input aria-label={`${name} basic lands`} type="number" inputMode="numeric" min={0} max={250} value={existing?.count || 0} onChange={e=>{
          const count=Math.max(0,Math.min(250,Math.trunc(Number(e.target.value)||0)));
          edit(d=>{const current=d.cards.find(c=>normalizedName(c.name)===normalizedName(name));if(!current)return {...d,cards:count?[...d.cards,{...manualCard(name,count),verified:true,typeLine:`Basic Land — ${name}`}]:d.cards};const side=sideboardCount(current,d.categories),assigned=(current.allocations||[]).reduce((sum,a)=>sum+a.count,0)-side;if(count<assigned){setError('Move basic lands assigned to custom categories before reducing this main count.');return d;}const updated=setAllocationCount(current,automaticCategory(current),count-assigned);return {...d,cards:d.cards.map(c=>c===current?updated:c).filter(c=>c.count>0)};});
        }} /></label>;
      })}</fieldset>
        <div className="space-y-2"><label className="block text-sm" htmlFor="memory-card-name">{replaceKey ? 'Replace card with' : 'Add a card by name'}</label>
          <div className="flex flex-wrap gap-2"><Input id="memory-card-name" className="min-w-0 flex-1" value={query} maxLength={200} onChange={e=>{setQuery(e.target.value);setFound(null);}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void search();}}} placeholder="Card name" /><Button variant="outline" disabled={!query.trim() || Boolean(busy)} onClick={()=>void search()}>Find card</Button></div>
          {found && <div className="rounded-md border border-border p-3"><p>{found.name}{!found.verified ? ' · Check this match' : ''}</p><Button variant="outline" className="mt-2" onClick={()=>addCard({...found,verified:true})}>{replaceKey ? 'Use this card' : 'Add this card'}</Button></div>}
          {query.trim() && <Button variant="ghost" onClick={()=>addCard(manualCard(query))}>Use “{query.trim()}” as an unverified name</Button>}
          {replaceKey && <Button variant="ghost" onClick={()=>{setReplaceKey(null);setReplaceCategory(null);setQuery('');setFound(null);}}>Cancel replacement</Button>}
        </div>
      </>}</div>} />
    {data.owner && <details className="panel memory-deck-details"><summary>Deck name & notes</summary><div className="space-y-4 pt-4">
      <label className="block space-y-1 text-sm">Deck name<Input value={draft.title} maxLength={120} onChange={e => edit(d => ({ ...d, title: e.target.value }))} /></label>
      <label className="block space-y-1 text-sm">Note<textarea className="w-full rounded-md border border-border bg-card p-3 text-base" value={draft.note} maxLength={2000} rows={2} onChange={e => edit(d => ({ ...d, note: e.target.value }))} /></label>
      {draft.status === 'pending' && <p className="text-xs text-muted-foreground">Unfinished drafts expire after 30 days without edits. Confirm the deck memory to keep it.</p>}
    </div></details>}
    {data.owner && <section id="memory-confirmation" tabIndex={-1} className="panel space-y-4 memory-confirmation"><h2>Deck memory confirmation</h2>{confirmationCurrent&&<p role="status">Confirmed memory · your current list is confirmed.</p>}
      {total<40 && <p className="text-sm">{total} main-deck cards recorded. Limited decks usually have at least 40; hidden lands may still need entering.</p>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-5" checked={draft.incomplete} onChange={e=>edit(d=>({...d,incomplete:e.target.checked}))} />This memory is incomplete</label>
      {(hasUnverified || suggestions.length>0) && <label className="flex items-start gap-2 text-sm"><input className="mt-1 size-5 shrink-0" type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)} />I reviewed the list and accept any remaining unverified cards or suggestions.</label>}
      <Button className="w-full sm:w-auto" disabled={confirmationCurrent || Boolean(busy) || persisting || !total || (total<40 && !draft.incomplete) || ((hasUnverified || suggestions.length>0) && !acknowledged)} onClick={async()=>{setBusy('Confirming memory…');await save(true);setBusy('');}}>{confirmationCurrent?'Confirmed memory':'Confirm deck memory'}</Button>
      <p className="text-xs text-muted-foreground">{draft.shared ? confirmationCurrent?'Your confirmed memory is shared with the playgroup.':'Your shared memory has changes awaiting confirmation.' : 'Only you can see this deck and its photos.'}</p>
      {(data.tournament?.status==='completed' || draft.shared) && draft.status==='confirmed' && (!draft.confirmed_revision||draft.confirmed_revision===draft.revision) && <div className="space-y-2"><p className="text-sm">Sharing includes your decklist and retained photos.</p><Button variant="outline" disabled={Boolean(busy)} onClick={()=>void share()}>{draft.shared ? 'Make private' : 'Share with playgroup'}</Button></div>}
      <details className="disclosure"><summary>Delete deck memory</summary><div className="space-y-3"><p className="text-sm">Delete the saved list and photos. Your tournament results stay.</p><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.checked)} />Delete this memory permanently</label><Button variant="destructive" disabled={!deleteConfirm || Boolean(busy)} onClick={async()=>{setBusy('Deleting memory…');try{await api(base,'DELETE');router.push('/decks');router.refresh();}catch{setError('Could not delete this memory.');setBusy('');}}}>Delete memory</Button></div></details>
    </section>}
    <Link className="text-link underline" href={`/tournament/${draft.tournament_id}`}>Back to tournament</Link>
  </div>;
}
