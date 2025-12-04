/**
 * Swiss Format Pairing System for MTG Draft Tournaments
 * 
 * Implements the official MTG tournament pairing rules:
 * - Point System: Win=3, Draw=1, Loss=0 (MTG Standard 3-1-0)
 * - OMW% (Opponent Match Win Percentage) as primary tiebreaker
 * - Bye rotation ensuring fair distribution
 * - Match history tracking to prevent rematches
 * 
 * @see https://magic.wizards.com/en/game-info/gameplay/rules-and-formats/tournament-rules
 */

// =============================================================================
// Types
// =============================================================================

export interface MatchResult {
  matchId: string;
  player1Id: string;
  player2Id: string | null; // null indicates bye
  player1Result: 'win' | 'loss' | 'draw' | null;
  player2Result: 'win' | 'loss' | 'draw' | null;
  roundNumber: number;
}

export interface PlayerStanding {
  playerId: string;
  matchWins: number;    // Number of match wins
  matchLosses: number;  // Number of match losses
  matchDraws: number;   // Number of match draws
  points: number;       // Total points (3-1-0 system)
  matchWinPercentage: number;  // Player's own MWP (minimum 33%)
  opponentMatchWinPercentage: number; // OMW% (average of opponents' MWP)
  gamesWon: number;     // Total games won (for GW% tiebreaker)
  gamesPlayed: number;  // Total games played
  gameWinPercentage: number; // GW% (minimum 33%)
  receivedBye: boolean; // Has this player received a bye?
  byeCount: number;     // Number of byes received
  opponents: string[];  // List of opponent IDs faced
}

export interface SwissPairing {
  player1: string;
  player2: string | null; // null indicates bye
}

export interface PairingResult {
  pairings: SwissPairing[];
  warnings: string[];
}

// =============================================================================
// Constants
// =============================================================================

/** MTG Points: Win = 3, Draw = 1, Loss = 0 */
export const POINTS_WIN = 3;
export const POINTS_DRAW = 1;
export const POINTS_LOSS = 0;

/** Minimum MWP/GWP is 33% (0.33) per MTG rules */
export const MIN_WIN_PERCENTAGE = 1 / 3;

/** Bye is recorded as 2-0 win */
export const BYE_GAMES_WON = 2;
export const BYE_GAMES_LOST = 0;

// =============================================================================
// Point System Functions
// =============================================================================

/**
 * Calculate points for a match result using MTG 3-1-0 system
 */
export function calculateMatchPoints(result: 'win' | 'loss' | 'draw' | null): number {
  switch (result) {
    case 'win': return POINTS_WIN;
    case 'draw': return POINTS_DRAW;
    case 'loss': return POINTS_LOSS;
    default: return 0;
  }
}

/**
 * Calculate a player's Match Win Percentage (MWP)
 * MWP = points / (matches_played * 3)
 * Minimum is 33% per MTG rules
 */
export function calculateMatchWinPercentage(
  wins: number, 
  losses: number, 
  draws: number
): number {
  const totalMatches = wins + losses + draws;
  if (totalMatches === 0) return MIN_WIN_PERCENTAGE;
  
  const points = (wins * POINTS_WIN) + (draws * POINTS_DRAW) + (losses * POINTS_LOSS);
  const maxPoints = totalMatches * POINTS_WIN;
  const mwp = points / maxPoints;
  
  // MTG rules: minimum 33% MWP
  return Math.max(mwp, MIN_WIN_PERCENTAGE);
}

/**
 * Calculate a player's Game Win Percentage (GWP)
 * GWP = games_won / games_played
 * Minimum is 33% per MTG rules
 */
export function calculateGameWinPercentage(
  gamesWon: number, 
  gamesPlayed: number
): number {
  if (gamesPlayed === 0) return MIN_WIN_PERCENTAGE;
  
  const gwp = gamesWon / gamesPlayed;
  return Math.max(gwp, MIN_WIN_PERCENTAGE);
}

