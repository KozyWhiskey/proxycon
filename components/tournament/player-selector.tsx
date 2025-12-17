'use client';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface Player {
  id: string;
  display_name: string | null;
  username: string | null;
}

interface PlayerSelectorProps {
  players: Player[];
  selectedPlayers: string[];
  onSelectionChange: (playerIds: string[]) => void;
}

export default function PlayerSelector({
  players,
  selectedPlayers,
  onSelectionChange,
}: PlayerSelectorProps) {
  const handleToggle = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      onSelectionChange(selectedPlayers.filter((id) => id !== playerId));
    } else {
      onSelectionChange([...selectedPlayers, playerId]);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-slate-100 text-base">Select Participants</Label>
      <div className="grid grid-cols-2 gap-3">
        {players.map((player) => {
          const isSelected = selectedPlayers.includes(player.id);
          return (
            <Card
              key={player.id}
              className={`cursor-pointer transition-all bg-slate-900 border-slate-800 hover:border-yellow-500/50 ${
                isSelected
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'hover:bg-slate-800'
              }`}
              onClick={() => handleToggle(player.id)}
            >
              <div className="p-4 h-16 flex items-center justify-between">
                <span className="text-slate-100 font-medium">
                  {player.display_name || player.username || 'Unknown'}
                </span>
                <div
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                    isSelected
                      ? 'bg-yellow-500 border-yellow-500'
                      : 'border-slate-600'
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-slate-950"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="text-sm text-slate-400">
        {selectedPlayers.length} player{selectedPlayers.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
}