// Development visibility: growthOutlook purity + offseason report capture.
import { growthOutlook, developPlayer } from '../src/data/development.js'
import { reducer, load, mulberry32 } from '../src/game/useGameState.js'

Math.random = mulberry32(909)
let failures = 0
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); failures++ } else console.log('ok  :', m) }

// ---------- growthOutlook purity ----------
const teen = { age: 17, ovr: 72, potential: 92 }
assert(growthOutlook(teen) === 'rising', 'young headroom → rising')
assert(growthOutlook({ age: 23, ovr: 80, potential: 95 }) === 'steady', 'mid band → steady')
assert(growthOutlook({ age: 32, ovr: 82, potential: 90 }) === 'declining', 'veteran band → declining')
assert(growthOutlook({ age: 24, ovr: 88, potential: 88 }) === 'at ceiling', 'ovr at potential → at ceiling')
assert(growthOutlook(teen) === growthOutlook({ ...teen }), 'growthOutlook is pure (repeatable)')

// ---------- load backfill ----------
globalThis.localStorage = {
  _v: JSON.stringify({ version: 1, mode: 'season', teams: {}, faPool: [] }),
  getItem() { return this._v },
  setItem(k, v) { this._v = v },
}
const loaded = load()
assert(loaded.offseasonReport === null, 'load() backfills missing offseasonReport → null')
delete globalThis.localStorage

// ---------- ADVANCE captures report ----------
function finishForAdvance() {
  let s = reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'DevVis' })
  let guard = 0
  while (!s.finished && guard++ < 60) s = reducer(s, { type: 'PLAY_ROUND' })
  let pg = 0
  while (s.phase === 'playoffs' && s.tournament?.status === 'active' && pg++ < 10) {
    s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
  }
  return { ...s, board: { ...s.board, confidence: 100, expectation: 'Avoid last place' } }
}

const pre = finishForAdvance()
const preManaged = pre.teams[pre.teamId]
const next = reducer(pre, { type: 'ADVANCE_SEASON' })
assert(next.offseasonReport != null, 'ADVANCE_SEASON sets offseasonReport')
const rep = next.offseasonReport
assert(rep.seasonIndexCompleted === pre.career.seasonIndex, 'report seasonIndexCompleted matches ended season')
assert(Array.isArray(rep.roster) && rep.roster.length === preManaged.length, 'report roster covers managed team')
for (const row of rep.roster) {
  const before = preManaged.find((p) => p.id === row.id)
  assert(before, `roster row ${row.id} matches pre-advance player`)
  assert(row.ageAfter === row.ageBefore + 1, `${row.name} age +1`)
  assert(row.potential === before.potential, `${row.name} potential unchanged in report`)
  assert(typeof row.atCeiling === 'boolean', `${row.name} atCeiling boolean`)
  if (row.oswSpike != null) {
    const trait = before.traits?.find((t) => (typeof t === 'string' ? t : t.id) === 'one_season_wonder')
    const wasHidden = !trait || (typeof trait === 'object' && !trait.revealed)
    assert(!wasHidden || row.oswSpike === null, 'hidden OSW not reported as spike')
  }
}
assert(Array.isArray(rep.lineupChanges) && Array.isArray(rep.released) && Array.isArray(rep.aiChurn), 'report arrays present')

// dismiss + next advance replaces
const dismissed = reducer(next, { type: 'DISMISS_OFFSEASON_REPORT' })
assert(dismissed.offseasonReport === null, 'DISMISS_OFFSEASON_REPORT clears panel')
assert(reducer(dismissed, { type: 'DISMISS_OFFSEASON_REPORT' }) === dismissed, 'dismiss no-op when null')

// sacked advance leaves no report (spread state must not attach a new report)
const careerBare = reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Sack' })
const fired = reducer(
  { ...careerBare, finished: true, board: { confidence: 1, expectation: 'Win the title' } },
  { type: 'ADVANCE_SEASON' },
)
assert(fired.sacked === true, 'low confidence advance sacks')
assert(fired.offseasonReport == null, 'sacked ADVANCE omits offseasonReport')

if (failures > 0) { console.error(`${failures} FAILURE(S)`); process.exit(1) }
console.log('development-visibility: all passed')
