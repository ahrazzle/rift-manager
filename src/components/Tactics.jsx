import { STYLE_META, PHASE_META } from '../engine/sim.js'
import { Card, Chip } from './ui/index.js'
import OptionGroup from './team/OptionGroup.jsx'

export default function Tactics({ state, dispatch }) {
  const { style, phase } = state.tactic
  const styleOpts = Object.entries(STYLE_META).map(([v, m]) => ({ v, label: m.label, blurb: m.blurb, extra: `×${m.mult}` }))
  const phaseOpts = Object.entries(PHASE_META).map(([v, m]) => ({ v, label: m.label, blurb: m.blurb }))

  return (
    <div className="team-stack">
      <Card
        title="Tactics"
        action={
          <Chip>
            {STYLE_META[style].label} · {PHASE_META[phase].label}
          </Chip>
        }
      >
        <p className="opt-lede">
          Style shifts your effective strength and how swingy games are. Phase sets a timing
          edge versus the opponent’s phase (Early beats Late, Late beats Early).
        </p>
        <OptionGroup
          name="tactic-style"
          label="Style"
          options={styleOpts}
          value={style}
          onPick={(v) => dispatch({ type: 'SET_TACTIC', style: v, phase })}
        />
        <OptionGroup
          name="tactic-phase"
          label="Game phase focus"
          options={phaseOpts}
          value={phase}
          onPick={(v) => dispatch({ type: 'SET_TACTIC', style, phase: v })}
        />
        <p className="opt-current">
          Current: <strong>{STYLE_META[style].label}</strong> · <strong>{PHASE_META[phase].label}</strong>
        </p>
      </Card>
    </div>
  )
}
