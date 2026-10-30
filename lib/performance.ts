import { headers } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { cache } from 'react';

export const performanceEnabled = () => process.env.PROXYCON_PERFORMANCE_LOGGING === 'true';
export function performanceId(value?: string | null) { return value && /^[a-zA-Z0-9_-]{1,64}$/.test(value) ? value : randomUUID(); }
export const requestPerformanceId = cache(async () => performanceId((await headers()).get('x-proxycon-profile')));
export function timedFetch(id: string): typeof fetch {
  return async (input, init) => {
    const started = performance.now();
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    // Deliberately omit query strings, headers, bodies, profiles, and credentials.
    const endpoint = new URL(raw).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id');
    let status = 0;
    try { const response = await fetch(input, init); status = response.status; return response; }
    finally { console.info('PROXYCON_PERF ' + JSON.stringify({ id, kind:'fetch', endpoint, method:init?.method || 'GET', status, ms:Math.round((performance.now()-started)*10)/10 })); }
  };
}
export async function profile<T>(name: string, work: () => Promise<T>): Promise<T> {
  if (!performanceEnabled()) return work();
  const id = await requestPerformanceId();
  const started = performance.now();
  try { return await work(); }
  finally { console.info('PROXYCON_PERF ' + JSON.stringify({ id, kind:'function', name, ms:Math.round((performance.now()-started)*10)/10 })); }
}
