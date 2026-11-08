// Pure derivations for the Hub. No React, no DOM: unit-tested directly.
import { orderStandings } from '../../game/useGameState.js'
import { teamName, fanMood, formDots, headlines, seriesWon, userSeries } from '../../game/hype.js'
import { scoutOpponent } from '../../game/preparation.js'
import { STYLE_META, PHASE_META } from '../../engine/sim.js'
import { ordinal, PLAYOFF_SPOTS } from '../../game/seriesSnapshot.js'

export const ROLES = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']

/** The user's fixture for the week about to be played, or null. */
export function nextMatch(state) {
  if (!state?.teamId || state.finished) return null
  const week = state.schedule?.[state.round - 1] ?? []
  const m = week.find(([h, a]) => h === state.teamId || a === state.teamId)
  if (!m) return null
  const home = m[0] === state.teamId
  return { oppId: home ? m[1] : m[0], home, week: state.round, matches: week }
}

/** "2–0 · 1st" style record line for a club in the regional table. */
export function recordLine(state, teamId) {
  const row = state?.standings?.[teamId]
  if (!row) return ''
  const pos = orderStandings(state.standings).findIndex((r) => r.teamId === teamId) + 1
  const played = (row.W ?? 0) + (row.L ?? 0)
  return played ? `${row.W}–${row.L} · ${ordinal(pos)}` : `${row.W}–${row.L}`
}

export { oddsWord } from '../ui/odds.js'

/** Regional weeks are best of three (needWins 2). */
export const REGIONAL_BEST_OF = 3

/**
 * Readiness row: three checks that link to the screen that fixes them.
 * Never blocks Play. tone 'ok' | 'todo'.
 */
export function readiness(state, why) {
  const roster = state?.teams?.[state.teamId] ?? []
  const byId = Object.fromEntries(roster.map((p) => [p.id, p]))
  const starters = ROLES.map((r) => byId[state?.lineup?.[r]]).filter((p) => p)
  const lineupOk = starters.length === ROLES.length && starters.every((p, i) => p.role === ROLES[i])
  const style = STYLE_META[state?.tactic?.style]?.label ?? 'Balanced'
  const phase = (PHASE_META[state?.tactic?.phase]?.label ?? 'Mid Game').replace(' Game', ' game')
  const s = state?.strategy ?? {}
  const planned = !!(s.comp || s.roam || s.wincon || s.swap)
  const tacticsFactor = why?.factors?.find((f) => f.label === 'Tactics & gameplan')?.contribution ?? 0
  const prepared = state?.trainedRound === state?.round
  return [
    {
      id: 'lineup',
      label: 'Lineup',
      tone: lineupOk ? 'ok' : 'todo',
      value: lineupOk ? starters.map((p) => p.name).join(' · ') : `${ROLES.length - starters.length || 1} role${ROLES.length - starters.length === 1 ? '' : 's'} to fill`,
      tab: 'lineup',
    },
    {
      id: 'plan',
      label: 'Game plan',
      tone: tacticsFactor < 0 ? 'todo' : 'ok',
      value: tacticsFactor < 0
        ? `${style} · ${phase} costs ${Math.abs(tacticsFactor).toFixed(1)} pts`
        : `${style} · ${phase}${planned ? ' · custom plan' : ''}`,
      tab: tacticsFactor < 0 ? 'tactics' : 'strategy',
    },
    {
      id: 'prep',
      label: 'Coach’s office',
      tone: prepared ? 'ok' : 'todo',
      value: prepared ? 'Session done this week' : 'One session available',
      href: '#weekly-preparation',
    },
  ]
}

/** Top of the table plus the user's row when they sit below the cut. */
export function tableRows(state, limit = PLAYOFF_SPOTS) {
  const rows = orderStandings(state?.standings ?? {})
  const me = state?.teamId
  const shaped = rows.map((r, i) => ({
    pos: i + 1,
    teamId: r.teamId,
    record: `${r.W}–${r.L}`,
    points: r.points,
    you: r.teamId === me,
    form: lastResults(state, r.teamId, 3),
  }))
  const top = shaped.slice(0, limit)
  const mine = shaped.find((r) => r.you)
  return { rows: top, extra: mine && mine.pos > limit ? mine : null, total: shaped.length }
}

