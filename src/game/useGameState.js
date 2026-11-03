// ============================================================================
// useGameState — game state, actions, and localStorage persistence.
// ============================================================================
import { useCallback, useEffect, useReducer, useState } from 'react'
import { TEAMS, FREE_AGENTS, ROLES } from '../data/lck.js'
import { getSeason, LEAGUES, PRESENT_BY_LEAGUE } from '../data/seasons.js'
import { CAMPAIGNS } from '../data/campaigns.js'
import { COACHES, COACH_BY_ID, coachBonus } from '../data/coaches.js'
import { buildLCKSchedule, makeStandings, emptyStanding, roundRobin, buildPlayoffs } from '../engine/season.js'
import { simulateSeries, simulateSingleGame } from '../engine/sim.js'
import { createDraft, applyBan, applyPick, scoreComp, getDraftDebrief, PERSONALITY_IDS } from './draft.js'
import { IGL_CALLS, buildIglPrompt, evaluateIglCall } from './igl.js'
import { playerWage, signingFee, teamBudget, canAfford } from './economy.js'
import { developPlayer } from '../data/development.js'
import { SERIES_TRAIT_IDS } from '../data/traits.js'
import { buildAcademyPlayer } from '../data/academy.js'
import { DILEMMA_EVENTS } from '../data/events.js'
import { bestLineup, userLineup, styledPlayer, clampForm } from './logic.js'
import { aiTactic } from './ai.js'
import { prepareWeek, preparationBonus, upcomingOpponent } from './preparation.js'
import { readSave, writeSave } from './persistence.js'

// Deterministic per-series RNG so the Match Detail view can recompute identical
// games[] on demand without persisting full timelines. Each series stores its
// seed + the two lineup/tactic snapshots used at sim time; the detail view
// re-runs simulateSeries with mulberry32(seed) to get byte-identical output
// (sim.js threads the single injected rng in fixed order).
import { mulberry32 } from './random.js'
export { mulberry32 } from './random.js'
import { comfortChamps } from './comfort.js'
export { comfortChamps } from './comfort.js'
import { MATCH_OPTIONS, matchOptions, createMatchSession, startMatchSession, startSessionGame, changeSessionDraft, makeSessionCall, finishSessionGame, nextSessionGame, sessionResult } from './matchSession.js'
const SCHEDULE = buildLCKSchedule()
const TOTAL_ROUNDS = SCHEDULE.length

// --- Expansion systems: board, economy, contracts/morale, press -------------
// Backfill contract/morale onto players that predate the systems (old saves,
// campaign extraTeams). Deterministic-ish; cosmetic only.
function backfillPlayerFields(teams, faPool) {
  for (const tid in teams) {
    for (const p of teams[tid]) {
      if (p.contract == null) p.contract = 1 + Math.floor(Math.random() * 3)
      if (p.morale == null) p.morale = 65 + Math.floor(Math.random() * 20)
    }
  }
  for (const p of faPool || []) {
    if (p.contract == null) p.contract = 1
    if (p.morale == null) p.morale = 70
  }
}
function clampMorale(v) {
  return Math.max(0, Math.min(100, Math.round(v)))
}
function boardExpectationFor(tier) {
  if (tier >= 89) return 'Win the title'
  if (tier >= 86) return 'Reach the final'
  if (tier >= 83) return 'Make the playoffs'
  return 'Avoid last place'
}
// Board + finance + press init once the managed team is known.
function initManagerState(base) {
  const tier = base.teamMeta?.[base.teamId]?.tier ?? 82
  base.board = { expectation: boardExpectationFor(tier), confidence: 60 }
  base.finance = { budget: teamBudget(tier) }
  base.press = { pending: true }
}
// Recent user-series streak: positive = win streak, negative = losing.
function userStreak(state) {
  const mine = (state.results || []).filter((r) => r.isUser).slice(-5)
  let s = 0
  for (let i = mine.length - 1; i >= 0; i--) {
    const r = mine[i]
    const won = r.userSide === 'home' ? r.homeWon : !r.homeWon
    if (won && s >= 0) s++
    else if (!won && s <= 0) s--
    else break
  }
  return s
}
// itero-inspired: deterministic comfort champions per player (3 from role
// pool). Drafting comfort gives a small bonus in draft mode.
// Shared series finalizer for draft/IGL modes: pushes the result entry,
// updates standings + form like PLAY_ROUND, advances the round.
function applyUserSeriesResult(state, form, standings, results, homeId, awayId, userIsHome, aWins, bWins, log, games) {
  const homeWon = aWins > bWins
  results.push({
    round: state.round,
    homeId,
    awayId,
    homeWon,
    aWins,
    bWins,
    isUser: true,
    userSide: userIsHome ? 'home' : 'away',
    log: log || [],
    detail: null,
    games: (games || []).map((entry) => entry.game),
  })
  const hw = standings[homeWon ? homeId : awayId]
  const lw = standings[homeWon ? awayId : homeId]
  if (hw && lw) {
    hw.W += 1; hw.points += 1; hw.gameWins += Math.max(aWins, bWins); hw.gameLosses += Math.min(aWins, bWins)
    lw.L += 1; lw.gameWins += Math.min(aWins, bWins); lw.gameLosses += Math.max(aWins, bWins)
  }
  return { results, standings, form }
}

// Interactive modes share the ordinary split -> playoff transition.
function finishInteractiveRound(state, updates) {
  const next = { ...state, ...updates, round: state.round + 1, press: { pending: true } }
  next.finished = next.round > state.totalRounds
  if (next.finished) {
    const ordered = orderStandings(next.standings).map((r) => r.teamId)
    if (ordered.length >= 4) {
      const { semis } = buildPlayoffs(ordered, 4)
      next.phase = 'playoffs'
      next.playoffChampionId = null
      next.tournament = { kind: 'playoffs', rounds: [
        { name: 'Semifinal', matches: semis.map(([h, a]) => tournamentMatch(h, a, state.teamId)) },
        { name: 'Final', matches: [tournamentMatch(null, null, state.teamId)] },
      ], status: 'active', championId: null, qualifies: ordered.slice(0, 4), revealedRounds: 1, resolver: 'biased' }
    }
  }
  return next
}

// Sim non-user matches of a round (shared by draft/IGL week starts).
// Mutates the passed form/standings/results copies; returns the user's match.
function simOtherMatches(state, matches, myId, round, form, standings, results) {
  let userMatch = null
  for (const [homeId, awayId] of matches) {
    if (homeId === myId || awayId === myId) {
      userMatch = [homeId, awayId]
      continue
    }
    const homeLineupObj = bestLineup(state.teams[homeId], form).lineup
    const awayLineupObj = bestLineup(state.teams[awayId], form).lineup
    const seed = (Math.random() * 0x7fffffff) | 0
    const res = simulateSeries(
      homeLineupObj, aiTactic(homeId, awayId, round, Math.random, state.teamMeta?.[homeId]?.tier),
      awayLineupObj, aiTactic(awayId, homeId, round, Math.random, state.teamMeta?.[awayId]?.tier),
      mulberry32(seed), homeId, awayId, { bigMatch: false, fearless: false },
    )
    const homeWon = res.winner === 'A'
    results.push({ round, homeId, awayId, homeWon, aWins: res.aWins, bWins: res.bWins, isUser: false, userSide: null, log: [], detail: null })
    const hw = standings[homeWon ? homeId : awayId]
    const lw = standings[homeWon ? awayId : homeId]
    if (hw && lw) {
      hw.W += 1; hw.points += 1; hw.gameWins += Math.max(res.aWins, res.bWins); hw.gameLosses += Math.min(res.aWins, res.bWins)
      lw.L += 1; lw.gameWins += Math.min(res.aWins, res.bWins); lw.gameLosses += Math.max(res.aWins, res.bWins)
    }
    for (const p of Object.values(homeWon ? homeLineupObj : awayLineupObj)) if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] + 3)
    for (const p of Object.values(homeWon ? awayLineupObj : homeLineupObj)) if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] - 3)
  }
  return userMatch
}
// Draft side selection: home is BLUE on even games (pro-style alternation).
function draftForGame(gameIndex, userIsHome) {
  const homeIsBlue = gameIndex % 2 === 0
  const userSide = (userIsHome === homeIsBlue) ? 'BLUE' : 'RED'
  return createDraft(userSide)
}

// Sim-speed pacing (the sim math is instant; these only pace the theatrics).
export const SIM_SPEEDS = {
  slow: { label: 'Slow', revealMs: 1400, walkoutMs: 1900, gameMs: 1500, thinkMs: 1200 },
  normal: { label: 'Normal', revealMs: 700, walkoutMs: 1200, gameMs: 800, thinkMs: 800 },
  fast: { label: 'Fast', revealMs: 250, walkoutMs: 500, gameMs: 350, thinkMs: 350 },
  instant: { label: 'Instant', revealMs: 0, walkoutMs: 0, gameMs: 0, thinkMs: 120 },
}
export function simSpeedMs(state, key) {
  const s = SIM_SPEEDS[state?.simSpeed] ?? SIM_SPEEDS.normal
  return s[key] ?? 0
}

function freshState(seasonYear = 'present') {
  const season = getSeason(seasonYear)
  const year = season.id
  const yearTeams = season.teams
  const yearFAs = season.freeAgents
  const teams = {}
  for (const t of yearTeams) teams[t.id] = t.players.map((p) => ({ ...p }))
  const faPool = yearFAs.map((p) => ({ ...p, team: 'FA' }))
  const form = {}
  for (const id in teams) for (const p of teams[id]) form[p.id] = 50
  for (const p of faPool) form[p.id] = 50
  // Per-year meta + schedule so saves carry their own dataset (old saves
  // without these backfill to present in load()). Standings are built from
  // the year's own team ids (not the static makeStandings()) so future years
  // with different team sets work without engine changes.
  const teamMeta = {}
  for (const t of yearTeams) teamMeta[t.id] = { id: t.id, name: t.name, short: t.short, color: t.color, tier: t.tier }
  const schedule = roundRobin(yearTeams.map((t) => t.id))
  const standings = {}
  for (const t of yearTeams) standings[t.id] = emptyStanding(t.id)
  backfillPlayerFields(teams, faPool)
  return {
    version: 1,
    matchOptions: matchOptions(),
    matchSession: null,
    teamId: null,
    managerName: '',
    // Year selector contract (design doc §2 LOCKED): seasonYear is canonical;
    // `year` is kept as an alias for the same value.
    seasonYear: year,
    year,
    // Multi-league contract (multileague-design §2 LOCKED): league resolves
    // from the season entry; phase/tournament track the international flow.
    league: season.league ?? 'LCK',
    phase: 'regional', // 'regional' | 'playoffs' | 'msi' | 'worlds' | 'done'
    tournament: null, // Tournament | null (multileague-design §4)
    playoffChampionId: null, // P1 item 11: playoff winner (top-level, survives bracket replace)
    seriesOptions: { fearless: false }, // P1 item 10: global series toggles
    pendingPromotion: null, // P1 item 8: { player, teamId } | null (academy offer)
    teamMeta,
    schedule,
    totalRounds: schedule.length,
    teams,
    faPool,
    form,
    lineup: {}, // role -> playerId (managed team starters)
    tactic: { style: 'BAL', phase: 'MID' },
    strategy: { comp: null, roam: null, swap: false, wincon: null }, // item 4 gameplan (season + career; campaign never reads)
    round: 1, // next round to play (1..totalRounds)
    standings,
    results: [], // played matches
    trainedRound: 0,
    finished: false,
    // Campaign mode (additive; old saves without these load as season).
    mode: 'season', // 'season' | 'campaign' | 'career' | 'draft' | 'igl' | 'gauntlet'
    campaign: null, // CampaignProgress | null (see freshCampaign below)
    career: null, // Career | null (see freshCareer below; null unless mode === 'career')
    pendingEvent: null, // CareerDilemma | null (p0-ux-design §2b; set by ADVANCE_SEASON roll)
    lastEventLog: null, // transient log string from the last RESOLVE_EVENT
    // Expansion systems (additive; old saves backfill via load()).
    board: null, // { expectation, confidence } | null
    finance: null, // { budget } | null
    press: { pending: false }, // post-match press conference
    gauntlet: null, // { round, wins, target, opponents, opponentId, status, lastResult } | null
    draftSeries: null, // active draft-mode series | null
    live: null, // active IGL-mode live series | null
    sacked: false, // board fired the coach
    simSpeed: 'normal', // reveal pacing: 'slow' | 'normal' | 'fast' | 'instant'
  }
}

