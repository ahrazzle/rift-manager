// ============================================================================
// Career dilemma events (p0-ux-design §2a LOCKED).
// One event = { id, title, description, chance (0..1 weight), options: [Option, Option] }
// Option = { label, oddsText, detail, apply: (draft, playerId) => log string }
// apply mutates a draft slice { teams, form, lineup? } and returns a log
// string. Randomness resolves INSIDE apply via Math.random() so odds text
// stays honest. playerId = event target, picked by the reducer (random
// starter from the managed roster), never by UI.
// ============================================================================

function clampForm(v) {
  return Math.max(0, Math.min(100, Math.round(v)))
}

function clampOvr(v) {
  return Math.max(40, Math.min(99, Math.round(v)))
}

function findTeamOf(draft, playerId) {
  for (const tid of Object.keys(draft.teams || {})) {
    if ((draft.teams[tid] || []).some((p) => p.id === playerId)) return tid
  }
  return null
}

function getPlayer(draft, playerId) {
  for (const tid of Object.keys(draft.teams || {})) {
    const found = (draft.teams[tid] || []).find((p) => p.id === playerId)
    if (found) return found
  }
  return null
}

function formOf(draft, playerId) {
  return draft.form?.[playerId] ?? 50
}

export const DILEMMA_EVENTS = [
  {
    id: 'wrist-injury',
    title: 'Star player wrist injury',
    description: 'Your starting mid laner reports wrist pain before the split.',
    chance: 0.4,
    options: [
      {
        label: 'Rest the split (-3 OVR, misses season)',
        oddsText: '100%: -3 OVR to {player}, season over for them',
        detail: 'Safe. They recover for next season.',
        apply: (draft, playerId) => {
          const p = getPlayer(draft, playerId)
          if (!p) throw new Error(`wrist-injury: player ${playerId} not found`)
          const before = p.ovr
          p.ovr = clampOvr(p.ovr - 3)
          return `${p.name} rests the split: OVR ${before} → ${p.ovr}. Season over for them, expected back next year.`
        },
      },
      {
        label: 'Play through it (50% recover, else worse)',
        oddsText: '50% full recovery · 50% -5 OVR + form crash',
        detail: 'Coin flip. Champion mentality or career-shortening gamble.',
        apply: (draft, playerId) => {
          const p = getPlayer(draft, playerId)
          if (!p) throw new Error(`wrist-injury: player ${playerId} not found`)
          if (Math.random() < 0.5) {
            return `${p.name} plays through the pain and recovers fully — no penalty. Champion mentality.`
          }
          const before = p.ovr
          p.ovr = clampOvr(p.ovr - 5)
          draft.form[p.id] = 20
          return `${p.name} breaks down playing hurt: OVR ${before} → ${p.ovr}, form crashes to 20.`
        },
      },
    ],
  },
  {
    id: 'locker-room-conflict',
    title: 'Locker-room conflict',
    description: 'Two starters clash over shotcalling. The room picks sides.',
    chance: 0.3,
    options: [
      {
        label: 'Back the veteran (rookie -2 OVR, form +)',
        oddsText: '100%: rookie -2 OVR, veteran +5 form',
        detail: 'Order restored, at a development cost.',
        apply: (draft, playerId) => {
          const tid = findTeamOf(draft, playerId)
          if (!tid) throw new Error(`locker-room-conflict: player ${playerId} not found`)
          const mates = [...draft.teams[tid]].sort((a, b) => a.ovr - b.ovr)
          if (mates.length === 0) throw new Error('locker-room-conflict: empty roster')
          const rookie = mates[0]
          const veteran = mates.length > 1 ? mates[mates.length - 1] : mates[0]
          const before = rookie.ovr
          rookie.ovr = clampOvr(rookie.ovr - 2)
          draft.form[veteran.id] = clampForm(formOf(draft, veteran.id) + 5)
          return `You back the veteran. ${rookie.name} (OVR ${before} → ${rookie.ovr}) loses development time; ${veteran.name} rallies the room (+5 form).`
        },
      },
      {
        label: 'Back the rookie (50/50: +2 or -2 OVR team ripple)',
        oddsText: '50% rookie +2 OVR · 50% veteran -2 OVR',
        detail: 'Bet on the future. Veterans have long memories.',
        apply: (draft, playerId) => {
          const tid = findTeamOf(draft, playerId)
          if (!tid) throw new Error(`locker-room-conflict: player ${playerId} not found`)
          const mates = [...draft.teams[tid]].sort((a, b) => a.ovr - b.ovr)
          if (mates.length === 0) throw new Error('locker-room-conflict: empty roster')
          const rookie = mates[0]
          const veteran = mates.length > 1 ? mates[mates.length - 1] : mates[0]
          if (Math.random() < 0.5) {
            const before = rookie.ovr
            rookie.ovr = clampOvr(rookie.ovr + 2)
            return `You back the rookie and it pays off: ${rookie.name} blossoms (OVR ${before} → ${rookie.ovr}).`
          }
          const before = veteran.ovr
          veteran.ovr = clampOvr(veteran.ovr - 2)
          return `You back the rookie and the veteran sulks: ${veteran.name} regresses (OVR ${before} → ${veteran.ovr}).`
        },
      },
    ],
  },
  {
    id: 'betting-scandal',
    title: 'Betting scandal rumor',
    description: 'A tabloid links your substitute to a betting ring. Unproven.',
    chance: 0.3,
    options: [
      {
        label: 'Suspend immediately (safe, -form across roster)',
        oddsText: '100%: all starters -3 form, story dies',
        detail: 'Boring. Effective.',
        apply: (draft, playerId) => {
          const tid = findTeamOf(draft, playerId)
          if (!tid) throw new Error(`betting-scandal: player ${playerId} not found`)
          for (const p of draft.teams[tid]) {
            draft.form[p.id] = clampForm(formOf(draft, p.id) - 3)
          }
          return `You suspend the substitute at once. The story dies, but the whole roster loses focus (-3 form across the roster).`
        },
      },
      {
        label: 'Deny and play on (75% nothing / 25% scandal: random starter -4 OVR)',
        oddsText: '75% no effect · 25% random starter -4 OVR',
        detail: 'Three-to-one odds. Tabloids love denials.',
        apply: (draft, playerId) => {
          if (Math.random() < 0.75) {
            return `You deny everything and play on. The rumor dies with no effect.`
          }
          const tid = findTeamOf(draft, playerId)
          if (!tid) throw new Error(`betting-scandal: player ${playerId} not found`)
          const lineupIds = draft.lineup ? Object.values(draft.lineup) : []
          const starters = lineupIds
            .map((id) => (draft.teams[tid] || []).find((p) => p.id === id))
            .filter(Boolean)
          const pool = starters.length > 0 ? starters : draft.teams[tid]
          if (pool.length === 0) throw new Error('betting-scandal: empty roster')
          const victim = pool[(Math.random() * pool.length) | 0]
          const before = victim.ovr
          victim.ovr = clampOvr(victim.ovr - 4)
          return `The denial backfires into a full scandal: ${victim.name} is implicated (OVR ${before} → ${victim.ovr}).`
        },
      },
    ],
  },
]
