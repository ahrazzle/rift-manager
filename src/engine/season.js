// ============================================================================
// LCK Manager — Season scheduling (single round-robin)
// ----------------------------------------------------------------------------
// 10 teams -> 9 rounds, each team plays once per round (5 matches/round).
// Uses the classic circle-method for a balanced round-robin.
// ============================================================================

import { TEAMS } from '../data/lck.js'

// Build a round-robin schedule of N teams. Returns array of rounds; each round
// is an array of [homeId, awayId] pairs.
export function roundRobin(teamIds) {
  const n = teamIds.length
  const arr = [...teamIds]
  // if odd, add a dummy "BYE"
  const hasBye = n % 2 !== 0
  if (hasBye) arr.push('BYE')
  const m = arr.length
  const rounds = []
  for (let r = 0; r < m - 1; r++) {
    const pairs = []
    for (let i = 0; i < m / 2; i++) {
      const a = arr[i]
      const b = arr[m - 1 - i]
      // alternate home/away for balance
      if (r % 2 === 0) pairs.push([a, b])
      else pairs.push([b, a])
    }
    rounds.push(pairs)
    // rotate all but the first element
    arr.splice(1, 0, arr.pop())
  }
  // filter out BYE matches
  return rounds
    .map((round) => round.filter(([a, b]) => a !== 'BYE' && b !== 'BYE'))
}

// Full season schedule for the LCK teams (single round-robin = 9 weeks).
export function buildLCKSchedule() {
  const ids = TEAMS.map((t) => t.id)
  return roundRobin(ids)
}

// Standings row factory.
export function emptyStanding(teamId) {
  return {
    teamId,
    W: 0,
    L: 0,
    gameWins: 0,
    gameLosses: 0,
    points: 0, // 1 for series win, 0 for loss (LCK uses series W/L)
  }
}

export function makeStandings() {
  const map = {}
  for (const t of TEAMS) map[t.id] = emptyStanding(t.id)
  return map
}

// P1 item 11 — top-4 single-elim playoffs: BO3 semifinals (1v4, 2v3) + BO3 final.
// buildPlayoffs(orderedTeamIds, topN = 4) → { semis: [[homeId, awayId], [homeId, awayId]], finalists: null }
//   orderedTeamIds: team ids BEST-first (caller passes orderStandings(standings).map(r => r.teamId)).
//   Pairing (locked): semis = [[1st, 4th], [2nd, 3rd]]. topN !== 4 → throws
//   (only top-4 is supported in P1). Returns pairings only — the reducer wraps
//   them in a tournament object.
export function buildPlayoffs(orderedTeamIds, topN = 4) {
  if (topN !== 4) throw new Error('buildPlayoffs: only top-4 (topN = 4) is supported in P1')
  const ids = [...(orderedTeamIds ?? [])]
  if (ids.length < 4) throw new Error('buildPlayoffs: need at least 4 team ids')
  const top = ids.slice(0, 4)
  return { semis: [[top[0], top[3]], [top[1], top[2]]], finalists: null }
}
