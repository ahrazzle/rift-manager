// ============================================================================
// Rift Manager — Match simulation engine (pure JS, no DOM, runs under node)
// ----------------------------------------------------------------------------
// Model:
//   - A team's strength = weighted player ratings + macro + form + tactic edge.
//   - Per game: p(win) = logistic((myStr - oppStr) / SCALE).
//   - Series = Best-of-3; each game drawn independently with that p.
//   - Tactic style (AGGR/BAL/DEF) sets mean strength multiplier + outcome
//     variance; tactic phase (EARLY/MID/LATE) gives a timing edge vs the
//     opponent's phase.
//   - Game detail (duration, gold walk, events, per-player stats) is generated
//     CONDITIONED on the pre-decided winner, calibrated to measured LCK 2026
//     data (see docs/live-data-research.md §8). Tactic hooks in the cosmetics
//     path are magnitude/rate only — they never flip the winner.
//   - RNG discipline: the single injected rng() is threaded through everything
//     in fixed order per game: drawGame (2 draws) -> flavor pick (1) ->
//     duration -> walk/event draws -> player-stat draws. Only the injected
//     generator is ever invoked; there are no wall-clock or global-RNG calls.
// ============================================================================

import { traitDelta, clutchBonus, normalizeTraits } from '../data/traits.js'

// Engine-owned lineup copy: normalized trait objects so traitDelta can stamp
// `revealed` without ever touching the caller's rosters.
function snapLineup(lineup) {
  const out = {}
  for (const role of Object.keys(lineup ?? {})) {
    const p = lineup[role]
    out[role] = { ...p, traits: normalizeTraits(p.traits) }
  }
  return out
}

function hasTraitCarriers(snap) {
  return Object.values(snap).some((p) => Array.isArray(p.traits) && p.traits.length > 0)
}

export const TACTICS = {
  style: ['AGGR', 'BAL', 'DEF'],
  phase: ['EARLY', 'MID', 'LATE'],
}

export const STYLE_META = {
  AGGR: { mult: 1.03, variance: 1.35, label: 'Aggressive', blurb: 'Higher ceiling, higher variance' },
  BAL: { mult: 1.015, variance: 1.0, label: 'Balanced', blurb: 'Even across the board' },
  DEF: { mult: 1.0, variance: 0.7, label: 'Defensive', blurb: 'Stable, lower variance' },
}

export const PHASE_META = {
  EARLY: { label: 'Early Game', blurb: 'Snowball the lane phase' },
  MID: { label: 'Mid Game', blurb: 'Teamfight around objectives' },
  LATE: { label: 'Late Game', blurb: 'Scale to hyper-carries' },
}

// Role weights: mid/bot slightly more impactful; support a touch less.
const ROLE_WEIGHT = { TOP: 1.0, JNG: 1.0, MID: 1.1, BOT: 1.1, SUP: 0.9 }

const SCALE = 9 // rating-diff units per logistic e-fold

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

// Phase timing edge: EARLY beats LATE, LATE beats EARLY, MID neutral.
// Returns a strength delta for `mine` vs `theirs`.
export function phaseEdge(mine, theirs) {
  if (mine === theirs) return 0
  const beats = { EARLY: 'LATE', LATE: 'EARLY', MID: null }
  if (beats[mine] === theirs) return 2.0 // my timing counters theirs
  if (beats[theirs] === mine) return -2.0 // theirs counters mine
  return 0.5 // mild bonus for committing to a phase at all
}

// Combine a lineup (object role->player) + tactic into a single strength number.
export function computeStrength(lineup, tactic) {
  const players = Object.values(lineup)
  if (players.length === 0) return 0
  let wsum = 0
  let ovrAcc = 0
  let macroAcc = 0
  let formAcc = 0
  let consistAcc = 0
  for (const p of players) {
    const w = ROLE_WEIGHT[p.role] ?? 1
    wsum += w
    ovrAcc += p.ovr * w
    macroAcc += p.macro * w
    formAcc += p.form * w
    consistAcc += p.consist * w
  }
  const ovr = ovrAcc / wsum
  const macro = macroAcc / wsum
  const form = formAcc / wsum
  const consist = consistAcc / wsum

  const style = STYLE_META[tactic.style] || STYLE_META.BAL
  let s = ovr * style.mult
  s += (macro - 50) * 0.06 // macro discipline nudges strength
  s += (form - 50) * 0.12 // current form matters
  s += (consist - 50) * 0.02
  return s
}

// Single-game win probability for `mine` given both strengths.
export function winProb(myStr, oppStr) {
  return 1 / (1 + Math.exp(-(myStr - oppStr) / SCALE))
}

// Logistic-ish random draw with tactic variance.
function drawGame(myStr, oppStr, myTactic, oppTactic, rng) {
  const style = STYLE_META[myTactic.style] || STYLE_META.BAL
  const oppStyle = STYLE_META[oppTactic.style] || STYLE_META.BAL
  // effective strength includes phase edge and a variance-scaled noise term
  const edge = phaseEdge(myTactic.phase, oppTactic.phase)
  const base = myStr - oppStr + edge
  const noiseScale = ((style.variance + oppStyle.variance) / 2) * 4
  const noise = (rng() * 2 - 1) * noiseScale
  const adj = base + noise
  const p = winProb(0, -adj) // p(my win) for diff = adj
  return rng() < p
}

const FLAVOR_WIN = [
  'clean teamfight win',
  'objective control',
  'a perfectly executed engage',
  'a Baron steal swing',
  'superior macro',
  'a clutch outplay',
]
const FLAVOR_LOSS = [
  'got caught out of position',
  'lost the objective race',
  'fell behind in the lane phase',
  'mis-timed a fight',
  'couldn\'t close out the lead',
]

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}

