import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { Toaster } from '@/components/ui/toaster';
export const metadata: Metadata = { title: 'ProxyCon', description: 'Events, tables, and results for one Magic playgroup.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('proxycon-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:'system'}catch(e){document.documentElement.dataset.theme='system'}` }} /></head><body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}><AppShell>{children}</AppShell><Toaster /></body></html>;
}
