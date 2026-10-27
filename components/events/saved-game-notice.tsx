'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export function SavedGameNotice({ eventId }: {
    eventId: string;
}) { const [id, setId] = useState(''); useEffect(() => { const value = sessionStorage.getItem('proxycon-result:' + eventId); if (value) {
    queueMicrotask(() => setId(value));
    sessionStorage.removeItem('proxycon-result:' + eventId);
} }, [eventId]); return id ? <section className="panel" role="status"><strong>Result saved.</strong><div className="action-row"><Link href={'/events/' + eventId + '/match/' + id}>View result</Link><Link href={'/events/' + eventId + '/play?again=' + id}>Play again with this group</Link><button type="button" onClick={() => setId('')}>Dismiss</button></div></section> : null; }
