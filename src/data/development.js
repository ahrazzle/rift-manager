// ============================================================================
// LCK Manager — player development (P0 engine, item 5)
// ----------------------------------------------------------------------------
// Annual OVR delta ranges per integer age. Values are TUNABLE DATA, not
// engine constants. RiftScore shape: big growth at 16, ~flat at 24, decline
// from 30, hard decline by 34. 35+ reuses the 34 band.
// ============================================================================

// Annual OVR delta range per integer age: [min, max] inclusive.
export const growthByAge = {
  16: [3, 8], 17: [3, 7], 18: [2, 6], 19: [2, 5], 20: [1, 4],
  21: [1, 4], 22: [0, 3], 23: [0, 3], 24: [-1, 2], 25: [-1, 2],
  26: [-2, 1], 27: [-2, 1], 28: [-2, 0], 29: [-3, 0],
  30: [-6, 0], 31: [-6, 0], 32: [-6, -1], 33: [-6, -1],
  34: [-8, -2], // hard decline; 35+ reuses the 34 band
}

// Hard ceiling: no player exceeds Math.min(POTENTIAL_CEILING, potential).
export const POTENTIAL_CEILING = 99

// OVR cap for a player of `age` with base `potential` (0-99). Pure, no rng.
export function ageCeiling(age, potential) {
  return Math.min(POTENTIAL_CEILING, potential)
}

// Pure growth hint for UI (Career lineup / squad). No RNG. Potential is a fixed
// cap (ageCeiling ignores age). Labels: rising | steady | declining | at ceiling.
export function growthOutlook(player) {
  const age = player?.age ?? 21
  const ovr = player?.ovr ?? 70
  const potential = player?.potential ?? Math.min(POTENTIAL_CEILING, ovr + 5)
  const ceiling = ageCeiling(age, potential)
  if (ovr >= ceiling) return 'at ceiling'
  const bandAge = Math.max(16, Math.min(34, age + 1))
  const [min, max] = growthByAge[bandAge]
  if (max >= 3) return 'rising'
  if (max <= 0 && min <= -2) return 'declining'
  return 'steady'
}

// One annual delta for `age`, drawn from growthByAge via injected rng.
// Pure + rng: integer uniform in [min, max] for growthByAge[clamp(age,16,34)]
// (35+ uses the 34 band; <16 uses the 16 band).
export function growthRoll(age, rng = Math.random) {
  const a = Math.max(16, Math.min(34, age))
  const [min, max] = growthByAge[a]
  return min + Math.floor(rng() * (max - min + 1))
}

const clampRating = (v, hi = 99) => Math.max(45, Math.min(hi, Math.round(v)))

function driftToward(attr, target) {
  if (attr < target) return clampRating(attr + 1)
  if (attr > target) return clampRating(attr - 1)
  return attr
}

// Full annual update for one player object → new player object (no mutation).
// { ...player, age: age + 1, ovr: clamped delta, mech/macro/consist drift ±1
// toward ovr }. potential NEVER changes.
// P1 item 7 (additive): one_season_wonder carriers spike once (+6..+9, clamped
// to ceiling, fired/spike/revealed stamped), then regress by exactly `spike`
// on the next tick. All other traits ignore the season tick. Uses the
// off-season Math.random path, never the seeded match path.
export function developPlayer(player, rng = Math.random) {
  const age = player.age ?? 21
  const potential = player.potential ?? clampRating(player.ovr + 5)
  const newAge = age + 1
  const ceiling = ageCeiling(newAge, potential)
  const delta = growthRoll(newAge, rng)
  let ovr = clampRating(player.ovr + delta, ceiling)
  let traits = player.traits
  const oswIdx = Array.isArray(player.traits)
    ? player.traits.findIndex((t) => (typeof t === 'string' ? t : t.id) === 'one_season_wonder')
    : -1
  if (oswIdx >= 0) {
    const entry = player.traits[oswIdx]
    const fired = typeof entry === 'object' ? !!entry.fired : false
    const spike = typeof entry === 'object' ? (entry.spike ?? 0) : 0
    if (!fired && rng() < 0.15) {
      const applied = 6 + Math.floor(rng() * 4) // +6..+9
      ovr = clampRating(Math.min(ovr + applied, ceiling))
      traits = player.traits.map((t, i) =>
        i === oswIdx
          ? { id: 'one_season_wonder', revealed: true, fired: true, spike: applied }
          : (typeof t === 'string' ? { id: t, revealed: false, fired: false, spike: 0 } : { ...t }),
      )
    } else if (fired && spike > 0) {
      ovr = clampRating(ovr - spike)
      traits = player.traits.map((t, i) =>
        i === oswIdx && typeof t === 'object' ? { ...t, spike: 0 } : t,
      )
    }
  }
  return {
    ...player,
    age: newAge,
    potential,
    ovr,
    traits,
    mech: driftToward(player.mech, ovr),
    macro: driftToward(player.macro, ovr),
    consist: driftToward(player.consist, ovr),
  }
}
