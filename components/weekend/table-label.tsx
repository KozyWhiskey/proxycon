'use client';
import { useState } from 'react';
import { renameTable } from '@/app/weekend/actions';
import { useAction } from './act-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export function TableLabel({ matchId, label }: {
    matchId: string;
    label: string;
}) { const [open, setOpen] = useState(false); const [value, setValue] = useState(label); const { pending, run } = useAction(); return <>{!open ? <button className="text-link table-rename" type="button" onClick={() => setOpen(true)}>Rename table</button> : <form className="action-row" data-editing-result="true" onSubmit={async (e) => { e.preventDefault(); const r = await run(() => renameTable(matchId, value)); if (r.success)
    setOpen(false); }}><label>Table label<Input value={value} maxLength={60} onChange={e => setValue(e.target.value)}/></label><Button disabled={pending}>Save label</Button><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button></form>}</>; }
