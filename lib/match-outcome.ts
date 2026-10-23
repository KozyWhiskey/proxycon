/** Shared by the save action and review UI so the preview is the recorded result. */
export function matchOutcome(
  rows: { profile_id: string | null; team: number | null }[],
  games: Record<string, number> | undefined,
  draw: boolean,
  winnerIds: string[],
) {
  const ids = rows.map(seat => seat.profile_id).filter((id): id is string => Boolean(id));
  const teamed = rows.some(seat => seat.team);
  const hasScores = Boolean(games) && ids.some(id => (games?.[id] || 0) > 0);
  const counts = hasScores && games
    ? Object.fromEntries(ids.map(id => { const value = Number(games[id]); return [id, Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0]; }))
    : null;
  if (!counts || teamed) return { draw, winners: new Set(winnerIds.filter(id => ids.includes(id))), games: counts };
  const highest = Math.max(...ids.map(id => counts[id] || 0));
  const leaders = ids.filter(id => counts[id] === highest);
  return leaders.length === 1
    ? { draw: false, winners: new Set(leaders), games: counts }
    : { draw: true, winners: new Set<string>(), games: counts };
}

export interface ResultSnapshot { profileId: string; result: string | null; gamesWon: number | null }
export function matchesResultSnapshot(rows: { profile_id: string | null; result: string | null; games_won: number | null }[], expected: ResultSnapshot[]) {
  const named = rows.filter(row => row.profile_id);
  return named.length === expected.length && new Set(expected.map(row => row.profileId)).size === expected.length && named.every(row => {
    const old = expected.find(item => item.profileId === row.profile_id);
    return old && old.result === row.result && old.gamesWon === row.games_won;
  });
}

/** Tournament reports require an explicit whole-number score for both sides. */
export function validTournamentScore(ids: string[], games: Record<string, number> | undefined): boolean {
  if (ids.length < 2 || !games) return false;
  return ids.every(id => Number.isInteger(games[id]) && games[id] >= 0) && ids.some(id => games[id] > 0);
}
