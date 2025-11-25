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

interface Player {
  id: string;
  name: string;
  nickname: string | null;
  avatar_url: string | null;
  wins: number;
  tickets: number;
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
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('players')
      .select('id, name, nickname, avatar_url, wins, tickets')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to load players');
    } else {
      setPlayers(data || []);
    }
    setIsLoading(false);
  }

  const handleAdd = () => {
    setEditingPlayer(null);
    setFormData({ name: '', nickname: '', avatar_url: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      nickname: player.nickname || '',
      avatar_url: player.avatar_url || '',
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
      });
    } else {
      result = await addPlayer({
        name: formData.name.trim(),
        nickname: formData.nickname.trim() || null,
        avatar_url: formData.avatar_url.trim() || null,
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
                    <p className="text-slate-100 font-semibold truncate">
                      {player.nickname || player.name}
                    </p>
                    <p className="text-sm text-slate-400 truncate">
                      {player.nickname && player.name !== player.nickname && player.name}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-slate-500">
                        {player.wins || 0} wins
                      </span>
                      <span className="text-xs text-yellow-500">
                        {player.tickets || 0} tickets
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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

