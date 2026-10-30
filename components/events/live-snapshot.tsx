'use client';

import { useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

import { SnapshotIdentity, publishReceipt, type SnapshotReceipt } from './snapshot-store';

/** A failed background retrieval must not replace the last committed page or its input state. */
export function LiveSnapshot({ children, fetchedAt, failed = false }: { children?: ReactNode; fetchedAt?: string; failed?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const identity = useContext(SnapshotIdentity);
  const [saved, setSaved] = useState({ path, at: fetchedAt, children });
  if (!failed && (saved.path !== path || saved.at !== fetchedAt)) setSaved({ path, at: fetchedAt, children });
  const available = saved.path === path && saved.children != null;
  useEffect(() => {
    const receipt: SnapshotReceipt = { identity, key: window.location.pathname + window.location.search, at: fetchedAt || '', success: !failed };
    publishReceipt(receipt);
  }, [identity, path, fetchedAt, failed]);
  if (failed && !available) return <main className="page form-page"><h1>Couldn’t load this page</h1><p role="alert">Check your connection and try again.</p><Button onClick={() => router.refresh()}>Retry</Button></main>;
  return available ? saved.children : children;
}
