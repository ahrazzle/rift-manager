import { STYLE_META, PHASE_META } from '../engine/sim.js'

export default function Tactics({ state, dispatch }) {
  const { style, phase } = state.tactic

  return (
    <div className="stack">
      <div className="card">
        <h2>Tactics</h2>
        <p className="hint">
          Style shifts your effective strength and how swingy games are. Phase sets a timing
          edge versus the opponent’s phase (Early beats Late; Late beats Early).
        </p>

        <div className="tac-section">
          <h3>Style</h3>
          <div className="tac-grid">
            {Object.entries(STYLE_META).map(([key, m]) => (
              <button
                key={key}
                className={style === key ? 'tac active' : 'tac'}
                onClick={() => dispatch({ type: 'SET_TACTIC', style: key, phase })}
              >
                <span className="tac-name">{m.label}</span>
                <span className="tac-blurb">{m.blurb}</span>
                <span className="tac-mult">×{m.mult}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="tac-section">
          <h3>Game Phase Focus</h3>
          <div className="tac-grid">
            {Object.entries(PHASE_META).map(([key, m]) => (
              <button
                key={key}
                className={phase === key ? 'tac active' : 'tac'}
                onClick={() => dispatch({ type: 'SET_TACTIC', style, phase: key })}
              >
                <span className="tac-name">{m.label}</span>
                <span className="tac-blurb">{m.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="tac-current">
          Current: <strong>{STYLE_META[style].label}</strong> ·{' '}
          <strong>{PHASE_META[phase].label}</strong>
        </div>
      </div>
    </div>
  )
}