/** Last n series results for any club, oldest first: 'W' | 'L'. */
export function lastResults(state, teamId, n = 3) {
  return userSeries(state, teamId).slice(-n).map((r) => (seriesWon(r, teamId) ? 'W' : 'L'))
}

/** Fan hype, informational only (no streak language). */
export function hype(state) {
  const mood = fanMood(state)
  return { pct: mood.pct, word: mood.word, dots: formDots(state) }
}

export const HYPE_SCALE = ['Mutinous', 'Restless', 'Cautious', 'Buzzing', 'Ecstatic']

function stripTags(html) {
  return String(html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function boardRead(confidence) {
  if (confidence >= 70) return 'Your job is safe.'
  if (confidence >= 40) return 'Under pressure.'
  return 'One bad split from the sack.'
}

/**
 * Inbox items (newest concerns first). Press is an optional request, never a
 * modal: the Inbox renders Answer / Skip for it.
 * kind 'press' | 'board' | 'scout' | 'report' | 'league'
 */
export function inboxItems(state) {
  const items = []
  const me = state?.teamId
  if (!me) return items
  if (state.mode === 'career' && state.offseasonReport) {
    items.push({
      id: 'offseason',
      kind: 'report',
      icon: 'guide',
      title: `Off-season report · split ${state.offseasonReport.seasonIndexCompleted}`,
      text: 'Ages, OVR changes, contracts and the new free agents.',
      href: '#offseason-report',
      action: 'Read report',
    })
  }
  if (state.press?.pending && state.mode !== 'campaign') {
    const m = nextMatch(state)
    items.push({
      id: 'press',
      kind: 'press',
      icon: 'mail',
      title: 'Press request · optional',
      text: m ? `Reporters want a line before you face ${teamName(state, m.oppId)}.` : 'Reporters want a line on the season so far.',
    })
  }
  if (state.board) {
    const conf = Math.max(0, Math.min(100, state.board.confidence ?? 50))
    items.push({
      id: 'board',
      kind: 'board',
      icon: 'club',
      title: `Board · trust ${conf}`,
      text: `${boardRead(conf)} Goal: ${state.board.expectation ?? 'not set'}.`,
    })
  }
  const scout = state.finished ? null : scoutOpponent(state)
  if (scout) {
    const gap = scout.lanes?.[0]
    items.push({
      id: 'scout',
      kind: 'scout',
      icon: 'search',
      title: `Scout report · ${teamName(state, scout.opponentId)}`,
      text: `${scout.threat.name} (${scout.threat.role}, ${scout.threat.ovr}) is the one to watch.${gap && gap.edge < 0 ? ` Your widest gap is ${gap.role} (${gap.edge}).` : ''}`,
    })
  }
  const league = headlines(state).find((l) => l.cls === 'info')
  if (league) {
    items.push({ id: 'league', kind: 'league', icon: 'compete', title: 'Around the league', text: stripTags(league.text) })
  }
  return items
}

/** Press question and the honest effect of each answer (board, morale). */
export function pressQuestion(state) {
  const s = userSeries(state)
  let streak = null
  if (s.length) {
    const lastWon = seriesWon(s[s.length - 1], state.teamId)
    let n = 0
    for (let i = s.length - 1; i >= 0 && seriesWon(s[i], state.teamId) === lastWon; i--) n++
    streak = { won: lastWon, n }
  }
  if (streak?.won && streak.n >= 2) return 'Your team keeps winning. Is this the real deal?'
  if (streak && !streak.won && streak.n >= 2) return `That’s ${streak.n} straight defeats. What’s going wrong?`
  return 'How do you rate your team’s form heading into this week?'
}

export function pressAnswers(state) {
  const s = userSeries(state)
  let losing = 0
  for (let i = s.length - 1; i >= 0 && !seriesWon(s[i], state.teamId); i--) losing++
  const board = !!state.board
  return [
    { id: 'confident', label: 'Confident', quote: '“We’re winning it all.”', board: board ? 3 : null, morale: losing >= 2 ? -4 : 2 },
    { id: 'measured', label: 'Measured', quote: '“One game at a time.”', board: board ? 1 : null, morale: 1 },
    { id: 'deflect', label: 'Deflect', quote: '“No comment.”', board: board ? -2 : null, morale: 0 },
  ]
}
