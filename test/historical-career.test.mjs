import assert from 'node:assert/strict'
import { reducer, rosterBackend, load, mulberry32, qualifiersForTournament, tournamentSeasonForLeague } from '../src/game/useGameState.js'
import { getSeason, LEAGUES, seasonsForLeague } from '../src/data/seasons.js'
import { writeSave } from '../src/game/persistence.js'

const previousRandom = Math.random
const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
}
function saved(state) {
  writeSave(state)
  const loaded = load()
  assert.deepEqual(JSON.parse(JSON.stringify(loaded)), JSON.parse(JSON.stringify(state)))
  return loaded
}
function finishBracket(state) {
  for (let guard = 0; state.tournament?.status === 'active' && guard < 10; guard++) {
    state = reducer(state, { type: 'PLAY_TOURNAMENT_ROUND' })
  }
  assert.equal(state.tournament.status, 'done')
  return state
}
try {
  Math.random = mulberry32(20251012)
  // Every dataset offered in the selector is accepted by the career entry.
  for (const league of LEAGUES) for (const seasonYear of seasonsForLeague(league)) {
    const dataset = getSeason(seasonYear)
    const teamId = dataset.teams[0].id
    const state = reducer(undefined, { type: 'START_CAREER', seasonYear, teamId })
    assert.equal(state.seasonYear, seasonYear)
    assert.equal(state.league, league)
    assert.equal(state.teamId, teamId)
  }
  for (const [seasonYear, teamId] of [['2025-lck', 'T1'], ['2025-lpl', 'BLG']]) {
    const dataset = getSeason(seasonYear)
    // Production-shaped career (backend stamps joinedSeason at creation),
    // so the exact save round-trip below stays strict.
    let state = rosterBackend.reducer(undefined, { type: 'START_CAREER', seasonYear, teamId })
    assert.equal(state.teamId, teamId)
    assert.equal(state.career.seasonYear, seasonYear)
    assert.deepEqual(state.teams[teamId].map((p) => p.id), dataset.teams.find((t) => t.id === teamId).players.map((p) => p.id))
    state = saved(state)
    for (let guard = 0; !state.finished && guard < state.totalRounds + 1; guard++) {
      state = reducer(state, { type: 'PLAY_ROUND' })
    }
    assert.equal(state.finished, true)
    assert.equal(state.tournament.kind, 'playoffs')
    state = saved(finishBracket(state))
    const qualifiers = qualifiersForTournament(state)
    for (const league of LEAGUES) {
      const matching = getSeason(`2025-${league.toLowerCase()}`)
      assert.equal(tournamentSeasonForLeague(state, league).id, matching.id)
      if (league !== state.league) {
        const expected = [...matching.teams].sort((a, b) => b.tier - a.tier || (a.id < b.id ? -1 : 1)).slice(0, 2).map((t) => t.id)
        assert.deepEqual(qualifiers[league], expected)
      }
    }
    state = reducer(state, { type: 'BUILD_TOURNAMENT', kind: 'msi' })
    assert.equal(state.tournament.kind, 'msi')
    state = finishBracket(state) // exercises historical foreign rosters, not just qualifiers
    state = reducer(state, { type: 'BUILD_TOURNAMENT', kind: 'worlds' })
    state = saved(finishBracket(state))
    const starters = Object.values(state.lineup).map((id) => state.teams[teamId].find((p) => p.id === id))
    const teamIds = Object.keys(state.teams)
    state = reducer(state, { type: 'ADVANCE_SEASON' })
    assert.equal(state.career.seasonIndex, 2)
    assert.equal(state.career.history.length, 1)
    assert.equal(state.seasonYear, seasonYear)
    assert.equal(state.career.seasonYear, seasonYear)
    assert.equal(state.league, dataset.league)
    assert.deepEqual(Object.keys(state.teams), teamIds)
    assert.equal(state.round, 1)
    assert.equal(state.results.length, 0)
    for (const before of starters) {
      const after = state.teams[teamId].find((p) => p.id === before.id)
      assert.ok(after, `starter ${before.id} survives offseason`)
      assert.equal(after.age, before.age + 1, 'annual development carried forward')
    }
    saved(state)
  }
  const fallback = reducer(undefined, { type: 'START_CAREER', seasonYear: 'missing', teamId: 'NOPE' })
  assert.equal(fallback.seasonYear, 'present')
  assert.ok(fallback.teams[fallback.teamId])
  console.log('Historical career lifecycle checks passed')
} finally {
  Math.random = previousRandom
  delete globalThis.localStorage
}
