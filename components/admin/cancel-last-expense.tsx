'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { deleteLastExpense } from '@/app/admin/actions';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

interface LastExpense {
  id: string;
  description: string;
  amount: number;
  created_at: string;
  payer: {
    name: string;
    nickname: string | null;
  };
}

export default function CancelLastExpense() {
  const [lastExpense, setLastExpense] = useState<LastExpense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchLastExpense() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ledger')
        .select('id, description, amount, created_at, payer_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        setLastExpense(null);
        setIsLoading(false);
        return;
      }

      // Fetch payer info
      const { data: payer } = await supabase
        .from('players')
        .select('name, nickname')
        .eq('id', data.payer_id)
        .single();

      setLastExpense({
        ...data,
        payer: payer || { name: 'Unknown', nickname: null },
      });
      setIsLoading(false);
    }

    fetchLastExpense();
  }, []);

  const handleDelete = async () => {
    if (!lastExpense) return;

    setIsDeleting(true);
    const result = await deleteLastExpense();

    if (result.success) {
      toast.success(result.message || 'Last expense deleted successfully');
      setLastExpense(null);
    } else {
      toast.error(result.message || 'Failed to delete expense');
    }
    setIsDeleting(false);
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6">
          <p className="text-slate-400 text-center">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!lastExpense) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Cancel Last Expense</CardTitle>
          <CardDescription className="text-slate-400">
            Delete the most recent ledger entry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-center">No ledger entries found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">Cancel Last Expense</CardTitle>
        <CardDescription className="text-slate-400">
          Delete the most recent ledger entry
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
          <p className="text-sm text-slate-400 mb-1">Last Entry:</p>
          <p className="text-lg font-semibold text-slate-100">
            {lastExpense.description}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Paid by: {lastExpense.payer.nickname || lastExpense.payer.name}
            </span>
            <span className="text-lg font-bold text-rose-500">
              ${lastExpense.amount}
            </span>
          </div>
        </div>

        <Button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-semibold disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete Last Entry'}
        </Button>
      </CardContent>
    </Card>
  );
}

