'use client';

import React from 'react';
import { login } from './actions';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Define the type for a player
interface Player {
  id: string;
  name: string;
  nickname?: string | null;
  avatar_url?: string | null;
  color?: string | null;
  created_at: string;
}

interface PlayerSelectionGridProps {
  players: Player[];
}

// Generate initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

import { COLOR_CLASSES } from '@/lib/player-colors';

// Generate a color based on the player's name (consistent color per player)
// Used as fallback when no color is assigned
function getPlayerColorFromHash(name: string): string {
  const colors = Object.values(COLOR_CLASSES);
  
  // Simple hash function to consistently assign colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get player color class - uses stored color if available, otherwise falls back to hash-based
function getPlayerColor(color: string | null | undefined, name: string): string {
  if (color && COLOR_CLASSES[color]) {
    return COLOR_CLASSES[color];
  }
  return getPlayerColorFromHash(name);
}

export default function PlayerSelectionGrid({ players }: PlayerSelectionGridProps) {
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const handlePlayerClick = async (playerId: string) => {
    if (loadingId) return;
    
    try {
      setLoadingId(playerId);
      await login(playerId);
      toast.success('Welcome back!');
    } catch (error) {
      // Handle redirect error (it's expected)
      if (error && typeof error === 'object' && 'digest' in error) {
        const digest = (error as { digest?: string }).digest;
        if (digest?.startsWith('NEXT_REDIRECT')) {
          return; // Redirect is expected, don't show error
        }
      }
      toast.error('Failed to login. Please try again.');
      setLoadingId(null);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
      {players.map((player) => {
        const displayName = player.nickname || player.name;
        const initials = getInitials(player.name);
        const colorClass = getPlayerColor(player.color, player.name);
        const isLoading = loadingId === player.id;
        const isDisabled = !!loadingId && !isLoading;

        return (
          <Card
            key={player.id}
            className={`
              transition-all duration-200
              bg-slate-900 border-slate-800
              hover:border-yellow-500/50 hover:shadow-xl hover:shadow-yellow-500/10
              active:scale-[0.98]
              ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              ${isLoading ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/20' : ''}
            `}
          >
            <button
              type="button"
              onClick={() => handlePlayerClick(player.id)}
              disabled={isDisabled}
              aria-label={`Login as ${displayName}`}
              className="w-full h-40 sm:h-44 flex flex-col items-center justify-center p-6 gap-3 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              {/* Avatar */}
              <div className={`
                w-16 h-16 sm:w-20 sm:h-20 rounded-full
                flex items-center justify-center
                border-2
                ${colorClass}
                transition-all duration-200
                ${isLoading ? 'animate-pulse' : ''}
              `}>
                {player.avatar_url ? (
                  <img
                    src={player.avatar_url}
                    alt={displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xl sm:text-2xl font-bold">
                    {initials}
                  </span>
                )}
              </div>

              {/* Name */}
              <div className="text-center space-y-1">
                <h3 className="text-base sm:text-lg font-semibold text-slate-100 leading-tight">
                  {displayName}
                </h3>
                {player.nickname && player.name !== player.nickname && (
                  <p className="text-xs text-slate-500">{player.name}</p>
                )}
              </div>

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 text-yellow-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-medium">Loading...</span>
                </div>
              )}
            </button>
          </Card>
        );
      })}
    </div>
  );
}
