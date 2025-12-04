'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MyStatsProps {
  casualWins: number;
  tournamentWins: number;
  tournamentLosses: number;
  tournamentDraws: number;
  tournamentWinRate: string;
}

export default function MyStats({
  casualWins,
  tournamentWins,
  tournamentLosses,
  tournamentDraws,
  tournamentWinRate,
}: MyStatsProps) {
  const tournamentTotalMatches =
    tournamentWins + tournamentLosses + tournamentDraws;

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">My Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tournament Wins and Casual Wins - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-400 mb-1">Tournament Wins</p>
            <p className="text-4xl font-bold text-yellow-500">{tournamentWins}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Casual Wins</p>
            <p className="text-4xl font-bold text-green-500">{casualWins}</p>
          </div>
        </div>

        {/* Tournament Record */}
        {tournamentTotalMatches > 0 ? (
          <div className="pt-4 border-t border-slate-800">
            <p className="text-sm text-slate-400 mb-3">Tournament Record</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Record</span>
                <span className="text-xl font-bold text-slate-100">
                  {tournamentWins}-{tournamentLosses}-{tournamentDraws}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Win Rate</span>
                <span className="text-lg font-semibold text-yellow-500">
                  {tournamentWinRate}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-800">
            <p className="text-sm text-slate-500">No tournament matches yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
