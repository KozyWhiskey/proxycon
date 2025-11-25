'use client';

import React from 'react';
import { login } from './actions';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

// Define the type for a player
interface Player {
  id: string;
  name: string;
  nickname?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

interface PlayerSelectionGridProps {
  players: Player[];
}

export default function PlayerSelectionGrid({ players }: PlayerSelectionGridProps) {
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const handlePlayerClick = async (playerId: string) => {
    if (loadingId) return;
    try {
      setLoadingId(playerId);
      await login(playerId);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-4xl px-4">
      {players.map((player) => (
        <Card 
          key={player.id} 
          className="transition-all bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg"
        >
          <button
            type="button"
            onClick={() => handlePlayerClick(player.id)}
            disabled={!!loadingId}
            aria-label={`Login as ${player.name}`}
            className="w-full h-32 min-h-[48px] flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            <CardHeader className="p-4">
              <CardTitle className="text-center text-lg font-semibold text-slate-100">
                {player.nickname || player.name}
              </CardTitle>
              {player.nickname && player.name !== player.nickname && (
                <p className="text-center text-sm text-slate-400 mt-1">{player.name}</p>
              )}
            </CardHeader>
          </button>
        </Card>
      ))}
    </div>
  );
}
