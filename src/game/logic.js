// Pure game helpers shared by the UI and the reducer. No state mutation here.
import { TEAMS, ROLES } from '../data/lck.js'
import { TRAIT_BY_ID } from '../data/traits.js'
import { COACH_BY_ID, coachBonus } from '../data/coaches.js'
import { computeStrength, simulateSeries, strategyDelta, phaseEdge } from '../engine/sim.js'
import { aiTactic } from './ai.js'
import { preparationBonus } from './preparation.js'

export const TEAM_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.id, t]))
export const TEAM_ORDER = TEAMS.map((t) => t.id)

export function clampForm(v) {
  return Math.max(15, Math.min(98, Math.round(v)))
}

// Merge a player with the live form value from the form map.
export function styledPlayer(p, form) {
  const f = form[p.id]
  return f === undefined ? p : { ...p, form: f }
}

// Pick the highest-ovr player per role from a team's player list (AI lineups).
// Returns { lineup: {ROLE:player}, ids: [ids] }.
export function bestLineup(players, form) {
  const lineup = {}
  const ids = []
  for (const role of ROLES) {
    const inRole = players.filter((p) => p.role === role)
    if (inRole.length === 0) continue
    inRole.sort((a, b) => b.ovr - a.ovr)
    const starter = styledPlayer(inRole[0], form)
    lineup[role] = starter
    ids.push(starter.id)
  }
  return { lineup, ids }
}

// Build the user's chosen lineup from state.lineup (role->playerId) over the team's players.
export function userLineup(teamPlayers, lineupIds, form) {
  const byId = Object.fromEntries(teamPlayers.map((p) => [p.id, p]))
  const lineup = {}
  const ids = []
  for (const role of ROLES) {
    const id = lineupIds[role]
    const p = byId[id]
    if (p) {
      lineup[role] = styledPlayer(p, form)
      ids.push(id)
    }
  }
  return { lineup, ids }
}