// --- Campaign mode (per-game loss model) ------------------------------------
// A campaign node = one Bo5 series = 5 ordered game slots (1-based). Slots in
// node.hardLossSlots auto-resolve as historical losses (no sim, never
// game-over). Every other slot is winnable: ONE simulateSeries call per
// PLAY_CAMPAIGN_NODE press (player always side A/home); losing one fails the
// run immediately. A node clears when all 5 slots are recorded with every
// winnable slot won; clearing the last node sets status 'cleared'.
export const CAMPAIGN_SLOTS = 5

export function campaignById(campaignId) {
  return CAMPAIGNS.find((c) => c.id === campaignId) || null
}

function freshCampaign(campaignId) {
  return {
    campaignId,
    nodeIndex: 0,
    status: 'active', // 'active' | 'failed' | 'cleared'
    failedNodeId: null,
    failedSlot: null,
    nodeResults: [], // one entry per played slot, in order
  }
}

function nodeSlots(campaign, nodeId) {
  return campaign.nodeResults.filter((r) => r.nodeId === nodeId)
}

// Initial managed-team lineup = best ovr per role.
function defaultLineup(teamPlayers) {
  const { ids } = bestLineup(teamPlayers, {})
  const map = {}
  // bestLineup returns ids in ROLES order; map back by role
  const byId = Object.fromEntries(teamPlayers.map((p) => [p.id, p]))
  for (const id of ids) {
    const p = byId[id]
    if (p) map[p.role] = id
  }
  return map
}

// --- Career mode (design doc §2 LOCKED contract) ---------------------------
// Career = { managerName, teamId, seasonIndex 1..10, maxSeasons: 10,
//   status: 'active'|'retired', seasonYear: starting dataset id,
//   staff: { [teamId]: CoachId }, coachPool: Coach[], history: SeasonRecord[] }
function freshCareer(teamId, managerName, teamIds, seasonYear = 'present') {
  const staff = {}
  for (const tid of teamIds) {
    const def = COACHES.find((c) => c.team === tid)
    staff[tid] = def ? def.id : `COACH-${tid}`
  }
  return {
    managerName: managerName || 'Coach',
    teamId,
    seasonIndex: 1,
    maxSeasons: 10,
    status: 'active',
    seasonYear,
    staff,
    coachPool: COACHES.filter((c) => c.team === 'FA').map((c) => ({ ...c })),
    history: [],
  }
}

// A retired career is frozen: all gameplay actions no-op.
function isRetired(state) {
  return state.mode === 'career' && state.career?.status === 'retired'
}

// Resolve a coach object by id: live pool entry first, static registry fallback
// (staff-held coaches live only as ids in career.staff).
function careerCoachById(career, id) {
  const pooled = career?.coachPool?.find((c) => c.id === id)
  if (pooled) return pooled
  return COACH_BY_ID[id] || null
}

// Managed-team coach bonus for the next PLAY_ROUND (0 when none applies).
export function managedCoachBonus(state) {
  if (state.mode !== 'career' || !state.career || state.career.status !== 'active') return 0
  const coach = careerCoachById(state.career, state.career.staff[state.teamId])
  if (!coach) return 0
  return coachBonus(coach.rating)
}

// Standings ordering shared by Standings.jsx: points, then game diff, then wins.
export function orderStandings(standings) {
  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const da = a.gameWins - a.gameLosses
    const db = b.gameWins - b.gameLosses
    if (db !== da) return db - da
    return b.gameWins - a.gameWins
  })
}

function seasonRecordFor(state) {
  const rows = orderStandings(state.standings)
  const myRow = state.standings[state.teamId]
  const userPlacement = rows.findIndex((r) => r.teamId === state.teamId) + 1
  // International flags (multileague-design §5): absent on old records =
  // false. MSI ran first, so a worlds-kind tournament carries the MSI
  // champion forward as msiChampionId (set at BUILD_TOURNAMENT time).
  const t = state.tournament
  const msiChamp = t ? (t.kind === 'msi' ? t.championId : (t.msiChampionId ?? null)) : null
  const worldsChamp = t && t.kind === 'worlds' ? t.championId : null
  return {
    seasonIndex: state.career.seasonIndex,
    // P1 item 11: playoff winner is the season champion when playoffs ran.
    championId: state.playoffChampionId ?? rows[0]?.teamId ?? null,
    userPlacement,
    userW: myRow?.W ?? 0,
    userL: myRow?.L ?? 0,
    coachId: state.career.staff[state.teamId] ?? null,
    league: state.league ?? 'LCK',
    regionalTitle: userPlacement === 1,
    msiTitle: msiChamp != null && msiChamp === state.teamId,
    worldsTitle: worldsChamp != null && worldsChamp === state.teamId,
  }
}

// --- International tournaments (multileague-design §4 LOCKED) ---------------
// 8 teams (top 2 per league), single elim: QF(4) -> SF(2) -> F(1). Each match
// is ONE simulateSeries call, exactly like PLAY_ROUND. Engine untouched.
export const QUALIFIERS_PER_LEAGUE = 2

// Historical careers start an alternate timeline from the selected roster.
// Foreign qualifiers use the same starting year where a dataset exists;
// annual progression develops the live roster, rather than replaying history.
export function tournamentSeasonForLeague(state, league) {
  const year = /^(\d{4})/.exec(getSeason(state.seasonYear).id)?.[1]
  if (year) {
    const id = `${year}-${league.toLowerCase()}`
    const season = getSeason(id)
    if (season.id === id) return season
  }
  return getSeason(PRESENT_BY_LEAGUE[league])
}

// Find a team in the tournament's year-matched datasets.
function datasetTeamById(state, teamId) {
  for (const league of LEAGUES) {
    const season = tournamentSeasonForLeague(state, league)
    const found = season.teams.find((t) => t.id === teamId)
    if (found) return found
  }
  return null
}

// Top 2 per league. The managed league uses its live final regional
// standings (existing comparator, no new tiebreak); every other league has no
// played standings, so its qualifiers resolve deterministically by dataset
// tier order (strongest two). Historical non-LEAGUES years (e.g. OGN) feed the
// LCK slot from their live standings.
export function qualifiersForTournament(state) {
  const liveSlot = LEAGUES.includes(state.league) ? state.league : 'LCK'
  const out = {}
  for (const league of LEAGUES) {
    if (league === liveSlot) {
      const rows = orderStandings(state.standings)
      out[league] = [rows[0]?.teamId, rows[1]?.teamId].filter(Boolean)
    } else {
      const season = tournamentSeasonForLeague(state, league)
      out[league] = [...season.teams]
        .sort((a, b) => b.tier - a.tier || (a.id < b.id ? -1 : 1))
        .slice(0, QUALIFIERS_PER_LEAGUE)
        .map((t) => t.id)
    }
  }
  return out
}

// Seeding (locked): #1 seeds vs #2 seeds in round 1; same-league #1/#2 in
// opposite halves (top half = matches 0-1, bottom half = matches 2-3).
function seedTournament(qualifiers) {
  const first = (l) => qualifiers[l][0]
  const second = (l) => qualifiers[l][1]
  return [
    [first('LCK'), second('LEC')],
    [first('LPL'), second('LCS')],
    [first('LEC'), second('LCK')],
    [first('LCS'), second('LPL')],
  ]
}

function tournamentMatch(homeId, awayId, userTeamId) {
  return {
    homeId,
    awayId,
    winner: null,
    aWins: 0,
    bWins: 0,
    isUser: homeId === userTeamId || awayId === userTeamId,
    userSide: homeId === userTeamId ? 'home' : awayId === userTeamId ? 'away' : null,
    log: [],
    // Shared compact seed shape (MatchDetail recompute compatible).
    detail: null,
  }
}

function buildTournamentObject(state, kind) {
  const pairs = seedTournament(qualifiersForTournament(state))
  const qualifies = pairs.flat()
  // teamMeta extends additively so the bracket resolves foreign names/colors.
  const teamMeta = { ...state.teamMeta }
  for (const id of qualifies) {
    if (!teamMeta[id]) {
      const team = datasetTeamById(state, id)
      if (team) teamMeta[id] = { id: team.id, name: team.name, short: team.short, color: team.color, tier: team.tier }
    }
  }
  const t = {
    kind,
    rounds: [
      { name: 'Quarterfinal', matches: pairs.map(([h, a]) => tournamentMatch(h, a, state.teamId)) },
      { name: 'Semifinal', matches: [tournamentMatch(null, null, state.teamId), tournamentMatch(null, null, state.teamId)] },
      { name: 'Final', matches: [tournamentMatch(null, null, state.teamId)] },
    ],
    status: 'active',
    championId: null,
    qualifies,
    revealedRounds: 1, // QF visible at build; SF/F render as locked placeholders (P0 UX item 1)
    resolver: 'biased', // 'biased' | 'random' | 'manual' (P0 engine; UI flip via SET_RESOLVER)
  }
  // Worlds reuses the same qualifier set; carry the MSI champion so the
  // season record can credit both titles at ADVANCE_SEASON time.
  if (kind === 'worlds' && state.tournament?.kind === 'msi') {
    t.msiChampionId = state.tournament.championId
  }
  return { tournament: t, teamMeta }
}

// Roster source for one tournament side. Live league teams use live
// rosters/form; foreign teams snapshot the matching starting-year dataset
// with neutral form (AI has no form history). The managed team keeps its live
// roster/form via userLineup in playTournamentMatch.
function tournamentRoster(state, teamId) {
  if (state.teams[teamId]) return { players: state.teams[teamId], form: state.form }
  const team = datasetTeamById(state, teamId)
  const players = team ? team.players : []
  const form = {}
  for (const p of players) form[p.id] = 50
  return { players, form }
}

function playTournamentMatch(state, match, bonus, roundNo, simMode = 'biased', forcedWinner = null, roundsTotal = 3) {
  const myId = state.teamId
  const homeIsUser = match.homeId === myId
  const awayIsUser = match.awayId === myId
  const homeSrc = tournamentRoster(state, match.homeId)
  const awaySrc = tournamentRoster(state, match.awayId)
  const homeLineupObj = homeIsUser
    ? userLineup(state.teams[myId], state.lineup, state.form).lineup
    : bestLineup(homeSrc.players, homeSrc.form).lineup
  const awayLineupObj = awayIsUser
    ? userLineup(state.teams[myId], state.lineup, state.form).lineup
    : bestLineup(awaySrc.players, awaySrc.form).lineup
  const homeTactic = homeIsUser ? state.tactic : aiTactic(match.homeId, match.awayId, roundNo, Math.random, state.teamMeta?.[match.homeId]?.tier)
  const awayTactic = awayIsUser ? state.tactic : aiTactic(match.awayId, match.homeId, roundNo, Math.random, state.teamMeta?.[match.awayId]?.tier)
  const seed = (Math.random() * 0x7fffffff) | 0
  const bonusA = homeIsUser ? bonus : 0
  const bonusB = awayIsUser ? bonus : 0
  // Match-level forced winner ('home'|'away'|null, set by the Tournament UI)
  // maps to engine sides ('A'|'B'|null). Engine-side values pass through
  // defensively; anything else is null (non-manual modes ignore it).
  const fwMatch = forcedWinner ?? match.forcedWinner ?? null
  const fwEngine = fwMatch === 'home' || fwMatch === 'A' ? 'A'
    : fwMatch === 'away' || fwMatch === 'B' ? 'B' : null
  const mode = simMode === 'random' || simMode === 'manual' ? simMode : 'biased'
  // P1 item 7: only the last two rounds (SF/F) arm big_game_player.
  // roundNo = 10 + ri, so the round index is roundNo - 10.
  const bigMatch = (roundNo - 10) >= roundsTotal - 2
  const res = simulateSeries(
    homeLineupObj, homeTactic,
    awayLineupObj, awayTactic,
    mulberry32(seed),
    match.homeId, match.awayId,
    {
      aBonus: bonusA, bBonus: bonusB, simMode: mode, forcedWinner: fwEngine,
      bigMatch,
      fearless: state.seriesOptions?.fearless ?? false, // P1 item 10
    },
  )
  const homeWon = res.winner === 'A'
  return {
    ...match,
    winner: homeWon ? match.homeId : match.awayId,
    aWins: res.aWins,
    bWins: res.bWins,
    log: match.isUser ? res.log : [],
    detail: { seed, homeLineup: homeLineupObj, awayLineup: awayLineupObj, homeTactic, awayTactic, bonusA, bonusB, simMode: mode, forcedWinner: fwEngine, bigMatch, fearless: state.seriesOptions?.fearless ?? false },
  }
}

