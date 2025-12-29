'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Play, User, Calendar, BarChart2, Shield } from 'lucide-react';
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
      href: '/guilds',
      icon: Shield,
      label: 'Guilds',
    },
    {
      href: '/play/casual',
      icon: Play,
      label: 'Play',
    },
    {
      href: '/stats',
      icon: BarChart2,
      label: 'Stats',
    },
    {
      href: '/profile',
      icon: User,
      label: 'Profile',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 border-t border-white/10 backdrop-blur-md pb-safe">
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
                  'flex flex-col items-center justify-center gap-1 transition-all duration-200',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]")} />
                <span className={cn("text-[10px] font-medium font-heading tracking-wide", isActive ? "text-primary" : "text-muted-foreground")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}