// ============================================================================
// Gauntlet — the win-or-go-home run mode.
//
// Reads state.gauntlet { round, wins, target, opponentId, status } (reducer-
// owned). Null → the start card. 'active' → the run in progress. 'won' /
// 'lost' → the summary screen with a new-run button.
// ============================================================================
import { teamName } from '../game/hype.js'

function WinDots({ wins, target }) {
  const dots = []
  for (let i = 0; i < target; i++) {
    dots.push(
      <span key={i} className={i < wins ? 'form-dot W' : 'form-dot na'}>
        {i < wins ? '●' : '○'}
      </span>,
    )
  }
  return <div className="form-dots">{dots}</div>
}

export default function Gauntlet({ state, dispatch }) {
  const g = state?.gauntlet
  const start = () => dispatch({ type: 'GAUNTLET_START' })

  if (!g) {
    return (
      <div className="card">
        <span className="eyebrow">⚔️ Gauntlet</span>
        <h2 style={{ marginTop: 6 }}>Win or go home</h2>
        <p className="tag">
          A five-round knockout run against escalating opposition. One loss and
          the run is over. How far can your gameplan take you?
        </p>
        <div className="actions" style={{ marginTop: 14 }}>
          <button className="primary big" onClick={start}>Start Gauntlet Run</button>
        </div>
      </div>
    )
  }

  if (g.status === 'won' || g.status === 'lost') {
    const won = g.status === 'won'
    return (
      <div className="card">
        <span className="eyebrow">⚔️ Gauntlet: {won ? 'conquered' : 'over'}</span>
        <div className={`verdict-word ${won ? 'win' : 'loss'}`} style={{ fontSize: 44 }}>
          {won ? 'GAUNTLET WON' : 'KNOCKED OUT'}
        </div>
        <p className="tag">
          {g.wins} {g.wins === 1 ? 'win' : 'wins'} in {g.round} {g.round === 1 ? 'round' : 'rounds'}.
          {won ? ' Immortal. Run it back?' : ' The rift is cruel. Run it back?'}
        </p>
        <div className="actions" style={{ marginTop: 14 }}>
          <button className="primary big" onClick={start}>Start a new run</button>
        </div>
      </div>
    )
  }

  // active
  // active — with opponent scouting so the player knows what they're walking into.
  const oppMeta = state.teamMeta?.[g.opponentId]
  const oppRoster = (state.teams[g.opponentId] || []).slice().sort((a, b) => b.ovr - a.ovr).slice(0, 3)
  return (
    <div className="card matchup-card">
      <span className="eyebrow">⚔️ Gauntlet: Round {g.round + 1}</span>
      <div className="matchup" style={{ margin: '14px 0 8px' }}>
        <div className="side">
          <div className="team-tag" style={{ background: 'var(--team)' }}>YOU</div>
          <div className="side-sub">Win or go home</div>
        </div>
        <div className="vs">
          <div className="vs-label">vs</div>
        </div>
        <div className="side">
          <div className="team-tag" style={{ background: '#2a3342' }}>{g.opponentId}</div>
          <div className="side-sub">{teamName(state, g.opponentId)}</div>
        </div>
      </div>
      <WinDots wins={g.wins} target={g.target ?? 5} />
      <div style={{ background: '#0d1117', border: '1px solid #232d3d', borderRadius: 12, padding: 10, marginTop: 10 }}>
        <div className="eyebrow">🔍 Scouting report</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>
          Tier <strong>{oppMeta?.tier ?? '?'}</strong>
          {oppRoster.length > 0 && (
            <> · Key players: {oppRoster.map((p) => `${p.name} (${p.ovr})`).join(', ')}</>
          )}
        </div>
      </div>
      <button type="button" className="primary big" onClick={() => dispatch({ type: 'PREVIEW_MATCH', action: { type: 'GAUNTLET_PLAY' } })}>Enter next match →</button>
      <p className="hint">Survive all {g.target ?? 5} rounds to conquer the gauntlet.</p>
    </div>
  )
}