function baseReducer(state, action) {
  switch (action.type) {
    case 'NEW_GAME': {
      const base = freshState(action.seasonYear ?? action.year)
      const ids = Object.keys(base.teams)
      base.teamId = ids.includes(action.teamId) ? action.teamId : ids[0]
      base.managerName = action.managerName || 'Coach'
      base.lineup = defaultLineup(base.teams[base.teamId])
      const mode = action.mode ?? 'season'
      base.mode = ['season', 'draft', 'igl', 'gauntlet'].includes(mode) ? mode : 'season'
      initManagerState(base)
      return base
    }
    case 'RESET':
      return freshState()

    case 'START_CAREER': {
      // Honor every valid selector dataset; getSeason retains the unknown-id
      // fallback. Later seasons develop these rosters in an alternate timeline.
      const reqYear = action.seasonYear ?? action.year ?? 'present'
      const careerYear = getSeason(reqYear).id
      const base = freshState(careerYear)
      const ids = Object.keys(base.teams)
      base.teamId = ids.includes(action.teamId) ? action.teamId : ids[0]
      base.managerName = action.managerName || 'Coach'
      base.lineup = defaultLineup(base.teams[base.teamId])
      base.mode = 'career'
      base.career = freshCareer(base.teamId, base.managerName, ids, careerYear)
      initManagerState(base)
      // P1 item 7: stamp 2 managed-roster starters with one random
      // series-trigger trait each (revealed: false) so the user meets the
      // system. The rest of the league stays as generated.
      try {
        const managed = base.teams[base.teamId] || []
        const starters = Object.values(base.lineup)
          .map((id) => managed.find((p) => p.id === id))
          .filter(Boolean)
        for (let i = starters.length - 1; i > 0; i--) {
          const j = (Math.random() * (i + 1)) | 0
          ;[starters[i], starters[j]] = [starters[j], starters[i]]
        }
        for (const p of starters.slice(0, 2)) {
          const tid = SERIES_TRAIT_IDS[(Math.random() * SERIES_TRAIT_IDS.length) | 0]
          if (!Array.isArray(p.traits)) p.traits = []
          if (!p.traits.some((t) => (typeof t === 'string' ? t : t.id) === tid)) {
            p.traits = [...p.traits, { id: tid, revealed: false, fired: false, spike: 0 }]
          }
        }
      } catch {
        /* trait stamp is cosmetic — never break career start */
      }
      return base
    }

    case 'SET_LINEUP': {
      if (!state.teamId || isRetired(state)) return state
      return { ...state, lineup: { ...state.lineup, [action.role]: action.playerId } }
    }

    case 'SET_TACTIC':
      if (isRetired(state)) return state
      return { ...state, tactic: { style: action.style, phase: action.phase } }

    case 'SET_STRATEGY': {
      // Item 4 gameplan: partial merge, re-settable any time before the next
      // PLAY_ROUND. Campaign never reads state.strategy.
      if (isRetired(state)) return state
      const cur = state.strategy ?? { comp: null, roam: null, swap: false, wincon: null }
      const next = { ...cur }
      if ('comp' in action) next.comp = action.comp ?? null
      if ('roam' in action) next.roam = action.roam ?? null
      if ('swap' in action) next.swap = !!action.swap
      if ('wincon' in action) next.wincon = action.wincon ?? null
      return { ...state, strategy: next }
    }

    case 'SET_SERIES_OPTION': {
      // P1 item 10: global series toggles. Allowed anytime except retired.
      // Unknown keys / non-bool values → no-op.
      if (isRetired(state)) return state
      if (action.key !== 'fearless' || typeof action.value !== 'boolean') return state
      return { ...state, seriesOptions: { ...(state.seriesOptions ?? { fearless: false }), fearless: action.value } }
    }

    case 'TRAIN': {
      if (!state.teamId || state.trainedRound === state.round || isRetired(state)) return state
      const form = { ...state.form }
      for (const role of ROLES) {
        const id = state.lineup[role]
        if (id && form[id] !== undefined) form[id] = clampForm(form[id] + 4)
      }
      return { ...state, form, trainedRound: state.round }
    }

    case 'PREPARE_WEEK':
      return prepareWeek(state, action.focus)

    case 'SIGN': {
      if (!state.teamId || isRetired(state)) return state
      const idx = state.faPool.findIndex((p) => p.id === action.playerId)
      if (idx < 0) return state
      const player = state.faPool[idx]
      // Economy: signing fee must fit the budget.
      const fee = signingFee(player)
      const budget = state.finance?.budget
      if (budget != null && !canAfford(budget, fee)) return state
      const faPool = state.faPool.filter((p) => p.id !== action.playerId)
      const signed = { ...player, team: state.teamId, contract: 2, morale: 70 }
      const teams = {
        ...state.teams,
        [state.teamId]: [...state.teams[state.teamId], signed],
      }
      const form = { ...state.form }
      if (form[player.id] === undefined) form[player.id] = 50
      // Make the signed player the starter for their role.
      const lineup = { ...state.lineup, [player.role]: player.id }
      const finance = budget != null ? { budget: budget - fee } : state.finance
      return { ...state, faPool, teams, form, lineup, finance }
    }

    case 'PLAY_ROUND': {
      if (state.finished || !state.teamId) return state
      if (state.mode === 'campaign') return state // campaign uses PLAY_CAMPAIGN_NODE
      if (state.mode === 'draft' || state.mode === 'igl' || state.mode === 'gauntlet') return state // own week flows
      if (isRetired(state)) return state
      const round = state.round
      const schedule = state.schedule ?? SCHEDULE
      const totalRounds = state.totalRounds ?? TOTAL_ROUNDS
      const matches = schedule[round - 1]
      if (!matches) return state

      const form = { ...state.form }
      // Morale → form: happy players play slightly better, unhappy slightly worse.
      for (const p of state.teams[state.teamId] || []) {
        if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] + Math.round(((p.morale ?? 70) - 70) / 10))
      }
      const standings = JSON.parse(JSON.stringify(state.standings))
      const results = [...state.results]
      const myId = state.teamId
      // Career coach bonus: managed team only, AI teams get none.
      // Item 4 strategy: managed team's side only, AI-vs-AI default-zero.
      const prepBonus = preparationBonus(state, upcomingOpponent(state))
      const bonus = managedCoachBonus(state) + prepBonus
      const stratSnap = state.strategy ? { ...state.strategy } : null
      const fearless = state.seriesOptions?.fearless ?? false // P1 item 10
      // P1 item 7: revealed-trait persistence. Engine returns post-series
      // snapshots (res.lineups) only when a carrier exists; copy-on-write the
      // two teams' rosters and stamp revealed: true. Display-only otherwise.
      let teams = null
      const persistRevealed = (teamId, snap) => {
        if (!snap) return
        for (const p of Object.values(snap)) {
          const revealed = (p.traits || []).filter((t) => typeof t === 'object' && t.revealed)
          if (revealed.length === 0) continue
          if (!teams) {
            teams = {}
            for (const tid of Object.keys(state.teams)) teams[tid] = state.teams[tid].map((x) => ({ ...x }))
          }
          const roster = teams[teamId]
          if (!roster) continue
          const target = roster.find((x) => x.id === p.id)
          if (!target || !Array.isArray(target.traits)) continue
          target.traits = target.traits.map((t) => {
            if (typeof t === 'string') return t
            return revealed.some((r) => r.id === t.id) ? { ...t, revealed: true } : t
          })
        }
      }

      for (const [homeId, awayId] of matches) {
        const homeIsUser = homeId === myId
        const awayIsUser = awayId === myId

        const homeLineupObj = homeIsUser
          ? userLineup(state.teams[homeId], state.lineup, form).lineup
          : bestLineup(state.teams[homeId], form).lineup
        const awayLineupObj = awayIsUser
          ? userLineup(state.teams[awayId], state.lineup, form).lineup
          : bestLineup(state.teams[awayId], form).lineup

        const homeTactic = homeIsUser ? state.tactic : aiTactic(homeId, awayId, round, Math.random, state.teamMeta?.[homeId]?.tier)
        const awayTactic = awayIsUser ? state.tactic : aiTactic(awayId, homeId, round, Math.random, state.teamMeta?.[awayId]?.tier)

        const seed = (Math.random() * 0x7fffffff) | 0
        const bonusA = homeIsUser ? bonus : 0
        const bonusB = awayIsUser ? bonus : 0
        const stratA = homeIsUser ? stratSnap : null
        const stratB = awayIsUser ? stratSnap : null
        const injected = action.__matchResult && homeId === action.__matchContext.homeId && awayId === action.__matchContext.awayId
        const res = injected ? action.__matchResult : simulateSeries(
          homeLineupObj, homeTactic,
          awayLineupObj, awayTactic,
          mulberry32(seed),
          homeId, awayId,
          { aBonus: bonusA, bBonus: bonusB, aStrat: stratA, bStrat: stratB, bigMatch: false, fearless },
        )
        // P1 item 7: persist newly-revealed traits onto the two rosters.
        if (res.lineups) {
          persistRevealed(homeId, res.lineups.A)
          persistRevealed(awayId, res.lineups.B)
        }

        const homeWon = res.winner === 'A'
        results.push({
          round,
          homeId,
          awayId,
          homeWon,
          aWins: res.aWins,
          bWins: res.bWins,
          isUser: homeIsUser || awayIsUser,
          userSide: homeIsUser ? 'home' : awayIsUser ? 'away' : null,
          log: res.log,
          ...(injected ? { games: res.games } : {}),
          // Compact detail seed: lineups/tactics are snapshots at sim time so
          // MatchDetail can re-run simulateSeries deterministically. No full
          // timelines stored here — recomputed on demand. Strat snapshots
          // ride along so the recompute passes the same extra.
          detail: { seed, homeLineup: homeLineupObj, awayLineup: awayLineupObj, homeTactic, awayTactic, bonusA, bonusB, homeStrat: stratA, awayStrat: stratB, bigMatch: false, fearless,
            preparation: (homeIsUser || awayIsUser) && state.preparation?.round === round ? { focus: state.preparation.focus, bonus: prepBonus } : null },
        })

        // standings — aWins/bWins are home/away-relative, so map them to
        // winner/loser before crediting (an away 2–0 used to credit GW0 GL2).
        const winnerGameWins = homeWon ? res.aWins : res.bWins
        const loserGameWins = homeWon ? res.bWins : res.aWins
        const hw = homeWon ? standings[homeId] : standings[awayId]
        const lw = homeWon ? standings[awayId] : standings[homeId]
        hw.W += 1; hw.points += 1; hw.gameWins += winnerGameWins; hw.gameLosses += loserGameWins
        lw.L += 1; lw.gameWins += loserGameWins; lw.gameLosses += winnerGameWins

        // form delta: starters of winner +3, loser -3
        const winners = homeWon ? Object.values(homeLineupObj) : Object.values(awayLineupObj)
        const losers = homeWon ? Object.values(awayLineupObj) : Object.values(homeLineupObj)
        for (const p of winners) if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] + 3)
        for (const p of losers) if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] - 3)
        // morale: user's roster rides the result; benched players drift down.
        if (homeIsUser || awayIsUser) {
          const userWon = (homeIsUser && homeWon) || (awayIsUser && !homeWon)
          const lineupIds = new Set(Object.values(state.lineup || {}))
          const roster = (state.teams[myId] || []).map((p) => ({
            ...p,
            morale: clampMorale((p.morale ?? 70) + (userWon ? 3 : -3) + (lineupIds.has(p.id) ? 0 : -1)),
          }))
          if (!teams) {
            teams = {}
            for (const tid of Object.keys(state.teams)) teams[tid] = state.teams[tid].map((x) => ({ ...x }))
          }
          teams[myId] = roster
        }
      }

      // mild mean-reversion toward 50 so form doesn't run away
      for (const id in form) {
        const v = form[id]
        if (v > 55) form[id] = clampForm(v - 1)
        else if (v < 45) form[id] = clampForm(v + 1)
      }

      const nextRound = round + 1
      const seasonDone = nextRound > totalRounds
      // P1 item 11: when the last regional round completes, build the playoff
      // bracket immediately (top-4 single-elim, BO3 semis + final). finished
      // still means "regional schedule done"; phase moves to 'playoffs'.
      if (seasonDone) {
        const ordered = orderStandings(standings).map((r) => r.teamId)
        if (ordered.length >= 4) {
          const top4 = ordered.slice(0, 4)
          const { semis } = buildPlayoffs(ordered, 4)
          const tournament = {
            kind: 'playoffs',
            rounds: [
              { name: 'Semifinal', matches: semis.map(([h, a]) => tournamentMatch(h, a, state.teamId)) },
              { name: 'Final', matches: [tournamentMatch(null, null, state.teamId)] },
            ],
            status: 'active',
            championId: null,
            qualifies: top4,
            revealedRounds: 1,
            resolver: 'biased',
          }
          return {
            ...state,
            teams: teams ?? state.teams,
            form,
            standings,
            results,
            round: nextRound,
            finished: true,
            phase: 'playoffs',
            tournament,
            playoffChampionId: null,
            press: { pending: true },
          }
        }
      }
      return {
        ...state,
        teams: teams ?? state.teams,
        form,
        standings,
        results,
        round: nextRound,
        finished: seasonDone,
        press: { pending: true },
      }
    }

    // --- Expansion: press conferences -------------------------------------
    case 'PRESS_ANSWER': {
      if (!state.press?.pending || !state.teamId || isRetired(state)) return state
      const fx = {
        confident: { morale: 2, board: 3 },
        measured: { morale: 1, board: 1 },
        deflect: { morale: 0, board: -2 },
      }[action.answerId]
      if (!fx) return state
      // Bold talk on a losing streak backfires in the locker room.
      const moraleFx = action.answerId === 'confident' && userStreak(state) <= -2 ? -4 : fx.morale
      const teams = { ...state.teams }
      teams[state.teamId] = (teams[state.teamId] || []).map((p) => ({
        ...p, morale: clampMorale((p.morale ?? 70) + moraleFx),
      }))
      const board = state.board
        ? { ...state.board, confidence: Math.max(0, Math.min(100, state.board.confidence + fx.board)) }
        : state.board
      return { ...state, teams, board, press: { pending: false } }
    }
    case 'PRESS_SKIP': {
      if (!state.press?.pending) return state
      return { ...state, press: { pending: false } }
    }
    case 'SET_SIM_SPEED': {
      const speed = action.speed
      if (!['slow', 'normal', 'fast', 'instant'].includes(speed)) return state
      return { ...state, simSpeed: speed }
    }

    // --- Expansion: gauntlet mode -----------------------------------------
    case 'GAUNTLET_START': {
      if (!state.teamId || isRetired(state)) return state
      const myTier = state.teamMeta?.[state.teamId]?.tier ?? 82
      const others = Object.keys(state.teams)
        .filter((id) => id !== state.teamId)
        .map((id) => ({ id, tier: state.teamMeta?.[id]?.tier ?? 80 }))
        .sort((a, b) => Math.abs(a.tier - myTier) - Math.abs(b.tier - myTier))
        .slice(0, 5)
        .sort((a, b) => a.tier - b.tier)
      if (others.length === 0) return state
      return {
        ...state,
        mode: 'gauntlet',
        gauntlet: {
          round: 0, wins: 0, target: others.length,
          opponents: others.map((o) => o.id), opponentId: others[0].id,
          status: 'active', lastResult: null,
        },
      }
    }
    case 'GAUNTLET_PLAY': {
      const g = state.gauntlet
      if (!g || g.status !== 'active' || !state.teamId || isRetired(state)) return state
      const oppId = g.opponentId
      const form = { ...state.form }
      const myLineup = userLineup(state.teams[state.teamId], state.lineup, form).lineup
      const oppLineup = bestLineup(state.teams[oppId], form).lineup
      const seed = (Math.random() * 0x7fffffff) | 0
      const res = action.__matchResult ?? simulateSeries(
        myLineup, state.tactic,
        oppLineup, aiTactic(oppId, state.teamId, 1, Math.random, state.teamMeta?.[oppId]?.tier),
        mulberry32(seed), state.teamId, oppId, {},
      )
      const won = res.winner === 'A'
      for (const p of Object.values(won ? myLineup : oppLineup)) if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] + 3)
      for (const p of Object.values(won ? oppLineup : myLineup)) if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] - 3)
      const teams = { ...state.teams }
      teams[state.teamId] = (teams[state.teamId] || []).map((p) => ({
        ...p, morale: clampMorale((p.morale ?? 70) + (won ? 4 : -4)),
      }))
      const wins = g.wins + (won ? 1 : 0)
      const round = g.round + 1
      const status = !won ? 'lost' : round >= g.target ? 'won' : 'active'
      return {
        ...state, form, teams,
        gauntlet: {
          ...g, round, wins, status,
          opponentId: status === 'active' ? g.opponents[round] : oppId,
          lastResult: { won, aWins: res.aWins, bWins: res.bWins, oppId, games: res.games },
        },
      }
    }

    // --- Expansion: active coach (draft) mode -------------------------------
    case 'DRAFT_WEEK_START': {
      if (state.mode !== 'draft' || state.finished || !state.teamId || isRetired(state)) return state
      if (state.draftSeries) return state
      const matches = (state.schedule ?? [])[state.round - 1]
      if (!matches) return state
      const form = { ...state.form }
      const standings = JSON.parse(JSON.stringify(state.standings))
      const results = [...state.results]
      const userMatch = simOtherMatches(state, matches, state.teamId, state.round, form, standings, results)
      if (!userMatch) {
        return finishInteractiveRound(state, { form, standings, results })
      }
      const [homeId, awayId] = userMatch
      const userIsHome = homeId === state.teamId
      // Enemy coach personality for this series (shown in the draft UI).
      const aiPersonality = PERSONALITY_IDS[(Math.random() * PERSONALITY_IDS.length) | 0]
      const aiTeamId = userIsHome ? awayId : homeId
      const aiComfort = []
      for (const p of state.teams[aiTeamId] || []) {
        for (const c of comfortChamps(p)) aiComfort.push(c)
      }
      return {
        ...state, form, standings, results,
        draftSeries: {
          homeId, awayId, userIsHome, gameIndex: 0, aWins: 0, bWins: 0,
          games: [], draft: draftForGame(0, userIsHome),
          aiPersonality, aiComfort,
        },
      }
    }
    case 'DRAFT_BAN': {
      const ds = state.draftSeries
      if (!ds?.draft || isRetired(state)) return state
      try {
        return { ...state, draftSeries: { ...ds, draft: applyBan(ds.draft, action.champId) } }
      } catch { return state }
    }
    case 'DRAFT_PICK': {
      const ds = state.draftSeries
      if (!ds?.draft || isRetired(state)) return state
      try {
        return { ...state, draftSeries: { ...ds, draft: applyPick(ds.draft, action.champId, action.role) } }
      } catch { return state }
    }
    case 'DRAFT_RESOLVE_GAME': {
      const ds = state.draftSeries
      if (!ds?.draft?.done || !state.teamId || isRetired(state)) return state
      const blue = scoreComp(ds.draft.picks.BLUE)
      const red = scoreComp(ds.draft.picks.RED)
      const userPicks = ds.draft.picks[ds.draft.userSide] || {}
      const comfortCount = Object.entries(userPicks).filter(([role, champ]) => {
        const p = (state.teams[state.teamId] || []).find((x) => x.id === state.lineup?.[role])
        return p && comfortChamps(p).includes(champ)
      }).length
      const comfortBonus = Math.min(0.45, comfortCount * 0.15)
      const homeSide = ds.userIsHome ? ds.draft.userSide : (ds.draft.userSide === 'BLUE' ? 'RED' : 'BLUE')
      const homeBonus = (homeSide === 'BLUE' ? blue.bonus : red.bonus) + (ds.userIsHome ? comfortBonus : 0)
      const awayBonus = (homeSide === 'BLUE' ? red.bonus : blue.bonus) + (ds.userIsHome ? 0 : comfortBonus)
      const form = { ...state.form }
      const homeLineupObj = ds.userIsHome
        ? userLineup(state.teams[ds.homeId], state.lineup, form).lineup
        : bestLineup(state.teams[ds.homeId], form).lineup
      const awayLineupObj = !ds.userIsHome
        ? userLineup(state.teams[ds.awayId], state.lineup, form).lineup
        : bestLineup(state.teams[ds.awayId], form).lineup
      const homeTactic = ds.userIsHome ? state.tactic : aiTactic(ds.homeId, ds.awayId, state.round, Math.random, state.teamMeta?.[ds.homeId]?.tier)
      const awayTactic = !ds.userIsHome ? state.tactic : aiTactic(ds.awayId, ds.homeId, state.round, Math.random, state.teamMeta?.[ds.awayId]?.tier)
      const seed = (Math.random() * 0x7fffffff) | 0
      const sg = simulateSingleGame(homeLineupObj, homeTactic, awayLineupObj, awayTactic, mulberry32(seed), ds.homeId, ds.awayId, { aBonus: homeBonus, bBonus: awayBonus, gameIndex: ds.gameIndex + 1 })
      const homeWon = sg.aWon
      const aWins = ds.aWins + (homeWon ? 1 : 0)
      const bWins = ds.bWins + (homeWon ? 0 : 1)
      const games = [...ds.games, {
        game: sg.game, homeWon,
        blueIdentity: blue.identity, redIdentity: red.identity,
        homeBonus, awayBonus, debrief: getDraftDebrief(ds.draft),
      }]
      const decided = aWins === 2 || bWins === 2 || games.length >= 3
      for (const p of Object.values(homeWon ? homeLineupObj : awayLineupObj)) if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] + 3)
      for (const p of Object.values(homeWon ? awayLineupObj : homeLineupObj)) if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] - 3)
      if (!decided) {
        const ni = ds.gameIndex + 1
        return {
          ...state, form,
          draftSeries: { ...ds, gameIndex: ni, aWins, bWins, games, draft: draftForGame(ni, ds.userIsHome) },
        }
      }
      const standings = JSON.parse(JSON.stringify(state.standings))
      const results = [...state.results]
      applyUserSeriesResult(state, form, standings, results, ds.homeId, ds.awayId, ds.userIsHome, aWins, bWins, sg.log, games)
      return finishInteractiveRound(state, { form, standings, results, draftSeries: null, lastInteractiveSeries: { aWins, bWins, games } })
    }

    // --- Expansion: IGL (watch-live) mode -----------------------------------
    case 'LIVE_WEEK_START': {
      if (state.mode !== 'igl' || state.finished || !state.teamId || isRetired(state)) return state
      if (state.live) return state
      const matches = (state.schedule ?? [])[state.round - 1]
      if (!matches) return state
      const form = { ...state.form }
      const standings = JSON.parse(JSON.stringify(state.standings))
      const results = [...state.results]
      const userMatch = simOtherMatches(state, matches, state.teamId, state.round, form, standings, results)
      if (!userMatch) {
        return finishInteractiveRound(state, { form, standings, results })
      }
      const [homeId, awayId] = userMatch
      return {
        ...state, form, standings, results,
        live: {
          homeId, awayId, userIsHome: homeId === state.teamId,
          gameIndex: 0, aWins: 0, bWins: 0, games: [], current: null,
        },
      }
    }
    case 'LIVE_START_GAME': {
      const lv = state.live
      if (!lv || lv.current || !state.teamId || isRetired(state)) return state
      const form = { ...state.form }
      const homeLineupObj = lv.userIsHome
        ? userLineup(state.teams[lv.homeId], state.lineup, form).lineup
        : bestLineup(state.teams[lv.homeId], form).lineup
      const awayLineupObj = !lv.userIsHome
        ? userLineup(state.teams[lv.awayId], state.lineup, form).lineup
        : bestLineup(state.teams[lv.awayId], form).lineup
      const homeTactic = lv.userIsHome ? state.tactic : aiTactic(lv.homeId, lv.awayId, state.round, Math.random, state.teamMeta?.[lv.homeId]?.tier)
      const awayTactic = !lv.userIsHome ? state.tactic : aiTactic(lv.awayId, lv.homeId, state.round, Math.random, state.teamMeta?.[lv.awayId]?.tier)
      const seed = (Math.random() * 0x7fffffff) | 0
      // Pass 1: no call — its early events set the scene; the winner is discarded.
      const pass1 = simulateSingleGame(homeLineupObj, homeTactic, awayLineupObj, awayTactic, mulberry32(seed), lv.homeId, lv.awayId, { gameIndex: lv.gameIndex + 1 })
      // The decision happens at the split (40% of events) — the prompt, the
      // optimal call, and the panel all read the game AT the split, not the future.
      const split = Math.max(3, Math.floor(pass1.game.events.length * 0.4))
      const splitGame = { ...pass1.game, events: pass1.game.events.slice(0, split) }
      return {
        ...state,
        live: {
          ...lv,
          current: {
            pass1: pass1.game,
            seed,
            split,
            lineups: { homeLineupObj, awayLineupObj, homeTactic, awayTactic },
            prompt: buildIglPrompt(splitGame, lv.userIsHome),
          },
        },
      }
    }
    case 'LIVE_MAKE_CALL': {
      const lv = state.live
      if (!lv?.current || lv.current.final || !state.teamId || isRetired(state)) return state
      const call = IGL_CALLS.find((c) => c.id === action.callId)
      if (!call) return state
      const { homeLineupObj, awayLineupObj, homeTactic, awayTactic } = lv.current.lineups
      const evaluation = evaluateIglCall({ ...lv.current.pass1, events: lv.current.pass1.events.slice(0, lv.current.split) }, lv.userIsHome, call.id)
      const seed = lv.current.seed ?? ((Math.random() * 0x7fffffff) | 0)
      // Pass 2 (official): the call's modifier applies to the user's side.
      const sg = simulateSingleGame(homeLineupObj, homeTactic, awayLineupObj, awayTactic, mulberry32(seed), lv.homeId, lv.awayId, {
        aBonus: lv.userIsHome ? evaluation.modifier : 0,
        bBonus: lv.userIsHome ? 0 : evaluation.modifier,
        gameIndex: lv.gameIndex + 1,
      })
      return {
        ...state,
        live: { ...lv, current: { ...lv.current, final: sg.game, evaluation, callId: call.id, homeWon: sg.aWon, log: sg.log } },
      }
    }
    case 'LIVE_ADVANCE': {
      const lv = state.live
      if (!lv?.current?.final || !state.teamId || isRetired(state)) return state
      const { final, homeWon, callId } = lv.current
      const { homeLineupObj, awayLineupObj } = lv.current.lineups
      const aWins = lv.aWins + (homeWon ? 1 : 0)
      const bWins = lv.bWins + (homeWon ? 0 : 1)
      const games = [...lv.games, { game: final, homeWon, callId }]
      const decided = aWins === 2 || bWins === 2 || games.length >= 3
      const form = { ...state.form }
      for (const p of Object.values(homeWon ? homeLineupObj : awayLineupObj)) if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] + 3)
      for (const p of Object.values(homeWon ? awayLineupObj : homeLineupObj)) if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] - 3)
      if (!decided) {
        return { ...state, form, live: { ...lv, gameIndex: lv.gameIndex + 1, aWins, bWins, games, current: null } }
      }
      const standings = JSON.parse(JSON.stringify(state.standings))
      const results = [...state.results]
      applyUserSeriesResult(state, form, standings, results, lv.homeId, lv.awayId, lv.userIsHome, aWins, bWins, lv.current.log, games)
      return finishInteractiveRound(state, { form, standings, results, live: null, lastInteractiveSeries: { aWins, bWins, games } })
    }

    case 'ADVANCE_SEASON': {
      if (state.mode !== 'career' || !state.career) return state
      if (state.career.status !== 'active') return state
      if (!state.finished) return state
      // International phase must be resolved first (no active tournament).
      if (state.tournament && state.tournament.status === 'active') return state
      if (state.pendingEvent) return state // owned by the UX builder; guard only
      if (state.pendingPromotion) return state // P1 item 8: promotion resolves first
      if (state.career.seasonIndex >= state.career.maxSeasons) return state
      const record = seasonRecordFor(state)
      const teamIds = Object.keys(state.teams)
      const schedule = roundRobin(teamIds)
      const standings = {}
      for (const tid of teamIds) standings[tid] = emptyStanding(tid)
      // P0 engine item 5: one annual development tick (off-season roll, off
      // the seeded match path).
      const teams = {}
      for (const tid of teamIds) teams[tid] = state.teams[tid].map((p) => developPlayer(p, Math.random))
      const faPool = (state.faPool ?? []).map((p) => developPlayer(p, Math.random))
      // --- Expansion: economy / contracts / morale / board / AI churn --------
      let finance = state.finance ? { ...state.finance } : null
      const myRoster = teams[state.teamId] || []
      // Annual wage bill.
      if (finance) {
        const bill = myRoster.reduce((s, p) => s + playerWage(p), 0)
        finance.budget -= bill
      }
      // Contracts: decrement; expired → renew if affordable, else release.
      // Starters are never released (the club always finds the money).
      const lineupIds = new Set(Object.values(state.lineup || {}))
      const kept = []
      const released = []
      for (const p of myRoster) {
        const yearsLeft = (p.contract ?? 2) - 1
        if (yearsLeft > 0) {
          kept.push({ ...p, contract: yearsLeft })
          continue
        }
        const renewFee = Math.round(signingFee(p) / 2)
        const isStarter = lineupIds.has(p.id)
        if (finance && (finance.budget >= renewFee || isStarter)) {
          finance.budget -= renewFee
          kept.push({ ...p, contract: 2, morale: clampMorale((p.morale ?? 70) + 5) })
        } else {
          released.push({ ...p, team: 'FA', contract: 1, morale: 60 })
        }
      }
      teams[state.teamId] = kept
      faPool.push(...released)
      // Morale: title joy / playoff hope / midtable blues, by final placement.
      const ordered = orderStandings(state.standings).map((r) => r.teamId)
      const place = ordered.indexOf(state.teamId) + 1
      const champ = state.playoffChampionId === state.teamId
      const moraleFx = champ ? 12 : place <= 4 ? 6 : place <= 6 ? 0 : -6
      teams[state.teamId] = (teams[state.teamId] || []).map((p) => ({
        ...p, morale: clampMorale((p.morale ?? 70) + moraleFx),
      }))
      // Board evaluation: meet the expectation or lose confidence.
      let board = state.board ? { ...state.board } : null
      let sacked = false
      if (board) {
        const exp = board.expectation
        const met = exp === 'Win the title' ? champ
          : exp === 'Reach the final' ? champ || place <= 2
          : exp === 'Make the playoffs' ? place <= 4
          : place < ordered.length
        board.confidence = Math.max(0, Math.min(100, board.confidence + (met ? 15 : -20)))
        if (board.confidence <= 0) sacked = true
      }
      if (sacked) return {
        ...state, board, finance, sacked: true, pendingEvent: null, pendingPromotion: null,
        press: { pending: false }, career: { ...state.career, status: 'retired', history: [...state.career.history, record] },
      }
      // AI offseason churn (light two-agent homage): each AI team cuts its
      // weakest player and signs the best FA fit for that role.
      let fa = [...faPool]
      for (const tid of teamIds) {
        if (tid === state.teamId) continue
        const roster = teams[tid] || []
        if (roster.length === 0) continue
        let weakIdx = 0
        roster.forEach((p, i) => { if (p.ovr < roster[weakIdx].ovr) weakIdx = i })
        const weak = roster[weakIdx]
        const cand = fa.filter((p) => p.role === weak.role).sort((a, b) => b.ovr - a.ovr)[0]
        if (cand && cand.ovr > weak.ovr + 2) {
          teams[tid] = roster.map((p, i) => (i === weakIdx ? { ...cand, team: tid, contract: 2, morale: 70 } : p))
          fa = fa.filter((p) => p.id !== cand.id)
          fa.push({ ...weak, team: 'FA', contract: 1, morale: 60 })
        }
      }
      // P0 UX item 4: career dilemma roll (~35%, non-empty managed roster).
      // pendingEvent gate above blocks advancing while one is unresolved.
      let pendingEvent = null
      const managedRoster = teams[state.teamId] || []
      const starterIds = Object.values(state.lineup || {}).filter((id) =>
        managedRoster.some((p) => p.id === id),
      )
      const eventPool = starterIds.length > 0 ? starterIds : managedRoster.map((p) => p.id)
      if (eventPool.length > 0 && Math.random() < 0.35) {
        const weights = DILEMMA_EVENTS.map((e) => e.chance ?? 1)
        const total = weights.reduce((a, b) => a + b, 0)
        let roll = Math.random() * total
        let evIdx = DILEMMA_EVENTS.length - 1
        for (let i = 0; i < DILEMMA_EVENTS.length; i++) {
          roll -= weights[i]
          if (roll <= 0) { evIdx = i; break }
        }
        pendingEvent = {
          eventId: DILEMMA_EVENTS[evIdx].id,
          playerId: eventPool[(Math.random() * eventPool.length) | 0],
        }
      }
      // P1 item 8: academy promotion offer (career only, managed team only,
      // ~30% roll, only when no pendingEvent was just rolled — one modal at
      // a time, event takes precedence).
      let pendingPromotion = null
      if (!pendingEvent && Math.random() < 0.30) {
        const tier = state.teamMeta?.[state.teamId]?.tier ?? 80
        pendingPromotion = { player: buildAcademyPlayer(state.teamId, tier), teamId: state.teamId }
      }
      return {
        ...state,
        pendingEvent,
        pendingPromotion, // P1 item 8: null unless the academy roll hit
        board,
        finance,
        sacked,
        career: sacked
          ? { ...state.career, status: 'retired' }
          : {
              ...state.career,
              seasonIndex: state.career.seasonIndex + 1,
              history: [...state.career.history, record],
            },
        schedule,
        totalRounds: schedule.length,
        standings,
        results: [],
        round: 1,
        finished: false,
        trainedRound: 0,
        tournament: null,
        phase: 'regional',
        playoffChampionId: null, // P1 item 11: cleared with the season reset
        teams,
        faPool: fa,
        lineup: defaultLineup(teams[state.teamId]),
        press: { pending: true },
      }
    }

    case 'RESOLVE_PROMOTION': {
      // P1 item 8: resolve the pending academy promotion offer. Own field +
      // action (not folded into RESOLVE_EVENT) because the payload carries a
      // full prospect object, not a ratings/form mutation.
      if (state.mode !== 'career' || !state.career) return state
      if (state.career.status !== 'active') return state
      const pp = state.pendingPromotion
      if (pp == null) return state
      if (!action.promote) {
        const meta = state.teamMeta?.[pp.teamId]?.name ?? pp.teamId
        return {
          ...state,
          pendingPromotion: null,
          lastEventLog: `${pp.player.name} stays with ${meta} Academy for another split.`,
        }
      }
      const roster = state.teams[pp.teamId] || []
      const lineupIds = new Set(Object.values(state.lineup || {}))
      let cutIdx = -1
      let cutOvr = Infinity
      roster.forEach((p, i) => {
        if (lineupIds.has(p.id)) return // starters are safe
        if (p.ovr < cutOvr) {
          cutOvr = p.ovr
          cutIdx = i
        }
      })
      if (cutIdx < 0) {
        // No bench to cut — the offer lapses rather than hanging forever.
        return { ...state, pendingPromotion: null }
      }
      const cut = roster[cutIdx]
      const { academy, ...prospect } = pp.player
      const promoted = { ...prospect, team: pp.teamId }
      const nextRoster = [...roster]
      nextRoster[cutIdx] = promoted
      const form = { ...state.form, [promoted.id]: 50 }
      return {
        ...state,
        teams: { ...state.teams, [pp.teamId]: nextRoster },
        faPool: [...(state.faPool ?? []), { ...cut, team: 'FA' }],
        form,
        pendingPromotion: null,
      }
    }

    case 'BUILD_TOURNAMENT': {
      if (!['season', 'career', 'draft', 'igl'].includes(state.mode)) return state
      if (isRetired(state)) return state
      const kind = action.kind
      if (kind === 'msi') {
        // Regional season must be finished; one tournament per phase.
        // P1 item 11: MSI builds either from a finished regional season with
        // no bracket (legacy — reachable only if playoffs somehow skipped) or
        // from a completed playoffs bracket (which it replaces, phase → msi).
        const legacy = state.phase === 'regional' && state.finished && !state.tournament
        const fromPlayoffs = state.phase === 'playoffs' && state.tournament?.kind === 'playoffs' && state.tournament.status === 'done'
        if (!legacy && !fromPlayoffs) return state
      } else if (kind === 'worlds') {
        // Worlds unlocks after a completed MSI (same qualifier set).
        if (state.phase !== 'msi' || !state.tournament) return state
        if (state.tournament.kind !== 'msi' || state.tournament.status !== 'done') return state
      } else {
        return state
      }
      const { tournament, teamMeta } = buildTournamentObject(state, kind)
      const rv = action.resolver ?? 'biased'
      tournament.resolver = rv === 'biased' || rv === 'random' || rv === 'manual' ? rv : 'biased'
      return { ...state, tournament, teamMeta, phase: kind }
    }

    case 'SET_RESOLVER': {
      const t = state.tournament
      if (!t || t.status !== 'active') return state
      const r = action.resolver
      if (r !== 'biased' && r !== 'random' && r !== 'manual') return state
      return { ...state, tournament: { ...t, resolver: r } }
    }

    case 'SELECT_MATCH_WINNER': {
      const t = state.tournament, ri = action.roundIndex, mi = action.matchIndex
      const m = t?.rounds?.[ri]?.matches?.[mi]
      if (!t || t.status !== 'active' || !m || m.winner || !m.homeId || !m.awayId || ![m.homeId, m.awayId].includes(action.winnerId)) return state
      return { ...state, tournament: { ...t, rounds: t.rounds.map((r, i) => i !== ri ? r : { ...r, matches: r.matches.map((x, j) => j !== mi ? x : { ...x, forcedWinner: action.winnerId === m.homeId ? 'home' : 'away' }) }) } }
    }
    case 'SET_TOURNAMENT_WINNER': {
      // P0 UX item 1: manual-resolver clicks pick a match winner directly.
      const t = state.tournament
      if (!t || t.status !== 'active') return state
      const round = t.rounds?.[action.roundIndex]
      const m = round?.matches?.[action.matchIndex]
      if (!m || m.winner) return state
      if (!m.homeId || !m.awayId) return state
      if (action.winnerId !== m.homeId && action.winnerId !== m.awayId) return state
      const side = action.winnerId === m.homeId ? 'home' : 'away'
      const decided = {
        ...m,
        forcedWinner: side,
        winner: action.winnerId,
        aWins: side === 'home' ? 2 : 0,
        bWins: side === 'home' ? 0 : 2,
      }
      const rounds = t.rounds.map((r, ri) =>
        ri === action.roundIndex
          ? { ...r, matches: r.matches.map((x, mi) => (mi === action.matchIndex ? decided : x)) }
          : r,
      )
      return { ...state, tournament: { ...t, rounds } }
    }

    case 'PLAY_TOURNAMENT_ROUND': {
      if (!['season', 'career', 'draft', 'igl'].includes(state.mode)) return state
      if (isRetired(state)) return state
      const t = state.tournament
      if (!t || t.status !== 'active') return state
      const ri = t.rounds.findIndex((r) => r.matches.some((m) => !m.winner))
      if (ri < 0) return state
      const bonus = managedCoachBonus(state)
      const roundNo = 10 + ri
      const simMode = t.resolver === 'random' || t.resolver === 'manual' ? t.resolver : 'biased'
      const played = t.rounds[ri].matches.map((m, mi) => {
        if (m.winner || !m.homeId || !m.awayId || (Number.isInteger(action.matchIndex) && action.matchIndex !== mi)) return m
        if (action.__matchResult && m.homeId === action.__matchContext.homeId && m.awayId === action.__matchContext.awayId) {
          const r = action.__matchResult
          return { ...m, winner: r.winner === 'A' ? m.homeId : m.awayId, aWins: r.aWins, bWins: r.bWins, log: r.log, games: r.games, detail: null }
        }
        return playTournamentMatch(state, m, bonus, roundNo, simMode, m.forcedWinner ?? null, t.rounds.length)
      })
      const rounds = t.rounds.map((r, i) => (i === ri ? { ...r, matches: played } : r))
      if (played.some((m) => !m.winner)) return { ...state, tournament: { ...t, rounds } }
      const fill = (m, homeId, awayId) => ({
        ...m,
        homeId,
        awayId,
        isUser: homeId === state.teamId || awayId === state.teamId,
        userSide: homeId === state.teamId ? 'home' : awayId === state.teamId ? 'away' : null,
      })
      // P1 item 11: the fill-forward is length-aware. 2-round playoffs feed
      // both semifinal winners into the final; the 3-round path is untouched.
      if (rounds.length === 2 && ri === 0) {
        const w = played.map((m) => m.winner)
        rounds[1] = { ...rounds[1], matches: [fill(rounds[1].matches[0], w[0], w[1])] }
      } else if (ri === 0) {
        const w = played.map((m) => m.winner)
        rounds[1] = {
          ...rounds[1],
          matches: [fill(rounds[1].matches[0], w[0], w[1]), fill(rounds[1].matches[1], w[2], w[3])],
        }
      } else if (ri === 1 && rounds.length === 3) {
        const w = played.map((m) => m.winner)
        rounds[2] = { ...rounds[2], matches: [fill(rounds[2].matches[0], w[0], w[1])] }
      }
      let status = 'active'
      let championId = null
      let phase = state.phase
      let playoffChampionId = state.playoffChampionId ?? null
      if (ri === rounds.length - 1) {
        status = 'done'
        championId = played[0].winner
        if (t.kind === 'worlds') phase = 'done'
        // P1 item 11: stamp the playoff winner on state when the final resolves.
        if (t.kind === 'playoffs') playoffChampionId = championId
      }
      return { ...state, tournament: { ...t, rounds, status, championId, revealedRounds: Math.min((t.revealedRounds ?? 1) + 1, rounds.length), resolver: t.resolver }, phase, playoffChampionId }
    }

    case 'RESOLVE_EVENT': {
      // P0 UX item 4: resolve the pending career dilemma. Touches only
      // teams/form/pendingEvent/lastEventLog. A throwing apply = no change.
      if (state.mode !== 'career' || !state.career) return state
      if (state.career.status !== 'active') return state
      const pe = state.pendingEvent
      if (pe == null) return state
      const ev = DILEMMA_EVENTS.find((e) => e.id === pe.eventId)
      const opt = ev?.options?.[action.optionIndex]
      if (!opt) return state
      const teams = {}
      for (const tid of Object.keys(state.teams)) {
        teams[tid] = state.teams[tid].map((p) => ({ ...p }))
      }
      const form = { ...state.form }
      const draft = { teams, form, lineup: { ...state.lineup } }
      let log
      try {
        log = opt.apply(draft, pe.playerId)
      } catch {
        return state
      }
      if (typeof log !== 'string') log = `${ev.title} resolved.`
      return { ...state, teams: draft.teams, form: draft.form, pendingEvent: null, lastEventLog: log }
    }

    case 'RETIRE': {
      if (state.mode !== 'career' || !state.career) return state
      if (state.career.status === 'retired') return state
      // A finished-but-unrecorded final season still counts: history keeps
      // completed seasons only.
      const history =
        state.finished && state.career.history.length < state.career.seasonIndex
          ? [...state.career.history, seasonRecordFor(state)]
          : state.career.history
      return { ...state, career: { ...state.career, status: 'retired', history } }
    }

    case 'HIRE_COACH': {
      if (state.mode !== 'career' || !state.career) return state
      if (state.career.status !== 'active') return state
      const idx = state.career.coachPool.findIndex((c) => c.id === action.coachId)
      if (idx < 0) return state
      const hired = state.career.coachPool[idx]
      const coachPool = state.career.coachPool.filter((c) => c.id !== action.coachId)
      const prevId = state.career.staff[state.teamId]
      if (prevId && prevId !== hired.id) {
        const prev = careerCoachById(state.career, prevId)
        if (prev) coachPool.push({ ...prev, team: 'FA' })
      }
      return {
        ...state,
        career: {
          ...state.career,
          staff: { ...state.career.staff, [state.teamId]: hired.id },
          coachPool,
        },
      }
    }

    case 'TRADE_COACH': {
      if (state.mode !== 'career' || !state.career) return state
      if (state.career.status !== 'active') return state
      const otherId = action.otherTeamId
      if (!otherId || otherId === state.teamId) return state
      const myCoachId = state.career.staff[state.teamId]
      const theirCoachId = state.career.staff[otherId]
      if (!myCoachId || !theirCoachId) return state
      const mine = careerCoachById(state.career, myCoachId)
      const theirs = careerCoachById(state.career, theirCoachId)
      if (!mine || !theirs) return state
      // AI acceptance: no gift of 6+ rating points.
      if (mine.rating < theirs.rating - 5) return state
      return {
        ...state,
        career: {
          ...state.career,
          staff: { ...state.career.staff, [state.teamId]: theirCoachId, [otherId]: myCoachId },
        },
      }
    }

    case 'TRADE_PLAYER': {
      if (state.mode !== 'career' || !state.career) return state
      if (state.career.status !== 'active') return state
      const myId = state.teamId
      const myRoster = state.teams[myId] || []
      if (!myRoster.some((p) => p.id === action.giveId)) return state
      let otherId = null
      let getP = null
      for (const tid of Object.keys(state.teams)) {
        if (tid === myId) continue
        const found = (state.teams[tid] || []).find((p) => p.id === action.getId)
        if (found) { otherId = tid; getP = found; break }
      }
      if (!getP) return state
      const giveP = myRoster.find((p) => p.id === action.giveId)
      if (giveP.role !== getP.role) return state
      // AI acceptance: won't lose more than 3 OVR.
      if (getP.ovr - giveP.ovr > 3) return state
      const teams = {
        ...state.teams,
        [myId]: myRoster.map((p) => (p.id === giveP.id ? { ...getP, team: myId } : p)),
        [otherId]: state.teams[otherId].map((p) => (p.id === getP.id ? { ...giveP, team: otherId } : p)),
      }
      const lineup = { ...state.lineup }
      if (lineup[giveP.role] === giveP.id) lineup[giveP.role] = getP.id
      return { ...state, teams, lineup }
    }

    default:
      // Campaign actions are handled additively; unknown actions no-op.
      return campaignReducer(state, action)
  }
}

