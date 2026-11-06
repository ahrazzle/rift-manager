// Pure view-models for Compete (no React). Everything is derived from
// state.standings, state.results and state.tournament: nothing is invented,
// and no engine or save-format change is needed.
import { TEAMS } from '../../data/lck.js'
import { orderStandings } from '../../game/useGameState.js'

const STATIC_NAME = Object.fromEntries(TEAMS.map((t) => [t.id, t.name]))

export function teamNameOf(state, teamId) {
  if (!teamId) return 'TBD'
  return state.teamMeta?.[teamId]?.name ?? STATIC_NAME[teamId] ?? teamId
}

/** Regular-season series only (tournament series never enter state.results). */
export function regionalResults(state) {
  const total = state.totalRounds ?? Infinity
  return (state.results ?? []).filter((r) => Number.isInteger(r.round) && r.round <= total)
}

export function lastPlayedRound(state) {
  return regionalResults(state).reduce((m, r) => Math.max(m, r.round), 0)
}

function winnerOf(r) {
  return r.homeWon ? r.homeId : r.awayId
}

/** Rebuild the league table as it stood after `round`, from results alone. */
export function tableThrough(state, round) {
  const standings = {}
  for (const id of Object.keys(state.standings ?? {})) {
    standings[id] = { teamId: id, W: 0, L: 0, gameWins: 0, gameLosses: 0, points: 0 }
  }
  for (const r of regionalResults(state)) {
    if (r.round > round) continue
    const win = winnerOf(r)
    const lose = r.homeWon ? r.awayId : r.homeId
    const winGames = r.homeWon ? r.aWins : r.bWins
    const loseGames = r.homeWon ? r.bWins : r.aWins
    const w = standings[win]
    const l = standings[lose]
    if (!w || !l) continue
    w.W += 1; w.points += 1; w.gameWins += winGames; w.gameLosses += loseGames
    l.L += 1; l.gameWins += loseGames; l.gameLosses += winGames
  }
  return orderStandings(standings)
}

/** A team's last `n` regular-season results, oldest first: 'W' | 'L'. */
export function formOf(state, teamId, n = 5) {
  return regionalResults(state)
    .filter((r) => r.homeId === teamId || r.awayId === teamId)
    .sort((a, b) => a.round - b.round)
    .slice(-n)
    .map((r) => (winnerOf(r) === teamId ? 'W' : 'L'))
}

/**
 * Table rows for the Standings screen.
 * move: places gained since the previous round (positive is better), or null
 * when there is no previous round to compare with (first week, or no history).
 */
export function standingRows(state) {
  const ordered = orderStandings(state.standings)
  const last = lastPlayedRound(state)
  const prevRank = {}
  if (last >= 2) tableThrough(state, last - 1).forEach((r, i) => { prevRank[r.teamId] = i + 1 })
  return ordered.map((r, i) => ({
    teamId: r.teamId,
    name: teamNameOf(state, r.teamId),
    rank: i + 1,
    W: r.W,
    L: r.L,
    gd: r.gameWins - r.gameLosses,
    form: formOf(state, r.teamId),
    move: prevRank[r.teamId] ? prevRank[r.teamId] - (i + 1) : null,
    isYou: r.teamId === state.teamId,
  }))
}

export const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')

/** Top-4 seeding as semifinals (1v4, 2v3), the way engine/season.js buildPlayoffs pairs them. */
export function playoffPicture(state, rows) {
  const t = state.tournament
  const regional = state.phase === 'regional' && !state.finished
  let seeds
  let mode = 'live'
  if (t?.kind === 'playoffs' && Array.isArray(t.qualifies)) {
    seeds = t.qualifies.slice(0, 4)
    mode = 'locked'
  } else if (!regional) {
    seeds = rows.slice(0, 4).map((r) => r.teamId)
    mode = 'final'
  } else {
    seeds = rows.slice(0, 4).map((r) => r.teamId)
  }
  const seed = (i) => ({ seed: i + 1, teamId: seeds[i], name: teamNameOf(state, seeds[i]), isYou: seeds[i] === state.teamId })
  const weeksLeft = regional ? Math.max(0, (state.totalRounds ?? 0) - lastPlayedRound(state)) : 0
  return { mode, semis: [[seed(0), seed(3)], [seed(1), seed(2)]], weeksLeft }
}

/** "What's at stake" facts. Every line is computed from the table; none is invented. */
export function stakes(state, rows) {
  const me = rows.find((r) => r.isYou)
  const out = { cut: null, goal: null, opponent: null }
  if (!me) return out
  const regional = state.phase === 'regional' && !state.finished
  if (regional && rows.length >= 5) {
    if (me.rank <= 4) {
      const gap = me.W - rows[4].W
      out.cut = gap > 0
        ? `Top 4 reach the playoffs. You are ${gap} series clear of ${ordinal(5)}.`
        : `Top 4 reach the playoffs. You are level on wins with ${ordinal(5)}; game difference decides.`
    } else {
      const gap = rows[3].W - me.W
      out.cut = gap > 0
        ? `Top 4 reach the playoffs. You are ${gap} series behind ${ordinal(4)}.`
        : `Top 4 reach the playoffs. You are level on wins with ${ordinal(4)}; game difference decides.`
    }
  } else if (!regional) {
    out.cut = me.rank <= 4 ? `You finished ${ordinal(me.rank)} and made the playoffs.` : `You finished ${ordinal(me.rank)}, outside the playoff line.`
  }
  if (state.board?.expectation) {
    out.goal = { text: state.board.expectation, trust: state.board.confidence }
  }
  if (regional) {
    const match = (state.schedule ?? [])[(state.round ?? 1) - 1]?.find(([h, a]) => h === state.teamId || a === state.teamId)
    if (match) {
      const oppId = match[0] === state.teamId ? match[1] : match[0]
      const opp = rows.find((r) => r.teamId === oppId)
      out.opponent = { teamId: oppId, name: teamNameOf(state, oppId), rank: opp?.rank ?? null, record: opp ? `${opp.W}–${opp.L}` : null, week: state.round }
    }
  }
  return out
}

export function ordinal(n) {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

/** Results screen: series as view rows, newest first. */
export function resultItems(state) {
  return [...(state.results ?? [])].reverse().map((r) => {
    const youHome = r.userSide === 'home'
    const youWon = r.userSide ? (youHome ? r.homeWon : !r.homeWon) : null
    return { r, key: `${r.round}-${r.homeId}-${r.awayId}`, youWon, homeWon: !!r.homeWon }
  })
}
