// Transfers Near: offseason FA refresh + budget income, and the report panel.
// Reducer tests run the real ADVANCE_SEASON; the render test bundles App and
// checks the offseason panel shows the new free agents and the money lines.
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { reducer, mulberry32 } from '../src/game/useGameState.js'
import { STAGING_SAVE_KEY, SAVE_KEY } from '../src/game/persistence.js'

Math.random = mulberry32(4242)
let failures = 0
const check = (c, m) => { if (!c) { console.error('FAIL:', m); failures++ } else console.log('ok  :', m) }

function finishForAdvance() {
  let s = reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Transfers' })
  let guard = 0
  while (!s.finished && guard++ < 60) s = reducer(s, { type: 'PLAY_ROUND' })
  let pg = 0
  while (s.phase === 'playoffs' && s.tournament?.status === 'active' && pg++ < 10) {
    s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' })
  }
  return { ...s, board: { ...s.board, confidence: 100, expectation: 'Avoid last place' } }
}

// ---------- FA refresh ----------
const pre = finishForAdvance()
const prePoolIds = new Set(pre.faPool.map((p) => p.id))
const next = reducer(pre, { type: 'ADVANCE_SEASON' })
const rep = next.offseasonReport
check(rep != null, 'ADVANCE_SEASON sets offseasonReport')
check(Array.isArray(rep.newFreeAgents) && rep.newFreeAgents.length === 5, 'report lists 5 new free agents')
check(new Set(rep.newFreeAgents.map((p) => p.role)).size === 5, 'newcomers cover all 5 roles')
check(rep.newFreeAgents.every((p) => p.age >= 17 && p.age <= 19), 'newcomers are 17-19')
check(rep.newFreeAgents.every((p) => next.faPool.some((q) => q.id === p.id && q.team === 'FA')), 'newcomers sit in the pool as FA')
check(rep.newFreeAgents.every((p) => !prePoolIds.has(p.id)), 'newcomer ids are new to the pool')
check(rep.newFreeAgents.every((p) => next.faPool.some((q) => q.id === p.id)), 'newcomers land in faPool')
check(next.faPool.length <= 20, 'faPool capped at 20 after refresh')

// Second advance: fresh ids, no collision with the first batch.
const second = reducer(
  {
    ...next,
    finished: true,
    pendingEvent: null,
    pendingPromotion: null,
    board: { ...next.board, confidence: 100, expectation: 'Avoid last place' },
  },
  { type: 'ADVANCE_SEASON' },
)
const secondIds = new Set(second.offseasonReport.newFreeAgents.map((p) => p.id))
check(second.offseasonReport.newFreeAgents.length === 5, 'second advance adds 5 more')
check(
  [...secondIds].every((id) => !rep.newFreeAgents.some((p) => p.id === id)),
  'second batch ids differ from first batch',
)
check(second.faPool.length <= 20, 'faPool still capped at 20 after second refresh')

// Forced cap: 25 weak FAs + 5 newcomers = 30 -> 20, newcomers survive.
const weakPool = Array.from({ length: 25 }, (_, i) => ({
  ...pre.faPool[i % pre.faPool.length],
  id: `FA-test-${i}`,
  ovr: 50 + (i % 10),
}))
const capped = reducer({ ...pre, faPool: weakPool }, { type: 'ADVANCE_SEASON' })
check(capped.faPool.length === 20, 'oversized pool trims to exactly 20')
check(
  capped.offseasonReport.newFreeAgents.every((p) => capped.faPool.some((q) => q.id === p.id)),
  'newcomers survive the trim (stronger than the weak pool)',
)

// Full pool: 20 elite FAs — trim must evict veterans, not drop newcomers from the pool.
const elitePool = Array.from({ length: 20 }, (_, i) => ({
  ...pre.faPool[i % pre.faPool.length],
  id: `FA-elite-${i}`,
  ovr: 95 - (i % 5),
}))
const fullElite = reducer({ ...pre, faPool: elitePool }, { type: 'ADVANCE_SEASON' })
check(fullElite.faPool.length === 20, 'elite full pool trims to exactly 20')
check(fullElite.offseasonReport.newFreeAgents.length === 5, 'elite trim still reports 5 newcomers')
check(
  fullElite.offseasonReport.newFreeAgents.every((p) => fullElite.faPool.some((q) => q.id === p.id)),
  'all reported newcomers stay in faPool when pool was already full',
)
check(
  elitePool.some((p) => !fullElite.faPool.some((q) => q.id === p.id)),
  'elite trim drops weakest veterans to make room',
)

