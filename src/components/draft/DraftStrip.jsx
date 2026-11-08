import { cx } from '../ui/cx.js'
import { DRAFT_ROLES } from '../../game/draft.js'
import { BanRow, PickSlot } from './SideColumn.jsx'
import { SIDE_WORD } from './copy.js'

/**
 * Mobile strip (under 900px, sticky under the mode bar): one row per side with
 * the five role slots and the five bans. Your own slots are the same buttons as
 * the desktop column, so role-first picks, swaps and flex assigns work here too.
 */
export function DraftStrip({ draft, userSide, teams, slotView, onSlot, step }) {
  return (
    <div className="draft-strip">
      {['BLUE', 'RED'].map((side) => {
        const team = teams[side]
        const acting = step?.side === side
        const banIndex = acting && step.type === 'ban' ? draft.bans[side].length : -1
        return (
          <div
            key={side}
            className={cx('draft-strip-row', `side-${side.toLowerCase()}`, side === userSide && 'is-user')}
            role="group"
            aria-label={`${team.abbr}, ${SIDE_WORD[side].toLowerCase()} side${side === userSide ? ', your team' : ''}`}
          >
            <span className="draft-strip-team" aria-hidden="true">
              {team.abbr}
            </span>
            <ol className="draft-strip-picks" aria-label={`${team.abbr} picks`}>
              {DRAFT_ROLES.map((role) => (
                <PickSlot key={role} variant="cell" view={slotView(side, role)} onActivate={onSlot} />
              ))}
            </ol>
            <BanRow draft={draft} side={side} team={team} activeIndex={banIndex} compact />
          </div>
        )
      })}
    </div>
  )
}