// =============================================================================
// Standings Calculation
// =============================================================================

/**
 * Build complete standings from match history
 * 
 * @param playerIds - All player IDs in the tournament
 * @param matchHistory - All completed matches
 * @returns Map of player ID to their standing
 */
export function calculateStandings(
  playerIds: string[],
  matchHistory: MatchResult[]
): Map<string, PlayerStanding> {
  const standings = new Map<string, PlayerStanding>();
  
  // Initialize all players
  for (const playerId of playerIds) {
    standings.set(playerId, {
      playerId,
      matchWins: 0,
      matchLosses: 0,
      matchDraws: 0,
      points: 0,
      matchWinPercentage: MIN_WIN_PERCENTAGE,
      opponentMatchWinPercentage: 0,
      gamesWon: 0,
      gamesPlayed: 0,
      gameWinPercentage: MIN_WIN_PERCENTAGE,
      receivedBye: false,
      byeCount: 0,
      opponents: [],
    });
  }
  
  // Process match history
  for (const match of matchHistory) {
    const player1 = standings.get(match.player1Id);
    if (!player1) continue;
    
    // Handle bye (no player2)
    if (!match.player2Id) {
      // Bye counts as win with 2-0 game score
      player1.matchWins++;
      player1.points += POINTS_WIN;
      player1.gamesWon += BYE_GAMES_WON;
      player1.gamesPlayed += BYE_GAMES_WON; // 2 games "played"
      player1.receivedBye = true;
      player1.byeCount++;
      // Note: Byes do NOT count as opponents for OMW%
      continue;
    }
    
    const player2 = standings.get(match.player2Id);
    if (!player2) continue;
    
    // Track opponents (for OMW% calculation)
    if (!player1.opponents.includes(match.player2Id)) {
      player1.opponents.push(match.player2Id);
    }
    if (!player2.opponents.includes(match.player1Id)) {
      player2.opponents.push(match.player1Id);
    }
    
    // Process results
    if (match.player1Result === 'win') {
      player1.matchWins++;
      player1.points += POINTS_WIN;
    } else if (match.player1Result === 'loss') {
      player1.matchLosses++;
      player1.points += POINTS_LOSS;
    } else if (match.player1Result === 'draw') {
      player1.matchDraws++;
      player1.points += POINTS_DRAW;
    }
    
    if (match.player2Result === 'win') {
      player2.matchWins++;
      player2.points += POINTS_WIN;
    } else if (match.player2Result === 'loss') {
      player2.matchLosses++;
      player2.points += POINTS_LOSS;
    } else if (match.player2Result === 'draw') {
      player2.matchDraws++;
      player2.points += POINTS_DRAW;
    }
  }
  
  // Calculate Match Win Percentages for all players
  for (const standing of standings.values()) {
    standing.matchWinPercentage = calculateMatchWinPercentage(
      standing.matchWins,
      standing.matchLosses,
      standing.matchDraws
    );
    
    standing.gameWinPercentage = calculateGameWinPercentage(
      standing.gamesWon,
      standing.gamesPlayed
    );
  }
  
  // Calculate Opponent Match Win Percentages (OMW%)
  // This must be done after all MWPs are calculated
  for (const standing of standings.values()) {
    if (standing.opponents.length === 0) {
      // Player has only faced byes - OMW% is 0 (or undefined, rank lowest)
      standing.opponentMatchWinPercentage = 0;
    } else {
      let totalOpponentMWP = 0;
      for (const opponentId of standing.opponents) {
        const opponent = standings.get(opponentId);
        if (opponent) {
          totalOpponentMWP += opponent.matchWinPercentage;
        }
      }
      standing.opponentMatchWinPercentage = totalOpponentMWP / standing.opponents.length;
    }
  }
  
  return standings;
}

