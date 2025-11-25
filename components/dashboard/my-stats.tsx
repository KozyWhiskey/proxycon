'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MyStatsProps {
  tickets: number;
  wins: number;
}

export default function MyStats({ tickets, wins }: MyStatsProps) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">My Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-slate-400 mb-1">Current Tickets</p>
          <p className="text-4xl font-bold text-yellow-500">{tickets}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400 mb-1">Weekend Wins</p>
          <p className="text-3xl font-semibold text-slate-100">{wins}</p>
        </div>
      </CardContent>
    </Card>
  );
}

