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
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="font-heading">My Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tournament Placements - Major Focus */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-heading">
            Tournament Victories
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {/* 1st Place */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center group transition-colors hover:bg-primary/15">
              <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-widest font-heading font-bold">
                1st Place
              </div>
              <div className="text-5xl font-bold text-primary leading-none text-glow">
                {tournamentFirstPlace}
              </div>
            </div>
            {/* 2nd Place */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center group transition-colors hover:bg-white/10">
              <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-widest font-heading font-bold">
                2nd Place
              </div>
              <div className="text-5xl font-bold text-zinc-300 leading-none">
                {tournamentSecondPlace}
              </div>
            </div>
            {/* 3rd Place */}
            <div className="bg-amber-900/10 border border-amber-900/30 rounded-lg p-4 text-center group transition-colors hover:bg-amber-900/15">
              <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-widest font-heading font-bold">
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
          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-heading">
                  Tournament Record
                </p>
                <p className="text-2xl font-bold text-foreground font-mono">
                  {tournamentWins}-{tournamentLosses}-{tournamentDraws}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-heading">
                  Win Rate
                </p>
                <p className="text-2xl font-bold text-primary text-glow font-mono">
                  {tournamentWinRate}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Casual Wins - List View */}
        {casualWins > 0 && (
          <div className="pt-4 border-t border-white/5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3 font-heading">
              Casual Wins ({casualWins})
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
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
                    className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-md border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-wrap text-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary border-glow"></div>
                      <span className="text-sm font-semibold font-heading tracking-wide">
                        {formatGameType(win.gameType)}
                      </span>
                      {showOpponents && (
                        <span className="text-xs text-muted-foreground">
                          vs {win.opponents?.join(', ')}
                        </span>
                      )}
                      {showBoardGameName && (
                        <span className="text-xs text-muted-foreground">
                          {win.boardGameName}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
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