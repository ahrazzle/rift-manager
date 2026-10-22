// ============================================================================
// LCK Manager — hidden player traits (P1 item 7)
// ----------------------------------------------------------------------------
// One trait = { id, name, desc, trigger, magnitude }.
// trigger: 'series' (evaluated per simulateSeries) | 'season' (per developPlayer).
// Player field (additive): player.traits = [] default; when present:
//   [{ id, revealed: false, fired: false, spike: 0 }]
// revealed: set true the first time the trait fires (log line). fired/spike:
// one_season_wonder bookkeeping only. Engine never mutates rosters — it works
// on copies and returns snapshots; the reducer persists `revealed`.
// ============================================================================

export const TRAIT_POOL = [
  { id: 'one_season_wonder', name: 'One-Season Wonder', desc: 'A career year out of nowhere — then gravity.', trigger: 'season', magnitude: 7 },
  { id: 'injury_prone',      name: 'Injury Prone',      desc: 'Misses time; plays below himself.',                  trigger: 'series',  magnitude: 1.0 },
  { id: 'big_game_player',   name: 'Big-Game Player',   desc: 'Grows in finals and deciders.',                      trigger: 'series',  magnitude: 1.0 },
  { id: 'clutch',            name: 'Clutch',            desc: 'Steadiest when the series is on the line.',           trigger: 'series',  magnitude: 1.0 },
  { id: 'inconsistent',      name: 'Inconsistent',      desc: 'Unpredictable series-to-series.',                     trigger: 'series',  magnitude: 1.5 },
]
export const TRAIT_BY_ID = Object.fromEntries(TRAIT_POOL.map((t) => [t.id, t]))

export const SERIES_TRAIT_IDS = TRAIT_POOL.filter((t) => t.trigger === 'series').map((t) => t.id)

// Roll traits for one fresh player. Pure + rng. Default rates keep the
// league sane: ~8% get exactly one trait, ~1% get two, rest get none.
// makePlayer / career-start call this; unbiased/default players pass traits: [].
export function rollTraits(rng = Math.random) {
  const pickOne = () => TRAIT_POOL[(rng() * TRAIT_POOL.length) | 0].id
  const r = rng()
  if (r < 0.01) {
    const first = pickOne()
    let second = pickOne()
    if (second === first) second = TRAIT_POOL[(TRAIT_POOL.indexOf(TRAIT_BY_ID[first]) + 1) % TRAIT_POOL.length].id
    return [first, second]
  }
  if (r < 0.09) return [pickOne()]
  return []
}

// Normalize a player's traits to the locked object shape (no mutation).
export function normalizeTraits(traits) {
  if (!Array.isArray(traits)) return []
  return traits.map((t) => {
    if (typeof t === 'string') return { id: t, revealed: false, fired: false, spike: 0 }
    return { id: t.id, revealed: !!t.revealed, fired: !!t.fired, spike: t.spike ?? 0 }
  })
}

function carriersOf(lineup, traitId) {
  return Object.values(lineup ?? {}).filter((p) =>
    (p.traits || []).some((t) => (typeof t === 'string' ? t : t.id) === traitId),
  )
}

function reveal(carrier, traitId, logArr) {
  const entry = (carrier.traits || []).find((t) => (typeof t === 'string' ? t : t.id) === traitId)
  if (!entry || (typeof entry === 'object' && entry.revealed)) return false
  if (typeof entry === 'object') entry.revealed = true
  const meta = TRAIT_BY_ID[traitId]
  if (logArr && meta) logArr.push(`${carrier.name} reveals ${meta.name}!`)
  return true
}

// traitDelta(lineup, ctx, rng, logArr) → { delta }
// ctx = { deciding: bool (this game is a series decider), bigMatch: bool }.
// Mutates `revealed` on the passed lineup COPIES only (engine-owned).
// Trait-free lineups: delta 0, zero rng consumed, zero log lines.
export function traitDelta(lineup, ctx = {}, rng = Math.random, logArr = null) {
  const { deciding = false, bigMatch = false } = ctx ?? {}
  let delta = 0
  // injury_prone: -1.0 per carrier (max -2.0). No rng, no draw-order change.
  const ip = carriersOf(lineup, 'injury_prone').slice(0, 2)
  if (ip.length > 0) {
    delta += -1.0 * ip.length
    for (const p of ip) reveal(p, 'injury_prone', logArr)
  }
  // big_game_player: +1.0 per carrier (max +2.0) iff bigMatch.
  if (bigMatch) {
    const bg = carriersOf(lineup, 'big_game_player').slice(0, 2)
    if (bg.length > 0) {
      delta += 1.0 * bg.length
      for (const p of bg) reveal(p, 'big_game_player', logArr)
    }
  }
  // clutch: +1.0 per carrier (max +2.0) iff deciding.
  if (deciding) {
    const cl = carriersOf(lineup, 'clutch').slice(0, 2)
    if (cl.length > 0) {
      delta += 1.0 * cl.length
      for (const p of cl) reveal(p, 'clutch', logArr)
    }
  }
  // inconsistent: ±1.5 uniform draw per carrier (max 2). Only consumes rng
  // when a carrier exists.
  const inc = carriersOf(lineup, 'inconsistent').slice(0, 2)
  for (const p of inc) {
    delta += (rng() * 2 - 1) * 1.5
    reveal(p, 'inconsistent', logArr)
  }
  return { delta }
}

// Decider-only clutch bonus for one side's lineup copy (game-3 path).
// Additive, arithmetic only — never consumes rng.
export function clutchBonus(lineup, logArr = null) {
  const cl = carriersOf(lineup, 'clutch').slice(0, 2)
  if (cl.length === 0) return 0
  for (const p of cl) reveal(p, 'clutch', logArr)
  return 1.0 * cl.length
}
