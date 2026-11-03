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
    format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic' })
  const { default: AnimatedRift } = await import(`${temp}/AnimatedRift.js`)
  const roles = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']
  const game = { durationMin: 30, game: 1, winner: 'A', events: [], goldTimeline: [],
    players: ['A', 'B'].flatMap(side => roles.map(role => ({ side, role, name: `${side}${role}` }))),
    picks: { A: { TOP: 'aatrox', JNG: 'elise', MID: 'ahri', BOT: 'ashe', SUP: 'bard' }, B: { TOP: 'camille' } } }
  const original = JSON.stringify(game)
  const props = { game, homeName: 'Home', awayName: 'Away', decision: true, initialTime: 10 }
  const mount = async () => act(async () => { tree = create(React.createElement(AnimatedRift, props)) })
  const select = label => tree.root.findAllByType('label').find(n => n.children[0] === `${label} `).findByType('select')
  const change = async (label, value) => act(async () => select(label).props.onChange({ target: { value } }))
  const labels = () => tree.root.findAllByProps({ className: 'rift-player-label' }).map(n => n.children.join(''))
  await mount()
  assert.ok(labels().includes('ATOP'))
  assert.equal(tree.root.findAllByType('image').length, 6, 'only actual drafted champions receive portraits')
  await change('Names', 'champions')
  assert.ok(labels().includes('Aatrox'))
  assert.ok(labels().includes('BMID'), 'missing draft data falls back to player identity')
  await change('Names', 'both')
  assert.ok(labels().includes('ATOP · Aatrox'))
  await change('Names', 'hidden')
  assert.equal(labels().length, 0)
  assert.equal(tree.root.findAllByProps({ className: 'rift-player' }).length, 10)
  const failed = tree.root.findAllByType('image')[0]
  await act(async () => failed.props.onError())
  assert.equal(tree.root.findAllByType('image').length, 5, 'failed portrait falls back to role icon')
  await change('Portraits', 'players')
  assert.equal(tree.root.findAllByType('image').length, 0)
  assert.ok(tree.root.findAllByType('text').some(n => n.children.join('') === 'AT'), 'player initials are available')
  assert.deepEqual(JSON.parse(values.get(MAP_DISPLAY_KEY)), { names: 'hidden', portraits: 'players' })
  await act(async () => tree.unmount())
  await mount()
  assert.equal(select('Names').props.value, 'hidden', 'settings survive remounts')
  assert.equal(select('Portraits').props.value, 'players')
  await change('Portraits', 'roles')
  assert.ok(tree.root.findAllByType('text').some(n => n.children.join('') === '◆'))
  assert.equal(JSON.stringify(game), original, 'display choices never modify match data')
  values.set(MAP_DISPLAY_KEY, '{broken')
  assert.deepEqual(readMapDisplay(), DEFAULT_MAP_DISPLAY)
  globalThis.localStorage.getItem = () => { throw Error('Storage blocked') }
  globalThis.localStorage.setItem = () => { throw Error('Storage blocked') }
  assert.deepEqual(readMapDisplay(), DEFAULT_MAP_DISPLAY)
  await change('Names', 'players')
  assert.ok(labels().includes('ATOP'), 'controls work without storage access')
  console.log('Map names, portraits, image failure and preference persistence checks pass')
} finally {
  if (tree) await act(async () => tree.unmount())
  delete globalThis.localStorage
  await rm(temp, { recursive: true, force: true })
}
