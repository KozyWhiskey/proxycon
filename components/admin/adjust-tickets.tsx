'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adjustTickets } from '@/app/admin/actions';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

interface Player {
  id: string;
  name: string;
  nickname: string | null;
  tickets: number;
}

export default function AdjustTickets() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPlayers() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('players')
        .select('id, name, nickname, tickets')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching players:', error);
        toast.error('Failed to load players');
      } else {
        setPlayers(data || []);
      }
      setIsLoading(false);
    }

    fetchPlayers();
  }, []);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  const handleSubmit = async () => {
    if (!selectedPlayerId || !amount) {
      toast.error('Please select a player and enter an amount');
      return;
    }

    const amountNum = parseInt(amount, 10);
    if (isNaN(amountNum)) {
      toast.error('Amount must be a valid number');
      return;
    }

    setIsSubmitting(true);
    const result = await adjustTickets(selectedPlayerId, amountNum);

    if (result.success) {
      toast.success(result.message || 'Tickets adjusted successfully');
      setSelectedPlayerId('');
      setAmount('');
      // Refresh players
      const supabase = createClient();
      const { data } = await supabase
        .from('players')
        .select('id, name, nickname, tickets')
        .order('name', { ascending: true });
      if (data) {
        setPlayers(data);
      }
    } else {
      toast.error(result.message || 'Failed to adjust tickets');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6">
          <p className="text-slate-400 text-center">Loading players...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">Adjust Tickets</CardTitle>
        <CardDescription className="text-slate-400">
          Add or subtract tickets from a player's balance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-slate-100">Select Player</Label>
          <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
            <SelectTrigger className="w-full h-12 bg-slate-800 border-slate-700 text-slate-100">
              <SelectValue placeholder="Choose a player..." />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.nickname || player.name} ({player.tickets || 0} tickets)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPlayer && (
          <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-400">Current Balance:</p>
            <p className="text-2xl font-bold text-yellow-500">
              {selectedPlayer.tickets || 0} tickets
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-slate-100">Amount</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., +100 or -50"
            className="h-12 bg-slate-800 border-slate-700 text-slate-100"
          />
          <p className="text-xs text-slate-400">
            Enter positive number to add, negative to subtract
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedPlayerId || !amount || isSubmitting}
          className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold disabled:opacity-50"
        >
          {isSubmitting ? 'Updating...' : 'Adjust Tickets'}
        </Button>
      </CardContent>
    </Card>
  );
}

