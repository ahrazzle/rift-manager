import { BottomSheet, Button, RoleIcon } from '../ui/index.js'
import { cx } from '../ui/cx.js'
import { DRAFT_ROLES } from '../../game/draft.js'
import { ChampArt } from './ChampGlyph.jsx'
import { CHAMP_BY_ID } from '../../data/champions.js'
import { champName } from './copy.js'

/**
 * The detail bar (desktop, sticky, e3) / bottom sheet (mobile) for the two
 * selection flows the draft already had: moving or swapping a committed pick,
 * and assigning a flex pick. Each role button is a proxy for tapping that role
 * slot on your comp, so the steps and the "can't play" explanations are the
 * same ones the slots give.
 */
export function ActionPanel({ model, onSlot, onCancel, hint, sheet }) {
  if (!model) return null
  const { mode, champId, sourceRole, rows } = model
  const name = champName(champId)
  const title = mode === 'assign' ? `Assign ${name}` : `Move ${name}`
  const lead =
    mode === 'assign'
      ? `Choose a role for ${name}. An open role assigns it; a filled one it can play swaps the champion there out.`
      : `${name} is in ${sourceRole}. Choose a filled role to swap, or an open role to move into.`
  const roleButtons = (
    <ul className="draft-act-roles" aria-label="Destination role">
      {rows.map((r) => (
        <li key={r.role}>
          <button
            type="button"
            className={cx('draft-act-role', r.ok ? 'is-ok' : 'is-no')}
            onClick={() => onSlot(r.role)}
          >
            <RoleIcon role={r.role} size={18} />
            <span className="draft-act-role-name">{r.role}</span>
            <span className="draft-act-role-note">{r.note}</span>
          </button>
        </li>
      ))}
    </ul>
  )
  const status = (
    <p className={cx('draft-act-hint', hint && 'has-hint')} role="status">
      {hint ?? ''}
    </p>
  )

  if (sheet) {
    return (
      <BottomSheet
        title={title}
        onClose={onCancel}
        className="draft-sheet"
        actions={
          <Button variant="quiet" onClick={onCancel}>
            Cancel
          </Button>
        }
      >
        <div className="draft-sheet-champ">
          <span className="draft-act-art">
            <ChampArt champId={champId} />
          </span>
          <div className="draft-act-text">
            <p className="draft-act-lead">{lead}</p>
            {status}
          </div>
        </div>
        {roleButtons}
      </BottomSheet>
    )
  }

  return (
    <section className="draft-act" aria-labelledby="draft-act-title">
      <span className="draft-act-art">
        <ChampArt champId={champId} />
      </span>
      <div className="draft-act-text">
        <h2 id="draft-act-title">{title}</h2>
        <p className="draft-act-lead">{lead}</p>
        {status}
      </div>
      <Button variant="quiet" onClick={onCancel} aria-keyshortcuts="Escape">
        Cancel
      </Button>
      {roleButtons}
    </section>
  )
}

/** Rows for the panel: which roles are legal destinations, in plain words. */
export function actionRows({ draft, userSide, mode, champId, sourceRole, legal }) {
  const roles = mode === 'move' ? DRAFT_ROLES.filter((r) => r !== sourceRole) : DRAFT_ROLES
  return roles.map((role) => {
    const occupant = draft.picks[userSide][role]
    const ok = legal(role)
    const canPlay = !!CHAMP_BY_ID[champId]?.roles.includes(role)
    let note
    if (ok) note = occupant ? (mode === 'assign' ? `Take over from ${champName(occupant)}` : `Swap with ${champName(occupant)}`) : mode === 'assign' ? 'Assign here' : 'Move here'
    else if (!canPlay) note = `Can't play ${role}`
    else note = occupant ? (mode === 'assign' ? `${champName(occupant)} has nowhere to go` : `${champName(occupant)} can't play ${sourceRole}`) : 'Leaves a flex pick without a role'
    return { role, ok, note }
  })
}
