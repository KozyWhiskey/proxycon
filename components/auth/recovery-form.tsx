'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { requestRecovery, resetRecoveredPassword } from '@/app/login/recovery-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export function RecoveryForm({ reset = false, next = '/' }: {
    reset?: boolean;
    next?: string;
}) {
    const [message, setMessage] = useState('');
    const [pending, setPending] = useState(false);
    const [sent, setSent] = useState(false);
    const [show, setShow] = useState(false);
    const router = useRouter();
    return <form className="panel space-y-4" onSubmit={async (e) => { e.preventDefault(); const data = new FormData(e.currentTarget); setPending(true); try {
        if (reset && data.get('password') !== data.get('confirm')) {
            setMessage('Passwords must match.');
            return;
        }
        const result = reset ? await resetRecoveredPassword(String(data.get('password'))) : await requestRecovery(String(data.get('email')), next);
        setMessage(result.message);
        if (result.success) {
            if (reset)
                router.push(next);
            else
                setSent(true);
        }
    }
    catch {
        setMessage('Could not connect. Your entry is still here; try again.');
    }
    finally {
        setPending(false);
    } }}>
    {!sent && (reset ? <><label className="grid gap-2">New password<Input name="password" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={8} required/></label><label className="grid gap-2">Confirm password<Input name="confirm" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={8} required/></label><button type="button" className="text-link min-h-11" aria-pressed={show} onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'} passwords</button></> : <label className="grid gap-2">Email<Input name="email" type="email" autoComplete="email" required/></label>)}
    {message && <p role="status">{message}</p>}{!sent && <Button disabled={pending}>{pending ? 'Saving…' : reset ? 'Update password' : 'Send recovery link'}</Button>}<Link className="block text-link" href={'/login?next=' + encodeURIComponent(next)}>Back to sign in</Link>{reset && <Link href={'/login/forgot-password?next=' + encodeURIComponent(next)}>Request another link</Link>}</form>;
}
