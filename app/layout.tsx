import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { Toaster } from '@/components/ui/toaster';
const body = localFont({ src: '../public/fonts/manrope.woff2', variable: '--font-body', weight: '400 700', display: 'swap' });
const display = localFont({ src: '../public/fonts/fraunces.woff2', variable: '--font-display', weight: '400 700', display: 'swap' });
const data = localFont({ src: [{ path: '../public/fonts/ibm-plex-mono-400.woff2', weight: '400' }, { path: '../public/fonts/ibm-plex-mono-500.woff2', weight: '500' }], variable: '--font-data', display: 'swap' });
export const metadata: Metadata = { title: 'ProxyCon', description: 'Events, tables, and results for one Magic playgroup.', other: /^[a-f0-9]{40,64}$/i.test(process.env.VERCEL_GIT_COMMIT_SHA || '') ? { 'proxycon-revision': process.env.VERCEL_GIT_COMMIT_SHA! } : undefined };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${body.variable} ${display.variable} ${data.variable}`} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('proxycon-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:'system'}catch(e){document.documentElement.dataset.theme='system'}` }} /></head><body className="font-sans antialiased"><AppShell>{children}</AppShell><Toaster /></body></html>;
}
