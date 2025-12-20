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
      <Label className="text-base">Select Participants</Label>
      <div className="grid grid-cols-2 gap-3">
        {players.map((player) => {
          const isSelected = selectedPlayers.includes(player.id);
          return (
            <Card
              key={player.id}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary bg-primary/20 border-glow'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
              onClick={() => handleToggle(player.id)}
            >
              <div className="p-4 h-16 flex items-center justify-between">
                <span className={`font-medium ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>
                  {player.display_name || player.username || 'Unknown'}
                </span>
                <div
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-white/20'
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-white"
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
      <p className="text-sm text-muted-foreground">
        {selectedPlayers.length} player{selectedPlayers.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
}
