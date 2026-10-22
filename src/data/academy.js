// ============================================================================
// LCK Manager — academy prospects (P1 item 8)
// ----------------------------------------------------------------------------
// Academy prospects are young (17-19), ~10-14 ovr below their org's tier.
// Pool is GENERATED, not hand-authored: 1-2 prospects per org.
// Prospect shape = normal player + `academy: true` flag; `traits: []`,
// `potential: clamp(ovr + 8)` (headroom — they are prospects).
// ============================================================================

import { ROLES, makePlayer } from './lck.js'

export const ACADEMY_PER_ORG = 2
export const ACADEMY_NAMES = ['Rookie', 'Challenger', 'Prodigy', 'Apprentice', 'Trainee', 'Prospect']

// Tiny deterministic string hash -> [0,1).
function hash01(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

const clamp = (v) => Math.max(45, Math.min(99, Math.round(v)))

// Single prospect: age 17-19, ovr = clamp(tier - 12 + jitter in [-4, +4])
// → ovr in [tier-16, tier-8].
export function buildAcademyPlayer(teamId, tier, role = null, rng = Math.random) {
  const r = role ?? ROLES[(rng() * ROLES.length) | 0]
  const ovr = clamp(tier - 12 + (Math.floor(rng() * 9) - 4))
  const age = 17 + ((rng() * 3) | 0)
  const base = makePlayer(teamId, academyNameFor(teamId, r), r, tier, false, age, null, [])
  return {
    ...base,
    ovr,
    // Keep sub-line ratings near the prospect ovr so the card reads sanely.
    mech: clamp(ovr + (rng() * 6 - 3)),
    macro: clamp(ovr + (rng() * 6 - 3)),
    consist: clamp(ovr + (rng() * 6 - 3)),
    age,
    potential: clamp(ovr + 8),
    traits: [],
    academy: true,
  }
}

function academyNameFor(teamId, role) {
  const idx = Math.floor(hash01(`${teamId}:${role}`) * ACADEMY_NAMES.length) % ACADEMY_NAMES.length
  return `${ACADEMY_NAMES[idx]} ${role}`
}

// 1-2 prospects for one org.
export function academyFor(teamId, tier, rng = Math.random) {
  const n = 1 + ((rng() * ACADEMY_PER_ORG) | 0)
  const roles = [...ROLES]
  // Fisher-Yates with the injected rng so role coverage is deterministic.
  for (let i = roles.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0
    ;[roles[i], roles[j]] = [roles[j], roles[i]]
  }
  const out = []
  for (let i = 0; i < n; i++) out.push(buildAcademyPlayer(teamId, tier, roles[i % roles.length], rng))
  return out
}
