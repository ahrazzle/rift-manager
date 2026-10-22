// ============================================================================
// LCK Manager — League data (MVP)
// ----------------------------------------------------------------------------
// Team names / player names reference the LCK for flavor.
// ALL ratings are GAME-BALANCED FICTIONAL VALUES for the simulation, not
// official stats. Edit this file to reskin the league.
//
// To add/remove a team: edit TEAMS below. To change rosters: edit each team's
// `roster` name-lists (starter first, sub second). Stats are generated
// deterministically from the player's name + the team tier, so the file stays
// small and readable.
// ============================================================================

import { rollTraits, normalizeTraits } from './traits.js'

export const ROLES = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']
export const ROLE_LABEL = {
  TOP: 'Top',
  JNG: 'Jungle',
  MID: 'Mid',
  BOT: 'Bot',
  SUP: 'Support',
}

// Tiny deterministic string hash -> [0,1)
function hash01(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // map to [0,1)
  return ((h >>> 0) % 100000) / 100000
}

// Deterministic jitter in [-spread, +spread] from a seed string.
function jitter(seed, spread) {
  return (hash01(seed) * 2 - 1) * spread
}

// Build a player from a name + role + team tier. ovr is centered on tier,
// with mech/macro/consist spread around it. Sub gets a small penalty.
// Build a player from a name + role + team tier. ovr is centered on tier,
// with mech/macro/consist spread around it. Sub gets a small penalty.
// Trailing `traits`: null → rollTraits() at the low background rate;
// undefined (omitted) or [] → guaranteed-clean player. Existing callers pass
// nothing → ratings byte-identical, `traits` just rides along.
export function makePlayer(teamId, name, role, tier, isStarter, age = 21, potential = null, traits) {
  const seed = `${teamId}:${role}:${name}`
  const base = tier + jitter(seed, 4) - (isStarter ? 0 : 6)
  const clamp = (v) => Math.max(45, Math.min(99, Math.round(v)))
  const ovr = clamp(base)
  const mech = clamp(base + jitter(seed + 'm', 6))
  const macro = clamp(base + jitter(seed + 'a', 6))
  const consist = clamp(base + jitter(seed + 'c', 6))
  const form = 50 // starts neutral; evolves via training/in-match results
  const rolled = traits === null ? rollTraits() : (traits ?? [])
  return {
    id: seed,
    name,
    role,
    team: teamId,
    ovr,
    mech,
    macro,
    consist,
    form,
    age,
    potential: potential ?? clamp(ovr + 5),
    traits: normalizeTraits(rolled),
  }
}

