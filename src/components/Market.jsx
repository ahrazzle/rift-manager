import { ROLE_LABEL } from '../data/lck.js'
import { canAfford, fmtMoney, playerWage, signingFee } from '../game/economy.js'

export default function Market({ state, dispatch }) {
  const budget = state.finance?.budget
  if (state.faPool.length === 0) {
    return (
      <div className="card">
        <h2>Transfer Market</h2>
        <p className="hint">No free agents available right now.</p>
      </div>
    )
  }
  return (
    <div className="card">
      <h2>Transfer Market: Free Agents</h2>
      <p className="hint">
        Sign a free agent to add them to your roster (they become the starter in their role).
      </p>
      {budget != null && <p>Transfer budget: {fmtMoney(budget)}</p>}
      <div className="market-grid">
        {state.faPool.map((p) => (
          <div className="fa-card" key={p.id}>
            <div className="fa-top">
              <span className="fa-name">{p.name}</span>
              <span className="fa-role">{ROLE_LABEL[p.role]}</span>
            </div>
            <div className="fa-stats">
              <span title="Overall">OVR {p.ovr}</span>
              <span title="Mechanics">MEC {p.mech}</span>
              <span title="Macro">MAC {p.macro}</span>
              <span title="Consistency">CON {p.consist}</span>
            </div>
            <p className="hint">Signing fee: {fmtMoney(signingFee(p))} · Annual wage: {fmtMoney(playerWage(p))}</p>
            <button className="primary" disabled={budget != null && !canAfford(budget, signingFee(p))} onClick={() => dispatch({ type: 'SIGN', playerId: p.id })}>
              {budget != null && !canAfford(budget, signingFee(p)) ? 'Insufficient budget' : 'Sign'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
