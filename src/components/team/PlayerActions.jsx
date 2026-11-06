import { useId } from 'react'
import { Button, cx } from '../ui/index.js'

/** Morale word for a 0-100 value. Cold needs attention (warn); the rest is neutral. */
export function moraleOf(morale) {
  if (morale >= 80) return { label: 'Locked in', tone: 'high' }
  if (morale >= 55) return { label: 'Steady', tone: 'mid' }
  return { label: 'Cold', tone: 'low' }
}

/** Morale as a word plus a small bar, so the state never rests on colour alone. */
export function MoraleIndicator({ morale, className }) {
  const value = Math.max(0, Math.min(100, Math.round(morale ?? 70)))
  const m = moraleOf(value)
  return (
    <span className={cx('morale', `morale--${m.tone}`, className)} title={`Morale ${value}`}>
      <span className="morale-bar" aria-hidden="true">
        <i style={{ width: `${value}%` }} />
      </span>
      <span className="morale-text">
        <span className="sr-only">Morale </span>
        {m.label}
      </span>
    </span>
  )
}

/**
 * The per-player actions area. One slot for Squad rows, Market rows and cards.
 *
 *   <PlayerActions
 *     player={p}
 *     actions={[{ id: 'sign', label: 'Sign', variant: 'primary', onClick, disabled, icon }]}
 *     note="Insufficient budget. Short by $1."
 *   />
 *
 * - `actions`: 0 to 3 buttons `{ id, label, onClick, variant?, disabled?, icon?, ariaLabel? }`.
 *   Today: Sign (Market), Offer / Want (Trade Board). Later: Sell, Release,
 *   Promote (academy) and the like. Extra entries beyond three are ignored on purpose:
 *   a fourth action belongs in a dialog, not in the row.
 * - `morale`: shows the morale indicator. Defaults to the player's morale when
 *   `showMorale` is true. FAs have none, so Market passes nothing.
 * - `note`: one honest line of why (cost, refusal, "can't afford"), linked to the
 *   buttons with aria-describedby.
 * - `children`: extra content rendered after the buttons (a confirmation chip, a status).
 */
export const MAX_PLAYER_ACTIONS = 3

export default function PlayerActions({ player, actions = [], morale, showMorale = false, note, children, className }) {
  const noteId = useId()
  const shown = actions.slice(0, MAX_PLAYER_ACTIONS)
  const moraleValue = morale ?? (showMorale ? player?.morale ?? 70 : null)
  return (
    <div className={cx('pa', className)} data-slot="player-actions" data-player={player?.id}>
      {moraleValue != null && <MoraleIndicator morale={moraleValue} />}
      {shown.length > 0 && (
        <div className="pa-buttons">
          {shown.map((a) => (
            <Button
              key={a.id}
              variant={a.variant ?? 'secondary'}
              icon={a.icon}
              disabled={a.disabled}
              aria-pressed={a.pressed}
              aria-label={a.ariaLabel}
              aria-describedby={note ? noteId : undefined}
              className="pa-btn"
              onClick={a.onClick}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}
      {note && (
        <p id={noteId} className="pa-note">
          {note}
        </p>
      )}
      {children}
    </div>
  )
}