// ============================================================================
// Enriched per-game detail (calibrated to docs/live-data-research.md §8).
// Everything below is conditioned on the pre-decided `winner`.
// ============================================================================

const ROLES = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']

// Hazen §7 role medians (calibration overrides).
const ROLE_KDA = {
  TOP: { k: 2, d: 3, a: 4 },
  JNG: { k: 2, d: 3, a: 7 },
  MID: { k: 3, d: 2, a: 5 },
  BOT: { k: 3, d: 2, a: 5 },
  SUP: { k: 1, d: 3, a: 9 },
}
const ROLE_CPM = { TOP: 8.4, JNG: 6.8, MID: 8.8, BOT: 9.2, SUP: 1.4 }
// Plausibility envelope for CS: [dur*lo - 15, dur*hi + 15].
const ROLE_CPM_RANGE = {
  TOP: [7.0, 9.5], JNG: [5.0, 8.0], MID: [7.4, 10.0], BOT: [7.6, 10.5], SUP: [0.5, 2.5],
}
const ROLE_DMG = { TOP: 0.22, JNG: 0.17, MID: 0.25, BOT: 0.27, SUP: 0.09 }
const ROLE_KP = { TOP: 0.55, JNG: 0.72, MID: 0.65, BOT: 0.68, SUP: 0.70 }

// Distribution weights (kill/assist/death shape per role identity).
const KILL_W = { TOP: 1.0, JNG: 0.9, MID: 1.25, BOT: 1.3, SUP: 0.35 }
const ASSIST_W = { TOP: 0.9, JNG: 1.25, MID: 1.0, BOT: 0.9, SUP: 1.5 }
const DEATH_W = { TOP: 1.05, JNG: 0.95, MID: 1.0, BOT: 1.0, SUP: 0.9 }
// Damage weights proportional to Hazen dmg shares (normalize to mean share).
const DMG_W = { TOP: 1.0, JNG: 0.77, MID: 1.14, BOT: 1.23, SUP: 0.41 }

const EVENT_TIEBREAK = { kill: 0, tower: 1, dragon: 2, teamfight: 3, baron: 4, ace: 5 }

// Approx-standard-normal draw from the injected rng (mean 0, sd ~1).
function gaussish(rng) {
  return (rng() + rng() + rng() - 1.5) * 2
}

function skillOf(p) {
  return 0.55 * p.ovr + 0.20 * p.mech + 0.10 * p.macro + 0.05 * p.consist + 0.10 * p.form
}

// Duration: median ~35, sd ~8, floor 20, cap 65, right-skewed.
function genDuration(winnerStrDiff, winnerTactic, rng, winnerFlavor) {
  const g = gaussish(rng)
  const skew = Math.max(0, g) * 1.5 // stretch only the upper tail
  const stomp = clamp(-winnerStrDiff * 0.35, -4, 2)
  let d = 35 + g * 8 + skew + stomp
  if (winnerTactic.phase === 'EARLY') d -= 1
  else if (winnerTactic.phase === 'LATE') d += 1
  // Strategy flavor (item 4): reuse of the existing duration hooks only.
  // All-false/omitted flavor leaves duration byte-identical.
  if (winnerFlavor?.late) d += 1
  if (winnerFlavor?.early || winnerFlavor?.aggr) d -= 1
  if (winnerTactic.style === 'DEF') d += 1.5
  return Math.round(clamp(d, 20, 65))
}

function sideSign(side) {
  return side === 'A' ? 1 : -1
}

// Fill a lineup gap so sims never crash on a 4-man lineup.
function rosterWithSubs(lineup, side) {
  const out = {}
  for (const role of ROLES) {
    if (lineup[role]) out[role] = lineup[role]
    else {
      out[role] = {
        id: `standin-${side}-${role}`,
        name: `Stand-in ${role}`,
        role,
        team: side,
        ovr: 70, mech: 70, macro: 70, consist: 70, form: 50,
      }
    }
  }
  return out
}

