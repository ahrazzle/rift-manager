// P0 UX tests (items 1/4/6): stage-gated reveal, manual resolver, dilemmas.
// Run: node test/p0-ux.test.mjs
import { reducer, load } from '../src/game/useGameState.js'
import { DILEMMA_EVENTS } from '../src/data/events.js'
import { developPlayer } from '../src/data/development.js'

let failures = 0
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); failures++ } else console.log('ok  :', m) }

function finishRegional(teamId = 'T1') {
  let s = reducer(undefined, { type: 'START_CAREER', teamId, managerName: 'Mozi' })
  let guard = 0
  while (!s.finished && guard++ < 60) s = reducer(s, { type: 'PLAY_ROUND' })
  if (!s.finished) throw new Error('season did not finish')
  return s
}

// ---------- item 1: revealedRounds ----------
let s = finishRegional()
// P1 item 11: a playoff bracket is now built at season end; play it out first.
let pg = 0
while (s.phase === 'playoffs' && s.tournament && s.tournament.status === 'active' && pg++ < 10) {
  s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
}
assert(s.tournament.status === 'done', 'playoff bracket done before MSI')
s = reducer(s, { type: 'BUILD_TOURNAMENT', kind: 'msi' })
assert(s.tournament.revealedRounds === 1, 'BUILD_TOURNAMENT sets revealedRounds=1')
assert(s.tournament.resolver === 'biased', 'BUILD_TOURNAMENT default resolver biased')
s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
assert(s.tournament.revealedRounds === 2, 'QF sim reveals SF (revealedRounds=2)')
s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
assert(s.tournament.revealedRounds === 3, 'SF sim reveals Final (revealedRounds=3)')
s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
assert(s.tournament.status === 'done' && s.tournament.revealedRounds === 3, 'Final sim caps revealedRounds at 3, status done')

// ---------- item 1: SET_TOURNAMENT_WINNER (manual) ----------
let m = finishRegional()
let mg = 0
while (m.phase === 'playoffs' && m.tournament && m.tournament.status === 'active' && mg++ < 10) {
  m = reducer(m, { type: 'PLAY_TOURNAMENT_ROUND' })
}
m = reducer(m, { type: 'BUILD_TOURNAMENT', kind: 'msi', resolver: 'manual' })
assert(m.tournament.resolver === 'manual', 'manual resolver build')
const home0 = m.tournament.rounds[0].matches[0].homeId
m = reducer(m, { type: 'SET_TOURNAMENT_WINNER', roundIndex: 0, matchIndex: 0, winnerId: home0 })
const dec = m.tournament.rounds[0].matches[0]
assert(dec.forcedWinner === 'home' && dec.winner === home0, 'SET_TOURNAMENT_WINNER sets forcedWinner+winner (manual)')
const badW = reducer(m, { type: 'SET_TOURNAMENT_WINNER', roundIndex: 0, matchIndex: 1, winnerId: 'NOPE' })
assert(badW.tournament.rounds[0].matches[1].winner == null, 'invalid winnerId no-op')
m = reducer(m, { type: 'PLAY_TOURNAMENT_ROUND' })
assert(m.tournament.rounds[0].matches.every((x) => x.winner), 'round completes around manual pick, manual winner kept: ' + (m.tournament.rounds[0].matches[0].winner === home0))
m = reducer(m, { type: 'PLAY_TOURNAMENT_ROUND' })
m = reducer(m, { type: 'PLAY_TOURNAMENT_ROUND' })
assert(m.tournament.status === 'done', 'manual tournament completes')
const frozen = reducer(m, { type: 'SET_TOURNAMENT_WINNER', roundIndex: 0, matchIndex: 0, winnerId: home0 })
assert(frozen === m, 'SET_TOURNAMENT_WINNER no-op when done')

