// Pure presentation helpers for the matchday broadcast. Nothing here changes
// simulation data; every value is read from the game and the revealed events.
import { physicalSide } from '../../game/mapSimulation.js'
import { CHAMP_BY_ID } from '../../data/champions.js'

export const ROLE_ORDER = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']

export function clockLabel(minute) {
  const m = Math.max(0, minute || 0)
  return `${Math.floor(m)}:${String(Math.floor((m % 1) * 60)).padStart(2, '0')}`
}

export function ordinal(n) {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`
}

/** Short broadcast tag for a club: the id when it is short, else the name. */
export function shortName(id, name) {
  const s = String(id || '')
  return s && s.length <= 5 ? s.toUpperCase() : name || s
}

/** "T1 leads 1–0", "Series tied 1–1", "T1 wins 2–1" (home/away wins). */
export function seriesState({ homeShort, awayShort, homeWins = 0, awayWins = 0, needWins }) {
  if (needWins && Math.max(homeWins, awayWins) >= needWins) {
    const home = homeWins > awayWins
    return `${home ? homeShort : awayShort} wins ${Math.max(homeWins, awayWins)}–${Math.min(homeWins, awayWins)}`
  }
  if (homeWins === awayWins) return homeWins ? `Series tied ${homeWins}–${awayWins}` : 'Series 0–0'
  return homeWins > awayWins
    ? `${homeShort} leads ${homeWins}–${awayWins}`
    : `${awayShort} leads ${awayWins}–${homeWins}`
}

export function goldLabel(diff) {
  return `${(Math.abs(diff) / 1000).toFixed(1)}k`
}

/**
 * Lead meter for the scorebug, centre-anchored: the bar grows from the middle
 * toward the leading side, half the track at a 10k lead. The number in text
 * is the real gold difference; the bar only shows it.
 */
export function goldLead(game, goldDiffA) {
  const blueIsA = physicalSide(game, 'A') === 'A'
  const blueLead = blueIsA ? goldDiffA : -goldDiffA
  if (Math.abs(blueLead) < 100) return { side: null, pct: 0 }
  return { side: blueLead > 0 ? 'blue' : 'red', pct: Math.round(Math.min(1, Math.abs(blueLead) / 10000) * 50) }
}

function championOf(game, name) {
  const p = game.players?.find((x) => x.name === name)
  if (!p) return null
  return CHAMP_BY_ID[game.picks?.[p.side]?.[p.role]]?.name ?? null
}

/**
 * One play-by-play line per revealed event: the actor is bold in the feed,
 * the side decides the colour bar. Team verbs are plural, broadcast style.
 */
export function eventLine(event, index, events, game, teamName) {
  const team = teamName(event.side)
  const foe = teamName(event.side === 'A' ? 'B' : 'A')
  const count = events.slice(0, index + 1).filter((e) => e.type === event.type && e.side === event.side).length
  switch (event.type) {
    case 'kill': {
      const first = events.findIndex((e) => e.type === 'kill') === index
      const champ = event.killer ? championOf(game, event.killer) : null
      const victim = event.victim || `a ${foe} player`
      return {
        actor: event.killer || team,
        detail: champ ? `(${champ})` : '',
        text: first ? `draws first blood on ${victim}` : `kills ${victim}`,
      }
    }
    case 'tower':
      return { actor: team, text: `take their ${ordinal(count)} tower` }
    case 'dragon':
      return { actor: team, text: `secure the ${ordinal(count)} dragon` }
    case 'baron':
      return { actor: team, text: 'secure Baron' }
    case 'teamfight':
      return { actor: team, text: 'win a teamfight' }
    case 'ace':
      return { actor: team, text: `ace ${foe}` }
    default:
      return { actor: team, text: event.type }
  }
}

/** Feed items, newest first. `extra` items (e.g. the IGL call) merge by time. */
export function feedItems(events, game, teamName, extra = []) {
  const items = events.map((event, index) => ({
    key: `${event.t}-${event.type}-${index}`,
    t: event.t,
    side: physicalSide(game, event.side) === 'A' ? 'blue' : 'red',
    ...eventLine(event, index, events, game, teamName),
  }))
  return [...items, ...extra].sort((a, b) => b.t - a.t || (b.pin ? 1 : 0) - (a.pin ? 1 : 0))
}

export const OBJECTIVE_ROWS = [
  ['dragon', 'Dragons'],
  ['baron', 'Barons'],
  ['tower', 'Towers'],
  ['teamfight', 'Teamfights won'],
]

export function objectiveCounts(events, side) {
  const out = {}
  for (const [type] of OBJECTIVE_ROWS) out[type] = events.filter((e) => e.type === type && e.side === side).length
  return out
}

/** Short, scannable tag for when an IGL call pays off (from its `when`). */
export const CALL_WHEN = {
  even: 'Even game',
  ahead: 'Ahead',
  behind: 'Behind',
  'ahead-late': 'Ahead late',
  'mid-behind': 'Mid behind',
  'fed-top': 'Fed top',
  'even-ahead': 'Tower lead',
}

/** The first sentence of a call's trade-off line. */
export function firstSentence(text = '') {
  const m = String(text).match(/^.*?[.!?](\s|$)/)
  return (m ? m[0] : String(text)).trim()
}

/** The game-state half of the IGL prompt, without the "make the call" ask. */
export function decisionContext(context = '') {
  return String(context)
    .replace(/\s*Make the call, coach\..*$/, '')
    .trim()
    .split(/(?<=\.)\s+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
    .replace(/(\d)-(\d)/g, '$1–$2')
}
