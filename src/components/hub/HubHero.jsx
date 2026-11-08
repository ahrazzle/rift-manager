import { useId } from 'react'
import TeamCrest from '../TeamCrest.jsx'
import { Button, Card, Chip, Icon, OddsBar } from '../ui/index.js'
import { teamName } from '../../game/hype.js'
import { readiness, recordLine, REGIONAL_BEST_OF } from './hubData.js'

/** One readiness check. Links to the screen that fixes it; never blocks Play. */
function ReadinessItem({ item, onOpen }) {
  const content = (
    <>
      <span className="hub-ready-k">
        <Icon name={item.tone === 'ok' ? 'check' : 'alert'} size={16} />
        {item.label}
        <span className="sr-only">{item.tone === 'ok' ? ', ready' : ', needs attention'}</span>
      </span>
      <span className="hub-ready-v">{item.value}</span>
    </>
  )
  if (item.href) {
    return (
      <a className={`hub-ready-item is-${item.tone}`} href={item.href} onClick={onOpen}>
        {content}
      </a>
    )
  }
  return (
    <button type="button" className={`hub-ready-item is-${item.tone}`} onClick={onOpen}>
      {content}
    </button>
  )
}

/**
 * Next match: crests, records, odds, readiness, and the one primary action.
 * Show simulation is the player's standing choice for how the series plays out.
 */
export default function HubHero({ state, match, pct, why, totalRounds, onPlay, setTab, onJumpToPrep, dispatch }) {
  const titleId = useId()
  const me = state.teamId
  const opp = match.oppId
  const checks = readiness(state, why)
  const igl = !!state.matchOptions?.igl
  const watching = !!state.matchOptions?.showSimulation || igl
  return (
    <section className="ui-card hub-hero" aria-labelledby={titleId}>
      <div className="hub-hero-top">
        <p className="label" id={titleId}>
          Next match · Best of {REGIONAL_BEST_OF}
        </p>
        <span className="hub-hero-chips">
          {state.seriesOptions?.fearless && <Chip>Fearless draft</Chip>}
          <Chip>
            Week {match.week} · {match.home ? 'Home' : 'Away'}
            <span className="sr-only">{` of ${totalRounds}`}</span>
          </Chip>
        </span>
      </div>

      <div className="hub-versus" data-tour="tour-matchup">
        <div className="hub-side">
          <TeamCrest teamId={me} name={teamName(state, me)} size={72} />
          <div>
            <p className="hub-side-id display">{me}</p>
            <p className="hub-side-sub">
              <span className="sr-only">{teamName(state, me)}, your team, </span>
              {recordLine(state, me) || 'You'}
            </p>
          </div>
        </div>
        <span className="hub-vs display" aria-hidden="true">
          vs
        </span>
        <div className="hub-side is-right">
          <div>
            <p className="hub-side-id display">{opp}</p>
            <p className="hub-side-sub">
              <span className="hub-side-name">{teamName(state, opp)}</span>
              {recordLine(state, opp) ? <span>{recordLine(state, opp)}</span> : null}
            </p>
          </div>
          <TeamCrest teamId={opp} name={teamName(state, opp)} size={72} />
        </div>
      </div>

      <OddsBar pct={pct} leftLabel={me} rightLabel={opp} why={why} />

      <ul className="hub-ready" aria-label="Match readiness">
        {checks.map((item) => (
          <li key={item.id}>
            <ReadinessItem
              item={item}
              onOpen={(e) => {
                if (item.href) {
                  e.preventDefault()
                  onJumpToPrep?.()
                } else setTab(item.tab)
              }}
            />
          </li>
        ))}
      </ul>

      <div className="hub-cta">
        <Button variant="primary" size="lg" icon="play" data-tour="tour-play-week" onClick={onPlay}>
          Play week {match.week}
        </Button>
        <Button variant="quiet" onClick={() => setTab('strategy')}>
          Review strategy
        </Button>
        <label className="shell-switch hub-watch">
          <span>
            <strong>Show simulation</strong>
            <small id={`${titleId}-watch`}>{igl ? 'On while IGL calls are on' : 'Watch the series on the Rift'}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={watching}
            disabled={igl}
            aria-describedby={`${titleId}-watch`}
            onChange={(e) => dispatch({ type: 'SET_MATCH_OPTION', key: 'showSimulation', value: e.target.checked })}
          />
        </label>
      </div>
    </section>
  )
}

/** Wrapper so the Hub can show a calm card when there is no fixture this week. */
export function NoFixture({ state }) {
  return (
    <Card title="No series this week" className="hub-hero">
      <p className="muted">{teamName(state, state.teamId)} has no fixture in week {state.round}. Check Compete for the schedule.</p>
    </Card>
  )
}
