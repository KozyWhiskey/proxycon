'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Theme = 'light' | 'dark' | 'system';
const key = 'proxycon-theme';

function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key !== key) return;
    document.documentElement.dataset.theme = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'system';
    listener();
  };
  window.addEventListener('storage', storage);
  window.addEventListener('themechange', listener);
  return () => { window.removeEventListener('storage', storage); window.removeEventListener('themechange', listener); };
}

function snapshot(): Theme {
  const value = document.documentElement.dataset.theme;
  return value === 'light' || value === 'dark' ? value : 'system';
}

function applyTheme(value: Theme) {
  try { localStorage.setItem(key, value); } catch { /* Apply for this visit when storage is unavailable. */ }
  document.documentElement.dataset.theme = value;
  window.dispatchEvent(new Event('themechange'));
}

export function useResolvedTheme(): 'light' | 'dark' {
  return useSyncExternalStore<'light' | 'dark'>(listener => {
    const unsubscribe = subscribe(listener);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', listener);
    return () => { unsubscribe(); media.removeEventListener('change', listener); };
  }, () => document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light', () => 'light');
}

export function ThemeControl() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'system' as Theme);
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <div className="theme-control">
      <Icon size={16} aria-hidden />
      <Select value={theme} onValueChange={(value) => applyTheme(value as Theme)}>
        <SelectTrigger size="sm" aria-label="Appearance" className="theme-control-trigger h-11 min-h-11 w-auto gap-1.5 border-border bg-card px-2.5 text-foreground shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" className="bg-card text-foreground">
          <SelectItem value="system">System</SelectItem>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
