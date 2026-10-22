// ============================================================================
// hype.js — the dopamine layer.
//
// Every function here is DERIVED from existing game state. Nothing is
// persisted, nothing mutates, nothing touches the reducer or the engine.
// Headlines, streaks, fan mood, achievements, MVP spotlights and coach notes
// are all computed on render from results / standings / tournament state.
// ============================================================================

import { orderStandings } from './useGameState.js'

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length]

// ---- Series helpers ---------------------------------------------------------

export function seriesWon(r, teamId) {
  if (r.homeId === teamId) return !!r.homeWon
  if (r.awayId === teamId) return !r.homeWon
  return false
}

export function userSeries(state, teamId = state.teamId) {
  return (state.results || [])
    .filter((r) => r.homeId === teamId || r.awayId === teamId)
    .sort((a, b) => a.round - b.round)
}

export function seriesScore(r, teamId) {
  const mine = r.homeId === teamId ? r.aWins : r.bWins
  const theirs = r.homeId === teamId ? r.bWins : r.aWins
  return { mine, theirs }
}

// Current W/L streak (most recent series first).
export function streakOf(state, teamId = state.teamId) {
  const s = userSeries(state, teamId)
  if (!s.length) return null
  const lastWon = seriesWon(s[s.length - 1], teamId)
  let n = 0
  for (let i = s.length - 1; i >= 0; i--) {
    if (seriesWon(s[i], teamId) === lastWon) n++
    else break
  }
  return { dir: lastWon ? 'W' : 'L', n }
}

// Longest win streak ever (for achievements).
export function bestWinStreak(state, teamId = state.teamId) {
  const s = userSeries(state, teamId)
  let best = 0
  let cur = 0
  for (const r of s) {
    cur = seriesWon(r, teamId) ? cur + 1 : 0
    best = Math.max(best, cur)
  }
  return best
}

// Last-5 form, oldest → newest. Pads with nulls early in the season.
export function formDots(state, teamId = state.teamId) {
  const s = userSeries(state, teamId).slice(-5)
  const dots = s.map((r) => (seriesWon(r, teamId) ? 'W' : 'L'))
  while (dots.length < 5) dots.unshift(null)
  return dots
}

// ---- Names / meta -----------------------------------------------------------

export function teamName(state, teamId) {
  return state.teamMeta?.[teamId]?.name ?? teamId
}
export function teamColor(state, teamId) {
  return state.teamMeta?.[teamId]?.color ?? '#3a4560'
}
export function teamTier(state, teamId) {
  return state.teamMeta?.[teamId]?.tier ?? 80
}

// ---- Fan mood ----------------------------------------------------------------
// 0-100 hype meter from the last five series. Wins lift it, losses drain it,
// contending for the top adds a buzz, sliding down the table sours it.
export function fanMood(state, teamId = state.teamId) {
  const dots = formDots(state, teamId).filter(Boolean)
  let pct = 52
  for (const d of dots) pct += d === 'W' ? 10 : -11
  const rows = orderStandings(state.standings || {})
  const idx = rows.findIndex((r) => r.teamId === teamId)
  if (idx >= 0 && idx <= 1) pct += 8
  else if (idx >= rows.length - 2) pct -= 8
  pct = Math.max(4, Math.min(98, Math.round(pct)))
  const [word, cls] =
    pct >= 80 ? ['Ecstatic', 'e5'] :
    pct >= 62 ? ['Buzzing', 'e4'] :
    pct >= 45 ? ['Cautious', 'e3'] :
    pct >= 28 ? ['Restless', 'e2'] : ['Mutinous', 'e1']
  return { pct, word, cls }
}

// ---- Rivalry -----------------------------------------------------------------
export function rivalryVs(state, oppId, teamId = state.teamId) {
  let myW = 0
  let oppW = 0
  for (const r of state.results || []) {
    const involves =
      (r.homeId === teamId && r.awayId === oppId) ||
      (r.homeId === oppId && r.awayId === teamId)
    if (!involves) continue
    if (seriesWon(r, teamId)) myW++
    else oppW++
  }
  return { myW, oppW, played: myW + oppW }
}

// ---- Placement ---------------------------------------------------------------
export function placementOf(state, teamId = state.teamId) {
  const rows = orderStandings(state.standings || {})
  const idx = rows.findIndex((r) => r.teamId === teamId)
  if (idx < 0) return null
  const leader = rows[0]
  const me = rows[idx]
  const gap = leader && me ? (leader.points ?? 0) - (me.points ?? 0) : 0
  return { pos: idx + 1, of: rows.length, gap, row: me }
}

