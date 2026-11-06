import { Button } from '../ui/index.js'
import { cx } from '../ui/cx.js'
import { openEligibleRoles } from '../../game/draft.js'
import { CHAMP_BY_ID } from '../../data/champions.js'
import { ChampArt } from './ChampGlyph.jsx'
import { champName } from './copy.js'

function flexRolesLabel(draft, side, entry) {
  const open = openEligibleRoles(draft, side, entry.champId)
  return open.length ? open.join(' / ') : (CHAMP_BY_ID[entry.champId]?.roles ?? []).join(' / ')
}

/**
 * Flex picks: champions taken without a committed role. Your own carry an
 * "Assign role" control that starts the same assign flow as before.
 */
export function FlexList({ draft, side, userSide, assignTarget, onAssignToggle, title = 'Flex picks · role hidden' }) {
  const list = draft.flex?.[side] ?? []
  if (!list.length) return null
  const isUser = side === userSide
  return (
    <div className="draft-flex">
      <p className="draft-flex-h">{title}</p>
      <ul>
        {list.map((e) => {
          const on = isUser && assignTarget === e.champId
          return (
            <li key={`${e.champId}-${side}`} className={cx('draft-flex-item', on && 'is-active')}>
              <span className="draft-flex-art">
                <ChampArt champId={e.champId} />
              </span>
              <span className="draft-flex-who">
                <b>{champName(e.champId)}</b>
                <span>Can play {flexRolesLabel(draft, side, e)}</span>
              </span>
              {isUser && (
                <Button variant={on ? 'quiet' : 'secondary'} onClick={() => onAssignToggle(e.champId)} aria-pressed={on}>
                  {on ? 'Cancel assign' : 'Assign role…'}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