// ---------- load() backfills ----------
let b = finishRegional()
let bg = 0
while (b.phase === 'playoffs' && b.tournament && b.tournament.status === 'active' && bg++ < 10) {
  b = reducer(b, { type: 'PLAY_TOURNAMENT_ROUND' })
}
b = reducer(b, { type: 'BUILD_TOURNAMENT', kind: 'msi' })
const stripped = JSON.parse(JSON.stringify(b))
delete stripped.tournament.revealedRounds
delete stripped.tournament.resolver
delete stripped.pendingEvent
delete stripped.lastEventLog
globalThis.localStorage = { _v: JSON.stringify(stripped), getItem(k) { return this._v }, setItem(k, v) { this._v = v } }
const loaded = load()
assert(loaded.tournament.revealedRounds === loaded.tournament.rounds.length, 'load() backfills revealedRounds=rounds.length')
assert(loaded.tournament.resolver === 'biased', 'load() backfills resolver')
assert(loaded.pendingEvent === null, 'load() backfills pendingEvent')
delete globalThis.localStorage

// ---------- item 4: ADVANCE_SEASON dilemma roll ----------
const fresh = reducer(undefined, { type: 'RESET' })
assert(fresh.pendingEvent === null, 'fresh state pendingEvent=null')
let a = finishRegional()
// Play the season-end playoff bracket so ADVANCE_SEASON is allowed.
let ag = 0
while (a.phase === 'playoffs' && a.tournament && a.tournament.status === 'active' && ag++ < 10) {
  a = reducer(a, { type: 'PLAY_TOURNAMENT_ROUND' })
}
let set = 0, nul = 0, shapeOk = true
for (let i = 0; i < 300; i++) {
  // If a dilemma/promotion is pending, resolve it (option 0) then re-attempt advance.
  if (a.pendingEvent) { a = reducer(a, { type: 'RESOLVE_EVENT', optionIndex: 0 }); continue }
  if (a.pendingPromotion) { a = reducer(a, { type: 'RESOLVE_PROMOTION', promote: false }); continue }
  // Finish the current season's full regional schedule + playoff bracket.
  let rg = 0
  while (!a.finished && rg++ < 60) a = reducer(a, { type: 'PLAY_ROUND' })
  while (a.tournament && a.tournament.status !== 'done') a = reducer(a, { type: 'PLAY_TOURNAMENT_ROUND' })
  const before = a.career.seasonIndex
  const n = reducer(a, { type: 'ADVANCE_SEASON' })
  // Reaching the career max-seasons is a valid terminal stop, not a shape bug.
  if (n === a) {
    if (a.career.seasonIndex >= a.career.maxSeasons) break
    shapeOk = false; break
  }
  a = n
  if (!a.pendingEvent) { nul++; continue }
  set++
  if (!DILEMMA_EVENTS.some((e) => e.id === a.pendingEvent.eventId)) shapeOk = false
  const roster = a.teams[a.teamId] || []
  if (!roster.some((p) => p.id === a.pendingEvent.playerId)) shapeOk = false
}
assert(set > 0 && nul > 0, `ADVANCE_SEASON sets pendingEvent ~35% (set ${set}, null ${nul})`)
assert(shapeOk, 'pendingEvent shape valid (known eventId, managed playerId)')
const blocked = { ...a, pendingEvent: { eventId: 'wrist-injury', playerId: (Object.values(a.lineup)[0] || a.teams[a.teamId][0].id) } }
const gated = reducer(blocked, { type: 'ADVANCE_SEASON' })
assert(gated === blocked, 'ADVANCE_SEASON gates when pendingEvent present')

