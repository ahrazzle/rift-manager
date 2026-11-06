import { Button, Chip } from '../ui/index.js'
import { cx } from '../ui/cx.js'
import { DRAFT_STEPS } from '../../game/draft.js'
import { SIDE_WORD, compNames, openRoles, otherSide, phaseLabel, turnOrdinal } from './copy.js'

/** 20-step order ribbon: bans short, picks tall, coloured by side. Decorative; the banner says it in words. */
export function OrderRibbon({ step, done }) {
  return (
    <div className="draft-ribbon" aria-hidden="true">
      {DRAFT_STEPS.map((s, i) => (
        <i
          key={i}
          className={cx(
            s.side === 'BLUE' ? 'is-blue' : 'is-red',
            s.type === 'ban' ? 'is-ban' : 'is-pick',
            (done || i < step) && 'is-done',
            !done && i === step && 'is-now',
          )}
        />
      ))}
    </div>
  )
}

/**
 * Whose turn, what it is ("Your pick · Pick 2 of 5"), open roles, the other
 * comp so far, and the role-first instruction. Done: "Draft complete" + Start.
 */
export function TurnBanner({
  draft, step, userSide, teams, ready, pickTargetRole, roleFilter,
  fearlessActive, fearlessCount, gameNumber, onLock,
}) {
  const enemy = otherSide(userSide)
  const enemyTeam = teams[enemy]
  const theirs = compNames(draft, enemy)
  const compLine = theirs.length ? `${enemyTeam.abbr} have ${theirs.join(' + ')}.` : `${enemyTeam.abbr} have no picks yet.`
  const open = openRoles(draft, userSide)
  const openLine = open.length ? `Open roles: ${open.join(' · ')}.` : 'Every role is filled.'
  const fearless = fearlessActive && fearlessCount > 0
    ? `${fearlessCount} champion${fearlessCount === 1 ? '' : 's'} from earlier games ${fearlessCount === 1 ? 'is' : 'are'} locked for this series.`
    : null

  let tone
  let eyebrow
  let title
  let lines = []
  let action = null
  if (!step) {
    tone = 'done'
    eyebrow = ready ? `Game ${gameNumber} · all 20 steps done` : 'Post-draft · all 20 steps done'
    title = ready ? 'Draft complete' : 'Assign your flex picks'
    lines = ready
      ? ['Both comps are locked. Take them onto the Rift.']
      : ['Official picks and bans are finished. Assign flex picks and rearrange roles until every slot is filled.']
    if (onLock) {
      action = (
        <div className="draft-turn-action">
          <Button variant="primary" size="lg" disabled={!ready} onClick={onLock} aria-describedby={ready ? undefined : 'draft-lock-why'}>
            Start game {gameNumber}
          </Button>
          {!ready && (
            <p id="draft-lock-why" className="draft-turn-why">
              Assign every flex pick to a role first.
            </p>
          )}
        </div>
      )
    }
  } else {
    const yours = step.side === userSide
    const kind = step.type === 'ban' ? 'Ban' : 'Pick'
    const count = `${kind} ${turnOrdinal(draft.step)} of 5`
    tone = step.side === 'BLUE' ? 'blue' : 'red'
    eyebrow = `${phaseLabel(draft.step)} · Step ${draft.step + 1} of 20`
    if (yours) {
      title = `Your ${kind.toLowerCase()} · ${count}`
      if (step.type === 'ban') {
        lines = ['Remove a champion from the pool.', `${openLine} ${compLine}`]
      } else {
        const how = pickTargetRole
          ? <>Committing to <strong>{pickTargetRole}</strong>: pick a legal champion below.</>
          : roleFilter !== 'ALL'
            ? <>Browsing <strong>{roleFilter}</strong>: select a champion to commit it to that role.</>
            : 'Choose a role to commit this pick, or pick a flex champion to keep the role hidden.'
        lines = [how, `${openLine} ${compLine}`]
      }
    } else {
      title = `${teams[step.side].abbr} ${step.type === 'ban' ? 'banning' : 'picking'} · ${count}`
      lines = ['Their coach is deciding.', `${openLine} ${compLine}`]
    }
  }

  return (
    <section className={cx('draft-turn', `tone-${tone}`)} aria-labelledby="draft-turn-title">
      <div className="draft-turn-text">
        <p className="draft-turn-eyebrow">
          <span>{eyebrow}</span>
          {step && (
            <span className="sr-only">
              , {SIDE_WORD[step.side]} side {step.type}
            </span>
          )}
        </p>
        <h2 id="draft-turn-title" className="draft-turn-title" aria-live="polite">
          {title}
        </h2>
        {lines.map((l, i) => (
          <p key={i} className={cx('draft-turn-line', i === 0 && 'is-lead')}>
            {l}
          </p>
        ))}
      </div>
      {!draft.done && <OrderRibbon step={draft.step} done={draft.done} />}
      {action}
      {fearless && (
        <p className="draft-turn-fearless">
          <Chip>Fearless</Chip>
          <span>{fearless}</span>
        </p>
      )}
    </section>
  )
}
