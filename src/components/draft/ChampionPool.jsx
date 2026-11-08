import { Button, EmptyState, Icon, RoleIcon, Seg } from '../ui/index.js'
import { cx } from '../ui/cx.js'
import { DRAFT_ROLES } from '../../game/draft.js'
import { ChampArt } from '../ui/index.js'
import { ROLE_WORD } from './copy.js'

const STATE_LONG = {
  Banned: 'banned',
  Picked: 'picked',
  Fearless: 'locked by Fearless, played earlier in this series',
}

/**
 * Role filter + search + the champion grid. Tile availability is decided by
 * the board (`tileView`); this only lays it out. Picking stays one click.
 */
export function ChampionPool({ visible, roleFilter, onRole, search, onSearch, tileView, onTile }) {
  const roleItems = [
    { id: 'ALL', label: 'All' },
    ...DRAFT_ROLES.map((r) => ({
      id: r,
      label: (
        <>
          <RoleIcon role={r} size={16} />
          <span className="draft-role-word">{ROLE_WORD[r]}</span>
        </>
      ),
    })),
  ]
  return (
    <section className="draft-pool-wrap" aria-label="Champion pool">
      <div className="draft-filters">
        <Seg name="draft-role" label="Filter by role" items={roleItems} value={roleFilter} onChange={onRole} className="draft-roles" />
        <label className="draft-search">
          <span className="sr-only">Search champions</span>
          <Icon name="search" size={18} />
          <input
            type="search"
            placeholder="Search champions"
            autoComplete="off"
            spellCheck="false"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </label>
      </div>
      {visible.length ? (
        <div className="draft-pool" role="group" aria-label="Champions">
          {visible.map((c) => {
            const t = tileView(c.id)
            return (
              <button
                key={c.id}
                type="button"
                className={cx('draft-tile', t.state && 'is-out', !t.clickable && !t.state && 'is-idle')}
                disabled={!t.clickable}
                onClick={() => onTile(c.id)}
                data-champ={c.id}
              >
                <span className="draft-tile-art">
                  <ChampArt champId={c.id} />
                  <span className="draft-tile-phase" aria-hidden="true">
                    {c.phase}
                  </span>
                  <span className="draft-tile-roles" aria-hidden="true">
                    {c.roles.map((r) => (
                      <RoleIcon key={r} role={r} size={14} />
                    ))}
                  </span>
                  {t.state && (
                    <span className="draft-tile-state" aria-hidden="true">
                      {t.state}
                    </span>
                  )}
                </span>
                <span className="draft-tile-name">{c.name}</span>
                <span className="sr-only">
                  , {c.roles.join(' and ')}, {c.phase} game
                  {t.state ? `, ${STATE_LONG[t.state]}` : t.reason ? `, ${t.reason}` : ''}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon="search"
          action={
            <Button onClick={() => onSearch('')} disabled={!search}>
              Clear search
            </Button>
          }
        >
          No champion matches “{search.trim()}”{roleFilter !== 'ALL' ? ` in ${roleFilter}` : ''}. Clear the search or pick another role.
        </EmptyState>
      )}
    </section>
  )
}