function genGoldWalkAndEvents(winner, durationMin, strDiff, tacticA, tacticB, rng, flavorA, flavorB) {
  const wSign = winner === 'A' ? 1 : -1
  const wTactic = winner === 'A' ? tacticA : tacticB
  const flA = flavorA || {}
  const flB = flavorB || {}
  const aggrSides = (tacticA.style === 'AGGR' ? 1 : 0) + (tacticB.style === 'AGGR' ? 1 : 0)
    + (flA.aggr ? 1 : 0) + (flB.aggr ? 1 : 0)
  const defSides = (tacticA.style === 'DEF' ? 1 : 0) + (tacticB.style === 'DEF' ? 1 : 0)
  const noiseMult = (1 + 0.075 * aggrSides - 0.075 * defSides) * (wTactic.style === 'AGGR' ? 1.075 : wTactic.style === 'DEF' ? 0.925 : 1)
  const lateSwingMult = (tacticA.phase === 'LATE' || tacticB.phase === 'LATE' || flA.late || flB.late) ? 1.15 : 1

  // Target final lead magnitude (close games ~1.5-5k, stomps 8-16k).
  let final = 2500 + Math.abs(strDiff) * 900 + rng() * 3500
  final = clamp(Math.round(final), 1500, 16000)
  const blowout = rng() < 0.15 && durationMin >= 24
  if (blowout) final = clamp(Math.max(final, Math.round(8000 + rng() * 5000)), 1500, 16000)
  const comeback = rng() < 0.25 && durationMin >= 24
  const rubberThreshold = 9000 + rng() * 4000
  const rubberPull = 0.3 + rng() * 0.2

  // Timeline sample times: 2,4,... + exact final at durationMin.
  const times = []
  for (let t = 2; t < durationMin; t += 2) times.push(t)
  if (times[times.length - 1] !== durationMin) times.push(durationMin)
  const n = times.length

  const driftBase = (wSign * final) / n
  const walk = new Array(n).fill(0)
  let cur = 0
  const comebackAt = comeback ? 12 + rng() * 10 : -1 // minute in [12,22]
  const comebackAmt = comeback ? 1000 + rng() * 2000 : 0
  let comebackApplied = false
  for (let i = 0; i < n; i++) {
    const t = times[i]
    const drift = driftBase * (blowout ? (1.1 + (1 - i / n) * 0.9) : (0.55 + rng() * 0.3))
    const noise = gaussish(rng) * (450 + 30 * t) * noiseMult
    cur += drift + noise
    // Rubber-band: pull back huge wrong-way leads before minute 20.
    if (t < 20 && wSign * cur < -rubberThreshold) {
      const excess = -(wSign * cur) - rubberThreshold
      cur += wSign * excess * rubberPull
    }
    if (comeback && !comebackApplied && t >= comebackAt) {
      cur -= wSign * comebackAmt
      comebackApplied = true
    }
    walk[i] = Math.round(cur)
  }

  // ---- Events (chronological at the end) ----
  const events = []
  const pushEvent = (t, type, side, note, swing) => {
    const tc = clamp(Math.round(t), 2, durationMin)
    events.push({ t: tc, type, side, note })
    if (swing) {
      let idx = 0
      for (let i = 0; i < n; i++) {
        if (times[i] <= tc) idx = i
        else break
      }
      const mag = swing * (tc >= 25 ? lateSwingMult : 1)
      walk[idx] = Math.round(walk[idx] + sideSign(side) * mag)
    }
  }

  const killRateMult = 1 + 0.125 * aggrSides - 0.1 * defSides
  const earlyFocus = tacticA.phase === 'EARLY' || tacticB.phase === 'EARLY' || flA.early || flB.early

  // Kill counts per side (enforce min 4; winner >= loser ~85%).
  let kA = Math.max(4, Math.round((5 + rng() * 5 + (durationMin - 30) * 0.08) * (tacticA.style === 'AGGR' ? 1.25 : tacticA.style === 'DEF' ? 0.8 : 1) * killRateMult))
  let kB = Math.max(4, Math.round((5 + rng() * 5 + (durationMin - 30) * 0.08) * (tacticB.style === 'AGGR' ? 1.25 : tacticB.style === 'DEF' ? 0.8 : 1) * killRateMult))
  const wK = winner === 'A' ? kA : kB
  const lK = winner === 'A' ? kB : kA
  if (lK > wK && rng() < 0.85) {
    const tmp = kA; kA = kB; kB = tmp
  }

  // Kill events across the game; first blood ~3-7 (median 5).
  const killEvents = []
  const totalKills = kA + kB
  const fbSide = rng() < 0.55 ? winner : (winner === 'A' ? 'B' : 'A')
  const fbT = clamp(Math.round(3 + rng() * 4), 2, durationMin)
  killEvents.push({ side: fbSide, firstBlood: true, forcedT: fbT })
  const poolA = kA - (fbSide === 'A' ? 1 : 0)
  const poolB = kB - (fbSide === 'B' ? 1 : 0)
  const order = []
  for (let i = 0; i < poolA; i++) order.push('A')
  for (let i = 0; i < poolB; i++) order.push('B')
  // deterministic shuffle with injected rng
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp
  }
  for (const s of order) killEvents.push({ side: s, firstBlood: false, forcedT: -1 })
  for (const ke of killEvents) {
    let t
    if (ke.forcedT > 0) t = ke.forcedT
    else if (earlyFocus && rng() < 0.35) t = 2 + rng() * Math.min(12, durationMin - 2)
    else t = 2 + rng() * (durationMin - 2)
    const mag = 300 + rng() * 200
    const label = ke.firstBlood ? 'First Blood' : 'kill'
    pushEvent(t, 'kill', ke.side, `${Math.round(t)}' — ${ke.side} ${label.toLowerCase()}`, mag)
  }

  // Towers: 5-11 total, winner-leaning split (towerBias shifts toward that side).
  const nTowers = 5 + Math.floor(rng() * 7)
  for (let i = 0; i < nTowers; i++) {
    let pWinT = 0.65
    if (winner === 'A') { if (flA.towerBias) pWinT += 0.15; if (flB.towerBias) pWinT -= 0.15 }
    else { if (flB.towerBias) pWinT += 0.15; if (flA.towerBias) pWinT -= 0.15 }
    const side = rng() < pWinT ? winner : (winner === 'A' ? 'B' : 'A')
    const firstTowers = events.filter((e) => e.type === 'tower' && e.side === side).length
    const mag = 650 + (firstTowers < 3 ? 150 : 0) + rng() * 100
    const firstBase = (flA.late || flB.late) ? 13 : 11 // swap/scale: first tower later
    const t = i === 0
      ? firstBase + rng() * Math.max(1, Math.min(4, durationMin - firstBase))
      : 6 + rng() * Math.max(1, Math.min(24, durationMin - 6))
    pushEvent(t, 'tower', side, `${Math.round(clamp(Math.round(t), 2, durationMin))}' — ${side} takes a tower`, mag)
  }

  // Dragons: first ~6-8, then every ~5 min (3-6 total; dragonBias shifts toward that side).
  const dragonSide = () => {
    let pWinD = 0.6
    if (winner === 'A') { if (flA.dragonBias) pWinD += 0.15; if (flB.dragonBias) pWinD -= 0.15 }
    else { if (flB.dragonBias) pWinD += 0.15; if (flA.dragonBias) pWinD -= 0.15 }
    return rng() < pWinD ? winner : (winner === 'A' ? 'B' : 'A')
  }
  let drakeT = 6 + rng() * 2
  let drakes = 0
  while (drakeT <= durationMin && drakes < 6) {
    const side = dragonSide()
    pushEvent(drakeT, 'dragon', side, `${Math.round(drakeT)}' — ${side} secures drake`, 200 + rng() * 200)
    drakes++
    drakeT += 4 + rng() * 3
    if (drakes >= 3 && rng() < 0.25) break
  }
  if (drakes < 3 && durationMin >= 12) {
    while (drakes < 3 && drakeT <= durationMin) {
      const side = dragonSide()
      pushEvent(drakeT, 'dragon', side, `${Math.round(drakeT)}' — ${side} secures drake`, 200 + rng() * 200)
      drakes++
      drakeT += 4 + rng() * 3
    }
  }

  // Teamfights: 2-5, minutes 10-38; loser-favored pre-inflection.
  let teamKillsA = kA
  let teamKillsB = kB
  const nFights = 2 + Math.floor(rng() * 4)
  for (let i = 0; i < nFights; i++) {
    const t = clamp(Math.round(10 + rng() * Math.max(1, Math.min(28, durationMin - 10))), 2, durationMin)
    let side
    if (comeback && t < comebackAt) side = (winner === 'A' ? 'B' : 'A')
    else side = rng() < 0.7 ? winner : (winner === 'A' ? 'B' : 'A')
    const mag = 1200 + rng() * 1300
    pushEvent(t, 'teamfight', side, `${t}' — ${side} wins the fight`, mag)
    const wCred = 1 + Math.floor(rng() * 3)
    const lCred = Math.floor(rng() * 2)
    if (side === 'A') { teamKillsA += (side === winner ? wCred : lCred); teamKillsB += (side === winner ? lCred : wCred) }
    else { teamKillsB += (side === winner ? wCred : lCred); teamKillsA += (side === winner ? lCred : wCred) }
  }

  // Barons: 20+, 1-2 per game — all to the eventual winner (strict majority).
  let nBarons = 0
  if (durationMin >= 21) {
    nBarons = 1
    if (durationMin >= 30 && rng() < 0.4) nBarons = 2
  } else if (rng() < 0.3) nBarons = 1
  for (let i = 0; i < nBarons; i++) {
    const t = clamp(Math.round(20 + rng() * Math.max(1, durationMin - 20)), 20, durationMin)
    pushEvent(t, 'baron', winner, `${t}' — ${winner} secures Baron`, 2000 + rng() * 2000)
  }

  // Aces: 0-2, 15+, mostly winner; each chained by a tower/baron within 2 min.
  const aceRoll = rng()
  const nAces = aceRoll < 0.4 ? 0 : aceRoll < 0.8 ? 1 : 2
  for (let i = 0; i < nAces; i++) {
    if (durationMin < 16) break
    const t = clamp(Math.round(15 + rng() * (durationMin - 15)), 15, durationMin)
    const side = rng() < 0.75 ? winner : (winner === 'A' ? 'B' : 'A')
    pushEvent(t, 'ace', side, `${t}' — ${side} ACEs the fight`, 1500 + rng() * 1500)
    if (side === 'A') teamKillsA += 2
    else teamKillsB += 2
    const followT = Math.min(durationMin, t + 1 + Math.floor(rng() * 2))
    const followType = nBarons > 0 && rng() < 0.4 ? 'baron' : 'tower'
    const followMag = followType === 'baron' ? 2000 + rng() * 2000 : 650 + rng() * 100
    pushEvent(followT, followType, side, `${followT}' — ${side} converts off the ace (${followType})`, followMag)
  }

  // Sort chronologically (ties: kill < tower < dragon < teamfight < baron < ace).
  events.sort((a, b) => a.t - b.t || EVENT_TIEBREAK[a.type] - EVENT_TIEBREAK[b.type])

  // Clamp every sample, then force the terminal point to the winner's lead.
  for (let i = 0; i < n; i++) walk[i] = clamp(walk[i], -18000, 18000)
  const target = wSign * final
  const rawLast = walk[n - 1]
  const gap = target - rawLast
  const tail = Math.min(3, n)
  for (let k = 0; k < tail; k++) {
    const i = n - tail + k
    if (i === n - 1) continue
    walk[i] = clamp(Math.round(walk[i] + (gap * (k + 1)) / (tail + 1)), -18000, 18000)
  }
  walk[n - 1] = target

  const goldTimeline = times.map((t, i) => ({ t, diff: walk[i] }))
  teamKillsA = Math.max(4, teamKillsA)
  teamKillsB = Math.max(4, teamKillsB)
  return { goldTimeline, events, teamKillsA, teamKillsB }
}