// --- Campaign reducer cases (appended additively; season cases untouched) ----
function campaignReducer(state, action) {
  switch (action.type) {
    case 'START_CAMPAIGN': {
      const campaign = campaignById(action.campaignId)
      if (!campaign) return state
      if ((campaign.kind ?? 'series') === 'season') {
        const base = freshState(campaign.seasonYear)
        base.teamId = null
        base.mode = 'campaign'
        base.campaign = freshCampaign(campaign.id)
        return base
      }
      const base = freshState()
      base.teamId = campaign.playerTeamId
      base.managerName = action.managerName || 'Coach'
      // Campaign-local teams (e.g. Los Ratones + opponents): merged into the
      // team map/meta/form so PLAY_CAMPAIGN_NODE can resolve them. They never
      // touch the season datasets.
      if (campaign.extraTeams) {
        for (const t of campaign.extraTeams) {
          base.teams[t.id] = t.players.map((p) => ({ ...p }))
          base.teamMeta[t.id] = { id: t.id, name: t.name, short: t.short, color: t.color, tier: t.tier }
          for (const p of base.teams[t.id]) base.form[p.id] = 50
        }
      }
      base.lineup = defaultLineup(base.teams[campaign.playerTeamId])
      base.mode = 'campaign'
      base.campaign = freshCampaign(campaign.id)
      return base
    }

    case 'COMPLETE_SEASON_REPLAY': {
      if (state.mode !== 'campaign' || !state.campaign) return state
      const campaign = campaignById(state.campaign.campaignId)
      if (!campaign || (campaign.kind ?? 'series') !== 'season') return state
      if (state.campaign.status !== 'active') return state
      return { ...state, campaign: { ...state.campaign, status: 'cleared' } }
    }

    case 'PLAY_CAMPAIGN_NODE': {
      if (state.mode !== 'campaign' || !state.campaign) return state
      const campaign = campaignById(state.campaign.campaignId)
      if (!campaign || (campaign.kind ?? 'series') !== 'series' || !campaign.nodes) return state
      const prog = state.campaign
      if (prog.status !== 'active') return state
      const node = campaign.nodes[prog.nodeIndex]
      if (!node) return state
      const played = nodeSlots(prog, node.id)
      if (played.length >= CAMPAIGN_SLOTS) return state
      const slot = played.length + 1 // 1-based
      const hardLosses = node.hardLossSlots || []

      // Hard-coded historical loss: no sim, synthetic record, never game-over.
      if (hardLosses.includes(slot)) {
        const entry = {
          nodeId: node.id,
          slot,
          playerWon: false,
          historicalLoss: true,
          homeId: campaign.playerTeamId,
          awayId: node.opponentId,
          winner: 'B',
          aWins: 0,
          bWins: 1,
          log: [
            `Historical loss — ${campaign.playerLabel} fell in Game ${slot} to ${node.opponentLabel}. This game was lost.`,
          ],
          detail: null,
          ...(action.__matchResult ? { games: action.__matchResult.games } : {}),
        }
        const nodeResults = [...prog.nodeResults, entry]
        const cleared = nodeResults.filter((r) => r.nodeId === node.id).length >= CAMPAIGN_SLOTS
        if (!cleared) return { ...state, campaign: { ...prog, nodeResults } }
        const nodeIndex = prog.nodeIndex + 1
        const status = nodeIndex >= campaign.nodes.length ? 'cleared' : 'active'
        return { ...state, campaign: { ...prog, nodeResults, nodeIndex, status } }
      }

      // Winnable slot: one Bo3-native simulateSeries call, player = side A.
      const playerLineupObj = userLineup(
        state.teams[campaign.playerTeamId], state.lineup, state.form,
      ).lineup
      const oppLineupObj = bestLineup(
        state.teams[node.opponentId], state.form,
      ).lineup
      const playerTactic = state.tactic
      const oppTactic = aiTactic(node.opponentId, campaign.playerTeamId, prog.nodeIndex + 1)
      const seed = (Math.random() * 0x7fffffff) | 0
      const res = action.__matchResult ?? simulateSeries(
        playerLineupObj, playerTactic,
        oppLineupObj, oppTactic,
        mulberry32(seed),
        campaign.playerLabel, node.opponentLabel,
      )
      const playerWon = res.winner === 'A'
      const entry = {
        nodeId: node.id,
        slot,
        playerWon,
        historicalLoss: false,
        homeId: campaign.playerTeamId,
        awayId: node.opponentId,
        winner: res.winner,
        aWins: res.aWins,
        bWins: res.bWins,
        log: res.log,
        ...(action.__matchResult ? { games: res.games } : {}),
        // Same compact seed shape as season results: MatchDetail.recomputeGames
        // re-runs simulateSeries with mulberry32(seed) for identical games.
        detail: {
          seed,
          homeLineup: playerLineupObj,
          awayLineup: oppLineupObj,
          homeTactic: playerTactic,
          awayTactic: oppTactic,
        },
      }
      // Losing any winnable slot fails the campaign immediately.
      if (!playerWon) {
        return {
          ...state,
          campaign: {
            ...prog,
            nodeResults: [...prog.nodeResults, entry],
            status: 'failed',
            failedNodeId: node.id,
            failedSlot: slot,
          },
        }
      }
      const nodeResults = [...prog.nodeResults, entry]
      const cleared = nodeResults.filter((r) => r.nodeId === node.id).length >= CAMPAIGN_SLOTS
      if (!cleared) return { ...state, campaign: { ...prog, nodeResults } }
      const nodeIndex = prog.nodeIndex + 1
      const status = nodeIndex >= campaign.nodes.length ? 'cleared' : 'active'
      return { ...state, campaign: { ...prog, nodeResults, nodeIndex, status } }
    }

    case 'PLAY_REPLAY_EXHIBITION':
      return action.__matchResult ? { ...state, lastExhibition: { ...action.__matchResult, homeId: action.__matchContext.homeId, awayId: action.__matchContext.awayId } } : state
    case 'COMMIT_LEGACY_SERIES': {
      if (!action.__matchResult || !action.__matchContext) return state
      const r = action.__matchResult, c = action.__matchContext
      const form = { ...state.form }, standings = structuredClone(state.standings), results = [...state.results]
      applyUserSeriesResult(state, form, standings, results, c.homeId, c.awayId, c.userSide === 'home', r.aWins, r.bWins, r.log, r.games.map((game) => ({ game })))
      return finishInteractiveRound(state, { form, standings, results, draftSeries: null, live: null })
    }

    case 'RETRY_CAMPAIGN_NODE': {
      if (state.mode !== 'campaign' || !state.campaign) return state
      const prog = state.campaign
      if (prog.status !== 'failed') return state
      // Drop the failed attempt, keep earlier slots of the node, resume there.
      const nodeResults = prog.nodeResults.filter(
        (r) => !(r.nodeId === prog.failedNodeId && r.slot >= prog.failedSlot),
      )
      return {
        ...state,
        campaign: { ...prog, nodeResults, status: 'active', failedNodeId: null, failedSlot: null },
      }
    }

    case 'RESTART_CAMPAIGN': {
      if (state.mode !== 'campaign' || !state.campaign) return state
      return { ...state, campaign: freshCampaign(state.campaign.campaignId) }
    }

    case 'QUIT_CAMPAIGN':
      return freshState()

    default:
      return state
  }
}

