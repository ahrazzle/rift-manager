// Server rendering catches app integration failures with real persisted state;
// native dialog focus trapping/Escape still need browser verification.
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { reducer } from '../src/game/useGameState.js'
import { SAVE_KEY } from '../src/game/persistence.js'

const temp = await mkdtemp(new URL('./.app-safety-', import.meta.url).pathname)
const previousRandom = Math.random
try {
  await build({ entryPoints: ['src/App.jsx', 'src/components/ConfirmDialog.jsx'],
    outdir: temp, bundle: true, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic', loader: { '.md': 'text', '.webp': 'file' } })
  const { default: App } = await import(`${temp}/App.js`)
  const { default: ConfirmDialog } = await import(`${temp}/components/ConfirmDialog.js`)
  Math.random = () => 0.42
  let state = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
  while (!state.finished) state = reducer(state, { type: 'PLAY_ROUND' })
  assert.equal(state.tournament.kind, 'playoffs')
  globalThis.localStorage = { getItem: (key) => key === SAVE_KEY ? JSON.stringify(state) : null }
  const markup = renderToString(React.createElement(App))
  // Shell: the phase track marks Playoffs as current; the bracket lives under Compete.
  assert.match(markup, /<li class="is-now" aria-current="step">[^<]*<span class="dot"[^>]*><\/span>Playoffs/)
  assert.match(markup, /<li class="is-done">[^<]*<span class="dot"[^>]*><\/span>Regional/)
  assert.match(markup, /aria-label="Main"/)
  for (const label of ['Hub', 'Team', 'Compete', 'Club', 'Guide']) assert.match(markup, new RegExp(`<span>${label}</span></button>`))
  assert.doesNotMatch(markup, /Week 9 of 9|Week 10/, 'no clamped week label after the regular season')
  const dialog = renderToString(React.createElement(ConfirmDialog, {
    title: 'Start a new game?', confirmLabel: 'Start new game', onConfirm() {}, onCancel() {},
  }, 'Your progress will be lost.'))
  assert.match(dialog, /<dialog[^>]*aria-labelledby="[^"]+"[^>]*aria-describedby="[^"]+"/)
  assert.match(dialog, /autofocus=""[^>]*>Keep playing<\/button>/)
  assert.match(dialog, />Start new game<\/button>/)
  globalThis.localStorage = { getItem: () => '{broken' }
  const recovery = renderToString(React.createElement(App))
  assert.match(recovery, /Your saved game could not be loaded/)
  assert.match(recovery, />Retry loading<\/button>/)
  assert.match(recovery, />Replace saved game<\/button>/)
  assert.doesNotMatch(recovery, />Retry saving<\/button>/)
  console.log('App safety rendering checks passed')
} finally {
  Math.random = previousRandom
  delete globalThis.localStorage
  await rm(temp, { recursive: true, force: true })
}
