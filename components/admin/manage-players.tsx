'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addPlayer, updatePlayer, deletePlayer } from '@/app/admin/actions';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { 
  AVAILABLE_COLORS, 
  COLOR_DISPLAY_NAMES, 
  getColorClass,
  isGuild 
} from '@/lib/player-colors';

interface Player {
  id: string;
  name: string;
  nickname: string | null;
  avatar_url: string | null;
  color: string | null;
  wins: number;
}

export default function ManagePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    avatar_url: '',
    color: undefined as string | undefined,
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    try {
      const supabase = createClient();
      // Try to fetch with color column, but handle gracefully if it doesn't exist
      const { data, error } = await supabase
        .from('players')
        .select('id, name, nickname, avatar_url, color, wins')
        .order('name', { ascending: true });

      if (error) {
        // If error is about missing column, try without it
        if (error.message.includes('column') && error.message.includes('color')) {
          console.warn('Color column not found, fetching without it');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('players')
            .select('id, name, nickname, avatar_url, wins')
            .order('name', { ascending: true });
          
          if (fallbackError) {
            console.error('Error fetching players:', fallbackError);
            toast.error('Failed to load players');
            setPlayers([]);
          } else {
            // Add null color to each player
            setPlayers((fallbackData || []).map(p => ({ ...p, color: null })));
          }
        } else {
          console.error('Error fetching players:', error);
          toast.error('Failed to load players');
          setPlayers([]);
        }
      } else {
        setPlayers(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching players:', err);
      toast.error('Failed to load players');
      setPlayers([]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleAdd = () => {
    setEditingPlayer(null);
    setFormData({ name: '', nickname: '', avatar_url: '', color: undefined });
    setIsDialogOpen(true);
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name || '',
      nickname: player.nickname || '',
      avatar_url: player.avatar_url || '',
      color: player.color || undefined,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (player: Player) => {
    setDeletingPlayer(player);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSubmitting(true);
    let result;

    if (editingPlayer) {
      result = await updatePlayer(editingPlayer.id, {
        name: formData.name.trim(),
        nickname: formData.nickname.trim() || null,
        avatar_url: formData.avatar_url.trim() || null,
        color: formData.color?.trim() || null,
      });
    } else {
      result = await addPlayer({
        name: formData.name.trim(),
        nickname: formData.nickname.trim() || null,
        avatar_url: formData.avatar_url.trim() || null,
        color: formData.color?.trim() || null,
      });
    }

    if (result.success) {
      toast.success(result.message || 'Player saved successfully');
      setIsDialogOpen(false);
      fetchPlayers();
    } else {
      toast.error(result.message || 'Failed to save player');
    }
    setIsSubmitting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPlayer) return;

    setIsSubmitting(true);
    const result = await deletePlayer(deletingPlayer.id);

    if (result.success) {
      toast.success(result.message || 'Player deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingPlayer(null);
      fetchPlayers();
    } else {
      toast.error(result.message || 'Failed to delete player');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6">
          <p className="text-slate-400 text-center">Loading players...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-100">Manage Players</CardTitle>
              <CardDescription className="text-slate-400">
                Add, edit, or remove players from the system
              </CardDescription>
            </div>
            <Button
              onClick={handleAdd}
              className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Player
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No players found</p>
          ) : (
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-slate-100 font-semibold truncate">
                        {player.nickname || player.name}
                      </p>
                      {player.color && (
                        <div
                          className={`w-5 h-5 rounded-full ${getColorClass(player.color) || ''}`}
                          title={COLOR_DISPLAY_NAMES[player.color] || player.color}
                        />
                      )}
                    </div>
                    <p className="text-sm text-slate-400 truncate">
                      {player.nickname && player.name !== player.nickname && player.name}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-slate-500">
                        {player.wins || 0} wins
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      onClick={() => handleEdit(player)}
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(player)}
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            // Reset form when dialog closes
            setEditingPlayer(null);
            setFormData({ name: '', nickname: '', avatar_url: '', color: undefined });
          }
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {editingPlayer ? 'Edit Player' : 'Add Player'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingPlayer
                ? 'Update player information'
                : 'Create a new player account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-100">Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                className="h-12 bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-100">Nickname</Label>
              <Input
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="Display name (optional)"
                className="h-12 bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-100">Avatar URL</Label>
              <Input
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                placeholder="https://example.com/avatar.jpg (optional)"
                className="h-12 bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-100">Color Theme</Label>
              <Select
                value={formData.color ?? 'auto'}
                onValueChange={(value) => {
                  setFormData({ ...formData, color: value === 'auto' ? undefined : value });
                }}
              >
                <SelectTrigger className="h-12 bg-slate-800 border-slate-700 text-slate-100">
                  <SelectValue placeholder="Auto (based on name)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-[400px]">
                  <SelectItem value="auto" className="text-slate-100 focus:bg-slate-700">
                    Auto (based on name)
                  </SelectItem>
                  
                  {/* Single Colors Section */}
                  <div className="px-2 py-1.5">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Single Colors
                    </div>
                    {AVAILABLE_COLORS.filter((color) => !isGuild(color)).map((color) => (
                      <SelectItem
                        key={color}
                        value={color}
                        className="text-slate-100 focus:bg-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full ${getColorClass(color) || ''} shrink-0`}
                          />
                          <span>{COLOR_DISPLAY_NAMES[color]}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </div>

                  {/* Guilds Section */}
                  <div className="px-2 py-1.5 border-t border-slate-700 mt-1">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Guilds (Two-Color)
                    </div>
                    {AVAILABLE_COLORS.filter((color) => isGuild(color)).map((color) => (
                      <SelectItem
                        key={color}
                        value={color}
                        className="text-slate-100 focus:bg-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full ${getColorClass(color) || ''} shrink-0`}
                          />
                          <span>{COLOR_DISPLAY_NAMES[color]}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Choose a color theme for the player's avatar. Leave as "Auto" to use automatic
                assignment based on name.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsDialogOpen(false)}
              variant="outline"
              disabled={isSubmitting}
              className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isSubmitting ? 'Saving...' : editingPlayer ? 'Update' : 'Add Player'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Delete Player</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete{' '}
              <strong className="text-slate-100">
                {deletingPlayer?.nickname || deletingPlayer?.name}
              </strong>
              ? This action cannot be undone and will remove all their tournament history,
              matches, and data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setIsDeleteDialogOpen(false)}
              variant="outline"
              disabled={isSubmitting}
              className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Player'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

