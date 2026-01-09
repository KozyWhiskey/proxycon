'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Trophy, Users, Calendar, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { deleteTournament, restoreTournament, permanentlyDeleteTournament } from '@/app/tournament/actions';

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  created_at: string;
  max_rounds: number | null;
  playerCount: number;
  currentRound: number | null;
  topStandings: Array<{
    rank: number;
    playerName: string;
    points: number;
    record: string;
  }>;
}

interface TournamentManagementListProps {
  pendingTournaments: Tournament[];
  activeTournaments: Tournament[];
  completedTournaments: Tournament[];
  archivedTournaments?: Tournament[];
}

export default function TournamentManagementList({
  pendingTournaments,
  activeTournaments,
  completedTournaments,
  archivedTournaments = [],
}: TournamentManagementListProps) {

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

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this tournament? It will be moved to the Archived section and can be restored later.')) return;
    const result = await deleteTournament(id);
    if (!result.success) alert(result.message);
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Restore this tournament?')) return;
    const result = await restoreTournament(id);
    if (!result.success) alert(result.message);
  };

  const handleDeletePermanently = async (id: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this tournament? This action cannot be undone.')) return;
    const result = await permanentlyDeleteTournament(id);
    if (!result.success) alert(result.message);
  };

  const renderTournamentCard = (tournament: Tournament, isArchived: boolean = false) => {
    return (
      <Card key={tournament.id} className={`glass-panel transition-colors ${isArchived ? 'opacity-75 border-dashed border-zinc-700' : 'hover:border-primary/50'}`}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-heading">{tournament.name}</CardTitle>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xs text-muted-foreground capitalize bg-white/5 px-2 py-0.5 rounded border border-white/5">{tournament.format}</span>
                <span className="text-muted-foreground/40">•</span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{tournament.playerCount} players</span>
                </div>
                {tournament.currentRound && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="text-xs text-primary font-medium">
                      Round {tournament.currentRound} of {tournament.max_rounds || '?'}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm border ${
              tournament.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
              tournament.status === 'active' ? 'bg-primary/10 text-primary border-primary/20 text-glow' :
              'bg-white/5 text-muted-foreground border-white/10'
            }`}>
              {getStatusLabel(tournament.status)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Standings Section */}
          {tournament.topStandings.length > 0 && (
            <div className="pt-2 border-t border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground font-heading uppercase tracking-wide">
                  {tournament.status === 'completed' ? 'Final Results' : 'Current Standings'}
                </span>
              </div>
              <div className="space-y-2">
                {tournament.topStandings.map((standing) => (
                  <div
                    key={standing.rank}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      standing.rank === 1 ? 'bg-primary/10 border border-primary/20' :
                      standing.rank === 2 ? 'bg-white/5 border border-white/10' :
                      standing.rank === 3 ? 'bg-amber-900/10 border border-amber-900/20' :
                      'bg-transparent border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold w-6 text-center">
                        {standing.rank === 1 && '🥇'}
                        {standing.rank === 2 && '🥈'}
                        {standing.rank === 3 && '🥉'}
                        {standing.rank > 3 && `#${standing.rank}`}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${
                          standing.rank === 1 ? 'text-primary' : 'text-foreground'
                        }`}>
                          {standing.playerName}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">{standing.record}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary font-mono">{standing.points} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tournament Info */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest">
            <Calendar className="w-3 h-3" />
            <span>Created: {formatDate(tournament.created_at)}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {!isArchived ? (
              <>
                {tournament.status === 'pending' && (
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1 bg-white/5 border-white/10 hover:bg-white/10"
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
                    className="flex-1 bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    <Link href={`/tournament/${tournament.id}/dashboard`}>
                      View Tournament
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white/5 border-white/10 hover:bg-rose-900/20 hover:text-rose-400 hover:border-rose-900/50 transition-colors"
                  onClick={() => handleArchive(tournament.id)}
                  title="Archive Tournament"
                >
                  <Archive className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/10 hover:bg-emerald-900/20 hover:text-emerald-400 hover:border-emerald-900/50"
                  onClick={() => handleRestore(tournament.id)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/10 hover:bg-rose-950 hover:text-rose-500 hover:border-rose-900"
                  onClick={() => handleDeletePermanently(tournament.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* Pending Tournaments */}
      {pendingTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-heading text-foreground">Pending Tournaments</h2>
          <p className="text-sm text-muted-foreground">
            Tournaments that haven&apos;t started yet. Complete seat selection to begin.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingTournaments.map((t) => renderTournamentCard(t, false))}
          </div>
        </div>
      )}

      {/* Active Tournaments */}
      {activeTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-heading text-foreground">Active Tournaments</h2>
          <p className="text-sm text-muted-foreground">Tournaments currently in progress.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTournaments.map((t) => renderTournamentCard(t, false))}
          </div>
        </div>
      )}

      {/* Completed Tournaments */}
      {completedTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-heading text-foreground">Completed Tournaments</h2>
          <p className="text-sm text-muted-foreground">Finished tournaments.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedTournaments.map((t) => renderTournamentCard(t, false))}
          </div>
        </div>
      )}

      {/* Archived Tournaments */}
      {archivedTournaments.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-white/10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Archive className="w-5 h-5" />
            <h2 className="text-xl font-bold font-heading">Archived Tournaments</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Inactive tournaments. Restore them to view details or resume.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity">
            {archivedTournaments.map((t) => renderTournamentCard(t, true))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingTournaments.length === 0 &&
        activeTournaments.length === 0 &&
        completedTournaments.length === 0 &&
        archivedTournaments.length === 0 && (
          <Card className="glass-panel">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center italic">No tournaments found.</p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}