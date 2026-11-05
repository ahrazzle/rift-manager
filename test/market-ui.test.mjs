import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { reducer } from '../src/game/useGameState.js'
import { signingFee, playerWage, fmtMoney, fmtMoneyExact } from '../src/game/economy.js'

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
  // #28: one dollar short must not read as affordable. The rounded budget
  // label and the exact fee must differ, and the card states the shortfall.
  assert.equal(fmtMoney(0), '$0', 'zero budget never reads as $0K')
  assert.notEqual(fmtMoney(fee - 1), fmtMoneyExact(fee), 'test data really collides when rounded')
  state = { ...state, finance: { budget: fee - 1 }, faPool: [player] }
  await render()
  assert.equal(tree.root.findByType('button').props.disabled, true)
  assert.match(textOf(tree.root), /Insufficient budget/)
  assert.ok(textOf(tree.root).includes(`Transfer budget: ${fmtMoney(fee - 1)}`))
  assert.ok(textOf(tree.root).includes(`Signing fee: ${fmtMoneyExact(fee)}`))
  assert.ok(textOf(tree.root).includes(`Annual wage: ${fmtMoneyExact(playerWage(player))}`))
  assert.ok(textOf(tree.root).includes('Short by $1'))
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

  // Zero budget reads "$0", never "$0K", and the shortfall is exact.
  state = { ...blocked, finance: { budget: 0 } }
  await render()
  assert.equal(tree.root.findByType('button').props.disabled, true)
  assert.ok(textOf(tree.root).includes('Transfer budget: $0'))
  assert.ok(!textOf(tree.root).includes('$0K'))
  assert.ok(textOf(tree.root).includes(`Short by ${fmtMoneyExact(fee)}`))

  state = { ...blocked, finance: null }
  await render()
  assert.equal(tree.root.findByType('button').props.disabled, false, 'legacy saves without budgets retain signing access')
  console.log('Transfer market affordability and signing checks passed')
} finally {
  if (tree) await act(async () => tree.unmount())
  await rm(temp, { recursive: true, force: true })
}