// A snapshot freezes the match setup before any draft or map interaction.
export function matchContextFor(state, action) {
  if (!state || isRetired(state)) return null
  let homeId, awayId, round = state.round, needWins = 2, locked = false, sourceAction
  let kind, label, simMode = 'biased', forcedWinner = null
  const form = { ...state.form }
  let managedId = state.teamId
  if (action?.type === 'PLAY_ROUND') {
    if (!['season', 'career'].includes(state.mode) || state.finished) return null
    const match = state.schedule?.[state.round - 1]?.find((m) => m.includes(state.teamId))
    if (!match) return null
    ;[homeId, awayId] = match
    for (const p of state.teams[state.teamId] || []) {
      if (form[p.id] !== undefined) form[p.id] = clampForm(form[p.id] + Math.round(((p.morale ?? 70) - 70) / 10))
    }
    kind = 'regional'; label = `${state.league} · Week ${state.round}`
    sourceAction = { type: action.type }
  } else if (action?.type === 'PLAY_TOURNAMENT_ROUND') {
    const t = state.tournament
    if (!t || t.status !== 'active') return null
    const ri = t.rounds.findIndex((r) => r.matches.some((m) => !m.winner))
    if (ri < 0) return null
    const matches = t.rounds[ri].matches
    const own = matches.findIndex((m) => !m.winner && m.isUser)
    const mi = Number.isInteger(action.matchIndex) ? action.matchIndex
      : own >= 0 ? own : matches.findIndex((m) => !m.winner)
    const match = matches[mi]
    if (!match || match.winner || !match.homeId || !match.awayId) return null
    ;({ homeId, awayId } = match)
    kind = 'tournament'; round = 10 + ri; label = `${t.kind === 'playoffs' ? state.league + ' playoffs' : t.kind.toUpperCase()} · ${t.rounds[ri].name}`
    sourceAction = { type: action.type, matchIndex: mi }
    simMode = t.resolver || 'biased'
    forcedWinner = ['home', 'A'].includes(match.forcedWinner) ? 'A' : ['away', 'B'].includes(match.forcedWinner) ? 'B' : null
    if (simMode === 'manual' && !forcedWinner) return null
    locked = simMode === 'manual' && !!forcedWinner
  } else if (action?.type === 'GAUNTLET_PLAY') {
    if (state.mode !== 'gauntlet' || state.gauntlet?.status !== 'active') return null
    homeId = state.teamId; awayId = state.gauntlet.opponentId
    kind = 'gauntlet'; label = `Gauntlet · Round ${state.gauntlet.round + 1}`
    sourceAction = { type: action.type }
  } else if (action?.type === 'PLAY_CAMPAIGN_NODE') {
    const campaign = campaignById(state.campaign?.campaignId)
    const prog = state.campaign
    if (state.mode !== 'campaign' || !campaign?.nodes || prog.status !== 'active') return null
    const node = campaign.nodes[prog.nodeIndex]
    if (!node) return null
    const slot = nodeSlots(prog, node.id).length + 1
    if (slot > CAMPAIGN_SLOTS) return null
    homeId = campaign.playerTeamId; awayId = node.opponentId; round = prog.nodeIndex + 1
    locked = (node.hardLossSlots || []).includes(slot)
    if (locked) { needWins = 1; simMode = 'manual'; forcedWinner = 'B' }
    kind = 'campaign'; label = `${campaign.title} · Slot ${slot}`
    sourceAction = { type: action.type }
  } else if (action?.type === 'PLAY_REPLAY_EXHIBITION') {
    if (state.mode !== 'campaign' || campaignById(state.campaign?.campaignId)?.kind !== 'season') return null
    homeId = action.teamId; awayId = action.opponentId
    if (homeId === awayId || !state.teams[homeId] || !state.teams[awayId]) return null
    managedId = homeId; kind = 'exhibition'; label = 'Historical roster exhibition'
    sourceAction = { type: action.type, teamId: homeId, opponentId: awayId }
  } else return null
  const homeSrc = tournamentRoster(state, homeId), awaySrc = tournamentRoster(state, awayId)
  const homeLineup = homeId === state.teamId ? userLineup(homeSrc.players, state.lineup, form).lineup : bestLineup(homeSrc.players, state.teams[homeId] ? form : homeSrc.form).lineup
  const awayLineup = awayId === state.teamId ? userLineup(awaySrc.players, state.lineup, form).lineup : bestLineup(awaySrc.players, state.teams[awayId] ? form : awaySrc.form).lineup
  const seed = (Math.random() * 0x7fffffff) | 0
  const rng = mulberry32(seed ^ 0x71b8)
  const homeTactic = homeId === managedId ? state.tactic : aiTactic(homeId, awayId, round, rng, state.teamMeta?.[homeId]?.tier)
  const awayTactic = awayId === managedId ? state.tactic : aiTactic(awayId, homeId, round, rng, state.teamMeta?.[awayId]?.tier)
  const bonus = ['regional', 'tournament'].includes(kind) ? managedCoachBonus(state) + (kind === 'regional' ? preparationBonus(state, upcomingOpponent(state)) : 0) : 0
  const userSide = homeId === managedId ? 'home' : awayId === managedId ? 'away' : null
  return { seed, sourceAction, kind, label, homeId, awayId, homeName: homeId, awayName: awayId,
    homeLineup, awayLineup, homeTactic, awayTactic, userSide, needWins, locked,
    extra: { aBonus: homeId === managedId ? bonus : 0, bBonus: awayId === managedId ? bonus : 0,
      aStrat: kind === 'regional' && userSide === 'home' ? state.strategy : null,
      bStrat: kind === 'regional' && userSide === 'away' ? state.strategy : null,
      simMode, forcedWinner, bigMatch: kind === 'tournament' && round - 10 >= state.tournament.rounds.length - 2,
      fearless: ['regional', 'tournament'].includes(kind) && !!state.seriesOptions?.fearless } }
}

