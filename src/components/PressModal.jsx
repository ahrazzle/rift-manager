// ============================================================================
// PressModal — the weekly press conference.
//
// Rendered when state.press.pending is true. One question, picked from three
// templates by context, each with three answers. Every answer shows its
// predicted effects BEFORE the player commits, then dispatches PRESS_ANSWER.
// ============================================================================
import { streakOf } from '../game/hype.js'

const ANSWERS = [
  { id: 'confident', label: 'Confident', quote: '"We\'re winning it all."' },
  { id: 'measured', label: 'Measured', quote: '"One game at a time."' },
  { id: 'deflect', label: 'Deflect', quote: '"No comment."' },
]

function pickQuestion(state) {
  const st = streakOf(state)
  if (st && st.dir === 'W' && st.n >= 2) {
    return `You're on a ${st.n}-series win streak. Is this team the real deal?`
  }
  if (st && st.dir === 'L' && st.n >= 2) {
    return `That's ${st.n} straight defeats. What's going wrong?`
  }
  return "How do you rate your team's form heading into this week?"
}

// Predicted effects, shown before the player answers.
function effectsFor(answerId, state) {
  const st = streakOf(state)
  const losing = st?.dir === 'L'
  if (answerId === 'confident') return { hype: 2, board: 3, morale: losing ? -4 : 2 }
  if (answerId === 'measured') return { hype: 1, board: 1, morale: 1 }
  return { hype: -1, board: -2, morale: 0 } // deflect
}

function EffectChip({ name, value }) {
  const cls = value > 0 ? 'tale-chip edge' : value < 0 ? 'tale-chip risk' : 'tale-chip'
  const sign = value > 0 ? '+' : ''
  return <span className={cls}>{sign}{value} {name}</span>
}

export default function PressModal({ state, dispatch, onClose }) {
  const question = pickQuestion(state)

  const answer = (answerId) => {
    dispatch({ type: 'PRESS_ANSWER', answerId })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Press conference" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🎙️ Press Conference</h2>
          <button className="ghost" onClick={onClose}>Leave</button>
        </div>
        <div style={{ padding: '20px 22px 24px' }}>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>{question}</p>
          <p className="hint" style={{ marginTop: 0 }}>The room is waiting. Your answer moves the needle.</p>
          <div className="tac-grid" style={{ marginTop: 16 }}>
            {ANSWERS.map((a) => {
              const fx = effectsFor(a.id, state)
              return (
                <button key={a.id} className="tac" onClick={() => answer(a.id)}>
                  <span className="tac-name">{a.label}</span>
                  <span className="tac-blurb">{a.quote}</span>
                  <div className="tale" style={{ margin: '8px 0 0' }}>
                    <EffectChip name="hype" value={fx.hype} />
                    <EffectChip name="board" value={fx.board} />
                    <EffectChip name="morale" value={fx.morale} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
