import { useState } from 'react'
import { ROLES, ROLE_LABEL } from '../data/lck.js'
import { canAfford, fmtMoney, fmtMoneyExact, signingFee } from '../game/economy.js'
import { Card, EmptyState, Seg, Button } from './ui/index.js'
import PlayerList from './team/PlayerList.jsx'

export default function Market({ state, dispatch }) {
  const budget = state.finance?.budget
  const [role, setRole] = useState('ALL')
  if (state.faPool.length === 0) {
    return (
      <Card title="Transfer market">
        <p className="opt-hint">No free agents available right now.</p>
      </Card>
    )
  }
  const shown = role === 'ALL' ? state.faPool : state.faPool.filter((p) => p.role === role)
  const affordable = (p) => budget == null || canAfford(budget, signingFee(p))
  const roleItems = [{ id: 'ALL', label: 'All' }, ...ROLES.map((r) => ({ id: r, label: ROLE_LABEL[r] }))]

  return (
    <Card
      title="Transfer market: free agents"
      action={budget != null ? <p className="mk-budget">Transfer budget: <strong className="num">{fmtMoney(budget)}</strong></p> : null}
    >
      <p className="opt-lede">
        Sign a free agent to add them to your roster (they become the starter in their role).
      </p>
      <div className="mk-filter">
        <Seg name="market-role" label="Filter by role" items={roleItems} value={role} onChange={setRole} className="team-seg" />
      </div>
      {shown.length === 0 ? (
        <EmptyState action={<Button onClick={() => setRole('ALL')}>Show all roles</Button>}>
          No free agent plays {ROLE_LABEL[role]}.
        </EmptyState>
      ) : (
        <PlayerList
          label="Free agents"
          players={shown}
          money
          actionsHeader="Sign"
          getActions={(p) => [
            { id: 'sign', label: 'Sign', variant: 'secondary', disabled: !affordable(p), onClick: () => dispatch({ type: 'SIGN', playerId: p.id }) },
          ]}
          getNote={(p) =>
            affordable(p)
              ? undefined
              : `Insufficient budget. Short by ${fmtMoneyExact(signingFee(p) - budget)}.`
          }
        />
      )}
    </Card>
  )
}