function settleMatch(state, session) {
  if (session.stage !== 'complete') return { ...state, matchSession: session }
  const result = sessionResult(session)
  const next = baseReducer({ ...state, matchSession: null }, {
    ...session.context.sourceAction, __matchResult: result, __matchContext: session.context,
  })
  return { ...next, matchSession: { ...session, stage: 'result' } }
}

function reducer(state, action) {
  const s = state?.matchSession
  if (['NEW_GAME', 'START_CAREER', 'START_CAMPAIGN'].includes(action.type)) {
    if (s) return state
    const next = baseReducer(state, action)
    return { ...next, matchOptions: matchOptions(action.matchOptions ?? state?.matchOptions), matchSession: null }
  }
  if (action.type === 'PREVIEW_MATCH') {
    if (s) return state
    const context = matchContextFor(state, action.action)
    if (!context) return state
    const options = matchOptions(state.matchOptions)
    if (!context.userSide) { options.draft = false; options.igl = false }
    return { ...state, matchSession: createMatchSession(context, options) }
  }
  if (action.type === 'SET_MATCH_OPTION') {
    if (!Object.hasOwn(MATCH_OPTIONS, action.key) || (s && s.stage !== 'setup') || (s && !s.context.userSide && action.key !== 'showSimulation')) return state
    const options = { ...matchOptions(s?.options ?? state.matchOptions), [action.key]: action.value === true }
    return { ...state, matchOptions: { ...matchOptions(state.matchOptions), [action.key]: options[action.key] },
      matchSession: s ? { ...s, options } : null }
  }
  if (s) {
    switch (action.type) {
      case 'MATCH_CANCEL': return s.stage === 'setup' ? { ...state, matchSession: null } : state
      case 'MATCH_CLOSE': return s.stage === 'result' ? { ...state, matchSession: null } : state
      case 'MATCH_START': return settleMatch(state, startMatchSession(s))
      case 'MATCH_DRAFT_AI': case 'MATCH_DRAFT_BAN': case 'MATCH_DRAFT_PICK':
        return { ...state, matchSession: changeSessionDraft(s, action) }
      case 'MATCH_DRAFT_LOCK': return s.stage === 'draft' && s.draft?.done ? settleMatch(state, startSessionGame(s)) : state
      case 'MATCH_DECISION': return s.stage === 'map' && s.options.igl && !s.current.callId
        ? { ...state, matchSession: { ...s, stage: 'decision', current: { ...s.current, cursor: s.current.decisionAt } } } : state
      case 'MATCH_CALL': return { ...state, matchSession: makeSessionCall(s, action.callId) }
      case 'MATCH_FINISH_GAME': return settleMatch(state, finishSessionGame(s))
      case 'MATCH_NEXT_GAME': return settleMatch(state, nextSessionGame(s))
      case 'MATCH_CURSOR': {
        if (s.stage !== 'map' || !Number.isFinite(action.minute)) return state
        const limit = s.options.igl && !s.current.callId ? s.current.decisionAt : s.current.game.durationMin
        return { ...state, matchSession: { ...s, current: { ...s.current, cursor: Math.max(0, Math.min(limit, action.minute)) } } }
      }
      case 'RESET': case 'SET_SIM_SPEED': return baseReducer(state, action)
      default: return state // Roster, campaign and bracket cannot change under an active match.
    }
  }
  if (action.type.startsWith('MATCH_')) return state
  // Result injection is private to settleMatch; ordinary actions cannot forge outcomes.
  const { __matchResult, __matchContext, ...publicAction } = action
  return baseReducer(state, publicAction)
}