function distributePool(total, weights) {
  // Largest-remainder integer distribution; weights order = player order.
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  const exact = weights.map((w) => (total * w) / sum)
  const base = exact.map((e) => Math.floor(e))
  let rest = total - base.reduce((a, b) => a + b, 0)
  const frac = exact.map((e, i) => ({ i, f: e - Math.floor(e) }))
  frac.sort((a, b) => b.f - a.f)
  let k = 0
  while (rest > 0 && frac.length > 0) {
    base[frac[k % frac.length].i]++
    rest--
    k++
  }
  return base
}

function genPlayerStats(lineupA, lineupB, winner, durationMin, teamKillsA, teamKillsB, rng, roleDeltaA, roleDeltaB) {
  const rostA = rosterWithSubs(lineupA, 'A')
  const rostB = rosterWithSubs(lineupB, 'B')
  const sides = [
    { rost: rostA, side: 'A', teamKills: teamKillsA, oppKills: teamKillsB },
    { rost: rostB, side: 'B', teamKills: teamKillsB, oppKills: teamKillsA },
  ]
  const perfs = []
  for (const { rost, side, teamKills, oppKills } of sides) {
    const won = side === winner
    const players = ROLES.map((r) => rost[r])
    const rd = side === 'A' ? roleDeltaA || {} : roleDeltaB || {}
    const sk = players.map((p) => skillOf(p) + (rd[p.role] || 0))
    const killMult = won ? 1.15 : 1 / 1.15
    const deathMult = won ? 0.9 : 1 / 0.9
    const kills = distributePool(
      teamKills,
      players.map((p, i) => KILL_W[p.role] * (0.7 + sk[i] / 100) * (0.7 + rng() * 0.6) * killMult)
    )
    const deaths = distributePool(
      oppKills,
      players.map((p, i) => DEATH_W[p.role] * (1.6 - sk[i] / 100) * (0.7 + rng() * 0.6) * deathMult)
    )
    const totalAssists = Math.round(teamKills * (1.2 + rng() * 0.8))
    const assists = distributePool(
      totalAssists,
      players.map((p, i) => ASSIST_W[p.role] * (0.7 + sk[i] / 100) * (0.7 + rng() * 0.6))
    )
    const cs = players.map((p, i) => {
      const cpm = ROLE_CPM[p.role] ?? 7
      const [lo, hi] = ROLE_CPM_RANGE[p.role] ?? [5, 10]
      const rawCs = Math.round(cpm * durationMin * (0.9 + rng() * 0.2) * (0.93 + sk[i] / 1000))
      return clamp(rawCs, Math.max(0, Math.round(durationMin * lo - 15)), Math.round(durationMin * hi + 15))
    })
    const raw = players.map((p, i) => DMG_W[p.role] * (0.65 + (p.mech ?? 70) / 100) * (0.75 + rng() * 0.5) * (1 + kills[i] * 0.06))
    let sum = raw.reduce((a, b) => a + b, 0) || 1
    let shares = raw.map((d) => d / sum)
    // Keep support below the ADC on this side (mirrors Hazen 9% vs 27%).
    let guard = 0
    while (shares[4] >= shares[3] && guard < 3) {
      raw[4] *= 0.75
      sum = raw.reduce((a, b) => a + b, 0) || 1
      shares = raw.map((d) => d / sum)
      guard++
    }
    const rounded = shares.map((s) => Math.round(s * 1000) / 1000)
    let drift = Math.round((1 - rounded.reduce((a, b) => a + b, 0)) * 1000) / 1000
    let maxI = 0
    for (let i = 1; i < rounded.length; i++) if (rounded[i] > rounded[maxI]) maxI = i
    rounded[maxI] = Math.round((rounded[maxI] + drift) * 1000) / 1000

    for (let i = 0; i < players.length; i++) {
      const p = players[i]
      const dmgShare = clamp(rounded[i], 0, 1)
      const kp = Math.min(1, (kills[i] + assists[i]) / Math.max(1, teamKills))
      const roleAvg = ROLE_DMG[p.role] ?? 0.2
      const ratingRaw =
        5.0 +
        (kills[i] - deaths[i] * 0.9 + assists[i] * 0.55) * 0.28 +
        (dmgShare - roleAvg) * 9 +
        (sk[i] - 72) * 0.045 +
        (won ? 0.9 : -0.4) +
        (rng() * 0.6 - 0.3)
      perfs.push({
        id: p.id,
        name: p.name,
        role: p.role,
        side,
        kills: kills[i],
        deaths: deaths[i],
        assists: assists[i],
        cs: cs[i],
        dmgShare,
        kp: Math.round(kp * 100) / 100,
        rating: clamp(Math.round(ratingRaw * 10) / 10, 0, 10),
        mvp: false,
      })
    }
  }
  // MVP: exactly one, on the winning side — highest rating, then kills,
  // then dmgShare, then role order (deterministic, no extra rng).
  let best = null
  for (const pf of perfs) {
    if (pf.side !== winner) continue
    if (
      !best ||
      pf.rating > best.rating ||
      (pf.rating === best.rating && pf.kills > best.kills) ||
      (pf.rating === best.rating && pf.kills === best.kills && pf.dmgShare > best.dmgShare)
    ) {
      best = pf
    }
  }
  if (best) best.mvp = true
  return perfs
}

