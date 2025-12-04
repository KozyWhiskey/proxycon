'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { logCasualMatch } from '../actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  nickname: string | null;
}

interface RankedPlayer {
  id: string;
  name: string;
  nickname: string | null;
  position: number;
}

function SortablePlayerItem({
  player,
  position,
}: {
  player: Player;
  position: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const positionLabels = ['1st', '2nd', '3rd', '4th'];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-lg"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="text-slate-100 font-medium">
          {positionLabels[position]} - {player.nickname || player.name}
        </div>
      </div>
    </div>
  );
}

export default function CasualPlayPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [gameType, setGameType] = useState<'commander' | 'board_game'>('commander');
  const [outcomeType, setOutcomeType] = useState<'simple' | 'ranked'>('simple');
  const [simpleWinner, setSimpleWinner] = useState<string | null>(null);
  const [rankedPlayers, setRankedPlayers] = useState<RankedPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    async function fetchPlayers() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('players')
        .select('id, name, nickname')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching players:', error);
        toast.error('Failed to load players');
      } else {
        setPlayers(data || []);
      }
      setIsLoading(false);
    }

    fetchPlayers();
  }, []);

  // Update ranked players when selected players change
  useEffect(() => {
    if (outcomeType === 'ranked' && selectedPlayers.length > 0) {
      const selectedPlayerData = players.filter((p) =>
        selectedPlayers.includes(p.id)
      );
      setRankedPlayers(
        selectedPlayerData.map((p, index) => ({
          ...p,
          position: index,
        }))
      );
    } else {
      setRankedPlayers([]);
    }
  }, [selectedPlayers, outcomeType, players]);

  const handlePlayerToggle = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter((id) => id !== playerId));
      if (simpleWinner === playerId) {
        setSimpleWinner(null);
      }
    } else {
      if (selectedPlayers.length >= 4) {
        toast.error('Maximum 4 players allowed');
        return;
      }
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setRankedPlayers((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update positions
        return newItems.map((item, index) => ({
          ...item,
          position: index,
        }));
      });
    }
  };

  const handleSubmit = async () => {
    if (selectedPlayers.length < 2) {
      toast.error('Please select at least 2 players');
      return;
    }

    if (outcomeType === 'simple' && !simpleWinner) {
      toast.error('Please select a winner');
      return;
    }

    if (outcomeType === 'ranked' && rankedPlayers.length !== selectedPlayers.length) {
      toast.error('Please rank all players');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build results array
      const results: Array<{
        playerId: string;
        result: 'win' | 'loss' | '1st' | '2nd' | '3rd' | '4th';
      }> = [];

      if (outcomeType === 'simple') {
        selectedPlayers.forEach((playerId) => {
          results.push({
            playerId,
            result: playerId === simpleWinner ? 'win' : 'loss',
          });
        });
      } else {
        // Ranked
        rankedPlayers.forEach((player) => {
          const positionLabels: Record<number, '1st' | '2nd' | '3rd' | '4th'> = {
            0: '1st',
            1: '2nd',
            2: '3rd',
            3: '4th',
          };
          results.push({
            playerId: player.id,
            result: positionLabels[player.position] || '4th',
          });
        });
      }

      const result = await logCasualMatch({
        gameType,
        playerIds: selectedPlayers,
        outcomeType,
        results,
      });

      if (!result.success) {
        toast.error(result.message || 'Failed to log game');
        setIsSubmitting(false);
      }
      // If successful, the server action will redirect
    } catch (error) {
      // Check if this is a redirect error (expected behavior)
      if (error && typeof error === 'object' && 'digest' in error) {
        const digest = (error as { digest?: string }).digest;
        if (digest?.startsWith('NEXT_REDIRECT')) {
          // This is expected - redirect() throws to perform redirect
          toast.success('Game logged successfully!');
          return;
        }
      }

      console.error('Error submitting casual match:', error);
      toast.error('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <p className="text-slate-400 text-center">Loading...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 text-2xl">Log Casual Game</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Game Type Selection */}
            <div className="space-y-3">
              <Label className="text-slate-100 text-base">Game Type</Label>
              <Select
                value={gameType}
                onValueChange={(value: 'commander' | 'board_game') => {
                  setGameType(value);
                }}
              >
                <SelectTrigger className="w-full h-12 bg-slate-800 border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commander">Commander</SelectItem>
                  <SelectItem value="board_game">Board Game</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Player Selection */}
            <div className="space-y-3">
              <Label className="text-slate-100 text-base">
                Players ({selectedPlayers.length}/4)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {players.map((player) => {
                  const isSelected = selectedPlayers.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      onClick={() => handlePlayerToggle(player.id)}
                      disabled={isSubmitting}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                          : 'bg-slate-800 border-slate-700 text-slate-100 hover:border-emerald-500/50 hover:bg-slate-700'
                      } disabled:opacity-50`}
                    >
                      <div className="font-medium">
                        {player.nickname || player.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Outcome Type Tabs */}
            {selectedPlayers.length >= 2 && (
              <div className="space-y-3">
                <Label className="text-slate-100 text-base">Outcome</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setOutcomeType('simple');
                      setSimpleWinner(null);
                    }}
                    disabled={isSubmitting}
                    className={`flex-1 h-12 rounded-lg border-2 font-medium transition-all ${
                      outcomeType === 'simple'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                        : 'bg-slate-800 border-slate-700 text-slate-100 hover:border-emerald-500/50'
                    } disabled:opacity-50`}
                  >
                    Simple
                  </button>
                  <button
                    onClick={() => setOutcomeType('ranked')}
                    disabled={isSubmitting}
                    className={`flex-1 h-12 rounded-lg border-2 font-medium transition-all ${
                      outcomeType === 'ranked'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                        : 'bg-slate-800 border-slate-700 text-slate-100 hover:border-emerald-500/50'
                    } disabled:opacity-50`}
                  >
                    Ranked
                  </button>
                </div>

                {/* Simple Outcome */}
                {outcomeType === 'simple' && (
                  <div className="space-y-3 mt-4">
                    <Label className="text-slate-400 text-sm">Select Winner</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedPlayers.map((playerId) => {
                        const player = players.find((p) => p.id === playerId);
                        if (!player) return null;

                        const isWinner = simpleWinner === playerId;
                        return (
                          <button
                            key={playerId}
                            onClick={() => setSimpleWinner(playerId)}
                            disabled={isSubmitting}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              isWinner
                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
                                : 'bg-slate-800 border-slate-700 text-slate-100 hover:border-yellow-500/50'
                            } disabled:opacity-50`}
                          >
                            <div className="font-medium">
                              {player.nickname || player.name}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ranked Outcome */}
                {outcomeType === 'ranked' && rankedPlayers.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <Label className="text-slate-400 text-sm">
                      Drag to reorder (1st to 4th)
                    </Label>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={rankedPlayers.map((p) => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {rankedPlayers.map((player) => (
                            <SortablePlayerItem
                              key={player.id}
                              player={player}
                              position={player.position}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            {selectedPlayers.length >= 2 &&
              ((outcomeType === 'simple' && simpleWinner) ||
                (outcomeType === 'ranked' &&
                  rankedPlayers.length === selectedPlayers.length)) && (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Logging Game...' : 'Log Game'}
                </Button>
              )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
