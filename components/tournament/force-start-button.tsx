'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { forceStartRound1 } from '@/app/tournament/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function ForceStartButton({ tournamentId }: { tournamentId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleForceStart = async () => {
    setIsSubmitting(true);
    try {
      const result = await forceStartRound1(tournamentId);
      if (result.success) {
        toast.success('Round 1 force started');
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to start round');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button 
      onClick={handleForceStart} 
      disabled={isSubmitting}
      variant="secondary"
      className="mt-4"
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isSubmitting ? 'animate-spin' : ''}`} />
      Force Start Round 1
    </Button>
  );
}
