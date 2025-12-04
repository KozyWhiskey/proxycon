'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Trophy, Users, Calendar } from 'lucide-react';

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
}

export default function TournamentManagementList({
  pendingTournaments,
  activeTournaments,
  completedTournaments,
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
    return (
      <Card key={tournament.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-slate-100 text-lg">{tournament.name}</CardTitle>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-slate-400 capitalize">{tournament.format}</span>
                <span className="text-slate-600">•</span>
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Users className="w-4 h-4" />
                  <span>{tournament.playerCount} players</span>
                </div>
                {tournament.currentRound && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-sm text-slate-400">
                      Round {tournament.currentRound} of {tournament.max_rounds || '?'}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className={`text-sm font-semibold px-2 py-1 rounded-md ${
              tournament.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
              tournament.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
              'bg-slate-700/50 text-slate-400'
            }`}>
              {getStatusLabel(tournament.status)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Standings Section */}
          {tournament.topStandings.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-semibold text-slate-300">
                  {tournament.status === 'completed' ? 'Final Results' : 'Current Standings'}
                </span>
              </div>
              <div className="space-y-2">
                {tournament.topStandings.map((standing) => (
                  <div
                    key={standing.rank}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      standing.rank === 1 ? 'bg-yellow-500/10 border border-yellow-500/20' :
                      standing.rank === 2 ? 'bg-slate-700/30 border border-slate-600/30' :
                      standing.rank === 3 ? 'bg-amber-900/20 border border-amber-700/30' :
                      'bg-slate-800/30'
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
                          standing.rank === 1 ? 'text-yellow-400' : 'text-slate-100'
                        }`}>
                          {standing.playerName}
                        </p>
                        <p className="text-xs text-slate-500">{standing.record}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-yellow-500">{standing.points} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tournament Info */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            <span>Created: {formatDate(tournament.created_at)}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
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
                <Link href={`/tournament/${tournament.id}/dashboard`}>
                  View Tournament
                </Link>
              </Button>
            )}
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

