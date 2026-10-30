'use client';
import {displayDay} from '@/lib/display-day';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AgendaItem } from '@/lib/agenda';
import { editAgenda } from '@/app/events/agenda-actions';
import { chicagoToday } from '@/lib/weekend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export function AgendaEditor({ eventId, items, members, tournaments, canManage, start, end }: {
    eventId: string;
    items: AgendaItem[];
    members: {
        id: string;
        name: string;
    }[];
    tournaments: {
        id: string;
        name: string;
    }[];
    canManage: boolean;
    start: string | null;
    end: string | null;
}) {
    const router = useRouter();
    const [editing, setEditing] = useState<AgendaItem | null | undefined>(undefined);
    const [managing,setManaging]=useState(false);
    const [message, setMessage] = useState('');
    const [conflict, setConflict] = useState<AgendaItem | null>(null);
    const [pending, transition] = useTransition();
    const [removing, setRemoving] = useState<string | null>(null);
    const [draft, setDraft] = useState<Record<string, string>>({});
    function open(item: AgendaItem | null) { setEditing(item); setConflict(null); setMessage(''); setDraft({ day: item?.day || ((start && chicagoToday() < start) || (end && chicagoToday() > end) ? start || chicagoToday() : chicagoToday()), title: item?.title || '', timing: item?.timing || '', note: item?.note || '', supplies_owner: item?.supplies_owner || '', tournament_id: item?.tournament_id || '' }); }
    function act(item: AgendaItem, op: 'delete' | 'up' | 'down') { transition(async () => { try {
        const r = await editAgenda(eventId, item.id, item.revision, op);
        setMessage(r.message);
        if (r.success) {
            setRemoving(null);
            router.refresh();
        }
    }
    catch {
        setMessage('Could not save. Try again.');
    } }); }
    return <><div className="action-row">{canManage && <Button onClick={() => open(null)}>Add a plan</Button>}{canManage&&items.length>0&&<Button variant="outline" aria-pressed={managing} onClick={()=>setManaging(v=>!v)}>{managing?'Done editing plans':'Edit plans'}</Button>}</div><p role="status">{message}</p>
 {editing !== undefined && <form className="panel space-y-4" data-editing-result="true" onSubmit={e => { e.preventDefault(); transition(async () => { try {
        const r = await editAgenda(eventId, editing?.id || null, editing?.revision || 0, 'save', draft);
        setMessage(r.message);
        if (!r.success && 'current' in r && r.current)
            setConflict(r.current as AgendaItem);
        if (r.success) {
            setConflict(null);
            setEditing(undefined);
            router.refresh();
        }
    }
    catch {
        setMessage('Could not save. Your plan is still here.');
    } }); }}><h2>{editing ? 'Edit plan' : 'Add a plan'}</h2>{['day', 'title', 'timing', 'note'].map(field => <label className="grid gap-2" key={field}>{({ day: 'Day', title: 'Activity', timing: 'When (optional)', note: 'Supplies / notes (optional)' } as Record<string, string>)[field]}<Input type={field === 'day' ? 'date' : 'text'} min={field === 'day' ? start || undefined : undefined} max={field === 'day' ? end || undefined : undefined} required={field === 'day' || field === 'title'} maxLength={field === 'title' ? 100 : field === 'timing' ? 80 : 500} value={draft[field]} onChange={e => setDraft({ ...draft, [field]: e.target.value })}/></label>)}<label className="grid gap-2">Supplies owner (optional)<select className="input" value={draft.supplies_owner} onChange={e => setDraft({ ...draft, supplies_owner: e.target.value })}><option value="">Not set</option>{members.map(m => <option value={m.id} key={m.id}>{m.name}</option>)}</select></label><label className="grid gap-2">Linked tournament (optional)<select className="input" value={draft.tournament_id} onChange={e => setDraft({ ...draft, tournament_id: e.target.value })}><option value="">None</option>{tournaments.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label><div className="action-row"><Button disabled={pending || !!conflict}>{pending ? 'Saving…' : 'Save plan'}</Button><Button type="button" variant="outline" onClick={() => setEditing(undefined)}>Cancel</Button></div>{conflict && <section className="panel"><h3>Current saved plan</h3><p>{displayDay(conflict.day)} · {conflict.title} · {conflict.timing}</p><p>{conflict.note}</p><p>Your proposed plan remains in the fields above. Review the differences before saving.</p><Button type="button" variant="outline" onClick={() => { setEditing(conflict); setConflict(null); setMessage('Saved plan adopted as the baseline. Your proposed changes are still here.'); }}>Keep my proposal and use this revision</Button></section>}</form>}
 {!items.length && <p>No plans yet.{canManage ? ' Add a plan when the group has an idea.' : ''}</p>}
 {[...new Set(items.map(i => i.day))].map(day => <section key={day} className="space-y-3"><h2>{displayDay(day)}</h2>{items.filter(i => i.day === day).map((i, index, group) => <article className="panel" key={i.id}><h3>{i.title}</h3>{i.timing && <p>{i.timing}</p>}<p className="subtle">{i.supplies_owner ? (members.find(m => m.id === i.supplies_owner)?.name || 'Player') + (/^bringing\b/i.test(i.note||'')?' '+i.note:' · supplies') : 'Supplies owner not set'}</p>{i.note && !(i.supplies_owner&&/^bringing\b/i.test(i.note)) && <p>{i.note}</p>}{((start && i.day < start) || (end && i.day > end)) && <p>Outside updated event dates · reschedule this plan.</p>}{i.tournament_id && <Link className="text-link" href={'/tournament/' + i.tournament_id}>Open tournament →</Link>}{canManage && managing && <div className="action-row"><Button variant="outline" onClick={() => open(i)}>Edit plan</Button><Button variant="outline" disabled={pending || index === 0} aria-label={'Move ' + i.title + ' up'} onClick={() => act(i, 'up')}>Move up</Button><Button variant="outline" disabled={pending || index === group.length - 1} aria-label={'Move ' + i.title + ' down'} onClick={() => act(i, 'down')}>Move down</Button><Button variant="ghost" onClick={() => setRemoving(i.id)}>Remove</Button></div>}{removing === i.id && <div role="group" aria-label="Confirm removal"><p>Remove this plan? Its linked tournament stays.</p><Button disabled={pending} onClick={() => act(i, 'delete')}>Remove plan</Button><Button variant="outline" onClick={() => setRemoving(null)}>Keep plan</Button></div>}</article>)}</section>)}</>;
}
