'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/app/weekend/actions';

export function ActButton({
  label,
  action,
  variant = 'default',
  pendingLabel,
  returnTo,
  disabled=false,
}: {
  label: string;
  action: () => Promise<ActionResult>;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  pendingLabel?: string;
  returnTo?: string;
  disabled?:boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      disabled={pending||disabled}
      className="font-heading"
      onClick={() => {
        start(async () => {
          try {
            const result = await action();
            if (!result.success) toast.error(result.message || 'That did not save.');
            else if (result.message) toast.success(result.message);
            if (result.success && returnTo) router.push(returnTo);
            else if (result.success) router.refresh();
          } catch { toast.error('Could not save. Check your connection and try again.'); }
        });
      }}
    >
      {pending ? pendingLabel || 'Saving…' : label}
    </Button>
  );
}

export function useAction({ refreshOnSuccess = true }: { refreshOnSuccess?: boolean } = {}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<ActionResult>) {
    setPending(true);
    try {
      const result = await action();
      if (!result.success) toast.error(result.message || 'That did not save.');
      else if (result.message) toast.success(result.message);
      if (result.success && refreshOnSuccess) router.refresh();
      return result;
    } catch {
      const result = { success: false, message: 'Could not save. Check your connection and try again.' };
      toast.error(result.message);
      return result;
    } finally { setPending(false); }
  }

  return { pending, run };
}
