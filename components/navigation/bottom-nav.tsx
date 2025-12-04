'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Play, Trophy, Menu, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/',
      icon: Home,
      label: 'Home',
    },
    {
      href: '/play/casual',
      icon: Play,
      label: 'Play',
    },
    {
      href: '/tournament/new',
      icon: Trophy,
      label: 'Draft',
    },
    {
      href: '/tournaments',
      icon: Menu,
      label: 'Tournaments',
    },
    {
      href: '/weekend-summary',
      icon: BarChart3,
      label: 'Summary',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800">
      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 transition-colors',
                  isActive
                    ? 'text-yellow-500 bg-yellow-500/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
