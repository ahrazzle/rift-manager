// Shared wording and small derivations for the draft board (no React).
import { CHAMP_BY_ID } from '../../data/champions.js'
import { DRAFT_STEPS, DRAFT_ROLES } from '../../game/draft.js'

export const SIDE_WORD = { BLUE: 'Blue', RED: 'Red' }
export const ROLE_WORD = { TOP: 'Top', JNG: 'Jungle', MID: 'Mid', BOT: 'Bot', SUP: 'Support' }

export const otherSide = (side) => (side === 'BLUE' ? 'RED' : 'BLUE')
export const champName = (id) => CHAMP_BY_ID[id]?.name ?? id

/** "Ban phase 1" … "Pick phase 2", same split as draft.js order. */
export function phaseLabel(step) {
  if (step < 6) return 'Ban phase 1'
  if (step < 12) return 'Pick phase 1'
  if (step < 16) return 'Ban phase 2'
  return 'Pick phase 2'
}

/** 1-based count of this side's bans (or picks) up to and including `step`. */
export function turnOrdinal(step) {
  const s = DRAFT_STEPS[step]
  if (!s) return 0
  return DRAFT_STEPS.slice(0, step + 1).filter((x) => x.type === s.type && x.side === s.side).length
}

export function openRoles(draft, side) {
  return DRAFT_ROLES.filter((r) => !draft.picks[side][r])
}

/** Names of a side's champions so far: committed picks, then hidden-role flex picks. */
export function compNames(draft, side) {
  const committed = DRAFT_ROLES.map((r) => draft.picks[side][r]).filter(Boolean).map(champName)
  const flex = (draft.flex?.[side] ?? []).map((e) => `${champName(e.champId)} (flex)`)
  return [...committed, ...flex]
}

/** Team display data with a fallback when the board renders without a match context. */
export function teamFor(teams, side, userSide) {
  const t = teams?.[side]
  const abbr = t?.id ?? (side === userSide ? 'You' : 'Enemy')
  return { id: t?.id ?? null, name: t?.name ?? abbr, abbr, lineup: t?.lineup ?? null }
}

export function playerName(team, role) {
  const p = team?.lineup?.[role]
  return typeof p === 'string' ? p : p?.name ?? null
}