// ---- Team definitions -------------------------------------------------------
// tier: baseline overall the roster is built around (higher = stronger team).
// roster: [starterName, subName] per role.
const TEAMS_RAW = [
  {
    id: 'T1',
    name: 'T1',
    short: 'T1',
    color: '#e2012d',
    tier: 90,
    roster: {
      TOP: ['Zeus', 'Doran'],
      JNG: ['Oner', 'Yohan'],
      MID: ['Faker', 'Poby'],
      BOT: ['Gumayusi', 'Smash'],
      SUP: ['Keria', 'Sky'],
    },
  },
  {
    id: 'GEN',
    name: 'Gen.G',
    short: 'GEN',
    color: '#aa8a00',
    tier: 89,
    roster: {
      TOP: ['Kiin', 'Moment'],
      JNG: ['Canyon', 'Hanse'],
      MID: ['Chovy', 'Grizzly'],
      BOT: ['Peyz', 'Kuma'],
      SUP: ['Lehends', 'Duro'],
    },
  },
  {
    id: 'HLE',
    name: 'Hanwha Life Esports',
    short: 'HLE',
    color: '#ff7a00',
    tier: 87,
    roster: {
      TOP: ['Doran', 'Zeus'],
      JNG: ['Peanut', 'Croco'],
      MID: ['Zeka', 'Viper'],
      BOT: ['Viper', 'SamD'],
      SUP: ['Delight', 'Life'],
    },
  },
  {
    id: 'DK',
    name: 'Dplus KIA',
    short: 'DK',
    color: '#002fa7',
    tier: 85,
    roster: {
      TOP: ['Aiming', 'Siwoo'],
      JNG: ['Canyon', 'Lucid'],
      MID: ['ShowMaker', 'BeryL'],
      BOT: ['Aiming', 'Kingen'],
      SUP: ['Kellin', 'BeryL'],
    },
  },
  {
    id: 'KT',
    name: 'KT Rolster',
    short: 'KT',
    color: '#ff0000',
    tier: 84,
    roster: {
      TOP: ['PerfecT', 'Casting'],
      JNG: ['Bdd', 'Pyosik'],
      MID: ['Bdd', 'Cuzz'],
      BOT: ['Deft', 'Avenger'],
      SUP: ['BeryL', 'Monster'],
    },
  },
  {
    id: 'KDF',
    name: 'Kwangdong Freecs',
    short: 'KDF',
    color: '#00b3a4',
    tier: 80,
    roster: {
      TOP: ['DuDu', 'Morgan'],
      JNG: ['Cuzz', 'Wave'],
      MID: ['BuLLDoG', 'Frog'],
      BOT: ['Dice', 'Berserker'],
      SUP: ['Harp', 'Roach'],
    },
  },
  {
    id: 'DRX',
    name: 'DRX',
    short: 'DRX',
    color: '#1f4fff',
    tier: 78,
    roster: {
      TOP: ['Kingen', 'Lind'],
      JNG: ['Sponge', 'Juhan'],
      MID: ['Ucal', 'Paduck'],
      BOT: ['Teddy', 'Taeyoon'],
      SUP: ['Andil', 'Kyaruno'],
    },
  },
  {
    id: 'NS',
    name: 'Nongshim RedForce',
    short: 'NS',
    color: '#d6001c',
    tier: 79,
    roster: {
      TOP: ['Kingen', 'Clear'],
      JNG: ['GIDEON', 'Punch'],
      MID: ['Fisher', 'Sylvie'],
      BOT: ['Jiwoo', 'Berserker'],
      SUP: ['Lehends', 'victor'],
    },
  },
  {
    id: 'BRO',
    name: 'OK BRION',
    short: 'BRO',
    color: '#7a00ff',
    tier: 74,
    roster: {
      TOP: ['Morgan', 'Envyy'],
      JNG: ['Hanse', 'Ellim'],
      MID: ['Clozer', 'Pungku'],
      BOT: ['Hena', 'Babel'],
      SUP: ['Pollu', 'Hook'],
    },
  },
  {
    id: 'FOX',
    name: 'Fox Esports',
    short: 'FOX',
    color: '#22c55e',
    tier: 76,
    roster: {
      TOP: ['Clear', 'Lonem'],
      JNG: ['Wave', 'Raptor'],
      MID: ['Sylvie', 'Clozer'],
      BOT: ['Taeyoon', 'Hena'],
      SUP: ['victor', 'Pollu'],
    },
  },
]

// Expand raw team defs into full team objects with player objects.
export const TEAMS = TEAMS_RAW.map((t) => {
  const players = []
  for (const role of ROLES) {
    const names = t.roster[role] || ['Unknown', 'Unknown']
    names.forEach((nm, i) => {
      players.push(makePlayer(t.id, nm, role, t.tier, i === 0))
    })
  }
  return {
    id: t.id,
    name: t.name,
    short: t.short,
    color: t.color,
    tier: t.tier,
    players,
  }
})

// ---- Free agents ------------------------------------------------------------
// A small pool the player can scout/sign. Same builder, no team yet.
const FREE_AGENT_DEFS = [
  { name: 'Ruler', role: 'BOT', tier: 88 },
  { name: 'Rascal', role: 'TOP', tier: 82 },
  { name: 'Chasy', role: 'TOP', tier: 80 },
  { name: 'Pyosik', role: 'JNG', tier: 83 },
  { name: 'Clozer', role: 'MID', tier: 81 },
  { name: 'Fate', role: 'MID', tier: 79 },
  { name: 'deokdam', role: 'BOT', tier: 82 },
  { name: 'Life', role: 'SUP', tier: 81 },
  { name: 'Effort', role: 'SUP', tier: 78 },
  { name: 'Untara', role: 'TOP', tier: 76 },
  { name: 'Ellim', role: 'JNG', tier: 77 },
  { name: 'Karma', role: 'MID', tier: 75 },
]

export const FREE_AGENTS = FREE_AGENT_DEFS.map((d, i) =>
  makePlayer('FA', d.name, d.role, d.tier, true)
).map((p, i) => ({ ...p, id: `FA-${i}-${p.name}` }))

// Convenience: all players flat (teams + FAs) for trade screens.
export function allPlayers() {
  return [...TEAMS.flatMap((t) => t.players), ...FREE_AGENTS]
}
