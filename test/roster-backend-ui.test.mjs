// Roster-backend production weave: the hook's reducer (not the legacy public
// one) stamps tenure, load() migrates old career saves once, the Squad/Season
// roster rows carry working Sell/Release controls with honest refusals, and
// the off-season report renders transfers, tenure morale and academy notes.
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { reducer, rosterBackend, load, mulberry32 } from '../src/game/useGameState.js'
import { writeSave } from '../src/game/persistence.js'
import { buildAcademyPlayer } from '../src/data/academy.js'
import { signingFee } from '../src/game/economy.js'

const temp = await mkdtemp(new URL('./.roster-backend-ui-', import.meta.url).pathname)
const textOf = (node) => (typeof node === 'string' ? node : (node.children || []).map(textOf).join(''))
const random = Math.random
const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
}
let tree
const render = (el) => act(async () => { if (tree) tree.update(el); else tree = create(el) })
try {
  Math.random = mulberry32(611)
  const bundle = async (entry) => {
    const out = `${temp}/${entry.replaceAll('/', '-')}.js`
    await build({ entryPoints: [`src/components/${entry}`], outfile: out, bundle: true, format: 'esm', platform: 'node',
      packages: 'external', jsx: 'automatic', loader: { '.webp': 'file' } })
    return import(out)
  }
  const { default: ManagedRoster } = await bundle('team/ManagedRoster.jsx')
  const { default: OffseasonReport } = await bundle('hub/OffseasonReport.jsx')
  const buttons = () => tree.root.findAllByType('button')
  const byLabel = (label) => buttons().find((b) => textOf(b) === label)
  const byAria = (label) => buttons().find((b) => b.props['aria-label'] === label)

  // ---- Production reducer: tenure stamps exist from career creation ----
  let career = rosterBackend.reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Mozi' })
  assert.ok(career.teams.T1.every((p) => p.joinedSeason === career.career.seasonIndex), 'START_CAREER stamps joinedSeason')
  const legacy = reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Mozi' })
  assert.ok(legacy.teams.T1.every((p) => p.joinedSeason === undefined), 'legacy public reducer stays unwrapped')

  // ---- load(): an old career save migrates once, then is stable ----
  const oldSave = JSON.parse(JSON.stringify(legacy))
  const oldProspect = buildAcademyPlayer('T1', 80)
  oldSave.pendingPromotion = { player: oldProspect, teamId: 'T1' }
  delete oldSave.academyByTeam
  delete oldSave.academyOfferSeasonByTeam
  delete oldSave.transferHistory
  writeSave(oldSave)
  const migrated = load()
  assert.ok(migrated.teams.T1.every((p) => p.joinedSeason === migrated.career.seasonIndex), 'load backfills joinedSeason to the current season')
  assert.deepEqual(migrated.pendingPromotion.prospectIds, [oldProspect.id], 'old single-player offer becomes a persisted prospect list')
  assert.equal(migrated.academyByTeam.T1[0].id, oldProspect.id)
  assert.deepEqual(migrated.transferHistory, [])
  writeSave(migrated)
  assert.deepEqual(load(), JSON.parse(JSON.stringify(migrated)), 'migration is one-time: second load is exact')

  // ---- Career roster rows: Sell + Release, starter release refused ----
  career = { ...career, finance: { budget: 5_000_000 } }
  const starterIds = new Set(Object.values(career.lineup))
  const bench = career.teams.T1.find((p) => !starterIds.has(p.id))
  const starter = career.teams.T1.find((p) => starterIds.has(p.id))
  assert.ok(bench && starter)
  await render(React.createElement(ManagedRoster, {
    state: career,
    dispatch: (a) => { career = rosterBackend.reducer(career, a) },
  }))
  assert.equal(byAria(`Release ${starter.name}`).props.disabled, true, 'starter release is disabled')
  assert.ok(textOf(tree.root).includes('Starters cannot be released'), 'the refusal reason is on the row')
  const budgetBefore = career.finance.budget
  await act(async () => byAria(`Sell ${bench.name}`).props.onClick())
  assert.ok(textOf(tree.root).includes(`Sell ${bench.name}?`), 'sell asks for confirmation first')
  assert.ok(textOf(tree.root).includes('leaves for free agency'), 'confirmation uses the honest free-agency copy')
  // ManagedRoster captured the pre-dialog state; re-render so confirm acts on it.
  await render(React.createElement(ManagedRoster, {
    state: career,
    dispatch: (a) => { career = rosterBackend.reducer(career, a) },
  }))
  await act(async () => byAria(`Sell ${bench.name}`).props.onClick())
  await act(async () => byLabel('Sell player').props.onClick())
  assert.ok(!career.teams.T1.some((p) => p.id === bench.id), 'sold player leaves the roster')
  assert.equal(career.faPool.find((p) => p.id === bench.id)?.morale, 60, 'sold player reaches free agency at morale 60')
  assert.equal(career.finance.budget, budgetBefore + Math.round(signingFee(bench) / 2), 'sale credits exactly half the signing fee')
  assert.equal(career.transferHistory.at(-1)?.type, 'PLAYER_SOLD')
  await act(async () => tree.unmount()); tree = null

  // If a sale becomes illegal while its confirmation is open, the confirm
  // button disables and the dialog shows the new reason (no dismiss-as-noop).
  let stale = { ...career }
  const staleStarterIds = new Set(Object.values(stale.lineup))
  const staleStarter = stale.teams.T1.find((p) => staleStarterIds.has(p.id)
    && stale.teams.T1.some((q) => q.id !== p.id && q.role === p.role && !staleStarterIds.has(q.id)))
  assert.ok(staleStarter, 'a starter with a bench replacement exists')
  await render(React.createElement(ManagedRoster, {
    state: stale,
    dispatch: (a) => { stale = rosterBackend.reducer(stale, a) },
  }))
  await act(async () => byAria(`Sell ${staleStarter.name}`).props.onClick())
  assert.ok(!byLabel('Sell player').props.disabled, 'confirm starts enabled')
  const noReplacement = {
    ...stale,
    teams: {
      ...stale.teams,
      T1: stale.teams.T1.filter((p) => p.id === staleStarter.id || p.role !== staleStarter.role),
    },
  }
  await render(React.createElement(ManagedRoster, {
    state: noReplacement,
    dispatch: (a) => { stale = rosterBackend.reducer(stale, a) },
  }))
  assert.equal(byLabel('Sell player').props.disabled, true, 'stale preview disables confirm')
  assert.ok(textOf(tree.root).includes('Keep at least one'), 'dialog shows the new refusal reason')
  await act(async () => tree.unmount()); tree = null

  // ---- Season roster rows: Release only, no Sell ----
  let season = rosterBackend.reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
  await render(React.createElement(ManagedRoster, {
    state: season,
    dispatch: (a) => { season = rosterBackend.reducer(season, a) },
  }))
  assert.equal(buttons().filter((b) => textOf(b) === 'Sell').length, 0, 'Season has no Sell control')
  assert.ok(buttons().some((b) => textOf(b) === 'Release'), 'Season keeps Release')
  assert.ok(textOf(tree.root).includes('Selling players is available only in Career'), 'Season explains the boundary')
  await act(async () => tree.unmount()); tree = null

  // ---- Off-season report: transfers, tenure morale, academy ----
  const report = {
    seasonIndexCompleted: 1, roster: [], lineupChanges: [], released: [], aiChurn: [],
    newFreeAgents: [], finance: null,
    transfers: {
      seasonIndex: 1, saleIncome: 346800,
      transactions: [{ type: 'PLAYER_SOLD', message: 'Bench Pro is listed and leaves for free agency. The club receives $346,800.' }],
    },
    morale: [{ type: 'morale', message: 'Veteran: settled after long service in the starting side (+2 morale).' }],
    academyPromotions: [{ type: 'ACADEMY_PROMOTED', message: 'Young Gun joins the main roster. Fringe Pro is released and becomes a free agent. No fee is received.' }],
  }
  await render(React.createElement(OffseasonReport, { report, dispatch: () => {} }))
  const reportText = textOf(tree.root)
  assert.ok(reportText.includes('Your transfers this split'))
  assert.ok(reportText.includes('Bench Pro is listed and leaves for free agency'))
  assert.ok(reportText.includes('already included in your budget'), 'sale income is reported, never paid twice')
  assert.ok(reportText.includes('Long-service morale') && reportText.includes('Veteran: settled'))
  assert.ok(reportText.includes('Young Gun joins the main roster'))
  console.log('roster-backend-ui: all passed')
} finally {
  if (tree) await act(async () => tree.unmount())
  Math.random = random
  delete globalThis.localStorage
  await rm(temp, { recursive: true, force: true })
}
