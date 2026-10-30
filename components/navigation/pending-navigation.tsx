'use client';
import { useLinkStatus } from 'next/link';
import { LoaderCircle } from 'lucide-react';

/** Immediate link feedback without replacing the working screen with a Suspense fallback. */
export function PendingNavigation() {
  const { pending } = useLinkStatus();
  return pending ? <span role="status" className="absolute right-1 top-1"><LoaderCircle size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /><span className="sr-only">Opening…</span></span> : null;
}
