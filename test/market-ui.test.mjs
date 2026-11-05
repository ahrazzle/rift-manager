import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { reducer } from '../src/game/useGameState.js'
import { signingFee, playerWage, fmtMoney } from '../src/game/economy.js'

const temp = await mkdtemp(new URL('./.market-ui-', import.meta.url).pathname)
const textOf = (node) => typeof node === 'string' ? node : (node.children || []).map(textOf).join('')
let tree
try {
  await build({ entryPoints: ['src/components/Market.jsx'], outfile: `${temp}/Market.js`,
    bundle: true, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic' })
  const { default: Market } = await import(`${temp}/Market.js`)
  let state = reducer(undefined, { type: 'NEW_GAME', teamId: 'T1' })
  const player = state.faPool[0]
  const fee = signingFee(player)
  const render = async () => act(async () => {
    const view = React.createElement(Market, { state, dispatch(action) { state = reducer(state, action) } })
    if (tree) tree.update(view)
    else tree = create(view)
  })
  state = { ...state, finance: { budget: fee - 1 }, faPool: [player] }
  await render()
  assert.equal(tree.root.findByType('button').props.disabled, true)
  assert.match(textOf(tree.root), /Insufficient budget/)
  assert.ok(textOf(tree.root).includes(`Signing fee: ${fmtMoney(fee)}`))
  assert.ok(textOf(tree.root).includes(`Annual wage: ${fmtMoney(playerWage(player))}`))
  const blocked = state
  assert.equal(reducer(state, { type: 'SIGN', playerId: player.id }), blocked, 'reducer still rejects unaffordable signings')

  // Exact affordability is allowed; the real reducer spends the budget and removes the card.
  state = { ...state, finance: { budget: fee } }
  await render()
  assert.equal(tree.root.findByType('button').props.disabled, false)
  await act(async () => tree.root.findByType('button').props.onClick())
  assert.equal(state.finance.budget, 0)
  assert.equal(state.lineup[player.role], player.id)
  await render()
  assert.match(textOf(tree.root), /No free agents available/)

  state = { ...blocked, finance: null }
  await render()
  assert.equal(tree.root.findByType('button').props.disabled, false, 'legacy saves without budgets retain signing access')
  console.log('Transfer market affordability and signing checks passed')
} finally {
  if (tree) await act(async () => tree.unmount())
  await rm(temp, { recursive: true, force: true })
}
