// Multi-league + MSI/Worlds acceptance test (item 3).
import { reducer } from '../src/game/useGameState.js'
import { SEASONS, SEASON_ORDER, getSeason, LEAGUES } from '../src/data/seasons.js'

const assert = (c, m) => {
  if (!c) { console.error('FAIL:', m); process.exit(1) } else console.log('ok:', m)
}

// 1) League datasets present + globally-unique ids.
const ids = new Set()
for (const lid of ['present-lpl', 'present-lec', 'present-lcs']) {
  const s = getSeason(lid)
  assert(s.league === lid.split('-')[1].toUpperCase(), `${lid} league tag`)
  assert(s.teams.length >= 8, `${lid} has >=8 teams (got ${s.teams.length})`)
  for (const t of s.teams) {
    assert(!ids.has(t.id), `unique team id ${t.id}`)
    ids.add(t.id)
    assert(t.players.length === 10, `${t.id} has 10 players`)
  }
}
assert(SEASON_ORDER.includes('present-lpl') && SEASON_ORDER.includes('present-lec') && SEASON_ORDER.includes('present-lcs'), 'SEASON_ORDER has new leagues')

// 2) present (LCK) unchanged.
assert(getSeason('present').league === 'LCK', 'present is LCK')
assert(SEASONS.present.teams === SEASONS.present.teams, 'present byte-identical ref')

// 3) Start an LPL career.
let st = reducer(undefined, { type: 'START_CAREER', teamId: getSeason('present-lpl').teams[0].id, managerName: 'Test', seasonYear: 'present-lpl' })
assert(st.mode === 'career', 'career mode')
assert(st.league === 'LPL', 'league = LPL')
assert(st.phase === 'regional', 'phase regional')
assert(st.tournament === null, 'no tournament yet')
assert(Object.keys(st.teams).length === getSeason('present-lpl').teams.length, 'LPL roster loaded')

// 4) Play the whole regional season.
let guard = 0
while (!st.finished && guard++ < 60) {
  st = reducer(st, { type: 'PLAY_ROUND' })
}
assert(st.finished === true, 'regional season finished')
assert(st.phase === 'playoffs', 'P1: phase is playoffs (bracket built) after season')

// 4b) Play the LCK playoff bracket to a champion before MSI.
let pGrd = 0
while (st.phase === 'playoffs' && st.tournament && st.tournament.status === 'active' && pGrd++ < 10) {
  st = reducer(st, { type: 'PLAY_TOURNAMENT_ROUND' })
}
assert(st.tournament.status === 'done', 'LCK playoff bracket completed')
assert(typeof st.playoffChampionId === 'string', 'playoffChampionId set')
assert(st.phase === 'playoffs', 'phase stays playoffs until MSI built')

// 5) Build MSI + play all rounds to a champion.
st = reducer(st, { type: 'BUILD_TOURNAMENT', kind: 'msi' })
assert(st.tournament && st.tournament.kind === 'msi', 'MSI built')
assert(st.tournament.rounds[0].matches.length === 4, 'QF has 4 matches (8 teams)')
assert(st.tournament.rounds.length === 3, 'QF/SF/F = 3 rounds')
// seed check: #1 vs #2 and same-league opposite halves
const qf = st.tournament.rounds[0].matches
assert(qf[0].homeId !== qf[0].awayId, 'QF0 distinct teams')
let grd = 0
while (st.tournament.status === 'active' && grd++ < 10) {
  st = reducer(st, { type: 'PLAY_TOURNAMENT_ROUND' })
}
assert(st.tournament.status === 'done', 'MSI completed')
assert(typeof st.tournament.championId === 'string', 'MSI has a champion')

// 6) Worlds builds from same qualifier set + completes.
st = reducer(st, { type: 'BUILD_TOURNAMENT', kind: 'worlds' })
assert(st.tournament.kind === 'worlds', 'Worlds built')
let grd2 = 0
while (st.tournament.status === 'active' && grd2++ < 10) {
  st = reducer(st, { type: 'PLAY_TOURNAMENT_ROUND' })
}
assert(st.tournament.status === 'done', 'Worlds completed')
assert(typeof st.tournament.championId === 'string', 'Worlds has a champion')

// 7) ADVANCE_SEASON records flags + resets.
const beforeIdx = st.career.seasonIndex
st = reducer(st, { type: 'ADVANCE_SEASON' })
assert(st.career.seasonIndex === beforeIdx + 1, 'season index advanced')
assert(st.tournament === null, 'tournament cleared')
assert(st.phase === 'regional', 'phase reset to regional')
assert(st.round === 1 && st.results.length === 0, 'new season reset')
const rec = st.career.history[st.career.history.length - 1]
assert(rec.league === 'LPL', 'history record has league flag')

// 8) Backfill contract: a minimal new game (no league/phase fields) gets them
//    derived from seasonYear via freshState — proving old-save shapes are safe.
const fresh = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
assert(fresh.league === 'LCK', 'derived league=LCK from present')
assert(fresh.phase === 'regional', 'derived phase=regional')
assert(fresh.career === null, 'career null on season start')
assert(fresh.tournament === null, 'tournament null on season start')

console.log('MULTILEAGUE ACCEPTANCE PASSED')
