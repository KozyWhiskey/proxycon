import { RecoveryForm } from '@/components/auth/recovery-form';
import { safeNext } from '@/lib/continuation';
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        next?: string;
    }>;
}) { const q = await searchParams; return <main className="page form-page task-page"><h1>Recover your account</h1><RecoveryForm reset={false} next={safeNext(q.next)}/></main>; }
