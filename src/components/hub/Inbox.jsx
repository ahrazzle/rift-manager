import { useEffect, useRef, useState } from 'react'
import { Button, Card, Chip, Icon } from '../ui/index.js'
import { inboxItems, pressAnswers, pressQuestion } from './hubData.js'

function Effect({ name, value }) {
  if (value == null) return null
  const tone = value > 0 ? 'win' : value < 0 ? 'loss' : 'neutral'
  return (
    <Chip tone={tone}>
      {value > 0 ? '+' : value < 0 ? '−' : '±'}
      {Math.abs(value)} {name}
    </Chip>
  )
}

/**
 * The weekly press request as an inbox item: optional, never a modal.
 * Answer shows the three replies with their exact effects before you pick;
 * Skip clears it. Effects mirror the PRESS_ANSWER reducer (board, morale).
 */
export function PressItem({ state, dispatch, item }) {
  const [open, setOpen] = useState(false)
  const firstRef = useRef(null)
  useEffect(() => {
    if (open) firstRef.current?.focus()
  }, [open])
  const answers = pressAnswers(state)
  return (
    <>
      <p>{item.text}</p>
      {!open ? (
        <div className="hub-inbox-acts">
          <Button aria-expanded="false" onClick={() => setOpen(true)}>
            Answer
          </Button>
          <Button variant="quiet" onClick={() => dispatch({ type: 'PRESS_SKIP' })}>
            Skip
          </Button>
        </div>
      ) : (
        <div className="hub-press">
          <p className="hub-press-q">“{pressQuestion(state)}”</p>
          <ul className="hub-press-answers">
            {answers.map((a, i) => (
              <li key={a.id}>
                <button type="button" ref={i === 0 ? firstRef : undefined} className="hub-press-answer" onClick={() => dispatch({ type: 'PRESS_ANSWER', answerId: a.id })}>
                  <span className="hub-press-label">
                    <b>{a.label}</b> <span className="muted">{a.quote}</span>
                  </span>
                  <span className="hub-press-fx">
                    <Effect name="board" value={a.board} />
                    <Effect name="morale" value={a.morale} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="hub-inbox-acts">
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Not now
            </Button>
            <Button variant="quiet" onClick={() => dispatch({ type: 'PRESS_SKIP' })}>
              Skip
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

/** Inbox: press, board, scout and report items. Read-only except the press request. */
export default function Inbox({ state, dispatch, onOpenHref }) {
  const items = inboxItems(state)
  if (!items.length) return null
  const actionable = items.filter((i) => i.kind === 'press' || i.kind === 'report').length
  return (
    <Card title="Inbox" className="hub-inbox-card" action={actionable ? <Chip>{actionable} new</Chip> : null}>
      <ul className="hub-inbox">
        {items.map((item) => (
          <li key={item.id} className={`is-${item.kind}`}>
            <span className="hub-inbox-ic" aria-hidden="true">
              <Icon name={item.icon} size={18} />
            </span>
            <div>
              <b>{item.title}</b>
              {item.kind === 'press' ? (
                <PressItem state={state} dispatch={dispatch} item={item} />
              ) : (
                <>
                  <p>{item.text}</p>
                  {item.href && (
                    <div className="hub-inbox-acts">
                      <Button
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault()
                          onOpenHref?.(item.href)
                        }}
                      >
                        {item.action}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