/**
 * Sort standings by MTG tiebreaker rules:
 * 1. Points (higher is better)
 * 2. OMW% (higher is better)
 * 3. GW% (higher is better)
 * 4. Random (for true ties)
 */
export function sortStandings(standings: PlayerStanding[]): PlayerStanding[] {
  return [...standings].sort((a, b) => {
    // Primary: Points (descending)
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    
    // Secondary: OMW% (descending)
    if (b.opponentMatchWinPercentage !== a.opponentMatchWinPercentage) {
      return b.opponentMatchWinPercentage - a.opponentMatchWinPercentage;
    }
    
    // Tertiary: GW% (descending)
    if (b.gameWinPercentage !== a.gameWinPercentage) {
      return b.gameWinPercentage - a.gameWinPercentage;
    }
    
    // Quaternary: Random (for tournament purposes, use consistent randomization)
    // Using player ID comparison for deterministic results during testing
    return a.playerId.localeCompare(b.playerId);
  });
}

// =============================================================================
// Swiss Pairing Algorithm
// =============================================================================

/**
 * Get all players a given player has faced (excluding byes)
 */
export function getPlayedOpponents(
  playerId: string,
  matchHistory: MatchResult[]
): Set<string> {
  const opponents = new Set<string>();
  
  for (const match of matchHistory) {
    if (match.player1Id === playerId && match.player2Id) {
      opponents.add(match.player2Id);
    } else if (match.player2Id === playerId) {
      opponents.add(match.player1Id);
    }
  }
  
  return opponents;
}

/**
 * Check if two players have already played each other
 */
export function havePlayed(
  player1Id: string,
  player2Id: string,
  matchHistory: MatchResult[]
): boolean {
  return matchHistory.some(match => 
    (match.player1Id === player1Id && match.player2Id === player2Id) ||
    (match.player1Id === player2Id && match.player2Id === player1Id)
  );
}

/**
 * Group players by their point totals
 */
function groupByPoints(standings: PlayerStanding[]): Map<number, PlayerStanding[]> {
  const groups = new Map<number, PlayerStanding[]>();
  
  for (const standing of standings) {
    const group = groups.get(standing.points) || [];
    group.push(standing);
    groups.set(standing.points, group);
  }
  
  return groups;
}

/**
 * Attempt to pair players within a group, avoiding rematches
 * Returns paired players and any unpaired players that need to drop to next group
 */
function pairWithinGroup(
  group: PlayerStanding[],
  matchHistory: MatchResult[]
): { pairs: SwissPairing[]; unpaired: PlayerStanding[]; warnings: string[] } {
  const pairs: SwissPairing[] = [];
  const warnings: string[] = [];
  const available = [...group];
  const unpaired: PlayerStanding[] = [];
  
  while (available.length >= 2) {
    const player1 = available.shift()!;
    let paired = false;
    
    // Try to find an opponent player1 hasn't played
    for (let i = 0; i < available.length; i++) {
      const player2 = available[i];
      
      if (!havePlayed(player1.playerId, player2.playerId, matchHistory)) {
        // Valid pairing found
        pairs.push({
          player1: player1.playerId,
          player2: player2.playerId,
        });
        available.splice(i, 1); // Remove player2 from available
        paired = true;
        break;
      }
    }
    
    if (!paired) {
      // No valid pairing found - try allowing rematch as last resort
      // First, check if we can float this player down to next group
      // For now, force a rematch with warning
      if (available.length > 0) {
        const player2 = available.shift()!;
        pairs.push({
          player1: player1.playerId,
          player2: player2.playerId,
        });
        warnings.push(
          `Warning: Rematch required between ${player1.playerId} and ${player2.playerId} ` +
          `(no other valid opponents in point group ${player1.points})`
        );
      } else {
        // Single unpaired player - will get bye or float down
        unpaired.push(player1);
      }
    }
  }
  
  // Any remaining players are unpaired (odd count or no valid opponents)
  unpaired.push(...available);
  
  return { pairs, unpaired, warnings };
}

