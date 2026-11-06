import TeamCrest from '../TeamCrest.jsx'
import { Chip, Icon, RoleIcon } from '../ui/index.js'
import { cx } from '../ui/cx.js'
import { DRAFT_ROLES } from '../../game/draft.js'
import { ChampArt } from './ChampGlyph.jsx'
import { SIDE_WORD, champName } from './copy.js'
import { FlexList } from './FlexList.jsx'

/** Five ban slots; a filled ban is struck through in the side colour. */
export function BanRow({ draft, side, team, activeIndex, compact = false }) {
  return (
    <ol className={cx('draft-bans', compact && 'is-compact')} aria-label={`${team.abbr} bans`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const id = draft.bans[side][i]
        return (
          <li key={i} className={cx('draft-ban', id && 'is-filled', activeIndex === i && 'is-active')}>
            {id ? <ChampArt champId={id} /> : !compact && <Icon name="ban" size={16} />}
            <span className="sr-only">
              {id ? `${champName(id)} banned` : activeIndex === i ? `Ban ${i + 1}, banning now` : `Ban ${i + 1} open`}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * One role slot. `view` comes from the board (slotView) so the desktop column
 * and the mobile strip show the same state and run the same handler.
 */
export function PickSlot({ view, onActivate, variant = 'row' }) {
  const { role, champId, player, interactive, active, openTurn, just, hint, label } = view
  const cls = cx(
    variant === 'row' ? 'draft-slot' : 'draft-cell',
    champId ? 'is-filled' : 'is-open',
    active && 'is-active',
    openTurn && 'is-open-turn',
    just && 'is-just',
    interactive && 'is-interactive',
  )
  const art = (
    <span className="draft-slot-art" key={champId ?? 'empty'}>
      {champId ? <ChampArt champId={champId} /> : <RoleIcon role={role} size={variant === 'row' ? 22 : 18} />}
    </span>
  )
  const body =
    variant === 'row' ? (
      <>
        {art}
        <span className="draft-slot-who">
          <small>
            <RoleIcon role={role} size={14} /> {role}
            {active && !champId ? ' · now' : ''}
          </small>
          <b>{champId ? champName(champId) : active ? 'Choosing…' : '—'}</b>
          <span>{[player, hint].filter(Boolean).join(' · ')}</span>
        </span>
      </>
    ) : (
      art
    )
  if (interactive) {
    return (
      <li className="draft-slot-li">
        <button
          type="button"
          className={cls}
          onClick={() => onActivate(role)}
          aria-label={label}
          aria-pressed={active}
        >
          {body}
        </button>
      </li>
    )
  }
  return (
    <li className="draft-slot-li">
      <div className={cls}>
        {body}
        <span className="sr-only">{label}</span>
      </div>
    </li>
  )
}

/** Desktop side column: header, bans, five role slots, flex holding list. */
export function SideColumn({
  draft, side, userSide, team, slotView, onSlot, step, flexProps, showRearrangeHelp,
}) {
  const isUser = side === userSide
  const acting = step?.side === side
  const banIndex = acting && step.type === 'ban' ? draft.bans[side].length : -1
  const headId = `draft-side-${side.toLowerCase()}`
  return (
    <section className={cx('draft-side', `side-${side.toLowerCase()}`, isUser && 'is-user')} aria-labelledby={headId}>
      <header className="draft-side-h">
        {team.id && <TeamCrest teamId={team.id} name={team.name} size={40} />}
        <h2 id={headId}>
          {team.abbr}
          <span className="sr-only">, {SIDE_WORD[side].toLowerCase()} side{isUser ? ', your team' : ''}</span>
        </h2>
        <Chip tone={side === 'BLUE' ? 'blue' : 'red'} aria-hidden="true">
          {SIDE_WORD[side]} side{isUser ? ' · You' : ''}
        </Chip>
      </header>
      <p className={cx('draft-side-status', acting && 'is-acting')} aria-hidden={!acting}>
        {acting ? (step.type === 'ban' ? 'Banning now' : 'Picking now') : ' '}
      </p>
      <BanRow draft={draft} side={side} team={team} activeIndex={banIndex} />
      <ol className="draft-picks" aria-label={`${team.abbr} picks`}>
        {DRAFT_ROLES.map((role) => (
          <PickSlot key={role} view={slotView(side, role)} onActivate={onSlot} />
        ))}
      </ol>
      <FlexList draft={draft} side={side} {...flexProps} />
      {isUser && showRearrangeHelp && (
        <p className="draft-side-help">Select two roles to swap their champions, or move one into an open role it can play.</p>
      )}
    </section>
  )
}

