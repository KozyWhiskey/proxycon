'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MyStatsProps {
  wins: number;
}

export default function MyStats({ wins }: MyStatsProps) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">My Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <p className="text-sm text-slate-400 mb-1">Weekend Wins</p>
          <p className="text-4xl font-bold text-yellow-500">{wins}</p>
        </div>
      </CardContent>
    </Card>
  );
}
