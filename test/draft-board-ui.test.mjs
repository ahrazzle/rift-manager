// Draft board (Broadcast Night Phase 4): render tests for the board states.
// The draft rules live in src/game/draft.js and are covered by draft.test.mjs;
// this suite pins what the restyled board shows and that each control still
// runs the same step as the role-first draft: ban/pick on one click, role
// first, flex, legal and illegal swaps with their explanation, Fearless lockout,
// the portrait -> ChampGlyph fallback, and the done state's Start game CTA.
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { createDraft } from '../src/game/draft.js'

const temp = await mkdtemp(new URL('./.draft-board-ui-', import.meta.url).pathname)
const textOf = (node) => (typeof node === 'string' ? node : (node.children || []).map(textOf).join(''))
const hasClass = (n, c) => typeof n.props?.className === 'string' && n.props.className.split(/\s+/).includes(c)

const teams = {
  BLUE: { id: 'T1', name: 'T1', lineup: { TOP: { name: 'Zeus' }, JNG: { name: 'Oner' }, MID: { name: 'Faker' }, BOT: { name: 'Gumayusi' }, SUP: { name: 'Keria' } } },
  RED: { id: 'GEN', name: 'Gen.G', lineup: { TOP: { name: 'Kiin' }, JNG: { name: 'Canyon' }, MID: { name: 'Chovy' }, BOT: { name: 'Ruler' }, SUP: { name: 'Duro' } } },
}
let tree
const BANS = { BLUE: ['aatrox', 'darius', 'fiora'], RED: ['gnar', 'garen', 'gwen'] }

