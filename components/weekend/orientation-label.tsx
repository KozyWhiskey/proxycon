'use client';
import { useState } from 'react';
import { saveOrientation } from '@/app/events/agenda-actions';
import { useAction } from './act-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export function OrientationLabel({ tournamentId, pod, label, canControl }: {
    tournamentId: string;
    pod: number;
    label: string;
    canControl: boolean;
}) { const [value, setValue] = useState(label); const { pending, run } = useAction(); return <>{label && <p className="subtle">Top edge: {label}</p>}{canControl && <details className="disclosure"><summary>Label the table orientation</summary><form className="space-y-2" data-editing-result="true" onSubmit={e => { e.preventDefault(); run(() => saveOrientation(tournamentId, pod, value)); }}><label>Top edge (optional)<Input value={value} maxLength={80} placeholder="Kitchen end" onChange={e => setValue(e.target.value)}/></label><Button disabled={pending}>Save orientation</Button></form></details>}</>; }
