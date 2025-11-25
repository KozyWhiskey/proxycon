'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function RoundGeneratedToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roundGenerated = searchParams.get('roundGenerated');

  useEffect(() => {
    if (roundGenerated === 'true') {
      toast.success('Next round has been generated!', {
        duration: 3000,
      });
      
      // Clean up the URL parameter
      const newUrl = window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [roundGenerated, router]);

  return null;
}

