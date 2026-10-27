import Link from 'next/link';
export function Brand() {
  return <Link href="/events" className="brand" aria-label="ProxyCon events"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>ProxyCon<span className="brand-period">.</span></span></Link>;
}
