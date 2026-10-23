'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';

function subscribe(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

export function LiveRefresh() {
  const router = useRouter();
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

  useEffect(() => {
    const refresh = () => {
      if (navigator.onLine && !document.hidden && !document.querySelector('input:focus, textarea:focus, select:focus, [role="dialog"], [data-editing-result="true"]')) {
        router.refresh();
      }
    };
    const timer = window.setInterval(refresh, 20000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [router]);

  if (online) return null;

  return (
    <div className="live-refresh-status" role="status">
      <span>Connection interrupted · results may be out of date</span>
      <button type="button" onClick={() => router.refresh()}>Retry</button>
    </div>
  );
}