// ---------- Budget income ----------
check(rep.finance != null, 'report carries a finance summary')
check(rep.finance.sponsorship === 90 * 6000, 'sponsorship scales with tier (T1 tier 90)')
check(rep.finance.income === rep.finance.sponsorship + rep.finance.prize, 'income = sponsorship + prize')
check(rep.finance.wages > 0, 'wage bill reported')
check(rep.finance.renewals >= 0, 'renewal fees reported')
check(
  rep.finance.budgetAfter
    === rep.finance.budgetBefore - rep.finance.wages - rep.finance.renewals + rep.finance.income,
  'budgetAfter = budgetBefore - wages - renewals + income',
)
check(next.finance.budget === rep.finance.budgetAfter, 'state budget matches report budgetAfter')

// Champion earns the top prize; a non-champion earns less.
const champ = reducer({ ...pre, playoffChampionId: 'T1' }, { type: 'ADVANCE_SEASON' })
check(champ.offseasonReport.finance.prize === 400000, 'champion prize is $400K')
const alsoRan = reducer({ ...pre, playoffChampionId: 'GEN' }, { type: 'ADVANCE_SEASON' })
check(
  alsoRan.offseasonReport.finance.prize < 400000,
  'non-champion prize is below the champion prize',
)
check(
  champ.offseasonReport.finance.income > alsoRan.offseasonReport.finance.income,
  'champion income beats non-champion income',
)

// Last place earns no prize.
const lastStandings = {}
for (const [tid, row] of Object.entries(pre.standings)) {
  lastStandings[tid] = { ...row, points: tid === 'T1' ? 0 : 10, gameWins: tid === 'T1' ? 0 : 5, gameLosses: 0 }
}
const last = reducer(
  { ...pre, standings: lastStandings, playoffChampionId: 'GEN', playoffFinalist: false },
  { type: 'ADVANCE_SEASON' },
)
check(last.offseasonReport.finance.prize === 0, 'last place earns no prize')

// ---------- Panel renders the refresh + money ----------
const temp = await mkdtemp(new URL('./.transfers-offseason-', import.meta.url).pathname)
const storage = new Map([[SAVE_KEY, 'live save must remain untouched']])
const textOf = (node) => typeof node === 'string' ? node : (node.children || []).map(textOf).join('')
let tree
try {
  await build({
    entryPoints: ['src/App.jsx'], outdir: temp, bundle: true, format: 'esm',
    platform: 'node', packages: 'external', jsx: 'automatic', loader: { '.md': 'text', '.webp': 'file' },
  })
  const { default: App } = await import(`${temp}/App.js`)
  globalThis.window = { location: { hostname: 'lolsim.askaconsult.com', pathname: '/staging/' } }
  globalThis.document = { activeElement: { isConnected: true, focus() {} } }
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => { storage.set(key, value) },
  }
  const shown = { ...next, pendingEvent: null, press: { pending: false } }
  storage.set(STAGING_SAVE_KEY, JSON.stringify(shown))
  await act(async () => {
    tree = create(React.createElement(App), {
      createNodeMock: (element) => element.type === 'dialog' ? { showModal() {}, close() {} } : null,
    })
  })
  const text = textOf(tree.root)
  check(text.includes('New free agents'), 'panel shows New free agents section')
  check(text.includes('Sponsorship'), 'panel shows Sponsorship line')
  check(text.includes('Budget'), 'panel shows Budget before/after line')
  check(text.includes(rep.newFreeAgents[0].name), 'panel names a new free agent')
  check(storage.get(SAVE_KEY) === 'live save must remain untouched', 'render does not touch the live save')
} finally {
  await rm(temp, { recursive: true, force: true })
}

if (failures > 0) { console.error(`${failures} FAILURE(S)`); process.exit(1) }
console.log('transfers-offseason: all passed')
