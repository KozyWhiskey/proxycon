'use server';
import { headers, cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { safeNext } from '@/lib/continuation';
export async function requestRecovery(email: string, next: string) {
    const h = await headers();
    const origin = process.env.PROXYCON_HOUSE_URL || h.get('origin');
    if (!origin)
        return { success: false, message: 'Open the app from its house address and try again.' };
    const supabase = await createClient();
    const redirectTo = new URL('/auth/callback', origin);
    redirectTo.searchParams.set('next', '/auth/reset-password?next=' + encodeURIComponent(safeNext(next)));
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo.toString() });
    return error ? { success: false, message: 'Could not send the recovery email. Try again.' } : { success: true, message: 'If this address has an email account, a recovery link is on its way.' };
}
export async function resetRecoveredPassword(password: string) {
    const jar = await cookies();
    if (jar.get('proxycon-recovery')?.value !== '1')
        return { success: false, message: 'This recovery link expired. Request another link.' };
    if (password.length < 8)
        return { success: false, message: 'Use at least 8 characters.' };
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error)
        return { success: false, message: 'This recovery link expired or could not be used. Request another link.' };
    jar.set('proxycon-recovery', '', { path: '/auth', maxAge: 0 });
    return { success: true, message: 'Password updated.' };
}
