import Link from 'next/link';
import {cookies} from 'next/headers';
import { RecoveryForm } from '@/components/auth/recovery-form';
import { safeNext } from '@/lib/continuation';
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        next?: string;
    }>;
}) { const q = await searchParams; const valid=(await cookies()).get('proxycon-recovery')?.value==='1';if(!valid)return <main className="page form-page task-page"><h1>Recovery link expired</h1><p>This recovery link expired or has already been used.</p><Link className="text-link" href={'/login/forgot-password?next='+encodeURIComponent(safeNext(q.next))}>Request another link →</Link></main>; return <main className="page form-page task-page"><h1>Choose a new password</h1><RecoveryForm reset={true} next={safeNext(q.next)}/></main>; }
