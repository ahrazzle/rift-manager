import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { MAP_DISPLAY_KEY, readMapDisplay, DEFAULT_MAP_DISPLAY } from '../src/game/mapDisplay.js'
import { champPortrait } from '../src/game/draft.js'

const temp = await mkdtemp(new URL('./.map-display-', import.meta.url).pathname)
const values = new Map()
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) }
let tree
try {
  assert.ok(champPortrait('kaisa').endsWith('/Kaisa.png'), 'Kai’Sa uses Riot’s case-sensitive portrait filename')
  assert.ok(champPortrait('leblanc').endsWith('/Leblanc.png'), 'LeBlanc uses Riot’s case-sensitive portrait filename')
  await build({ entryPoints: ['src/components/AnimatedRift.jsx'], outfile: `${temp}/AnimatedRift.js`, bundle: true,
    format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic', loader: { '.webp': 'file' } })
  const { default: AnimatedRift } = await import(`${temp}/AnimatedRift.js`)
  const roles = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']
  const game = { durationMin: 30, game: 1, winner: 'A', events: [], goldTimeline: [],
    players: ['A', 'B'].flatMap(side => roles.map(role => ({ side, role, name: `${side}${role}` }))),
    picks: { A: { TOP: 'aatrox', JNG: 'elise', MID: 'ahri', BOT: 'ashe', SUP: 'bard' }, B: { TOP: 'camille' } } }
  const original = JSON.stringify(game)
  // Map display settings moved off the live screen (Guide › Settings writes the
  // same stored preference); the map reads it when a game starts, or takes an
  // explicit `display` prop.
  const props = { game, homeName: 'Home', awayName: 'Away', decision: true, initialTime: 10 }
  const mount = async (extra = {}) => act(async () => { tree = create(React.createElement(AnimatedRift, { ...props, ...extra })) })
  const remount = async (display) => { await act(async () => tree.unmount()); await mount({ display }) }
  const portraits = () => tree.root.findAllByType('image').filter(node => node.props.onError)
  const labels = () => tree.root.findAllByProps({ className: 'rift-player-label' }).map(n => n.children.join(''))
  await mount()
  assert.equal(tree.root.findAllByType('fieldset').length, 0, 'no display settings on the live screen')
  assert.equal(tree.root.findAllByProps({ 'aria-label': 'Names' }).length, 0)
  assert.ok(labels().includes('ATOP'))
  assert.equal(portraits().length, 6, 'only actual drafted champions receive portraits')
  await remount({ names: 'champions', portraits: 'champions' })
  assert.ok(labels().includes('Aatrox'))
  assert.ok(labels().includes('BMID'), 'missing draft data falls back to player identity')
  await remount({ names: 'both', portraits: 'champions' })
  assert.ok(labels().includes('ATOP · Aatrox'))
  await remount({ names: 'hidden', portraits: 'champions' })
  assert.equal(labels().length, 0)
  assert.equal(tree.root.findAllByProps({ className: 'rift-player' }).length, 10)
  const failed = portraits()[0]
  await act(async () => failed.props.onError())
  assert.equal(portraits().length, 5, 'failed portrait falls back to role icon')
  await remount({ names: 'hidden', portraits: 'players' })
  assert.equal(portraits().length, 0)
  assert.ok(tree.root.findAllByType('text').some(n => n.children.join('') === 'AT'), 'player initials are available')
  // The stored preference (written by Guide › Settings) drives the map.
  values.set(MAP_DISPLAY_KEY, JSON.stringify({ names: 'champions', portraits: 'roles' }))
  await act(async () => tree.unmount())
  await mount()
  assert.ok(labels().includes('Aatrox'), 'stored names preference is honoured')
  assert.equal(portraits().length, 0, 'stored role-icon preference is honoured')
  assert.ok(tree.root.findAllByType('svg').length > 1, 'role icons use the shared SVG icon set')
  assert.equal(JSON.stringify(game), original, 'display choices never modify match data')
  await act(async () => tree.update(React.createElement(AnimatedRift, { ...props, game: { ...game, blueSide: 'B' } })))
  const blueScore = tree.root.findByProps({ className: 'rift-score side-A sb-side sb-blue' })
  const redScore = tree.root.findByProps({ className: 'rift-score side-B sb-side sb-red' })
  assert.equal(blueScore.findByType('strong').children.join(''), 'Away', 'physical blue scoreboard follows side swap')
  assert.equal(redScore.findByType('strong').children.join(''), 'Home', 'physical red scoreboard follows side swap')
  assert.equal(tree.root.findAllByProps({ className: 'rift-impact-callout' }).length, 0, 'paused decision does not manufacture impacts')
  assert.equal(tree.root.findAll(n => typeof n.props.className === 'string' && n.props.className.startsWith('rift-impact-callout')).length, 0)
  values.set(MAP_DISPLAY_KEY, '{broken')
  assert.deepEqual(readMapDisplay(), DEFAULT_MAP_DISPLAY)
  globalThis.localStorage.getItem = () => { throw Error('Storage blocked') }
  globalThis.localStorage.setItem = () => { throw Error('Storage blocked') }
  assert.deepEqual(readMapDisplay(), DEFAULT_MAP_DISPLAY)
  await act(async () => tree.unmount())
  await mount()
  assert.ok(labels().includes('ATOP'), 'the map works without storage access (default display)')
  console.log('Map names, portraits, image failure and stored display preference checks pass')
} finally {
  if (tree) await act(async () => tree.unmount())
  delete globalThis.localStorage
  await rm(temp, { recursive: true, force: true })
}
