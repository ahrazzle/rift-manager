// About / Community surfaces: reachable from footer + New Game, never a main nav tab.
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { renderToString } from 'react-dom/server'
import { reducer } from '../src/game/useGameState.js'
import { SAVE_KEY } from '../src/game/persistence.js'
import { GITHUB_CONTRIBUTING, GITHUB_DISCUSSIONS, GITHUB_REPO, LIVE_PLAY_URL } from '../src/siteLinks.js'

assert.match(GITHUB_REPO, /ahrazzle\/rift-manager/)
assert.match(GITHUB_CONTRIBUTING, /CONTRIBUTING\.md/)
assert.match(GITHUB_DISCUSSIONS, /discussions/)
assert.match(LIVE_PLAY_URL, /rift\.askaconsult\.com/)

const temp = await mkdtemp(new URL('./.about-community-', import.meta.url).pathname)
const textOf = (node) => typeof node === 'string' ? node : (node.children || []).map(textOf).join('')
let tree
try {
  await build({
    entryPoints: [
      'src/components/AboutCommunity.jsx',
      'src/components/SiteFooter.jsx',
      'src/components/NewGame.jsx',
      'src/App.jsx',
    ],
    outdir: temp,
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    jsx: 'automatic',
    loader: { '.md': 'text', '.webp': 'file', '.svg': 'file' },
  })

  const { default: AboutCommunity } = await import(`${temp}/components/AboutCommunity.js`)
  const { default: SiteFooter } = await import(`${temp}/components/SiteFooter.js`)
  const { default: NewGame } = await import(`${temp}/components/NewGame.js`)
  const { default: App } = await import(`${temp}/App.js`)

  let closed = false
  await act(async () => {
    tree = create(React.createElement(AboutCommunity, { onClose() { closed = true } }))
  })
  const aboutText = textOf(tree.root)
  assert.match(aboutText, /About \/ Community/)
  assert.match(aboutText, /prepare → decide → watch → adjust/)
  assert.match(aboutText, /Season/)
  assert.match(aboutText, /Career/)
  assert.match(aboutText, /Scenario/)
  assert.match(aboutText, /Gauntlet/)
  assert.match(aboutText, /Draft \/ IGL/)
  assert.match(aboutText, /public repository/i)
  assert.doesNotMatch(aboutText, /open source/i)
  assert.match(aboutText, /Data Dragon/)
  assert.match(aboutText, /not building a chemistry meter/i)
  assert.match(aboutText, /Original champion icons/)
  assert.ok(aboutText.includes(GITHUB_REPO.replace(/^https:\/\//, '')) || aboutText.includes('github.com/ahrazzle/rift-manager'))
  await act(async () => tree.root.findAllByType('button').find((b) => /Close/.test(textOf(b))).props.onClick())
  assert.equal(closed, true)
  await act(async () => tree.unmount())
  tree = null

  let opened = 0
  await act(async () => {
    tree = create(React.createElement(SiteFooter, { onOpenAbout() { opened += 1 } }))
  })
  const footerText = textOf(tree.root)
  assert.match(footerText, /Help shape the game/)
  assert.match(footerText, /prepare, decide, watch, adjust/)
  assert.match(footerText, /Data Dragon/)
  assert.match(footerText, /Original champion icons/)
  assert.doesNotMatch(footerText, /open source/i)
  const aboutBtn = tree.root.findAllByType('button').find((b) => textOf(b).includes('About / Community'))
  assert.ok(aboutBtn, 'footer exposes About / Community button')
  await act(async () => aboutBtn.props.onClick())
  assert.equal(opened, 1)
  await act(async () => tree.unmount())
  tree = null

  const state = reducer(undefined, { type: 'RESET' })
  let newGameOpened = 0
  await act(async () => {
    tree = create(React.createElement(NewGame, {
      state,
      dispatch() {},
      onOpenAbout() { newGameOpened += 1 },
    }))
  })
  const entry = textOf(tree.root)
  assert.match(entry, /About \/ Community/)
  assert.doesNotMatch(entry, /open source/i)
  const entryBtn = tree.root.findAllByType('button').find((b) => textOf(b).includes('About / Community'))
  assert.ok(entryBtn)
  await act(async () => entryBtn.props.onClick())
  assert.equal(newGameOpened, 1)
  await act(async () => tree.unmount())
  tree = null

  // App new-game shell: footer About control present; About is not a season nav tab.
  globalThis.localStorage = { getItem: () => null }
  const markup = renderToString(React.createElement(App))
  assert.match(markup, /About \/ Community/)
  assert.match(markup, /Help shape the game/)
  assert.doesNotMatch(markup, /aria-label="Season navigation"[^>]*>[\s\S]*About \/ Community/)
  assert.doesNotMatch(markup, /open source/i)

  // In-season shell still has footer About, still no About tab.
  let live = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
  globalThis.localStorage = { getItem: (key) => key === SAVE_KEY ? JSON.stringify(live) : null }
  const liveMarkup = renderToString(React.createElement(App))
  assert.match(liveMarkup, /About \/ Community/)
  assert.match(liveMarkup, /aria-label="Season navigation"/)
  assert.doesNotMatch(liveMarkup, />About \/ Community<\/button>\s*<\/nav>/)
  assert.doesNotMatch(liveMarkup, /open source/i)

  console.log('About / Community footer + New Game surfaces and copy checks passed')
} finally {
  if (tree) await act(async () => tree.unmount())
  delete globalThis.localStorage
  await rm(temp, { recursive: true, force: true })
}
