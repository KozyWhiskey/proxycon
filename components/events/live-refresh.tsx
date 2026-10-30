'use client';

import { useContext, useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SnapshotIdentity, latestReceipt, snapshotEvent, type SnapshotReceipt } from './snapshot-store';

type State = 'idle' | 'offline' | 'failed' | 'refreshing' | 'editing';
export function LiveRefresh({ fetchedAt }: { fetchedAt: string }) {
  const router = useRouter();
  const identity = useContext(SnapshotIdentity);
  const path = usePathname();
  const query = useSearchParams().toString();
  const [last, setLast] = useState(fetchedAt);
  const [state, setState] = useState<State>('refreshing');
  const [pending, start] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    let active = true, inFlight = false, paused = false;
    let controller: AbortController | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const editing = () => Boolean(document.querySelector('input:focus,textarea:focus,select:focus,[role="dialog"],[data-editing-result="true"]'));
    const finish = () => { inFlight = false; clearTimeout(deadline); };
    const accept = (data: SnapshotReceipt) => {
      if (!active || data.identity !== identity || data.key !== window.location.pathname + window.location.search) return;
      finish();
      paused = false;
      if (data.success && data.at) { setLast(data.at); setState(navigator.onLine ? 'idle' : 'offline'); }
      else setState(navigator.onLine ? 'failed' : 'offline');
    };
    const receipt = (event: Event) => accept((event as CustomEvent<SnapshotReceipt>).detail);
    const refresh = async () => {
      if (!active || document.hidden || inFlight) return;
      if (!navigator.onLine) { setState('offline'); return; }
      if (editing()) { paused = true; setState('editing'); return; }
      paused = false;
      inFlight = true;
      setState('refreshing');
      controller = new AbortController();
      deadline = setTimeout(() => { controller?.abort(); finish(); if (active) setState(navigator.onLine ? 'failed' : 'offline'); }, 15000);
      try {
        const id = path.match(/^\/events\/([^/]+)/)?.[1];
        const tournament = path.match(/^\/tournament\/([^/]+)/)?.[1];
        const suffix = id && id !== 'new' ? '?event=' + encodeURIComponent(id) : tournament ? '?tournament=' + encodeURIComponent(tournament) : '';
        const response = await fetch('/api/weekend-refresh' + suffix, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Refresh unavailable');
        // Only the committed page's receipt certifies freshness; the probe never advances Last updated.
        if (active) start(() => router.refresh());
      } catch {
        finish();
        if (active) setState(navigator.onLine ? 'failed' : 'offline');
      }
    };
    const offline = () => { controller?.abort(); finish(); setState('offline'); };
    const focusout = () => { if (paused) queueMicrotask(() => { if (!editing()) void refresh(); }); };
    const tick = setInterval(() => void refresh(), 20000);
    window.addEventListener(snapshotEvent, receipt);
    // A sibling can commit before this Suspense boundary hydrates and subscribes.
    queueMicrotask(() => { const saved = latestReceipt(identity,window.location.pathname + window.location.search); if (saved) accept(saved); });
    document.addEventListener('visibilitychange', refresh);
    document.addEventListener('focusout', focusout);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', offline);
    window.addEventListener('proxycon-refresh', refresh);
    return () => {
      active = false; controller?.abort(); finish(); clearInterval(tick);
      window.removeEventListener(snapshotEvent, receipt);
      document.removeEventListener('visibilitychange', refresh);
      document.removeEventListener('focusout', focusout);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', offline);
      window.removeEventListener('proxycon-refresh', refresh);
    };
  }, [identity, path, query, router]);
  const stamp = hydrated ? new Date(last).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : '…';
  const text = state === 'offline' ? 'Offline · showing data from ' + stamp : state === 'failed' ? 'Couldn’t refresh · showing data from ' + stamp : state === 'editing' ? 'Updates paused while editing · last updated ' + stamp : state === 'refreshing' || pending ? 'Refreshing…' : 'Last updated ' + stamp;
  return <div className="live-refresh-status" data-state={state} data-updated-at={last}><span role="status">{text}</span>{(state === 'failed' || state === 'offline') && <button type="button" onClick={() => window.dispatchEvent(new Event('proxycon-refresh'))}>Retry</button>}</div>;
}
