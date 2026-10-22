'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (!document.hidden && !document.querySelector('input:focus, textarea:focus, select:focus, [role="dialog"]')) router.refresh(); };
    const timer = window.setInterval(refresh, 20000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [router]);
  return null;
}
