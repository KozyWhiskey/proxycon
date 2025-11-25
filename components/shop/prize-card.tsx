'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { purchasePrize } from '@/app/shop/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

interface Prize {
  id: string;
  name: string;
  cost: number;
  stock: number;
  image_url: string | null;
}

interface PrizeCardProps {
  prize: Prize;
  userTickets: number;
  userId: string;
}

export default function PrizeCard({ prize, userTickets, userId }: PrizeCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const router = useRouter();

  const isOutOfStock = prize.stock <= 0;
  const canAfford = userTickets >= prize.cost;
  const canPurchase = !isOutOfStock && canAfford;

  const handlePurchase = async () => {
    setIsPurchasing(true);

    try {
      const result = await purchasePrize(prize.id, userId);

      if (result.success) {
        // Trigger confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        toast.success(result.message || 'Purchase successful!');
        setIsDialogOpen(false);
        
        // Refresh the page data
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to purchase prize');
        setIsPurchasing(false);
      }
    } catch (error) {
      console.error('Error purchasing prize:', error);
      toast.error('An unexpected error occurred');
      setIsPurchasing(false);
    }
  };

  return (
    <>
      <Card
        className={`bg-slate-900 border-slate-800 overflow-hidden ${
          isOutOfStock ? 'opacity-50 grayscale' : ''
        }`}
      >
        {prize.image_url && (
          <div className="w-full h-48 bg-slate-800 overflow-hidden">
            <img
              src={prize.image_url}
              alt={prize.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-100 mb-1">
              {prize.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-sm font-medium border border-yellow-500/30">
                {prize.cost} tickets
              </span>
              {isOutOfStock && (
                <span className="px-3 py-1 bg-rose-500/20 text-rose-500 rounded-full text-sm font-medium border border-rose-500/30">
                  SOLD OUT
                </span>
              )}
            </div>
          </div>

          {!isOutOfStock && (
            <Button
              onClick={() => setIsDialogOpen(true)}
              disabled={!canPurchase}
              className={`w-full h-12 font-semibold ${
                canPurchase
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {canAfford ? 'Buy' : `Need ${prize.cost - userTickets} more tickets`}
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              Confirm Purchase
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to buy <strong className="text-slate-100">{prize.name}</strong> for{' '}
              <strong className="text-yellow-500">{prize.cost} tickets</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              onClick={() => setIsDialogOpen(false)}
              disabled={isPurchasing}
              variant="outline"
              className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
            >
              {isPurchasing ? 'Processing...' : 'Confirm Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

