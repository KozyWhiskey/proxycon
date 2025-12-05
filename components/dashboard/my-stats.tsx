'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CasualWinDetail {
  gameType: string;
  createdAt: string;
  boardGameName?: string | null;
  opponents?: string[];
}

interface MyStatsProps {
  casualWins: number;
  casualWinDetails: CasualWinDetail[];
  tournamentFirstPlace: number;
  tournamentSecondPlace: number;
  tournamentThirdPlace: number;
  tournamentWins: number;
  tournamentLosses: number;
  tournamentDraws: number;
  tournamentWinRate: string;
}

export default function MyStats({
  casualWins,
  casualWinDetails,
  tournamentFirstPlace,
  tournamentSecondPlace,
  tournamentThirdPlace,
  tournamentWins,
  tournamentLosses,
  tournamentDraws,
  tournamentWinRate,
}: MyStatsProps) {
  const tournamentTotalMatches =
    tournamentWins + tournamentLosses + tournamentDraws;

  const formatGameType = (gameType: string | null): string => {
    if (!gameType) return 'Casual';
    return gameType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const suffix =
      day % 10 === 1 && day !== 11
        ? 'st'
        : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
        ? 'rd'
        : 'th';

    const base = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    // Insert suffix (e.g., "Dec 5" -> "Dec 5th")
    return base.replace(`${day}`, `${day}${suffix}`);
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">My Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tournament Placements - Major Focus */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Tournament Victories
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {/* 1st Place */}
            <div className="bg-linear-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-lg p-4 text-center">
              <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">
                1st Place
              </div>
              <div className="text-5xl font-bold text-yellow-500 leading-none">
                {tournamentFirstPlace}
              </div>
            </div>
            {/* 2nd Place */}
            <div className="bg-linear-to-br from-slate-700/20 to-slate-600/10 border border-slate-600/30 rounded-lg p-4 text-center">
              <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">
                2nd Place
              </div>
              <div className="text-5xl font-bold text-slate-300 leading-none">
                {tournamentSecondPlace}
              </div>
            </div>
            {/* 3rd Place */}
            <div className="bg-linear-to-br from-amber-700/20 to-amber-800/10 border border-amber-700/30 rounded-lg p-4 text-center">
              <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">
                3rd Place
              </div>
              <div className="text-5xl font-bold text-amber-600 leading-none">
                {tournamentThirdPlace}
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Record - Secondary Focus */}
        {tournamentTotalMatches > 0 && (
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                  Tournament Record
                </p>
                <p className="text-2xl font-bold text-slate-100">
                  {tournamentWins}-{tournamentLosses}-{tournamentDraws}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                  Win Rate
                </p>
                <p className="text-2xl font-bold text-yellow-500">
                  {tournamentWinRate}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Casual Wins - List View */}
        {casualWins > 0 && (
          <div className="pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">
              Casual Wins ({casualWins})
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {casualWinDetails.map((win, index) => {
                const showOpponents =
                  win.gameType === 'commander' &&
                  Array.isArray(win.opponents) &&
                  win.opponents.length > 0;
                const showBoardGameName =
                  win.gameType === 'board_game' &&
                  win.boardGameName &&
                  win.boardGameName.trim().length > 0;

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-md border border-slate-700/50"
                  >
                    <div className="flex items-center gap-2 flex-wrap text-slate-200">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-semibold">
                        {formatGameType(win.gameType)}
                      </span>
                      {showOpponents && (
                        <span className="text-sm text-slate-400">
                          vs {win.opponents?.join(', ')}
                        </span>
                      )}
                      {showBoardGameName && (
                        <span className="text-sm text-slate-400">
                          {win.boardGameName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDate(win.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