// --- Deterministic win-prob estimates --------------------------------------
// Every panel showing a matchup's win % must agree exactly. Monte-Carlo with
// Math.random gives each caller a different draw (±3%), so estimates are
// seeded from the matchup inputs instead: same state → same number everywhere.
// xmur3 hash + mulberry32 (local copies; useGameState.js has its own for saves).
function xmur3(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}
function mulberry32s(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function seededRng(str) {
  return mulberry32s(xmur3(String(str))())
}

// Seed string capturing every input to a matchup's win-prob estimate.
export function matchupSeed(state, oppId) {
  return [
    state.teamId, oppId, state.round,
    JSON.stringify(state.tactic), JSON.stringify(state.lineup),
    JSON.stringify(state.strategy), JSON.stringify(state.seriesOptions),
    JSON.stringify(state.form), coachBonusFor(state),
    preparationBonus(state, oppId),
    state.teamMeta?.[oppId]?.tier ?? '',
  ].join('|')
}

// The opponent's scouted gameplan, deterministic per matchup state so all
// panels estimate against the same opponent.
export function matchupOppTactic(state, oppId) {
  return aiTactic(
    oppId, state.teamId, state.round ?? 1,
    seededRng(matchupSeed(state, oppId) + '|tactic'),
    state.teamMeta?.[oppId]?.tier,
  )
}

// Monte-Carlo estimate of the user winning the series vs an opponent.
// The user is side A; userBonus (career coach bonus) folds into side A only.
// Trailing extra (e.g. { aStrat }) carries item-4 strategy into side A;
// default {} leaves all other callers byte-identical.
export function estimateSeriesWinProb(userLineupObj, userTactic, oppLineupObj, oppTactic, n = 600, rng = Math.random, userBonus = 0, extra = {}) {
  let wins = 0
  for (let i = 0; i < n; i++) {
    const res = simulateSeries(userLineupObj, userTactic, oppLineupObj, oppTactic, rng, 'You', 'Opp', { aBonus: userBonus, bBonus: 0, ...(extra || {}) })
    if (res.winner === 'A') wins++
  }
  return wins / n
}

// Convenience: a team's strength number for display.
export function teamStrength(players, form, tactic) {
  const { lineup } = bestLineup(players, form)
  return computeStrength(lineup, tactic)
}

// --- P1 item 9: win-probability explanation ---------------------------------
// No engine change. Pure helper + collapsible UI. Reads existing estimates.
// explainWinProb(state, oppId, opts?: { n?: number }) → { prob, factors }
//   prob: 0..1 Monte-Carlo series win prob (delegates to estimateSeriesWinProb, n default 500).
//   factors: ordered divergent list, contribution in percentage POINTS.
//   Labels are fixed strings (UI renders verbatim):
//     'Rating edge' | 'Form edge' | 'Tactics & gameplan' | 'Head-to-head' | 'Trait watch' | 'Coaching'

const clampPP = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function avgOvr(lineup) {
  const v = Object.values(lineup ?? {})
  if (v.length === 0) return 0
  return v.reduce((a, p) => a + (p.ovr ?? 0), 0) / v.length
}

function avgForm(lineup) {
  const v = Object.values(lineup ?? {})
  if (v.length === 0) return 50
  return v.reduce((a, p) => a + (p.form ?? 50), 0) / v.length
}

// Managed-team coach bonus without importing the reducer (no import cycle).
function coachBonusFor(state) {
  if (state.mode !== 'career' || !state.career || state.career.status !== 'active') return 0
  const id = state.career.staff?.[state.teamId]
  const pooled = state.career.coachPool?.find((c) => c.id === id)
  const coach = pooled || (id && COACH_BY_ID[id]) || null
  return coach ? coachBonus(coach.rating) : 0
}

// Revealed-trait edge: +1 per revealed big_game_player/clutch on my side,
// -1 per revealed injury_prone on my side; mirrored for the opponent.
function netTraitEdge(myLineup, oppLineup) {
  const score = (lineup, sign) => {
    let s = 0
    for (const p of Object.values(lineup ?? {})) {
      for (const t of p.traits || []) {
        if (typeof t === 'string' || !t.revealed) continue
        if (t.id === 'big_game_player' || t.id === 'clutch') s += sign
        else if (t.id === 'injury_prone') s -= sign
      }
    }
    return s
  }
  return score(myLineup, 1) - score(oppLineup, 1)
}

export function explainWinProb(state, oppId, opts = {}) {
  const n = opts.n ?? 500
  const rng = opts.rng ?? Math.random
  const myPlayers = state.teams?.[state.teamId] || []
  const oppPlayers = state.teams?.[oppId] || []
  const { lineup: myLineup } = userLineup(myPlayers, state.lineup, state.form)
  const { lineup: oppLineup } = bestLineup(oppPlayers, state.form)
  const myTactic = state.tactic ?? { style: 'BAL', phase: 'MID' }
  const oppTactic = opts.oppTactic
    ?? aiTactic(oppId, state.teamId, state.round ?? 1, rng, state.teamMeta?.[oppId]?.tier)
  const bonus = coachBonusFor(state)
  const preparation = preparationBonus(state, oppId)
  const prob = estimateSeriesWinProb(
    myLineup, myTactic, oppLineup, oppTactic, n, rng, bonus + preparation,
    { aStrat: state.strategy ?? null },
  )
  const rating = clampPP((avgOvr(myLineup) - avgOvr(oppLineup)) * 1.1, -25, 25)
  const form = clampPP((avgForm(myLineup) - avgForm(oppLineup)) * 0.35, -10, 10)
  const stratDelta = strategyDelta(state.strategy ?? null, myTactic).delta
  const tactics = clampPP(stratDelta * 2.2 + phaseEdge(myTactic.phase, oppTactic.phase) * 1.1, -8, 8)
  let myW = 0
  let oppW = 0
  for (const r of state.results ?? []) {
    if (r.homeId === state.teamId && r.awayId === oppId) {
      if (r.homeWon) myW++
      else oppW++
    } else if (r.homeId === oppId && r.awayId === state.teamId) {
      if (r.homeWon) oppW++
      else myW++
    }
  }
  const h2h = (myW === 0 && oppW === 0)
    ? { label: 'Head-to-head (no meetings yet)', contribution: 0 }
    : { label: 'Head-to-head', contribution: clampPP((myW - oppW) * 2, -6, 6) }
  const trait = { label: 'Trait watch', contribution: clampPP(netTraitEdge(myLineup, oppLineup) * 2, -6, 6) }
  const coaching = { label: 'Coaching', contribution: clampPP(bonus * 2.2, -6, 6) }
  return {
    prob,
    preparation,
    factors: [
      { label: 'Rating edge', contribution: rating },
      { label: 'Form edge', contribution: form },
      { label: 'Tactics & gameplan', contribution: tactics },
      h2h,
      trait,
      coaching,
    ],
  }
}

// MatchDetail variant: same factor labels, reconstructed from a stored series
// detail seed (lineups/tactics/bonus/strats). H2H and trait rows are
// unavailable here → contribution 0 with dash: true (UI shows '—').
// perspective: 'home' | 'away' (the side the factors favor).
export function explainSeriesDetail(detail, perspective = 'home') {
  const mineFirst = perspective !== 'away'
  const myLineup = mineFirst ? detail.homeLineup : detail.awayLineup
  const oppLineup = mineFirst ? detail.awayLineup : detail.homeLineup
  const myTactic = (mineFirst ? detail.homeTactic : detail.awayTactic) || { style: 'BAL', phase: 'MID' }
  const oppTactic = (mineFirst ? detail.awayTactic : detail.homeTactic) || { style: 'BAL', phase: 'MID' }
  const myStrat = (mineFirst ? detail.homeStrat : detail.awayStrat) ?? null
  const myBonus = mineFirst ? (detail.bonusA ?? 0) : (detail.bonusB ?? 0)
  const oppBonus = mineFirst ? (detail.bonusB ?? 0) : (detail.bonusA ?? 0)
  const prob = estimateSeriesWinProb(
    myLineup || {}, myTactic, oppLineup || {}, oppTactic, 200, Math.random,
    myBonus - oppBonus,
    {
      aStrat: myStrat,
      fearless: detail.fearless ?? false,
      bigMatch: detail.bigMatch ?? false,
    },
  )
  const rating = clampPP((avgOvr(myLineup) - avgOvr(oppLineup)) * 1.1, -25, 25)
  const form = clampPP((avgForm(myLineup) - avgForm(oppLineup)) * 0.35, -10, 10)
  const tactics = clampPP(
    strategyDelta(myStrat, myTactic).delta * 2.2 + phaseEdge(myTactic.phase, oppTactic.phase) * 1.1, -8, 8,
  )
  return {
    prob,
    factors: [
      { label: 'Rating edge', contribution: rating },
      { label: 'Form edge', contribution: form },
      { label: 'Tactics & gameplan', contribution: tactics },
      { label: 'Head-to-head (no meetings yet)', contribution: 0, dash: true },
      { label: 'Trait watch', contribution: 0, dash: true },
      { label: 'Coaching', contribution: clampPP((myBonus - oppBonus) * 2.2, -6, 6) },
    ],
  }
}

// Human hint per revealed series trait (Strategy lineup chips).
export function traitHint(id) {
  const meta = TRAIT_BY_ID[id]
  if (!meta) return null
  if (id === 'clutch') return 'Clutch — boosted in deciders'
  if (id === 'big_game_player') return 'Big-Game Player — boosted in finals'
  if (id === 'injury_prone') return 'Injury Prone — plays below himself'
  if (id === 'inconsistent') return 'Inconsistent — unpredictable'
  return meta.name
}
