import { useRef } from 'react'
import { Button, Chip, Dialog } from '../ui/index.js'
import { CALL_WHEN, decisionContext, firstSentence } from './matchModel.js'

function Bars({ filled }) {
  return (
    <span className="rr-bars" role="img" aria-label={`${filled} of 3`}>
      {[0, 1, 2].map((i) => (
        <i key={i} className={i < filled ? 'on' : ''} />
      ))}
    </span>
  )
}

/**
 * IGL decision. Centred dialog on desktop, bottom sheet under 900px (the
 * shared Dialog). Untimed. Every call carries the same stakes in the engine:
 * the call that fits the game state adds strength for the rest of the game,
 * any other call costs a little. So the trade-off shown per option is *when*
 * it pays, and the Risk/Reward bars describe the read itself, once.
 *
 * The call grid keeps `.igl-call-grid` / `.igl-call-option`: the walkthrough
 * tip measures it so it never covers a call.
 */
export default function DecisionDialog({
  prompt,
  clock,
  gameNumber,
  holdOpen = false,
  withTip = false,
  onChoose,
  onDelegate,
  onClose,
}) {
  const firstRef = useRef(null)
  const context = decisionContext(prompt?.context)
  return (
    <Dialog
      className={`igl-decision match-decision${withTip ? ' has-tip' : ''}`}
      size="md"
      title={
        <span className="decision-title" data-tour="tour-igl-decision">
          Tactical pause. How do we play it?
        </span>
      }
      description={context}
      onClose={onClose}
      dismissible={!holdOpen}
      initialFocusRef={firstRef}
      actions={
        <>
          <p className="decision-note">
            <b>No timer.</b> Odds come from both lineups’ ratings, form and tactics. The call adds or costs strength
            for the rest of this game.
          </p>
          {onDelegate && (
            <Button variant="quiet" className="decision-delegate" onClick={onDelegate}>
              Let the team decide
            </Button>
          )}
        </>
      }
    >
      <div className="decision-meta">
        <Chip>
          IGL call · Game {gameNumber} · {clock}
        </Chip>
        <span className="decision-stakes">
          <span>
            Right read · Reward <Bars filled={3} />
          </span>
          <span>
            Misread · Risk <Bars filled={1} />
          </span>
        </span>
      </div>
      <div className="igl-call-grid">
        {(prompt?.options ?? []).map((call, index) => (
          <button
            type="button"
            className="igl-call-option"
            key={call.id}
            ref={index === 0 ? firstRef : undefined}
            onClick={() => onChoose(call.id)}
          >
            <strong>{call.label}</strong>
            {CALL_WHEN[call.when] && <span className="call-when">{CALL_WHEN[call.when]}</span>}
            <span className="call-desc">{call.desc}</span>
            <span className="call-edge">{firstSentence(call.edge)}</span>
          </button>
        ))}
      </div>
    </Dialog>
  )
}