try {
  await build({
    entryPoints: ['src/components/draft/DraftBoard.jsx', 'src/components/draft/ChampGlyph.jsx'],
    outdir: temp, bundle: true, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic',
  })
  const { default: DraftBoard } = await import(`${temp}/DraftBoard.js`)
  const { ChampArt, ChampGlyph, glyphHue, glyphMonogram } = await import(`${temp}/ChampGlyph.js`)

  const calls = []
  const handlers = {
    onBan: (id) => calls.push(['ban', id]),
    onPick: (id, role) => calls.push(['pick', id, role]),
    onPickFlex: (id) => calls.push(['flex', id]),
    onAssignFlex: (id, role) => calls.push(['assign', id, role]),
    onRearrange: (p) => calls.push(['rearrange', p]),
  }
  const render = async (draft, extra = {}) => {
    calls.length = 0
    if (tree) await act(async () => tree.unmount())
    await act(async () => {
      tree = create(React.createElement(DraftBoard, { draft, userSide: draft.userSide, teams, ...handlers, ...extra }))
    })
  }
  const banner = () => textOf(tree.root.find((n) => n.props?.id === 'draft-turn-title'))
  const tile = (id) => tree.root.find((n) => n.type === 'button' && n.props['data-champ'] === id)
  // Your desktop column slot (the mobile strip renders the same handler as .draft-cell).
  const slot = (side, role) => tree.root
    .find((n) => hasClass(n, 'draft-side') && hasClass(n, `side-${side.toLowerCase()}`))
    .find((n) => n.type === 'button' && hasClass(n, 'draft-slot') && String(n.props['aria-label']).includes(` ${role}`))
  const press = async (node) => act(async () => node.props.onClick())

  // ---------- Ban turn: banner, ribbon, one-click ban ----------
  await render(createDraft('BLUE'))
  assert.equal(banner(), 'Your ban · Ban 1 of 5')
  assert.equal(tree.root.findAll((n) => n.type === 'i' && n.parent && hasClass(n.parent, 'draft-ribbon')).length, 20, '20-step order ribbon')
  assert.ok(textOf(tree.root).includes('Remove a champion from the pool.'))
  assert.equal(tile('ahri').props.disabled, false)
  await press(tile('ahri'))
  assert.deepEqual(calls, [['ban', 'ahri']], 'a ban commits on click, no confirm step')

  // ---------- AI turn: "Their coach is deciding", pool disabled ----------
  await render({ ...createDraft('BLUE'), step: 1, bans: { BLUE: ['ahri'], RED: [] } })
  assert.equal(banner(), 'GEN banning · Ban 1 of 5')
  assert.ok(textOf(tree.root).includes('Their coach is deciding.'))
  assert.equal(tile('orianna').props.disabled, true)

  // ---------- Pick turn: role first, then one click commits to that role ----------
  const pickDraft = {
    ...createDraft('BLUE'), step: 10, bans: BANS,
    picks: { BLUE: { JNG: 'amumu' }, RED: { JNG: 'vi', MID: 'corki' } },
  }
  await render(pickDraft)
  assert.equal(banner(), 'Your pick · Pick 3 of 5')
  assert.ok(textOf(tree.root).includes('Open roles: TOP · MID · BOT · SUP. GEN have Vi + Corki.'))
  await press(slot('BLUE', 'MID'))
  assert.ok(textOf(tree.root).includes('Committing to MID'), 'choosing a role slot makes it the pick target')
  assert.ok(hasClass(slot('BLUE', 'MID'), 'is-active'), 'the target slot is highlighted in the side colour')
  assert.equal(tree.root.findAll((n) => n.type === 'button' && n.props['data-champ'] === 'leona').length, 0, 'the pool follows the target role')
  assert.equal(tile('corki').props.disabled, true)
  assert.ok(textOf(tile('corki')).includes('Picked') && textOf(tile('corki')).includes(', picked'), 'picked: on the tile and in the name')
  await press(tile('orianna'))
  assert.deepEqual(calls, [['pick', 'orianna', 'MID']])

  // ---------- Flex: a 2-role champion picked with no role goes to the flex list ----------
  await render(pickDraft)
  await press(tile('irelia'))
  assert.deepEqual(calls, [['flex', 'irelia']], 'no role chosen + two open roles = flex pick')

  // Assign a flex pick: "Assign role…" opens the detail bar; a role button assigns it.
  const flexDraft = { ...pickDraft, step: 11, flex: { BLUE: [{ champId: 'irelia', reservedRole: null }], RED: [] } }
  await render(flexDraft)
  const assignBtn = tree.root.findAll((n) => n.type === 'button' && textOf(n) === 'Assign role…')
  assert.ok(assignBtn.length >= 1, 'your flex pick has an Assign role control')
  await press(assignBtn[0])
  const bar = tree.root.find((n) => n.type === 'section' && hasClass(n, 'draft-act'))
  assert.ok(textOf(bar).includes('Assign Irelia'))
  const barRole = (role) => bar.find((n) => n.type === 'button' && hasClass(n, 'draft-act-role') && textOf(n).startsWith(role))
  assert.ok(hasClass(barRole('TOP'), 'is-ok') && hasClass(barRole('MID'), 'is-ok'))
  assert.ok(textOf(barRole('BOT')).includes("Can't play BOT"))
  assert.equal(tile('orianna').props.disabled, true, 'the pool is paused while a flex is being assigned')
  await press(barRole('TOP'))
  assert.deepEqual(calls, [['assign', 'irelia', 'TOP']])

  // ---------- Swaps: illegal explains why, legal dispatches the swap ----------
  const swapDraft = { ...pickDraft, step: 12, picks: { BLUE: { TOP: 'kennen', JNG: 'amumu', MID: 'jayce' }, RED: pickDraft.picks.RED } }
  await render(swapDraft)
  await press(slot('BLUE', 'TOP'))
  assert.ok(textOf(tree.root.find((n) => n.type === 'section' && hasClass(n, 'draft-act'))).includes('Move Kennen'))
  await press(slot('BLUE', 'JNG'))
  assert.deepEqual(calls, [], 'an illegal swap dispatches nothing')
  const status = tree.root.find((n) => n.props?.role === 'status')
  assert.equal(textOf(status), 'Kennen can’t play JNG', 'and explains why')
  await press(slot('BLUE', 'MID'))
  assert.deepEqual(calls, [['rearrange', { op: 'swap', roleA: 'TOP', roleB: 'MID' }]])
  // Moving into an open role it can't play explains too; into one it can, moves.
  await render(swapDraft)
  await press(slot('BLUE', 'JNG'))
  await press(slot('BLUE', 'BOT'))
  assert.equal(textOf(tree.root.find((n) => n.props?.role === 'status')), 'Amumu can’t play BOT')
  await press(slot('BLUE', 'SUP'))
  assert.deepEqual(calls, [['rearrange', { op: 'move', fromRole: 'JNG', toRole: 'SUP' }]])

  // ---------- Fearless: locked tiles are disabled with the state on the tile and in the name ----------
  await render({ ...createDraft('RED', { fearlessIds: ['orianna', 'vi'] }), step: 1, bans: { BLUE: ['ahri'], RED: [] } },
    { fearlessActive: true, fearlessCount: 2 })
  const fl = tile('orianna')
  assert.equal(fl.props.disabled, true, 'Fearless-locked even on a ban turn')
  assert.ok(textOf(fl).includes('Fearless'), 'state text on the tile')
  assert.ok(textOf(fl).includes('locked by Fearless, played earlier in this series'), 'and in the accessible name')
  assert.ok(textOf(tile('ahri')).includes('banned'), 'banned tiles say so too')
  assert.equal(tile('jinx').props.disabled, false)
  assert.ok(textOf(tree.root).includes('2 champions from earlier games are locked'))

  // ---------- Done: "Draft complete" + Start game N; disabled until flex is assigned ----------
  const full = { TOP: 'kennen', JNG: 'amumu', MID: 'orianna', BOT: 'jinx', SUP: 'leona' }
  const redFull = { TOP: 'jayce', JNG: 'vi', MID: 'corki', BOT: 'ezreal', SUP: 'nautilus' }
  let locked = 0
  await render({ ...pickDraft, step: 20, done: true, picks: { BLUE: full, RED: redFull } },
    { onLock: () => locked++, series: { gameNumber: 2, needWins: 2, label: 'LCK · Week 3' } })
  assert.equal(banner(), 'Draft complete')
  const start = tree.root.find((n) => n.type === 'button' && textOf(n) === 'Start game 2')
  assert.equal(start.props.disabled, false)
  await press(start)
  assert.equal(locked, 1)
  assert.ok(textOf(tree.root).includes('Comps are locked'))
  const { MID: _m, ...four } = full
  await render({ ...pickDraft, step: 20, done: true, picks: { BLUE: four, RED: redFull }, flex: { BLUE: [{ champId: 'irelia', reservedRole: null }], RED: [] } },
    { onLock: () => locked++ })
  assert.equal(banner(), 'Assign your flex picks')
  assert.equal(tree.root.find((n) => n.type === 'button' && textOf(n) === 'Start game 1').props.disabled, true)

  // ---------- ChampGlyph fallback ----------
  assert.equal(glyphMonogram("K'Sante"), 'Ks')
  assert.equal(glyphHue('ahri'), glyphHue('ahri'))
  assert.ok(glyphHue('ahri') >= 0 && glyphHue('ahri') < 360)
  await act(async () => tree.unmount())
  await act(async () => { tree = create(React.createElement(ChampArt, { champId: 'ahri' })) })
  const img = tree.root.findByType('img')
  assert.match(img.props.src, /ddragon\.leagueoflegends\.com\/cdn\/.+\/Ahri\.png$/, 'portraits stay')
  assert.equal(img.props.alt, '', 'decorative: the name is printed beside it')
  await act(async () => img.props.onError())
  assert.equal(tree.root.findAllByType('img').length, 0, 'a failed portrait falls back')
  assert.equal(textOf(tree.root.find((n) => hasClass(n, 'champ-glyph'))), 'Ah')
  await act(async () => tree.unmount())
  await act(async () => { tree = create(React.createElement(ChampArt, { champId: 'not-a-champion' })) })
  assert.ok(tree.root.find((n) => hasClass(n, 'champ-glyph')), 'missing portrait = glyph')
  await act(async () => { tree = create(React.createElement(ChampGlyph, { champId: 'ahri', size: 40 })) })
  assert.equal(tree.root.findByProps({ 'data-glyph': 'ahri' }).props['aria-hidden'], 'true')
  await act(async () => tree.unmount())
  tree = null

  console.log('Draft board: ban/pick turns, role-first, flex, swaps, Fearless, done state and glyph fallback pass')
} finally {
  if (tree) await act(async () => tree.unmount())
  await rm(temp, { recursive: true, force: true })
}
