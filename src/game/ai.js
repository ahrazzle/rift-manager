// Opponent (AI) tactic selection — lightweight heuristics.
import { TEAMS } from '../data/lck.js'

const TIER_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.id, t.tier]))
const STYLES = ['AGGR', 'BAL', 'DEF']
const PHASES = ['EARLY', 'MID', 'LATE']

// Stronger teams lean Aggressive/Balanced; weaker teams lean Defensive/Balanced.
// Phase is chosen to occasionally counter the opponent's likely phase.
export function aiTactic(teamId, oppId, round, rng = Math.random, tierOverride = null) {
  // tierOverride lets non-LCK / historical-year teams (absent from the static
  // registry) play to their real strength instead of a flat 80.
  const tier = tierOverride ?? TIER_BY_ID[teamId] ?? 80
  let style
  const r = rng()
  if (tier >= 87) style = r < 0.45 ? 'AGGR' : r < 0.85 ? 'BAL' : 'DEF'
  else if (tier >= 82) style = r < 0.2 ? 'AGGR' : r < 0.6 ? 'BAL' : 'DEF'
  else style = r < 0.15 ? 'AGGR' : r < 0.5 ? 'BAL' : 'DEF'

  // Phase: pick based on round rhythm — early rounds push EARLY, mid MID, late LATE,
  // with noise. Keeps opponents from feeling random but not predictable.
  const phasePick = (round + Math.floor(rng() * 3)) % 3
  const phase = PHASES[phasePick]
  return { style, phase }
}
