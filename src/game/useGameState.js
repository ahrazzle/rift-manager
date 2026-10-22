// ============================================================================
// useGameState — game state, actions, and localStorage persistence.
// ============================================================================
import { useEffect, useReducer } from 'react'
import { TEAMS, FREE_AGENTS, ROLES } from '../data/lck.js'
import { getSeason, LEAGUES, PRESENT_BY_LEAGUE } from '../data/seasons.js'
import { CAMPAIGNS } from '../data/campaigns.js'
import { COACHES, COACH_BY_ID, coachBonus } from '../data/coaches.js'
import { buildLCKSchedule, makeStandings, emptyStanding, roundRobin, buildPlayoffs } from '../engine/season.js'
import { simulateSeries } from '../engine/sim.js'
import { developPlayer } from '../data/development.js'
import { SERIES_TRAIT_IDS } from '../data/traits.js'
import { buildAcademyPlayer } from '../data/academy.js'
import { DILEMMA_EVENTS } from '../data/events.js'
import { bestLineup, userLineup, styledPlayer, clampForm } from './logic.js'
import { aiTactic } from './ai.js'

// Deterministic per-series RNG so the Match Detail view can recompute identical
// games[] on demand without persisting full timelines. Each series stores its
// seed + the two lineup/tactic snapshots used at sim time; the detail view
// re-runs simulateSeries with mulberry32(seed) to get byte-identical output
// (sim.js threads the single injected rng in fixed order).
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const SAVE_KEY = 'lck-manager-save-v1'
const SCHEDULE = buildLCKSchedule()
const TOTAL_ROUNDS = SCHEDULE.length

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
  return {
    version: 1,
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
    mode: 'season', // 'season' | 'campaign' | 'career'
    campaign: null, // CampaignProgress | null (see freshCampaign below)
    career: null, // Career | null (see freshCareer below; null unless mode === 'career')
    pendingEvent: null, // CareerDilemma | null (p0-ux-design §2b; set by ADVANCE_SEASON roll)
    lastEventLog: null, // transient log string from the last RESOLVE_EVENT
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
//   status: 'active'|'retired', seasonYear: 'present',
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

// Find a dataset team object by id across all present-league datasets.
function datasetTeamById(teamId) {
  for (const league of LEAGUES) {
    const season = getSeason(PRESENT_BY_LEAGUE[league])
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
      const season = getSeason(PRESENT_BY_LEAGUE[league])
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
      const team = datasetTeamById(id)
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
// rosters/form; foreign teams snapshot their present dataset via getSeason()
// with neutral form (AI has no form history). The managed team keeps its live
// roster/form via userLineup in playTournamentMatch.
function tournamentRoster(state, teamId) {
  if (state.teams[teamId]) return { players: state.teams[teamId], form: state.form }
  const team = datasetTeamById(teamId)
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

function reducer(state, action) {
  switch (action.type) {
    case 'NEW_GAME': {
      const base = freshState(action.seasonYear ?? action.year)
      const ids = Object.keys(base.teams)
      base.teamId = ids.includes(action.teamId) ? action.teamId : ids[0]
      base.managerName = action.managerName || 'Coach'
      base.lineup = defaultLineup(base.teams[base.teamId])
      return base
    }
    case 'RESET':
      return freshState()

    case 'START_CAREER': {
      // Multi-league: seasonYear widened to any present-league id (default
      // 'present'); historical/unknown years fall back to 'present'.
      const reqYear = action.seasonYear ?? action.year ?? 'present'
      const resolved = getSeason(reqYear).id
      const careerYear = ['present', 'present-lpl', 'present-lec', 'present-lcs'].includes(resolved)
        ? resolved
        : 'present'
      const base = freshState(careerYear)
      const ids = Object.keys(base.teams)
      base.teamId = ids.includes(action.teamId) ? action.teamId : ids[0]
      base.managerName = action.managerName || 'Coach'
      base.lineup = defaultLineup(base.teams[base.teamId])
      base.mode = 'career'
      base.career = freshCareer(base.teamId, base.managerName, ids, careerYear)
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

    case 'SIGN': {
      if (!state.teamId || isRetired(state)) return state
      const idx = state.faPool.findIndex((p) => p.id === action.playerId)
      if (idx < 0) return state
      const player = state.faPool[idx]
      const faPool = state.faPool.filter((p) => p.id !== action.playerId)
      const teams = {
        ...state.teams,
        [state.teamId]: [...state.teams[state.teamId], { ...player, team: state.teamId }],
      }
      const form = { ...state.form }
      if (form[player.id] === undefined) form[player.id] = 50
      // Make the signed player the starter for their role.
      const lineup = { ...state.lineup, [player.role]: player.id }
      return { ...state, faPool, teams, form, lineup }
    }

    case 'PLAY_ROUND': {
      if (state.finished || !state.teamId) return state
      if (state.mode === 'campaign') return state // campaign uses PLAY_CAMPAIGN_NODE
      if (isRetired(state)) return state
      const round = state.round
      const schedule = state.schedule ?? SCHEDULE
      const totalRounds = state.totalRounds ?? TOTAL_ROUNDS
      const matches = schedule[round - 1]
      if (!matches) return state

      const form = { ...state.form }
      const standings = JSON.parse(JSON.stringify(state.standings))
      const results = [...state.results]
      const myId = state.teamId
      // Career coach bonus: managed team only, AI teams get none.
      // Item 4 strategy: managed team's side only, AI-vs-AI default-zero.
      const bonus = managedCoachBonus(state)
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
        const res = simulateSeries(
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
          // Compact detail seed: lineups/tactics are snapshots at sim time so
          // MatchDetail can re-run simulateSeries deterministically. No full
          // timelines stored here — recomputed on demand. Strat snapshots
          // ride along so the recompute passes the same extra.
          detail: { seed, homeLineup: homeLineupObj, awayLineup: awayLineupObj, homeTactic, awayTactic, bonusA, bonusB, homeStrat: stratA, awayStrat: stratB, bigMatch: false, fearless },
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
      }
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
        career: {
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
        faPool,
        lineup: defaultLineup(teams[state.teamId]),
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
      if (cutIdx < 0) return state // no bench to cut — no change
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
      if (state.mode !== 'season' && state.mode !== 'career') return state
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
      if (state.mode !== 'season' && state.mode !== 'career') return state
      if (isRetired(state)) return state
      const t = state.tournament
      if (!t || t.status !== 'active') return state
      const ri = t.rounds.findIndex((r) => r.matches.some((m) => !m.winner))
      if (ri < 0) return state
      const bonus = managedCoachBonus(state)
      const roundNo = 10 + ri
      const simMode = t.resolver === 'random' || t.resolver === 'manual' ? t.resolver : 'biased'
      const played = t.rounds[ri].matches.map((m) =>
        m.winner || !m.homeId || !m.awayId ? m : playTournamentMatch(state, m, bonus, roundNo, simMode, m.forcedWinner ?? null, t.rounds.length),
      )
      const rounds = t.rounds.map((r, i) => (i === ri ? { ...r, matches: played } : r))
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
      const res = simulateSeries(
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

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1 || !parsed.teamId) return freshState()
    // Old season saves predate campaign mode: default to season.
    if (!['season', 'campaign', 'career'].includes(parsed.mode)) parsed.mode = 'season'
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
    return parsed
  } catch {
    return freshState()
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    } catch {
      /* ignore quota errors */
    }
  }, [state])

  return { state, dispatch, TOTAL_ROUNDS }
}

export { TOTAL_ROUNDS, reducer }