// ============================================================================
// In-sim strategic choices (item 4; Season + Career, Campaign unaffected).
// Per-role ovr-equivalent deltas for strategy.roam (null = no effect).
// Net strength = Σ(w·δ)/Σw over ROLE_WEIGHT (Σw = 5.1):
//   ROAM (6 + 4.4 − 6.6)/5.1 ≈ +0.75 · STAY (−2 − 1.1 + 6.6 + 1.8)/5.1 ≈ +1.0
// ============================================================================
export const ROAM_DELTAS = {
  ROAM: { TOP: 0, JNG: 6, MID: 4, BOT: -6, SUP: 0 },
  STAY: { TOP: 0, JNG: -2, MID: -1, BOT: 6, SUP: 2 },
}

const ROLE_WSUM = 5.1 // TOP:1.0 JNG:1.0 MID:1.1 BOT:1.1 SUP:0.9

// Per-role ovr-equivalent delta map for a roam choice (all-zero when null).
export function roleDeltasFor(roam) {
  const base = { TOP: 0, JNG: 0, MID: 0, BOT: 0, SUP: 0 }
  const src = (roam && ROAM_DELTAS[roam]) || null
  if (!src) return base
  for (const r of ROLES) base[r] = src[r] || 0
  return base
}

// → { delta: number, flavor: { aggr, late, early, dragonBias, towerBias } }
// Pure arithmetic on (strat, tactic). Consumes NO rng.
// strat: null | { comp, roam, swap, wincon } (same shape as state.strategy).
// flavor flags only select EXISTING cosmetic branches (no strength, no winner flip).
export function strategyDelta(strat, tactic) {
  const none = { aggr: false, late: false, early: false, dragonBias: false, towerBias: false }
  if (!strat) return { delta: 0, flavor: none }
  const phase = tactic?.phase
  const compTerm = strat.comp === 'AGGR' || strat.comp === 'SCALE' ? 1.0 : 0
  const rd = roleDeltasFor(strat.roam)
  const roleTerm = (rd.TOP * 1.0 + rd.JNG * 1.0 + rd.MID * 1.1 + rd.BOT * 1.1 + rd.SUP * 0.9) / ROLE_WSUM
  const swapDelta = !strat.swap ? 0 : phase === 'EARLY' ? -1.0 : 1.0
  let winconTerm = 0
  if (strat.wincon === 'DRAGONS' || strat.wincon === 'SPLIT') winconTerm = 1.25
  else if (strat.wincon === 'SCALE') winconTerm = phase === 'EARLY' ? 0.25 : 1.0
  else if (strat.wincon === 'EARLY') winconTerm = phase === 'LATE' ? 0.25 : 1.0
  const delta = clamp(compTerm + roleTerm + swapDelta + winconTerm, -2.5, 2.5)
  const flavor = {
    aggr: strat.comp === 'AGGR' || strat.wincon === 'DRAGONS',
    late: strat.comp === 'SCALE' || !!strat.swap || strat.wincon === 'SCALE',
    early: strat.wincon === 'EARLY',
    dragonBias: strat.wincon === 'DRAGONS',
    towerBias: strat.wincon === 'SPLIT',
  }
  return { delta, flavor }
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// Rewrite event notes with real team/player names and gold. Deterministic
// (no rng): killers and victims are dealt round-robin weighted by their
// actual kills/deaths, so re-runs stay byte-identical and the main rng
// stream is untouched. Also stamps killer/victim on kill events for live
// UI (the IGL game-state panel attributes kills as the ticker reveals).
function enrichEvents(events, players, labelA, labelB) {
  const bySide = { A: [], B: [] }
  for (const p of players) (bySide[p.side] === undefined ? bySide.A : bySide[p.side]).push(p)
  const weighted = (list, key) => {
    const out = []
    list.forEach((p, i) => {
      const n = Math.max(0, Math.round(p[key] ?? 0))
      for (let k = 0; k < n; k++) out.push(i)
    })
    if (out.length === 0) list.forEach((_, i) => out.push(i))
    return out
  }
  const killW = { A: weighted(bySide.A, 'kills'), B: weighted(bySide.B, 'kills') }
  const deathW = { A: weighted(bySide.A, 'deaths'), B: weighted(bySide.B, 'deaths') }
  const ki = { A: 0, B: 0 }
  const di = { A: 0, B: 0 }
  const towers = { A: 0, B: 0 }
  const drakes = { A: 0, B: 0 }
  for (const e of events) {
    const t = Math.round(e.t)
    const mine = e.side === 'A' ? labelA : labelB
    const foe = e.side === 'A' ? labelB : labelA
    if (e.type === 'kill') {
      const kl = bySide[e.side][killW[e.side][ki[e.side] % killW[e.side].length] ?? 0] ?? {}
      ki[e.side]++
      const opp = e.side === 'A' ? 'B' : 'A'
      const vc = bySide[opp][deathW[opp][di[opp] % deathW[opp].length] ?? 0] ?? {}
      di[opp]++
      e.killer = kl.name
      e.victim = vc.name
      const first = /first blood/i.test(e.note)
      e.note = `${t}' — ${first ? 'First Blood: ' : ''}${mine} ${kl.name ?? '?'} kills ${foe} ${vc.name ?? '?'} (+${first ? 400 : 300}g)`
    } else if (e.type === 'tower') {
      towers[e.side]++
      const conv = /converts off the ace/i.test(e.note)
      e.note = conv
        ? `${t}' — ${mine} converts off the ace (tower)`
        : `${t}' — ${mine} takes ${ordinal(towers[e.side])} tower`
    } else if (e.type === 'dragon') {
      drakes[e.side]++
      e.note = `${t}' — ${mine} secures ${ordinal(drakes[e.side])} dragon`
    } else if (e.type === 'teamfight') {
      e.note = `${t}' — ${mine} wins the teamfight`
    } else if (e.type === 'baron') {
      const conv = /converts off the ace/i.test(e.note)
      e.note = conv
        ? `${t}' — ${mine} converts off the ace (baron)`
        : `${t}' — ${mine} secures Baron`
    } else if (e.type === 'ace') {
      e.note = `${t}' — ${mine} ACEs ${foe}`
    }
  }
  return events
}

function simulateGame(lineupA, lineupB, winner, gameIndex, note, strDiff, tacticA, tacticB, rng, fx = {}) {
  const winnerStrDiff = winner === 'A' ? strDiff : -strDiff
  const winnerTactic = winner === 'A' ? tacticA : tacticB
  const winnerFlavor = winner === 'A' ? fx.flavorA : fx.flavorB
  const durationMin = genDuration(winnerStrDiff, winnerTactic, rng, winnerFlavor)
  const { goldTimeline, events, teamKillsA, teamKillsB } = genGoldWalkAndEvents(
    winner, durationMin, strDiff, tacticA, tacticB, rng, fx.flavorA, fx.flavorB
  )
  const players = genPlayerStats(lineupA, lineupB, winner, durationMin, teamKillsA, teamKillsB, rng, fx.roleA, fx.roleB)
  const killsA = players.filter((p) => p.side === 'A').reduce((a, p) => a + p.kills, 0)
  const killsB = players.filter((p) => p.side === 'B').reduce((a, p) => a + p.kills, 0)
  enrichEvents(events, players, fx.labelA ?? 'Team A', fx.labelB ?? 'Team B')
  return { game: gameIndex, winner, durationMin, goldTimeline, events, players, note, killsA, killsB }
}

// Simulate a Best-of-3 series.
// lineupA/B: {TOP:player,...}; tacticA/B: {style,phase}; rng: ()=>[0,1)
// extra: { aBonus, bBonus, aStrat, bStrat } — flat strength add-ons (career
//   coach bonus) + structured strategy snapshots (item 4, same shape as
//   state.strategy, null on AI sides); default-zero leaves all existing
//   callers byte-identical.
// P1 item 7: extra.bigMatch (default false) arms big_game_player; trait
//   deltas fold in at the strategyDelta site. Trait-free lineups consume zero
//   extra rng and produce byte-identical output (with and without bigMatch).
// P1 item 10: extra.fearless (default false); FEARLESS_PENALTY strength points
//   off the game-N winner's next game (biased only). Base sA/sB untouched.
// returns { winner, aWins, bWins, games:[GameResult...], log:[...], sA, sB }
// (+ `lineups: { A, B }` snapshots ONLY when a trait carrier exists, so the
// reducer can persist revealed flags; trait-free series keep the exact P0 shape).
// extra.simMode: 'biased' (default) | 'random' | 'manual'.
// extra.forcedWinner: 'A' | 'B' | null — honored ONLY when simMode === 'manual'.
// extra.traitSeed: reserved (P1 item 7); when null, trait rng draws use the
//   series rng. Currently informational only.
// sA/sB are computed + returned in all modes (display-only under random/manual).
export const FEARLESS_PENALTY = 1.0
export function simulateSeries(lineupA, tacticA, lineupB, tacticB, rng = Math.random, labelA = 'Team A', labelB = 'Team B', extra = {}) {
  const { aBonus = 0, bBonus = 0, aStrat = null, bStrat = null, simMode: simModeRaw, forcedWinner: forcedWinnerRaw, bigMatch: bigMatchRaw, fearless: fearlessRaw } = extra ?? {}
  const bigMatch = bigMatchRaw ?? false
  const fearless = fearlessRaw ?? false
  let simMode = simModeRaw ?? 'biased'
  if (simMode !== 'biased' && simMode !== 'random' && simMode !== 'manual') simMode = 'biased'
  let forcedWinner = forcedWinnerRaw ?? null
  if (forcedWinner !== 'A' && forcedWinner !== 'B') forcedWinner = null
  // Manual without a valid forced winner falls back to biased (with a log line).
  let manualFallback = false
  if (simMode === 'manual' && !forcedWinner) {
    simMode = 'biased'
    manualFallback = true
  }
  const dA = strategyDelta(aStrat, tacticA)
  const dB = strategyDelta(bStrat, tacticB)
  // P1 item 7: engine-owned working copies (normalized trait objects) so the
  // engine never mutates rosters. random/manual still compute+log traits via
  // a dummy rng so the series rng stream (and winners) are untouched.
  const snapA = snapLineup(lineupA)
  const snapB = snapLineup(lineupB)
  const hasCarriers = hasTraitCarriers(snapA) || hasTraitCarriers(snapB)
  const log = []
  const traitRng = simMode === 'biased' ? rng : () => 0.5
  const tA = traitDelta(snapA, { deciding: false, bigMatch }, traitRng, log)
  const tB = traitDelta(snapB, { deciding: false, bigMatch }, traitRng, log)
  const sA = computeStrength(lineupA, tacticA) + (aBonus || 0) + dA.delta + tA.delta
  const sB = computeStrength(lineupB, tacticB) + (bBonus || 0) + dB.delta + tB.delta
  const fx = {
    flavorA: dA.flavor, flavorB: dB.flavor,
    roleA: roleDeltasFor(aStrat?.roam), roleB: roleDeltasFor(bStrat?.roam),
    labelA, labelB,
  }
  const strDiff = sA - sB
  const games = []
  let aWins = 0
  let bWins = 0
  const maxGames = 3
  const need = 2
  log.push(`${labelA} strength ${sA.toFixed(1)} vs ${labelB} ${sB.toFixed(1)}`)
  if (manualFallback) log.push('Manual resolver missing forcedWinner — falling back to biased.')
  if (fearless && simMode !== 'biased') log.push(`Fearless on — no effect under ${simMode}.`)

  let g = 1
  let prevWinner = null // 'A' | 'B' | null (P1 item 10)
  while (g <= maxGames && aWins < need && bWins < need) {
    // P1 item 7: game g is a decider when it is the last possible game and
    // the series is tied (BO3: g === 3 && 1–1). Clutch fires additively here.
    const deciding = g === maxGames && aWins === 1 && bWins === 1
    const clutchA = deciding && simMode === 'biased' ? clutchBonus(snapA, log) : 0
    const clutchB = deciding && simMode === 'biased' ? clutchBonus(snapB, log) : 0
    if (deciding && simMode !== 'biased') {
      // Computed + logged, but never decides (same rule as sA/sB).
      clutchBonus(snapA, log)
      clutchBonus(snapB, log)
    }
    // P1 item 10: the game-N winner plays off comfort in game N+1 (biased only).
    let effA = sA + clutchA
    let effB = sB + clutchB
    if (fearless && simMode === 'biased' && prevWinner) {
      if (prevWinner === 'A') effA -= FEARLESS_PENALTY
      else effB -= FEARLESS_PENALTY
      log.push(`Fearless: ${prevWinner === 'A' ? labelA : labelB} off comfort (−1.0).`)
    }
    let aWon
    if (simMode === 'random') {
      // Ratings ignored; per-game winner from a single rng draw. Same
      // simulateGame call below so cosmetics/duration/stats keep working.
      aWon = rng() < 0.5
    } else if (simMode === 'manual') {
      aWon = forcedWinner === 'A'
    } else {
      aWon = drawGame(effA, effB, tacticA, tacticB, rng)
    }
    const note = aWon ? pick(FLAVOR_WIN, rng) : pick(FLAVOR_LOSS, rng)
    const winner = aWon ? 'A' : 'B'
    const detail = simulateGame(lineupA, lineupB, winner, g, note, strDiff, tacticA, tacticB, rng, fx)
    games.push(detail)
    if (aWon) aWins++;
    else bWins++
    prevWinner = aWon ? 'A' : 'B' // P1 item 10: next game penalizes this side
    log.push(`Game ${g}: ${aWon ? labelA : labelB} takes it via ${note}.`)
    log.push(`Game ${g}: ${detail.durationMin} min, ${detail.killsA}-${detail.killsB} kills.`)
    g++
  }
  const winner = aWins > bWins ? 'A' : 'B'
  log.push(`Series: ${labelA} ${aWins} – ${bWins} ${labelB}. Winner: ${winner === 'A' ? labelA : labelB}.`)
  const out = { winner, aWins, bWins, games, log, sA, sB }
  // P1 item 7: return post-series snapshots ONLY when a trait carrier exists
  // (revealed flags for the reducer to persist). Trait-free series keep the
  // exact P0 return shape.
  if (hasCarriers) out.lineups = { A: snapA, B: snapB }
  return out
}

// Single-game sim for draft/IGL modes (per-game bonuses from drafts/calls).
// Mirrors one iteration of simulateSeries' game loop: same strength formula,
// same drawGame, same simulateGame cosmetics. Returns { aWon, game, sA, sB }.
export function simulateSingleGame(lineupA, tacticA, lineupB, tacticB, rng = Math.random, labelA = 'Team A', labelB = 'Team B', extra = {}) {
  const { aBonus = 0, bBonus = 0, aStrat = null, bStrat = null, gameIndex = 1,
    bigMatch = false, deciding = false, fearless = false, previousWinner = null, forcedWinner = null } = extra ?? {}
  const simMode = extra?.simMode === 'random' ? 'random'
    : extra?.simMode === 'manual' && ['A', 'B'].includes(forcedWinner) ? 'manual' : 'biased'
  const dA = strategyDelta(aStrat, tacticA)
  const dB = strategyDelta(bStrat, tacticB)
  const snapA = snapLineup(lineupA)
  const snapB = snapLineup(lineupB)
  const log = []
  const traitRng = simMode === 'biased' ? rng : () => 0.5
  const tA = traitDelta(snapA, { deciding: false, bigMatch }, traitRng, log)
  const tB = traitDelta(snapB, { deciding: false, bigMatch }, traitRng, log)
  const sA = computeStrength(lineupA, tacticA) + (aBonus || 0) + dA.delta + tA.delta
  const sB = computeStrength(lineupB, tacticB) + (bBonus || 0) + dB.delta + tB.delta
  const fx = {
    flavorA: dA.flavor, flavorB: dB.flavor,
    roleA: roleDeltasFor(aStrat?.roam), roleB: roleDeltasFor(bStrat?.roam),
    labelA, labelB,
  }
  const strDiff = sA - sB
  const clutchA = deciding ? clutchBonus(snapA, log) : 0
  const clutchB = deciding ? clutchBonus(snapB, log) : 0
  const effA = sA + clutchA - (fearless && previousWinner === 'A' ? FEARLESS_PENALTY : 0)
  const effB = sB + clutchB - (fearless && previousWinner === 'B' ? FEARLESS_PENALTY : 0)
  const aWon = simMode === 'manual' ? forcedWinner === 'A'
    : simMode === 'random' ? rng() < 0.5 : drawGame(effA, effB, tacticA, tacticB, rng)
  const note = aWon ? pick(FLAVOR_WIN, rng) : pick(FLAVOR_LOSS, rng)
  const game = simulateGame(lineupA, lineupB, aWon ? 'A' : 'B', gameIndex, note, strDiff, tacticA, tacticB, rng, fx)
  const out = { aWon, game, sA, sB, log }
  if (hasTraitCarriers(snapA) || hasTraitCarriers(snapB)) out.lineups = { A: snapA, B: snapB }
  return out
}