// ---- MVP ---------------------------------------------------------------------
// Best user-side performer across recomputed games of one series.
export function mvpOfGames(games, userSide) {
  if (!games || !games.length) return null
  const youA = userSide !== 'away'
  const side = youA ? 'A' : 'B'
  let best = null
  for (const g of games) {
    for (const p of g.players || []) {
      if (p.side !== side) continue
      if (!best || (p.rating ?? 0) > (best.rating ?? 0)) best = { ...p, game: g.game }
    }
  }
  return best
}

export function fmtKDA(p) {
  if (!p) return ''
  return `${p.kills ?? 0}/${p.deaths ?? 0}/${p.assists ?? 0}`
}

// ---- Headlines ---------------------------------------------------------------
// Narrative lines for the last completed round. userGames = recomputed games
// of the user's series (optional — enriches the lead line).
export function headlines(state, userGames = null) {
  const lines = []
  const lastRound = (state.round || 1) - 1
  if (lastRound < 1) return lines
  const me = state.teamId
  const mine = (state.results || []).find((r) => r.round === lastRound && (r.homeId === me || r.awayId === me))
  const others = (state.results || []).filter((r) => r.round === lastRound && !(r.homeId === me || r.awayId === me))

  const oppName = (r) => teamName(state, r.homeId === me ? r.awayId : r.homeId)

  if (mine) {
    const won = seriesWon(mine, me)
    const { mine: m, theirs: t } = seriesScore(mine, me)
    const st = streakOf(state, me)
    const mvp = mvpOfGames(userGames, mine.userSide)
    const comeback =
      userGames && userGames.length > 1 &&
      userGames[0].winner !== (mine.userSide === 'away' ? 'B' : 'A') && won
    if (won) {
      const lead = [
        `<b>${teamName(state, me)}</b> take down <b>${oppName(mine)}</b> ${m}–${t}`,
        `<b>${teamName(state, me)}</b> get the better of <b>${oppName(mine)}</b>, ${m}–${t}`,
        `Statement made — <b>${teamName(state, me)}</b> beat <b>${oppName(mine)}</b> ${m}–${t}`,
      ]
      let sub = ''
      if (comeback) sub = `the reverse sweep, after dropping game one`
      else if (m === 2 && t === 0) sub = `a clean sweep, never in doubt`
      else if (st && st.dir === 'W' && st.n >= 2) sub = `a <b>${st.n}-series win streak</b> and counting`
      if (mvp && (mvp.rating ?? 0) >= 7.5)
        sub += `${sub ? ' — ' : ''}<b>${mvp.name}</b> runs the show (${fmtKDA(mvp)}, ${mvp.rating.toFixed(1)})`
      lines.push({
        icon: '✅', cls: 'win',
        text: `${pick(lead, lastRound)}${sub ? ` — <span class="hl-dim">${sub}</span>` : ''}.`,
      })
    } else {
      const lead = [
        `<b>${oppName(mine)}</b> hand <b>${teamName(state, me)}</b> a ${t}–${m} defeat`,
        `Tough week — <b>${oppName(mine)}</b> take the series ${t}–${m}`,
        `<b>${teamName(state, me)}</b> fall ${m}–${t} to <b>${oppName(mine)}</b>`,
      ]
      let sub = ''
      if (st && st.dir === 'L' && st.n >= 2) sub = `a <b>${st.n}-series skid</b> — the bounce-back starts now`
      else sub = `regroup and go again next week`
      lines.push({ icon: '❌', cls: 'loss', text: `${pick(lead, lastRound)} — <span class="hl-dim">${sub}</span>.` })
    }
  }

  // Around the league: biggest upset + most dramatic other series.
  const scored = others.map((r) => {
    const winner = r.homeWon ? r.homeId : r.awayId
    const loser = r.homeWon ? r.awayId : r.homeId
    const diff = teamTier(state, loser) - teamTier(state, winner)
    const games = (r.aWins ?? 0) + (r.bWins ?? 0)
    return { r, winner, loser, diff, games }
  })
  const upsets = scored.filter((s) => s.diff >= 4).sort((a, b) => b.diff - a.diff)
  if (upsets.length) {
    const u = upsets[0]
    lines.push({
      icon: '🤯', cls: 'info',
      text: `Upset of the week — <b>${teamName(state, u.winner)}</b> stun <b>${teamName(state, u.loser)}</b> ${Math.max(u.r.aWins, u.r.bWins)}–${Math.min(u.r.aWins, u.r.bWins)}.`,
    })
  }
  const drama = scored.filter((s) => s.games >= 3 && s.diff < 4).sort((a, b) => b.games - a.games)[0]
  if (drama && lines.length < 4) {
    lines.push({
      icon: '⚔️', cls: 'info',
      text: `<b>${teamName(state, drama.winner)}</b> edge <b>${teamName(state, drama.loser)}</b> in a ${Math.max(drama.r.aWins, drama.r.bWins)}–${Math.min(drama.r.aWins, drama.r.bWins)} thriller.`,
    })
  }
  const sweep = scored.filter((s) => (s.r.aWins === 2 && s.r.bWins === 0) || (s.r.aWins === 0 && s.r.bWins === 2))[0]
  if (sweep && lines.length < 4) {
    lines.push({
      icon: '🧹', cls: 'info',
      text: `<b>${teamName(state, sweep.winner)}</b> sweep <b>${teamName(state, sweep.loser)}</b> aside without dropping a game.`,
    })
  }

  // Table context.
  const pl = placementOf(state, me)
  if (pl && lines.length < 5) {
    const tableLine =
      pl.pos === 1 ? `<b>${teamName(state, me)}</b> sit top of the table — the team to beat.`
      : pl.gap === 0 ? `<b>${teamName(state, me)}</b> are level at the summit, P${pl.pos}.`
      : pl.gap <= 2 ? `<b>${teamName(state, me)}</b> sit P${pl.pos}, ${pl.gap} point${pl.gap === 1 ? '' : 's'} off the lead.`
      : `<b>${teamName(state, me)}</b> sit P${pl.pos} of ${pl.of} — work to do.`
    lines.push({ icon: '📊', cls: 'gold', text: tableLine })
  }

  // Whispers: trait reveals in the user's series log (series-level log lines
  // read like "Faker reveals Big-Game Player!").
  if (mine && lines.length < 6) {
    const rev = (mine.log || []).find((l) => typeof l === 'string' && l.includes('reveals'))
    if (rev) {
      const m = rev.match(/([A-Za-z0-9_ .'-]+) reveals/i)
      const who = m ? m[1].trim() : 'Someone'
      lines.push({
        icon: '👀', cls: 'gold',
        text: `Scouts are whispering — <b>${who}</b> showed something special this week.`,
      })
    }
  }
  return lines.slice(0, 6)
}

// ---- Achievements ------------------------------------------------------------
// All derived. `unlocked` is a pure function of history — no persistence.
const ACH = [
  { id: 'debut', icon: '🎙️', name: 'First whistle', desc: 'Play your first series as head coach.',
    test: (s, me) => userSeries(s, me).length > 0 },
  { id: 'off-the-mark', icon: '✅', name: 'Off the mark', desc: 'Win your first series.',
    test: (s, me) => userSeries(s, me).some((r) => seriesWon(r, me)) },
  { id: 'sweep', icon: '🧹', name: 'Clean sweep', desc: 'Win a series 2–0.',
    test: (s, me) => userSeries(s, me).some((r) => { const sc = seriesScore(r, me); return seriesWon(r, me) && sc.mine === 2 && sc.theirs === 0 }) },
  { id: 'comeback', icon: '🔥', name: 'Comeback kings', desc: 'Win a series after losing game one.',
    test: (s, me, gamesByRound) => userSeries(s, me).some((r) => {
      const gs = gamesByRound?.[r.round]
      if (!gs || gs.length < 2 || !seriesWon(r, me)) return false
      const youA = r.userSide !== 'away'
      return gs[0].winner !== (youA ? 'A' : 'B')
    }) },
  { id: 'streak-3', icon: '⚡', name: 'Heating up', desc: 'Win 3 series in a row.',
    test: (s, me) => bestWinStreak(s, me) >= 3 },
  { id: 'streak-5', icon: '🔥', name: 'Unstoppable', desc: 'Win 5 series in a row.',
    test: (s, me) => bestWinStreak(s, me) >= 5 },
  { id: 'giant-slayer', icon: '🗡️', name: 'Giant slayer', desc: 'Beat a team rated 5+ tiers above you.',
    test: (s, me) => userSeries(s, me).some((r) => {
      if (!seriesWon(r, me)) return false
      const opp = r.homeId === me ? r.awayId : r.homeId
      return teamTier(s, opp) - teamTier(s, me) >= 5
    }) },
  { id: 'kingslayer', icon: '👑', name: 'Kingslayer', desc: 'Beat T1 or Gen.G in a series.',
    test: (s, me) => me !== 'T1' && me !== 'GEN' && userSeries(s, me).some((r) => {
      if (!seriesWon(r, me)) return false
      const opp = r.homeId === me ? r.awayId : r.homeId
      return opp === 'T1' || opp === 'GEN'
    }) },
  { id: 'talent', icon: '🌱', name: 'Talent factory', desc: 'Promote an academy prospect to the senior squad.',
    test: (s, me) => (s.teams?.[me] || []).some((p) => p.academy) },
  { id: 'playoffs', icon: '🎯', name: 'Playoff bound', desc: 'Reach the postseason.',
    test: (s, me) => ['playoffs', 'msi', 'worlds', 'done'].includes(s.phase) || !!s.playoffChampionId },
  { id: 'regional', icon: '🏆', name: 'Regional champions', desc: 'Win your regional split.',
    test: (s, me) => s.playoffChampionId === me },
  { id: 'msi', icon: '🌏', name: 'MSI champions', desc: 'Lift the Mid-Season Invitational.',
    test: (s, me) => { const t = s.tournament; return !!t && (t.kind === 'msi' ? t.championId === me : t.msiChampionId === me) } },
  { id: 'worlds', icon: '🌍', name: 'World champions', desc: 'Win the World Championship.',
    test: (s, me) => { const t = s.tournament; return !!t && t.kind === 'worlds' && t.championId === me } },
  { id: 'dynasty', icon: '♾️', name: 'Dynasty', desc: 'Win 3 career titles with one club.',
    test: (s, me) => (s.career?.history || []).filter((h) => h.championId === me).length >= 3 },
  { id: 'decade', icon: '📜', name: 'Ten-season legacy', desc: 'Complete a full 10-season career.',
    test: (s) => (s.career?.history || []).length >= 10 },
]

export function achievements(state, gamesByRound = null) {
  const me = state.teamId
  if (!me) return []
  return ACH.map((a) => {
    let unlocked = false
    try { unlocked = !!a.test(state, me, gamesByRound) } catch { unlocked = false }
    return { id: a.id, icon: a.icon, name: a.name, desc: a.desc, unlocked }
  })
}

// Newly unlocked since the previous snapshot of unlocked ids (for toasts).
export function newlyUnlocked(state, prevIds = [], gamesByRound = null) {
  const prev = new Set(prevIds)
  return achievements(state, gamesByRound).filter((a) => a.unlocked && !prev.has(a.id))
}

// ---- Coach notes --------------------------------------------------------------
// A short, specific read on the series just played. Numbers come from the
// recomputed games; the tone follows the result.
export function coachNote(state, result, games) {
  const me = state.teamId
  const won = seriesWon(result, me)
  const youA = result.userSide !== 'away'
  const side = youA ? 'A' : 'B'
  const mine = (games || []).flatMap((g) => (g.players || []).filter((p) => p.side === side))
  const best = mine.length ? mine.reduce((a, b) => ((b.rating ?? 0) > (a.rating ?? 0) ? b : a)) : null
  const worst = mine.length ? mine.reduce((a, b) => ((b.rating ?? 0) < (a.rating ?? 0) ? b : a)) : null
  const earlyDiffs = (games || []).map((g) => {
    const tl = g.goldTimeline || []
    const half = tl.slice(0, Math.max(1, Math.floor(tl.length / 2)))
    if (!half.length) return 0
    const avg = half.reduce((a, p) => a + (p.diff || 0), 0) / half.length
    return youA ? avg : -avg
  })
  const slowStarts = earlyDiffs.filter((d) => d < -1500).length

  if (won) {
    const bits = []
    if (best && (best.rating ?? 0) >= 7.5)
      bits.push(`<b>${best.name}</b> was the difference (${fmtKDA(best)}, ${best.rating.toFixed(1)} rating)`)
    if (slowStarts === 0 && games && games.length)
      bits.push(`clean early games — no gold deficit at 15 in any game`)
    const st = streakOf(state, me)
    if (st && st.dir === 'W' && st.n >= 3) bits.push(`that's <b>${st.n} in a row</b> — the room believes`)
    return {
      tone: 'win',
      head: 'Coach’s read',
      body: bits.length
        ? bits.join('. ') + '. Keep the same five, keep the same plan.'
        : 'Did the job. Bank the points and move on to next week.',
    }
  }
  const bits = []
  if (worst && best && (best.rating ?? 0) - (worst.rating ?? 0) >= 2.5)
    bits.push(`the gap between <b>${best.name}</b> (${best.rating.toFixed(1)}) and <b>${worst.name}</b> (${worst.rating.toFixed(1)}) decided it`)
  else if (worst)
    bits.push(`<b>${worst.name}</b> never got going (${fmtKDA(worst)})`)
  if (slowStarts > 0)
    bits.push(`slow starts hurt — down early gold in ${slowStarts} game${slowStarts > 1 ? 's' : ''}`)
  return {
    tone: 'loss',
    head: 'Coach’s read',
    body: bits.length
      ? 'What beat us: ' + bits.join('; ') + '. One training block on early-game plans, then we go again.'
      : 'Fine margins. Review the draft, reset, and take it out on next week’s opponent.',
  }
}
