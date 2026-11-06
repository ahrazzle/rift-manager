// Matchday broadcast: render tests for the Scorebug, DecisionDialog and the
// pure feed/series helpers. Run: node test/match-broadcast-ui.test.mjs
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { IGL_CALLS } from '../src/game/igl.js'

const temp = await mkdtemp(new URL('./.match-broadcast-ui-', import.meta.url).pathname)
const text = (node) => (typeof node === 'string' ? node : (node.children || []).map(text).join(''))
const byClass = (root, cls) => root.findAll((n) => typeof n.props?.className === 'string' && n.props.className.split(' ').includes(cls))
let tree
try {
  await build({
    entryPoints: ['src/components/match/Scorebug.jsx', 'src/components/match/DecisionDialog.jsx', 'src/components/match/matchModel.js'],
    outdir: temp, bundle: true, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic', loader: { '.webp': 'file' },
  })
  const { default: Scorebug } = await import(`${temp}/Scorebug.js`)
  const { default: DecisionDialog } = await import(`${temp}/DecisionDialog.js`)
  const model = await import(`${temp}/matchModel.js`)

  // ---------- helpers ----------
  assert.equal(model.seriesState({ homeShort: 'T1', awayShort: 'GEN', homeWins: 1, awayWins: 0, needWins: 2 }), 'T1 leads 1–0')
  assert.equal(model.seriesState({ homeShort: 'T1', awayShort: 'GEN', homeWins: 1, awayWins: 1, needWins: 2 }), 'Series tied 1–1')
  assert.equal(model.seriesState({ homeShort: 'T1', awayShort: 'GEN', homeWins: 0, awayWins: 2, needWins: 2 }), 'GEN wins 2–0')
  assert.equal(model.clockLabel(18.72), '18:43')
  assert.deepEqual(model.goldLead({ blueSide: 'A' }, 2400), { side: 'blue', pct: 12 }, 'blue lead grows left from the centre')
  assert.deepEqual(model.goldLead({ blueSide: 'B' }, 2400), { side: 'red', pct: 12 }, 'home on red: the lead belongs to the red side')
  assert.deepEqual(model.goldLead({ blueSide: 'A' }, -25000), { side: 'red', pct: 50 }, 'capped at half the track')
  assert.deepEqual(model.goldLead({ blueSide: 'A' }, 50), { side: null, pct: 0 })
  assert.equal(model.decisionContext('No team has dragon control yet. kills are even at 2-3. Make the call, coach. Around the 14-minute mark?'),
    'No team has dragon control yet. Kills are even at 2–3.')
  const game = { blueSide: 'A', players: [{ name: 'Faker', side: 'A', role: 'MID' }], picks: { A: { MID: 'ahri' } } }
  const events = [
    { t: 3, type: 'kill', side: 'A', killer: 'Faker', victim: 'Chovy' },
    { t: 9, type: 'tower', side: 'B' },
    { t: 12, type: 'dragon', side: 'A' },
  ]
  const names = (s) => (s === 'A' ? 'T1' : 'GEN')
  const feed = model.feedItems(events, game, names, [{ key: 'call', t: 10, side: 'blue', actor: 'Your call', text: 'Play for dragons.', pin: true }])
  assert.deepEqual(feed.map((i) => i.t), [12, 10, 9, 3], 'newest first, the IGL call merged by time')
  assert.equal(feed[3].actor, 'Faker')
  assert.equal(feed[3].detail, '(Ahri)', 'champion shown beside the actor after a draft')
  assert.match(feed[3].text, /first blood on Chovy/)
  assert.equal(feed[2].side, 'red')
  assert.equal(feed[0].text, 'secure the 1st dragon')

  // ---------- Scorebug ----------
  const sides = {
    blue: { id: 'T1', name: 'T1', short: 'T1', kills: 9, towers: 4, seriesWins: 1 },
    red: { id: 'GEN', name: 'Gen.G', short: 'GEN', kills: 5, towers: 2, seriesWins: 0 },
  }
  await act(async () => {
    tree = create(React.createElement(Scorebug, { sides, time: 18.72, gameNumber: 2, series: 'T1 leads 1–0', goldDiffA: 2400, leader: 'T1', game: { blueSide: 'A' } }))
  })
  const bug = tree.root.findByProps({ 'aria-label': 'Scoreboard' })
  assert.equal(bug.type, 'section')
  const blue = byClass(tree.root, 'sb-blue')[0]
  const red = byClass(tree.root, 'sb-red')[0]
  assert.equal(text(blue.findByType('strong')), 'T1')
  assert.equal(text(red.findByType('strong')), 'GEN')
  assert.match(text(blue), /Blue.*Series 1/, 'side given in text, not colour only')
  assert.match(text(red), /Red.*Series 0/)
  assert.match(text(blue), /9 kills/)
  assert.equal(byClass(blue, 'team-crest').length, 1, 'crest, not a text name only')
  assert.match(text(bug), /Game 2/)
  assert.match(text(bug), /18:43/)
  assert.match(text(bug), /T1 leads 1–0/)
  assert.match(text(bug), /T1 \+2\.4k gold/)
  assert.match(text(bug), /Towers 4–2/)
  assert.equal(byClass(tree.root, 'sb-goldbar')[0].props['aria-hidden'], 'true', 'the bar is decorative; the number is text')
  const fill = byClass(tree.root, 'sb-goldbar')[0].findByType('i')
  assert.equal(fill.props.className, 'sb-gold-blue')
  assert.deepEqual(fill.props.style, { width: '12%', right: '50%' })
  await act(async () => tree.update(React.createElement(Scorebug, { sides, time: 1, gameNumber: 1, series: 'Series 0–0', goldDiffA: 40, leader: 'T1', game: { blueSide: 'A' } })))
  assert.match(text(tree.root), /Gold even/)
  await act(async () => tree.unmount())

  // ---------- DecisionDialog ----------
  const chosen = []
  let delegated = 0
  let closed = 0
  const prompt = { context: 'Enemy has taken 2 dragons. your team is down 3 kills. Make the call, coach. Around the 14-minute mark, what is the gameplan?', options: IGL_CALLS }
  const dialog = (extra = {}) =>
    React.createElement(DecisionDialog, {
      prompt, clock: '14:00', gameNumber: 2, iglName: 'Keria',
      onChoose: (id) => chosen.push(id), onDelegate: () => delegated++, onClose: () => closed++, ...extra,
    })
  await act(async () => { tree = create(dialog()) })
  const panel = tree.root.findByProps({ role: 'dialog' })
  assert.equal(panel.props['aria-modal'], 'true')
  assert.ok(panel.props.className.includes('igl-decision'), 'walkthrough tip finds the decision panel')
  assert.match(text(panel), /Tactical pause\. How do we play it\?/)
  assert.ok(tree.root.findAll((n) => n.props['data-tour'] === 'tour-igl-decision').length === 1, 'IGL tip anchor')
  assert.match(text(panel), /Enemy has taken 2 dragons\. Your team is down 3 kills\./, 'one line of context, no prompt boilerplate')
  assert.match(text(panel), /IGL call · Game 2 · 14:00/)
  const grid = byClass(tree.root, 'igl-call-grid')
  assert.equal(grid.length, 1, 'the call grid keeps its class for the tutorial guard')
  const options = tree.root.findAllByType('button').filter((b) => b.props.className === 'igl-call-option')
  assert.equal(options.length, IGL_CALLS.length, 'every engine call is offered')
  assert.match(text(options[0]), /Play for dragons/)
  assert.match(text(options[0]), /Even game/, 'scannable when-it-pays tag')
  assert.match(text(options[0]), /Stronger when even/, 'one-sentence trade-off')
  assert.ok(!/Denying soul/.test(text(options[0])), 'only the first sentence of the trade-off')
  assert.match(text(panel), /No timer\./)
  assert.match(text(panel), /ratings, form and tactics/, 'which ratings drive the odds')
  const bars = tree.root.findAll((n) => n.props.className === 'rr-bars')
  assert.deepEqual(bars.map((b) => b.props['aria-label']), ['3 of 3', '1 of 3'])
  assert.deepEqual(bars.map((b) => b.findAllByType('i').filter((i) => i.props.className === 'on').length), [3, 1], 'risk/reward carried by filled shape')
  await act(async () => options[3].props.onClick())
  assert.deepEqual(chosen, [IGL_CALLS[3].id])
  const delegate = tree.root.findAllByType('button').find((b) => text(b) === 'Let Keria decide')
  assert.ok(delegate, 'escape hatch names the shotcaller')
  await act(async () => delegate.props.onClick())
  assert.equal(delegated, 1)
  const close = tree.root.findAllByType('button').find((b) => b.props['aria-label'] === 'Close')
  assert.ok(close, 'dismissible by default (Esc and Close)')
  await act(async () => close.props.onClick())
  assert.equal(closed, 1)
  await act(async () => tree.update(dialog({ holdOpen: true, withTip: true })))
  assert.equal(tree.root.findAllByType('button').find((b) => b.props['aria-label'] === 'Close'), undefined, 'held open while the walkthrough tip points at it')
  assert.ok(tree.root.findByProps({ role: 'dialog' }).props.className.includes('has-tip'))
  await act(async () => tree.unmount())
  tree = null

  console.log('Scorebug, DecisionDialog and play-by-play helpers render and behave')
} finally {
  if (tree) await act(async () => tree.unmount())
  await rm(temp, { recursive: true, force: true })
}