function migrateMatchExperience(parsed) {
  parsed.matchOptions = matchOptions(parsed.matchOptions)
  if (!('matchSession' in parsed)) parsed.matchSession = null
  if (!['draft', 'igl'].includes(parsed.mode)) return parsed
  const oldMode = parsed.mode, old = parsed.draftSeries || parsed.live
  parsed.mode = 'season'
  parsed.matchOptions[oldMode] = true
  if (old && !parsed.matchSession) {
    const context = matchContextFor(parsed, { type: 'PLAY_ROUND' })
    if (context) {
      context.sourceAction = { type: 'COMMIT_LEGACY_SERIES' }
      context.kind = 'legacy'
      const games = (old.games || []).map((g) => g.game)
      let session = { ...createMatchSession(context, parsed.matchOptions), games,
        aWins: old.aWins, bWins: old.bWins, legacyCompleted: games.length }
      if (oldMode === 'draft') session = { ...session, stage: 'draft', draft: old.draft, aiPersonality: old.aiPersonality }
      else if (old.current) {
        const c = old.current, l = c.lineups
        Object.assign(context, { seed: c.seed, homeLineup: l.homeLineupObj, awayLineup: l.awayLineupObj, homeTactic: l.homeTactic, awayTactic: l.awayTactic })
        const decisionAt = c.pass1.events[Math.max(0, c.split - 1)]?.t ?? 12
        session = { ...session, stage: c.final ? 'map' : 'decision', current: {
          game: c.final || c.pass1, seed: c.seed, cursor: decisionAt, decisionAt,
          extra: { ...context.extra, gameIndex: games.length + 1 }, callId: c.callId ?? null,
          prompt: c.prompt, evaluation: c.evaluation, log: c.log || [],
        } }
      } else session = { ...session, stage: 'between' }
      parsed.matchSession = session
    }
  }
  parsed.draftSeries = null; parsed.live = null
  return parsed
}