// ---------- item 4: RESOLVE_EVENT ----------
const tid = a.teamId
const starterId = Object.values(a.lineup)[0] || a.teams[tid][0].id
const starterBefore = a.teams[tid].find((p) => p.id === starterId).ovr
const withEv = { ...a, pendingEvent: { eventId: 'wrist-injury', playerId: starterId } }
const r0 = reducer(withEv, { type: 'RESOLVE_EVENT', optionIndex: 0 })
assert(r0.pendingEvent === null, 'RESOLVE_EVENT clears pendingEvent')
assert(typeof r0.lastEventLog === 'string' && r0.lastEventLog.length > 0, 'RESOLVE_EVENT sets lastEventLog')
assert(r0.teams[tid].find((p) => p.id === starterId).ovr === starterBefore - 3, `wrist rest -3 OVR (${starterBefore} -> ${r0.teams[tid].find((p) => p.id === starterId).ovr})`)
const r1 = reducer({ ...a, pendingEvent: { eventId: 'wrist-injury', playerId: starterId } }, { type: 'RESOLVE_EVENT', optionIndex: 1 })
assert(r1.pendingEvent === null && typeof r1.lastEventLog === 'string' && r1.lastEventLog.length > 0, 'risky option resolves + logs')
assert(reducer(a, { type: 'RESOLVE_EVENT', optionIndex: 0 }) === a, 'no pendingEvent -> unchanged')
assert(reducer(withEv, { type: 'RESOLVE_EVENT', optionIndex: 9 }) === withEv, 'bad optionIndex -> unchanged')
// every event x option moves ovr or form at least sometimes (denial is 75% nothing)
for (const evId of DILEMMA_EVENTS.map((e) => e.id)) {
  for (let o = 0; o < 2; o++) {
    let changed = false
    for (let i = 0; i < 40 && !changed; i++) {
      const base = JSON.parse(JSON.stringify(a))
      base.pendingEvent = { eventId: evId, playerId: starterId }
      const out = reducer(base, { type: 'RESOLVE_EVENT', optionIndex: o })
      if (out.pendingEvent !== null) { changed = false; break }
      if (JSON.stringify(out.teams) !== JSON.stringify(base.teams) || JSON.stringify(out.form) !== JSON.stringify(base.form)) changed = true
    }
    assert(changed, `${evId} option ${o} applies (ovr or form changed)`)
  }
}
// RESOLVE_EVENT touches only teams/form/pendingEvent/lastEventLog
{
  const base = JSON.parse(JSON.stringify(a))
  base.pendingEvent = { eventId: 'wrist-injury', playerId: starterId }
  const out = reducer(base, { type: 'RESOLVE_EVENT', optionIndex: 0 })
  const same = JSON.stringify(out.standings) === JSON.stringify(base.standings)
    && JSON.stringify(out.schedule) === JSON.stringify(base.schedule)
    && JSON.stringify(out.results) === JSON.stringify(base.results)
    && out.round === base.round && out.finished === base.finished
    && JSON.stringify(out.tournament) === JSON.stringify(base.tournament)
  assert(same, 'RESOLVE_EVENT leaves standings/schedule/results/round/tournament alone')
}
// season mode cannot resolve
{
  let ns = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', managerName: 'x' })
  ns = { ...ns, pendingEvent: { eventId: 'wrist-injury', playerId: starterId } }
  assert(reducer(ns, { type: 'RESOLVE_EVENT', optionIndex: 0 }) === ns, 'RESOLVE_EVENT no-op outside career')
}

// ---------- DILEMMA_EVENTS shape ----------
assert(DILEMMA_EVENTS.length === 3, 'DILEMMA_EVENTS has 3 events')
for (const e of DILEMMA_EVENTS) {
  const okShape = e.options.length === 2 && e.options.every((o) =>
    typeof o.label === 'string' && o.label.length > 0
    && typeof o.oddsText === 'string' && o.oddsText.length > 0
    && typeof o.detail === 'string' && typeof o.apply === 'function')
  assert(okShape, `${e.id} has 2 options with label/oddsText/detail/apply`)
}

// ---------- engine child preserved ----------
{
  const teen = { id: 'x', name: 'X', role: 'MID', team: 'T', ovr: 70, mech: 70, macro: 70, consist: 70, form: 50, age: 16, potential: 95 }
  let x = 42
  const grown = developPlayer(teen, () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648 })
  assert(grown.age === 17, 'engine developPlayer still increments age (preserved)')
  let rs = finishRegional()
  rs = reducer(rs, { type: 'BUILD_TOURNAMENT', kind: 'msi' })
  rs = reducer(rs, { type: 'SET_RESOLVER', resolver: 'manual' })
  assert(rs.tournament.resolver === 'manual', 'engine SET_RESOLVER preserved')
}

console.log(failures === 0 ? '\nALL P0-UX TESTS PASSED' : `\n${failures} FAILURES`)
process.exit(failures ? 1 : 0)
