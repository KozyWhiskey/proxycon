'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(userId: string) {
  // Next.js 16 requires await cookies()
  const cookieStore = await cookies();
  cookieStore.set({
    name: 'proxycon_user_id',
    value: userId,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // One week
    path: '/',
  });

  redirect('/');
}
