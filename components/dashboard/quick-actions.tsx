'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Play, ShoppingBag, Receipt, Trophy } from 'lucide-react';

export default function QuickActions() {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          asChild
          className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
        >
          <Link href="/tournament/new">
            <Plus className="w-5 h-5 mr-2" />
            New Tournament
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full h-12 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
        >
          <Link href="/play/casual">
            <Play className="w-5 h-5 mr-2" />
            Log Casual Game
          </Link>
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button
            asChild
            variant="outline"
            className="h-12 border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Link href="/tournaments">
              <Trophy className="w-4 h-4 mr-2" />
              Manage
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Link href="/shop">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Prize Wall
            </Link>
          </Button>
        </div>
        <Button
          asChild
          variant="outline"
          className="w-full h-12 border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          <Link href="/ledger">
            <Receipt className="w-4 h-4 mr-2" />
            Ledger
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

