// Exercise the JSX routing boundary and render its actual Dashboard subtree.
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { reducer } from '../src/game/useGameState.js'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { default: ModesDashboard } = await server.ssrLoadModule('/src/components/ModesDashboard.jsx')
  for (const mode of ['draft', 'igl']) {
    const state = { ...reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', mode }), finished: true, phase: 'done' }
    const visited = []
    const setTab = (tab) => visited.push(tab)
    const tree = ModesDashboard({ state, dispatch: () => {}, setTab, totalRounds: state.totalRounds })
    const dashboard = React.Children.toArray(tree.props.children).find(child => typeof child.type === 'function')
    assert.equal(dashboard.props.setTab, setTab)
    assert.equal(dashboard.props.totalRounds, state.totalRounds)
    dashboard.props.setTab('results')
    assert.deepEqual(visited, ['results'])
    assert(renderToStaticMarkup(tree).length > 100)
  }
  console.log('draft/IGL finished Dashboard renders and preserves navigation callback')
} finally {
  await server.close()
}