/**
 * Select the player who should receive a bye
 * 
 * Priority:
 * 1. Prefer players who have NOT received a bye yet
 * 2. Among those, prefer the lowest-ranked player
 * 3. If all have received byes, give it to the lowest-ranked player
 */
function selectByePlayer(
  unpaired: PlayerStanding[],
  allStandings: Map<string, PlayerStanding>
): PlayerStanding | null {
  if (unpaired.length === 0) return null;
  
  // Sort unpaired players by:
  // 1. Bye count (ascending - prefer those with fewer byes)
  // 2. Points (ascending - prefer lower ranked)
  // 3. OMW% (ascending - prefer lower ranked)
  const sorted = [...unpaired].sort((a, b) => {
    // First, prefer players who haven't received a bye
    if (a.byeCount !== b.byeCount) {
      return a.byeCount - b.byeCount;
    }
    
    // Then, prefer lower-ranked players (fewer points)
    if (a.points !== b.points) {
      return a.points - b.points;
    }
    
    // Then, prefer lower OMW%
    return a.opponentMatchWinPercentage - b.opponentMatchWinPercentage;
  });
  
  return sorted[0];
}

/**
 * Generate Swiss pairings for the next round
 * 
 * Algorithm:
 * 1. Calculate standings with OMW%
 * 2. Handle bye if odd number of players (prioritize players without byes)
 * 3. Group players by points
 * 4. Within each group, pair from top to bottom, avoiding rematches
 * 5. Unpaired players "float down" to the next point group
 * 
 * @param playerIds - All player IDs in the tournament
 * @param matchHistory - All completed matches
 * @returns Pairings for the next round
 */
export function generateSwissPairings(
  playerIds: string[],
  matchHistory: MatchResult[]
): PairingResult {
  const warnings: string[] = [];
  const pairings: SwissPairing[] = [];
  
  // Calculate full standings
  const standingsMap = calculateStandings(playerIds, matchHistory);
  const sortedStandings = sortStandings(Array.from(standingsMap.values()));
  
  // Handle odd number of players - assign bye first
  let playersToMatch = [...sortedStandings];
  
  if (playersToMatch.length % 2 === 1) {
    const byePlayer = selectByePlayer(playersToMatch, standingsMap);
    if (byePlayer) {
      pairings.push({
        player1: byePlayer.playerId,
        player2: null, // Bye
      });
      // Remove bye player from matching pool
      playersToMatch = playersToMatch.filter(p => p.playerId !== byePlayer.playerId);
      
      if (byePlayer.byeCount > 0) {
        warnings.push(
          `Note: ${byePlayer.playerId} receiving bye #${byePlayer.byeCount + 1} ` +
          `(all players have received at least one bye)`
        );
      }
    }
  }
  
  // Group remaining players by points
  const pointGroups = groupByPoints(playersToMatch);
  const sortedPointValues = Array.from(pointGroups.keys()).sort((a, b) => b - a);
  
  let floatingPlayers: PlayerStanding[] = [];
  
  // Process each point group from highest to lowest
  for (const pointValue of sortedPointValues) {
    const group = pointGroups.get(pointValue) || [];
    
    // Add any floating players from higher groups
    const combinedGroup = [...floatingPlayers, ...group];
    
    // Sort combined group by tiebreakers
    const sortedGroup = sortStandings(combinedGroup);
    
    // Pair within group
    const { pairs, unpaired, warnings: groupWarnings } = pairWithinGroup(
      sortedGroup,
      matchHistory
    );
    
    pairings.push(...pairs);
    warnings.push(...groupWarnings);
    
    // Unpaired players float down to next group
    floatingPlayers = unpaired;
  }
  
  // Handle any remaining unpaired players
  // This can happen in small tournaments with many rematches
  while (floatingPlayers.length >= 2) {
    const player1 = floatingPlayers.shift()!;
    const player2 = floatingPlayers.shift()!;
    
    pairings.push({
      player1: player1.playerId,
      player2: player2.playerId,
    });
    
    if (havePlayed(player1.playerId, player2.playerId, matchHistory)) {
      warnings.push(
        `Warning: Forced rematch between ${player1.playerId} and ${player2.playerId} ` +
        `(no other options available)`
      );
    }
  }
  
  // If there's still one unpaired player, they get a bye
  // (This shouldn't happen if we handled odd count above, but just in case)
  if (floatingPlayers.length === 1) {
    const byePlayer = floatingPlayers[0];
    pairings.push({
      player1: byePlayer.playerId,
      player2: null,
    });
    warnings.push(
      `Warning: Unexpected bye assigned to ${byePlayer.playerId} during floating`
    );
  }
  
  return { pairings, warnings };
}

