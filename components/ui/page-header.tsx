'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  showBackButton = true,
  backHref = '/',
  backLabel = 'Dashboard',
  actions,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Back/Home Button */}
          {showBackButton && (
            <Button
              onClick={handleBack}
              variant="ghost"
              size="icon"
              className="h-12 w-12 flex-shrink-0 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              aria-label={backLabel}
            >
              {backHref === '/' ? (
                <Home className="w-5 h-5" />
              ) : (
                <ArrowLeft className="w-5 h-5" />
              )}
            </Button>
          )}

          {/* Title Section */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-slate-400 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Actions Section */}
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

