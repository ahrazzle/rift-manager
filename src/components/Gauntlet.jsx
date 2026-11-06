// ============================================================================
// Gauntlet — the win-or-go-home run mode.
//
// Reads state.gauntlet { round, wins, target, opponentId, status } (reducer-
// owned). Null → the start card. 'active' → the run in progress. 'won' /
// 'lost' → the summary screen with a new-run button. The shell supplies the
// mode topbar and the ladder track; this screen is the card stack only.
// ============================================================================
import { teamName } from '../game/hype.js'
import { Button, Card, Chip, Pips } from './ui/index.js'
import TeamCrest from './TeamCrest.jsx'

export default function Gauntlet({ state, dispatch }) {
  const g = state?.gauntlet
  const start = () => dispatch({ type: 'GAUNTLET_START' })

  if (!g) {
    return (
      <Card variant="hero" eyebrow="Gauntlet" title="Win or go home" className="cmp-gauntlet">
        <p className="cmp-lede">
          A five-round knockout run against escalating opposition. One loss and
          the run is over. How far can your gameplan take you?
        </p>
        <div className="cmp-actions">
          <Button variant="primary" size="lg" onClick={start}>Start Gauntlet Run</Button>
        </div>
      </Card>
    )
  }

  if (g.status === 'won' || g.status === 'lost') {
    const won = g.status === 'won'
    return (
      <Card variant="hero" eyebrow={`Gauntlet ${won ? 'cleared' : 'over'}`} className="cmp-gauntlet">
        <h2 className="cmp-verdict">
          {won ? 'Gauntlet won' : 'Knocked out'}
          {won && <Chip tone="gold" icon="star">Cleared</Chip>}
        </h2>
        <p className="cmp-lede">
          {g.wins} {g.wins === 1 ? 'win' : 'wins'} in {g.round} {g.round === 1 ? 'round' : 'rounds'}.
          {won ? ' Immortal. Run it back?' : ' The rift is cruel. Run it back?'}
        </p>
        <Pips results={Array.from({ length: g.target ?? 5 }, (_, i) => (i < g.wins ? 'W' : null))} label="Gauntlet wins" />
        <div className="cmp-actions">
          <Button variant="primary" size="lg" onClick={start}>Start a new run</Button>
        </div>
      </Card>
    )
  }

  // active: with opponent scouting so the player knows what they're walking into.
  const oppMeta = state.teamMeta?.[g.opponentId]
  const oppName = teamName(state, g.opponentId)
  const oppRoster = (state.teams[g.opponentId] || []).slice().sort((a, b) => b.ovr - a.ovr).slice(0, 3)
  const target = g.target ?? 5
  return (
    <Card variant="hero" eyebrow="Gauntlet" title={`Round ${g.round + 1} of ${target}`} className="cmp-gauntlet">
      <div className="cmp-vs">
        <div className="cmp-vs-side">
          <TeamCrest teamId={state.teamId} name={teamName(state, state.teamId)} size={72} />
          <strong>{teamName(state, state.teamId)}</strong>
          <span className="cmp-vs-sub">You · win or go home</span>
        </div>
        <span className="cmp-vs-mid">vs</span>
        <div className="cmp-vs-side">
          <TeamCrest teamId={g.opponentId} name={oppName} size={72} />
          <strong>{oppName}</strong>
          <span className="cmp-vs-sub">Round {g.round + 1} opponent</span>
        </div>
      </div>
      <div className="cmp-gauntlet-wins">
        <Pips results={Array.from({ length: target }, (_, i) => (i < g.wins ? 'W' : null))} label="Gauntlet wins" />
        <span className="cmp-note">{g.wins} of {target} cleared</span>
      </div>
      <Card variant="inset" title="Scouting report" titleAs="h3">
        <p className="cmp-scout">
          Tier <strong>{oppMeta?.tier ?? '?'}</strong>
          {oppRoster.length > 0 && <> · Key players: {oppRoster.map((p) => `${p.name} (${p.ovr})`).join(', ')}</>}
        </p>
      </Card>
      <div className="cmp-actions">
        <Button variant="primary" size="lg" onClick={() => dispatch({ type: 'PREVIEW_MATCH', action: { type: 'GAUNTLET_PLAY' } })}>Enter next match →</Button>
      </div>
      <p className="cmp-note">Survive all {target} rounds to conquer the gauntlet.</p>
    </Card>
  )
}
