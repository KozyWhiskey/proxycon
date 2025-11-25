'use client';

import { useState } from 'react';
import { deleteTournament } from '@/app/tournament/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  created_at: string;
  max_rounds: number | null;
}

interface TournamentManagementListProps {
  pendingTournaments: Tournament[];
  activeTournaments: Tournament[];
  completedTournaments: Tournament[];
}

export default function TournamentManagementList({
  pendingTournaments,
  activeTournaments,
  completedTournaments,
}: TournamentManagementListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (tournamentId: string, tournamentName: string) => {
    if (!confirm(`Are you sure you want to delete "${tournamentName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(tournamentId);

    try {
      const result = await deleteTournament(tournamentId);

      if (!result.success) {
        toast.error(result.message || 'Failed to delete tournament');
        setDeletingId(null);
        return;
      }

      toast.success('Tournament deleted successfully');
      router.refresh();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast.error('An unexpected error occurred');
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500';
      case 'active':
        return 'text-green-500';
      case 'completed':
        return 'text-slate-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const renderTournamentCard = (tournament: Tournament) => {
    const isDeleting = deletingId === tournament.id;

    return (
      <Card key={tournament.id} className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-100">{tournament.name}</CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                {tournament.format} • {tournament.max_rounds || '?'} rounds
              </p>
            </div>
            <span className={`text-sm font-semibold ${getStatusColor(tournament.status)}`}>
              {getStatusLabel(tournament.status)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">Created: {formatDate(tournament.created_at)}</p>
          <div className="flex gap-2">
            {tournament.status === 'pending' && (
              <Button
                asChild
                variant="outline"
                className="flex-1 border-slate-700 text-slate-100 hover:bg-slate-800"
              >
                <Link href={`/tournament/${tournament.id}/seating`}>
                  Continue Setup
                </Link>
              </Button>
            )}
            {(tournament.status === 'active' || tournament.status === 'completed') && (
              <Button
                asChild
                variant="outline"
                className="flex-1 border-slate-700 text-slate-100 hover:bg-slate-800"
              >
                <Link href={`/tournament/${tournament.id}`}>
                  View Tournament
                </Link>
              </Button>
            )}
            <Button
              onClick={() => handleDelete(tournament.id, tournament.name)}
              disabled={isDeleting}
              variant="outline"
              className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Pending Tournaments */}
      {pendingTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-100">Pending Tournaments</h2>
          <p className="text-sm text-slate-400">
            Tournaments that haven't started yet. Complete seat selection to begin.
          </p>
          <div className="space-y-3">
            {pendingTournaments.map(renderTournamentCard)}
          </div>
        </div>
      )}

      {/* Active Tournaments */}
      {activeTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-100">Active Tournaments</h2>
          <p className="text-sm text-slate-400">Tournaments currently in progress.</p>
          <div className="space-y-3">
            {activeTournaments.map(renderTournamentCard)}
          </div>
        </div>
      )}

      {/* Completed Tournaments */}
      {completedTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-100">Completed Tournaments</h2>
          <p className="text-sm text-slate-400">Finished tournaments.</p>
          <div className="space-y-3">
            {completedTournaments.map(renderTournamentCard)}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingTournaments.length === 0 &&
        activeTournaments.length === 0 &&
        completedTournaments.length === 0 && (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <p className="text-slate-400 text-center">No tournaments found.</p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

