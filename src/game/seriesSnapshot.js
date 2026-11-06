// ============================================================================
// seriesSnapshot.js: what a finished series changed, derived, never stored.
//
// The Result stage needs "before vs after" numbers (standings, fan hype, a
// player's form, the playoff line). Nothing in state keeps a pre-series copy,
// so this module rebuilds the "before" side from data already in state:
//   - standings: the post-series table with the played week's results reverted
//   - fan hype:  fanMood() over results/standings without that week
//   - form:      matchSession.context.*Lineup[role].form (frozen at kickoff)
//   - bracket / gauntlet: the session context and the post-series bracket
// Board confidence is never shown here: a series does not move it (only press
// answers and the end-of-split review do), so a board delta would be invented.
//
// Pure functions only. Tolerates missing pieces (old saves, other modes): a
// tile that cannot be derived honestly is left out.
// ============================================================================
import { orderStandings } from './useGameState.js'
import { fanMood, teamName } from './hype.js'
import { reviewSeries } from './matchReview.js'
import { iglCallById } from './igl.js'
import { CHAMP_BY_ID } from '../data/champions.js'

export const PLAYOFF_SPOTS = 4

export function ordinal(n) {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

const sideOf = (userSide) => (userSide === 'away' ? 'B' : 'A')

/** Who played, who won, from whose point of view. */
export function seriesOutcome(state, session) {
  const c = session?.context ?? {}
  const homeWon = (session?.aWins ?? 0) > (session?.bWins ?? 0)
  const userSide = c.userSide === 'home' || c.userSide === 'away' ? c.userSide : null
  const userId = userSide ? (userSide === 'home' ? c.homeId : c.awayId) : null
  const oppId = userSide ? (userSide === 'home' ? c.awayId : c.homeId) : null
  const winnerId = homeWon ? c.homeId : c.awayId
  const loserId = homeWon ? c.awayId : c.homeId
  const won = userSide ? (userSide === 'home') === homeWon : null
  const aWins = session?.aWins ?? 0
  const bWins = session?.bWins ?? 0
  const mine = userSide === 'away' ? bWins : aWins
  const theirs = userSide === 'away' ? aWins : bWins
  const result = c.kind === 'regional' ? findSeriesResult(state, c) : null
  const week = result?.round ?? null
  return {
    kind: c.kind ?? null,
    userSide,
    userId,
    oppId,
    winnerId,
    loserId,
    won,
    spectator: !userSide,
    // Score from the user's side (spectator: winner first).
    score: userSide ? [mine, theirs] : [Math.max(aWins, bWins), Math.min(aWins, bWins)],
    bestOf: Math.max(1, (c.needWins ?? 2) * 2 - 1),
    week,
    stageLabel: week ? `Week ${week}` : c.label ?? 'Series',
    league: state?.league ?? null,
  }
}

/** The regional result row this session produced (latest meeting of the pair). */
export function findSeriesResult(state, context) {
  let found = null
  for (const r of state?.results ?? []) {
    if (r.homeId !== context?.homeId || r.awayId !== context?.awayId) continue
    if (!Number.isFinite(r.round) || r.round >= 10) continue
    if (!found || r.round >= found.round) found = r
  }
  return found
}

/** Undo one week's results on a copy of the table. */
export function revertStandings(standings, roundResults) {
  const before = {}
  for (const [id, row] of Object.entries(standings ?? {})) before[id] = { ...row }
  for (const r of roundResults ?? []) {
    const winnerId = r.homeWon ? r.homeId : r.awayId
    const loserId = r.homeWon ? r.awayId : r.homeId
    const wGames = r.homeWon ? r.aWins : r.bWins
    const lGames = r.homeWon ? r.bWins : r.aWins
    const w = before[winnerId]
    const l = before[loserId]
    if (w) {
      w.W -= 1
      w.points -= 1
      w.gameWins -= wGames
      w.gameLosses -= lGames
    }
    if (l) {
      l.L -= 1
      l.gameWins -= lGames
      l.gameLosses -= wGames
    }
  }
  return before
}

export function positionOf(standings, teamId) {
  const rows = orderStandings(standings ?? {})
  const i = rows.findIndex((r) => r.teamId === teamId)
  return i < 0 ? null : i + 1
}

/**
 * Points between you and the playoff line. Inside the top four it is the
 * margin over the first team outside (>= 0); outside it is the gap to fourth
 * (< 0). Null when the league is too small to have a line.
 */
export function playoffGap(standings, teamId, spots = PLAYOFF_SPOTS) {
  const rows = orderStandings(standings ?? {})
  if (rows.length <= spots) return null
  const i = rows.findIndex((r) => r.teamId === teamId)
  if (i < 0) return null
  const pts = rows[i].points ?? 0
  return i < spots ? pts - (rows[spots].points ?? 0) : pts - (rows[spots - 1].points ?? 0)
}

/** Best user-side player across the series (average rating, then kills). */
export function seriesMvp(games, userSide) {
  if (!Array.isArray(games) || !games.length) return null
  const side = sideOf(userSide)
  const by = new Map()
  let teamKills = 0
  for (const g of games) {
    for (const p of g?.players ?? []) {
      if (p.side !== side) continue
      teamKills += p.kills ?? 0
      const key = p.id ?? p.name
      const a = by.get(key) ?? { id: p.id, name: p.name, role: p.role, kills: 0, deaths: 0, assists: 0, ratingSum: 0, games: 0, mvpGames: 0, champs: [] }
      a.kills += p.kills ?? 0
      a.deaths += p.deaths ?? 0
      a.assists += p.assists ?? 0
      a.ratingSum += p.rating ?? 0
      a.games += 1
      if (p.mvp) a.mvpGames += 1
      const champ = g?.picks?.[side]?.[p.role]
      const name = champ ? CHAMP_BY_ID[champ]?.name ?? champ : null
      if (name && !a.champs.includes(name)) a.champs.push(name)
      by.set(key, a)
    }
  }
  let best = null
  for (const a of by.values()) {
    a.rating = a.games ? Math.round((a.ratingSum / a.games) * 10) / 10 : 0
    if (!best || a.rating > best.rating || (a.rating === best.rating && a.kills > best.kills)) best = a
  }
  if (!best) return null
  const { ratingSum, ...rest } = best
  void ratingSum
  return {
    ...rest,
    played: games.length,
    teamKills,
    killShare: teamKills ? Math.round(((best.kills + best.assists) / teamKills) * 100) : 0,
    kda: `${best.kills}/${best.deaths}/${best.assists}`,
  }
}

/**
 * One honest sentence for the MVP card: what the record shows, and credit for
 * a coaching call only when the IGL evaluation says it fit.
 */
export function mvpLine(mvp, games, userSide) {
  if (!mvp) return ''
  const bits = []
  if (mvp.mvpGames && mvp.mvpGames === mvp.played) bits.push(mvp.played > 1 ? `Player of the game in all ${mvp.played} games` : 'Player of the game')
  else if (mvp.mvpGames) bits.push(`Player of the game in ${mvp.mvpGames} of ${mvp.played}`)
  else bits.push(`Best average rating on your side (${mvp.rating.toFixed(1)})`)
  bits.push(`in on ${mvp.killShare}% of your team’s kills`)
  let line = `${bits.join(', ')}.`
  const side = sideOf(userSide)
  const goodCall = (games ?? []).find((g) => g?.coachingCall && g.coachingCall.side === side && g.coachingCall.modifier > 0 && g.winner === side)
  if (goodCall) {
    const label = iglCallById(goodCall.coachingCall.id)?.label
    if (label) line += ` Your ${label.toLowerCase()} call in game ${goodCall.game} fit the moment.`
  }
  return line
}

/** "What to look at" after a loss: the first coaching note that needs work. */
export function lookAtNote(games, userSide) {
  const review = reviewSeries(games ?? [], userSide ?? 'home')
  if (!review) return null
  const note = review.notes.find((n) => n.kind === 'work') ?? review.notes[0]
  return note ? { ...note, focus: review.focus } : null
}

function fmtDuration(min) {
  if (!Number.isFinite(min) || min <= 0) return ''
  const whole = Math.floor(min)
  const secs = Math.round((min - whole) * 60)
  return secs ? `${whole}:${String(secs).padStart(2, '0')}` : `${whole} min`
}

/** Per-game rows for the games list, from the user's side when there is one. */
export function gameRows(games, userSide) {
  const side = sideOf(userSide)
  return (games ?? []).map((g, i) => {
    const mineK = (g?.players ?? []).filter((p) => p.side === side).reduce((n, p) => n + (p.kills ?? 0), 0)
    const theirK = (g?.players ?? []).filter((p) => p.side && p.side !== side).reduce((n, p) => n + (p.kills ?? 0), 0)
    const picks = g?.picks?.[side]
    const champs = picks ? ['TOP', 'MID', 'BOT'].map((r) => picks[r]).filter(Boolean).map((id) => CHAMP_BY_ID[id]?.name ?? id) : []
    const call = g?.coachingCall && g.coachingCall.side === side ? iglCallById(g.coachingCall.id)?.label : null
    return {
      n: g?.game ?? i + 1,
      won: g?.winner === side,
      blue: g?.blueSide ? g.blueSide === side : null,
      kills: [mineK, theirK],
      duration: fmtDuration(g?.durationMin),
      champs,
      call,
    }
  })
}

function bracketLabel(tournament, roundIndex) {
  return tournament?.rounds?.[roundIndex]?.name ?? 'Bracket'
}

/**
 * The "What changed" tiles: [{ id, label, value, delta, unit, note }].
 * `delta` is "better is positive" (null = no arrow). `note` is quiet text.
 */
export function seriesChanges(state, session, mvp = null) {
  const out = seriesOutcome(state, session)
  if (out.spectator) return []
  const c = session.context ?? {}
  const tiles = []
  const me = out.userId

  if (out.kind === 'regional') {
    const result = findSeriesResult(state, c)
    if (result && state?.standings?.[me]) {
      const weekResults = (state.results ?? []).filter((r) => r.round === result.round)
      const before = revertStandings(state.standings, weekResults)
      const posA = positionOf(state.standings, me)
      const posB = positionOf(before, me)
      const row = state.standings[me]
      const moved = posB != null && posA != null ? posB - posA : 0
      tiles.push({
        id: 'standings',
        label: 'Standings',
        value: ordinal(posA),
        delta: moved || null,
        unit: moved ? 'places' : '',
        note: `${row.W}–${row.L} · ${moved > 0 ? `from ${ordinal(posB)}` : moved < 0 ? `from ${ordinal(posB)}` : posA === 1 ? 'held top spot' : `held ${ordinal(posA)}`}`,
      })
      const hypeAfter = fanMood(state).pct
      const hypeBefore = fanMood({ ...state, results: (state.results ?? []).filter((r) => r.round !== result.round), standings: before }).pct
      tiles.push({ id: 'hype', label: 'Fan hype', value: String(hypeAfter), delta: hypeAfter - hypeBefore, unit: 'points', note: `from ${hypeBefore}` })
      const formTile = formChange(state, session, mvp)
      if (formTile) tiles.push(formTile)
      const gapA = playoffGap(state.standings, me)
      const gapB = playoffGap(before, me)
      if (gapA != null) {
        const done = !!state.finished
        tiles.push({
          id: 'playoffs',
          label: 'Playoff line',
          value: done ? (posA <= PLAYOFF_SPOTS ? 'In' : 'Out') : gapA > 0 ? `+${gapA}` : String(gapA),
          delta: done || gapB == null ? null : gapA - gapB || null,
          unit: 'series',
          // Same term as Standings ("N series clear of 5th"): one point is one series won.
          note: done
            ? posA <= PLAYOFF_SPOTS ? 'Top four · playoffs next' : 'Missed the top four'
            : gapA > 0 ? 'series clear of 5th' : gapA === 0 ? 'level with the line' : 'series behind 4th',
        })
      }
    }
    return tiles
  }

  if (out.kind === 'tournament') {
    const t = state?.tournament
    const ri = t?.rounds?.findIndex((r) => r.matches?.some((m) => m.homeId === c.homeId && m.awayId === c.awayId && m.winner)) ?? -1
    if (t && ri >= 0) {
      const champion = t.status === 'done' && t.championId === me
      tiles.push({
        id: 'bracket',
        label: t.kind === 'playoffs' ? 'Playoffs' : String(t.kind ?? 'Bracket').toUpperCase(),
        value: champion ? 'Champions' : out.won ? (ri + 1 < (t.rounds?.length ?? 0) ? 'Through' : 'Won') : 'Out',
        delta: null,
        unit: '',
        note: champion
          ? 'Won the final'
          : out.won
            ? `Into the ${bracketLabel(t, ri + 1).toLowerCase()}`
            : `Eliminated in the ${bracketLabel(t, ri).toLowerCase()}`,
      })
    }
    return tiles
  }

  if (out.kind === 'gauntlet') {
    const g = state?.gauntlet
    if (g) {
      const target = g.target ?? g.opponents?.length ?? 0
      tiles.push({
        id: 'gauntlet',
        label: 'Gauntlet',
        value: `${g.wins} of ${target}`,
        delta: out.won ? 1 : null,
        unit: 'wins',
        note: g.status === 'won' ? 'Ladder cleared' : g.status === 'lost' ? 'Run over' : `from ${Math.max(0, g.wins - (out.won ? 1 : 0))}`,
      })
    }
    const formTile = formChange(state, session, mvp)
    if (formTile) tiles.push(formTile)
    return tiles
  }

  return tiles
}

/** Form tile for one starter: kickoff form (session context) vs now. */
export function formChange(state, session, mvp) {
  const c = session?.context ?? {}
  const lineup = c.userSide === 'away' ? c.awayLineup : c.homeLineup
  if (!lineup) return null
  const entries = Object.entries(lineup)
  const pick = (mvp && entries.find(([, p]) => p?.id === mvp.id)) || entries.find(([r]) => r === 'MID') || entries[0]
  if (!pick) return null
  const [, p] = pick
  const before = p?.form
  const after = state?.form?.[p?.id]
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null
  // Kickoff form includes the morale nudge the sim applied, so it can differ
  // from the Hub's pre-match number; the note says which baseline it is.
  return { id: 'form', label: `${p.name} form`, value: String(after), delta: after - before || null, unit: 'points', note: `from ${before} at kickoff` }
}

/** "Up next" line: next opponent and when, or the next phase. */
export function upNext(state, session) {
  const out = seriesOutcome(state, session)
  if (out.spectator) return null
  const me = out.userId
  if (out.kind === 'regional') {
    if (state.finished) {
      const pos = positionOf(state.standings, me)
      return { text: pos != null && pos <= PLAYOFF_SPOTS ? 'Regular season done · playoffs next' : 'Regular season done', oppId: null }
    }
    const match = state.schedule?.[state.round - 1]?.find((m) => m.includes(me))
    if (!match) return null
    const oppId = match[0] === me ? match[1] : match[0]
    const row = state.standings?.[oppId]
    return { oppId, name: teamName(state, oppId), record: row ? `${row.W}–${row.L}` : null, when: `Week ${state.round}` }
  }
  if (out.kind === 'gauntlet') {
    const g = state.gauntlet
    if (!g || g.status !== 'active' || !g.opponentId) return null
    return { oppId: g.opponentId, name: teamName(state, g.opponentId), record: null, when: `Round ${g.round + 1}` }
  }
  if (out.kind === 'tournament') {
    const t = state.tournament
    if (!t || t.status !== 'active' || !out.won) return null
    const ri = t.rounds.findIndex((r) => r.matches.some((m) => !m.winner))
    const m = t.rounds[ri]?.matches.find((x) => x.homeId === me || x.awayId === me)
    if (!m) return { text: `${t.rounds[ri]?.name ?? 'Next round'} next`, oppId: null }
    const oppId = m.homeId === me ? m.awayId : m.homeId
    return oppId ? { oppId, name: teamName(state, oppId), record: null, when: t.rounds[ri].name } : { text: `${t.rounds[ri].name} next`, oppId: null }
  }
  return null
}