export function load() {
  try {
    const raw = readSave()
    if (!raw) return freshState()
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1 || !parsed.teams || typeof parsed.teams !== 'object' ||
        Array.isArray(parsed.teams) || !Object.values(parsed.teams).every((players) =>
          Array.isArray(players) && players.every((p) => p && typeof p === 'object' && !Array.isArray(p))) ||
        !Array.isArray(parsed.results) || !Array.isArray(parsed.faPool) ||
        !Number.isInteger(parsed.round) || parsed.round < 1 ||
        !['standings', 'lineup', 'form', 'tactic'].every((key) => parsed[key] &&
          typeof parsed[key] === 'object' && !Array.isArray(parsed[key]))) return freshState()
    // Old season saves predate campaign mode: default to season.
    if (parsed.mode == null) parsed.mode = 'season'
    if (!['season', 'campaign', 'career', 'draft', 'igl', 'gauntlet'].includes(parsed.mode)) return freshState()
    if (parsed.mode === 'campaign') {
      const progress = parsed.campaign
      const campaign = campaignById(progress?.campaignId)
      if (!campaign || !Number.isInteger(progress.nodeIndex) || progress.nodeIndex < 0 ||
          !['active', 'failed', 'cleared'].includes(progress.status) || !Array.isArray(progress.nodeResults)) return freshState()
      if ((campaign.kind ?? 'series') === 'season') {
        if (parsed.teamId != null || parsed.seasonYear !== campaign.seasonYear ||
            progress.nodeIndex !== 0 || progress.nodeResults.length || progress.status === 'failed') return freshState()
      } else {
        if (parsed.teamId !== campaign.playerTeamId || progress.nodeIndex > campaign.nodes.length ||
            (progress.status === 'active' && progress.nodeIndex === campaign.nodes.length) ||
            !progress.nodeResults.every((r) => r && campaign.nodes.some((n) => n.id === r.nodeId) &&
              Number.isInteger(r.slot) && r.slot >= 1 && r.slot <= CAMPAIGN_SLOTS)) return freshState()
      }
    } else if (!parsed.teamId || !Array.isArray(parsed.teams[parsed.teamId])) return freshState()
    if (parsed.mode === 'campaign' && parsed.teamId && !Array.isArray(parsed.teams[parsed.teamId])) return freshState()
    if (parsed.mode === 'career' && (!parsed.career || typeof parsed.career !== 'object')) return freshState()
    if (!('campaign' in parsed)) parsed.campaign = null
    // Old saves predate career mode: null unless a career save.
    if (!('career' in parsed)) parsed.career = null
    // Old saves predate the year selector: backfill to present.
    if (!parsed.seasonYear) parsed.seasonYear = 'present'
    if (!parsed.year) parsed.year = parsed.seasonYear
    // Old saves predate multi-league: backfill league/tournament/phase.
    if (!parsed.league) {
      try {
        parsed.league = getSeason(parsed.seasonYear).league ?? 'LCK'
      } catch {
        parsed.league = 'LCK'
      }
    }
    if (!('tournament' in parsed)) parsed.tournament = null
    if (parsed.tournament && !parsed.tournament.resolver) parsed.tournament.resolver = 'biased'
    // Old saves predate stage-gated reveal: show the full bracket.
    if (parsed.tournament && parsed.tournament.revealedRounds == null) {
      parsed.tournament.revealedRounds = parsed.tournament.rounds?.length ?? 3
    }
    // Old saves predate career dilemmas.
    if (!('pendingEvent' in parsed)) parsed.pendingEvent = null
    if (!('lastEventLog' in parsed)) parsed.lastEventLog = null
    if (!parsed.phase) parsed.phase = parsed.finished ? 'done' : 'regional'
    if (!parsed.teamMeta || !parsed.schedule || !parsed.totalRounds) {
      const present = freshState('present')
      if (!parsed.teamMeta) parsed.teamMeta = present.teamMeta
      if (!parsed.schedule) parsed.schedule = present.schedule
      if (!parsed.totalRounds) parsed.totalRounds = present.totalRounds
    }
    // Old saves predate item-4 strategy: backfill to defaults, and stored
    // result details predate strat snapshots (recompute treats missing as null).
    if (!parsed.strategy || typeof parsed.strategy !== 'object') {
      parsed.strategy = { comp: null, roam: null, swap: false, wincon: null }
    } else {
      parsed.strategy = {
        comp: parsed.strategy.comp ?? null,
        roam: parsed.strategy.roam ?? null,
        swap: !!parsed.strategy.swap,
        wincon: parsed.strategy.wincon ?? null,
      }
    }
    if (Array.isArray(parsed.results)) {
      for (const r of parsed.results) {
        if (r && r.detail) {
          if (!('homeStrat' in r.detail)) r.detail.homeStrat = null
          if (!('awayStrat' in r.detail)) r.detail.awayStrat = null
        }
      }
    }
    // Old saves predate item-5 age/potential: backfill on teams + FA pool.
    const backfillPlayer = (p) => {
      if (!p || typeof p !== 'object') return
      if (p.age == null) p.age = 21
      if (p.potential == null) p.potential = Math.max(45, Math.min(99, (p.ovr ?? 70) + 5))
    }
    if (parsed.teams && typeof parsed.teams === 'object') {
      for (const tid of Object.keys(parsed.teams)) {
        if (Array.isArray(parsed.teams[tid])) for (const p of parsed.teams[tid]) backfillPlayer(p)
      }
    }
    if (Array.isArray(parsed.faPool)) for (const p of parsed.faPool) backfillPlayer(p)
    // P1 backfills: traits, seriesOptions, pendingPromotion, playoffChampionId.
    const backfillTraits = (p) => { if (p && typeof p === 'object' && !Array.isArray(p.traits)) p.traits = [] }
    if (parsed.teams && typeof parsed.teams === 'object') {
      for (const tid of Object.keys(parsed.teams)) {
        if (Array.isArray(parsed.teams[tid])) for (const p of parsed.teams[tid]) backfillTraits(p)
      }
    }
    if (Array.isArray(parsed.faPool)) for (const p of parsed.faPool) backfillTraits(p)
    if (!parsed.seriesOptions || typeof parsed.seriesOptions !== 'object') parsed.seriesOptions = { fearless: false }
    else if (typeof parsed.seriesOptions.fearless !== 'boolean') parsed.seriesOptions.fearless = false
    if (!('pendingPromotion' in parsed)) parsed.pendingPromotion = null
    if (!('playoffChampionId' in parsed)) parsed.playoffChampionId = null
    return migrateMatchExperience(parsed)
  } catch {
    return freshState()
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  const [storageError, setStorageError] = useState(null)

  const retrySave = useCallback(() => {
    try {
      writeSave(state)
      setStorageError(null)
    } catch {
      setStorageError('Progress could not be saved in this browser. Free some storage, then retry saving.')
    }
  }, [state])
  useEffect(() => { retrySave() }, [retrySave])

  return { state, dispatch, TOTAL_ROUNDS, storageError, retrySave }
}

export { TOTAL_ROUNDS, reducer }
