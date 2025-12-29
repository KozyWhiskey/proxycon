'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { requestToJoin } from '@/app/guilds/actions';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';

export function JoinRequestButton({ guildId }: { guildId: string }) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const handleRequest = () => {
    startTransition(async () => {
      const res = await requestToJoin(guildId);
      if (res.success) {
        toast.success(res.message || 'Request sent!');
        setSent(true);
      } else {
        toast.error(res.message || 'Failed to send request');
      }
    });
  };

  if (sent) {
    return (
      <Button disabled variant="secondary" className="w-full md:w-auto opacity-50">
        <Send className="w-4 h-4 mr-2" />
        Requested
      </Button>
    );
  }

  return (
    <Button 
      className="w-full md:w-auto font-heading" 
      onClick={handleRequest}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Send className="w-4 h-4 mr-2" />
      )}
      Request to Join
    </Button>
  );
}