// =============================================================================
// Round 1 Pairing (Draft Seat Based)
// =============================================================================

/**
 * Generate Round 1 pairings based on draft seat positions
 * Players are paired with the person sitting across from them at the draft table
 * 
 * For N players (seats 1 to N):
 * - Seat K pairs with Seat (K + N/2) for K <= N/2
 * - If odd number, highest seat gets bye
 * 
 * Example for 8 players:
 * - Seat 1 vs Seat 5
 * - Seat 2 vs Seat 6
 * - Seat 3 vs Seat 7
 * - Seat 4 vs Seat 8
 * 
 * Example for 7 players:
 * - Seat 1 vs Seat 4
 * - Seat 2 vs Seat 5
 * - Seat 3 vs Seat 6
 * - Seat 7 gets bye
 */
export function generateRound1Pairings(
  participants: { playerId: string; draftSeat: number }[]
): PairingResult {
  const pairings: SwissPairing[] = [];
  const warnings: string[] = [];
  
  // Sort by draft seat
  const sorted = [...participants].sort((a, b) => a.draftSeat - b.draftSeat);
  const numPlayers = sorted.length;
  const halfCount = Math.floor(numPlayers / 2);
  
  // Pair across the table
  for (let i = 0; i < halfCount; i++) {
    const seat1 = sorted[i];
    const seat2 = sorted[i + halfCount];
    
    pairings.push({
      player1: seat1.playerId,
      player2: seat2.playerId,
    });
  }
  
  // Handle bye for odd number of players
  if (numPlayers % 2 === 1) {
    const byePlayer = sorted[numPlayers - 1]; // Highest seat number
    pairings.push({
      player1: byePlayer.playerId,
      player2: null, // Bye
    });
  }
  
  return { pairings, warnings };
}

// =============================================================================
// Utility Functions for Database Integration
// =============================================================================

/**
 * Convert database match records to MatchResult format
 */
export function convertDbMatchToMatchResult(
  matchId: string,
  roundNumber: number,
  participants: { playerId: string; result: 'win' | 'loss' | 'draw' | null }[]
): MatchResult {
  // Single participant = bye
  if (participants.length === 1) {
    return {
      matchId,
      roundNumber,
      player1Id: participants[0].playerId,
      player2Id: null,
      player1Result: 'win', // Bye is automatic win
      player2Result: null,
    };
  }
  
  // Two participants = normal match
  return {
    matchId,
    roundNumber,
    player1Id: participants[0].playerId,
    player2Id: participants[1].playerId,
    player1Result: participants[0].result,
    player2Result: participants[1].result,
  };
}

/**
 * Format OMW% for display (e.g., "45.67%")
 */
export function formatOMWPercentage(omw: number): string {
  return `${(omw * 100).toFixed(2)}%`;
}

/**
 * Format Match Win Percentage for display
 */
export function formatMWPercentage(mwp: number): string {
  return `${(mwp * 100).toFixed(2)}%`;
}

