// Strategy — pre-match gameplan panel (item 4; season + career, NOT campaign).
// Four controls (comp / roam / swap / wincon) dispatching SET_STRATEGY plus a
// live estimateSeriesWinProb readout against the upcoming week's opponent that
// passes the current strategy as { aStrat } so the edge moves with choices.
import { useMemo } from 'react'
import { buildLCKSchedule } from '../engine/season.js'
import { bestLineup, userLineup, estimateSeriesWinProb, explainWinProb, matchupSeed, matchupOppTactic, seededRng } from '../game/logic.js'
import { managedCoachBonus } from '../game/useGameState.js'
import { TRAIT_BY_ID } from '../data/traits.js'

const FALLBACK_SCHEDULE = buildLCKSchedule()

const COMP_OPTS = [
  { v: null, label: 'Balanced', blurb: 'No draft bias' },
  { v: 'AGGR', label: 'Aggressive', blurb: '+1.0 str · bloodier, shorter games' },
  { v: 'SCALE', label: 'Scaling', blurb: '+1.0 str · longer, comeback-shaped' },
]
const ROAM_OPTS = [
  { v: null, label: 'Default', blurb: 'Support plays standard' },
  { v: 'ROAM', label: 'Roam', blurb: 'JNG/MID up, BOT down (≈+0.75)' },
  { v: 'STAY', label: 'Stay', blurb: 'BOT/SUP up, map down (≈+1.0)' },
]
const WINCON_OPTS = [
  { v: null, label: 'None', blurb: 'No priority' },
  { v: 'DRAGONS', label: 'Dragons', blurb: '+1.25 · objective-heavy' },
  { v: 'SPLIT', label: 'Splitpush', blurb: '+1.25 · tower-led' },
  { v: 'SCALE', label: 'Scale', blurb: '+1.0 (EARLY phase: +0.25)' },
  { v: 'EARLY', label: 'Early', blurb: '+1.0 (LATE phase: +0.25)' },
]

function OptRow({ opts, cur, onPick }) {
  return (
    <div className="tac-grid">
      {opts.map((o) => (
        <button
          key={String(o.v)}
          className={cur === o.v ? 'tac active' : 'tac'}
          onClick={() => onPick(o.v)}
        >
          <span className="tac-name">{o.label}</span>
          <span className="tac-blurb">{o.blurb}</span>
        </button>
      ))}
    </div>
  )
}

export default function Strategy({ state, dispatch }) {
  const strat = state.strategy ?? { comp: null, roam: null, swap: false, wincon: null }

  const preview = useMemo(() => {
    const schedule = state.schedule ?? FALLBACK_SCHEDULE
    const matches = state.finished ? [] : schedule[state.round - 1] || []
    const myMatch = matches.find(([h, a]) => h === state.teamId || a === state.teamId)
    if (!myMatch) return null
    const oppId = myMatch[0] === state.teamId ? myMatch[1] : myMatch[0]
    const myObj = userLineup(state.teams[state.teamId], state.lineup, state.form).lineup
    const oppObj = bestLineup(state.teams[oppId], state.form).lineup
    // Deterministic seeds: withStrat and the Why-panel share one draw, so the
    // Strategy tab agrees exactly with the Dashboard hero. Base is a separate
    // draw by design (it measures the no-gameplan number).
    const seed = matchupSeed(state, oppId)
    const oppTactic = matchupOppTactic(state, oppId)
    const fearless = state.seriesOptions?.fearless ?? false
    const bonus = managedCoachBonus(state)
    const base = estimateSeriesWinProb(myObj, state.tactic, oppObj, oppTactic, 300, seededRng(seed + '|base'), bonus)
    const withStrat = estimateSeriesWinProb(myObj, state.tactic, oppObj, oppTactic, 300, seededRng(seed), bonus, { aStrat: strat, fearless })
    const why = explainWinProb(state, oppId, { n: 300, rng: seededRng(seed), oppTactic })
    return { oppId, base, withStrat, why }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.teamId, state.round, state.finished, state.schedule, state.teams, state.lineup, state.form, state.tactic, state.strategy, state.seriesOptions, state.results])

  return (
    <div className="stack">
      <div className="card">
        <h2>Strategy — Week {state.round} Gameplan</h2>
        <p className="hint">
          Set before you play the week. Applies to your side only, every week until you change it.
          Stacked choices clamp at +2.5 strength.
        </p>

        <div className="tac-section">
          <h3>Draft Bias</h3>
          <OptRow opts={COMP_OPTS} cur={strat.comp} onPick={(v) => dispatch({ type: 'SET_STRATEGY', comp: v })} />
        </div>

        <div className="tac-section">
          <h3>Support Roam vs Stay</h3>
          <OptRow opts={ROAM_OPTS} cur={strat.roam} onPick={(v) => dispatch({ type: 'SET_STRATEGY', roam: v })} />
        </div>

        <div className="tac-section">
          <h3>Lane Swap</h3>
          <div className="tac-grid">
            <button
              className={!strat.swap ? 'tac active' : 'tac'}
              onClick={() => dispatch({ type: 'SET_STRATEGY', swap: false })}
            >
              <span className="tac-name">No Swap</span>
              <span className="tac-blurb">Play standard lanes</span>
            </button>
            <button
              className={strat.swap ? 'tac active' : 'tac'}
              onClick={() => dispatch({ type: 'SET_STRATEGY', swap: true })}
            >
              <span className="tac-name">Swap</span>
              <span className="tac-blurb">MID/LATE phase +1.0 · EARLY phase −1.0</span>
            </button>
          </div>
        </div>

        <div className="tac-section">
          <h3>Win Condition</h3>
          <OptRow opts={WINCON_OPTS} cur={strat.wincon} onPick={(v) => dispatch({ type: 'SET_STRATEGY', wincon: v })} />
        </div>

        <div className="tac-section">
          <h3>Fearless Draft</h3>
          <div className="tac-grid">
            <button
              className={state.seriesOptions?.fearless ? 'tac active' : 'tac'}
              onClick={() => dispatch({ type: 'SET_SERIES_OPTION', key: 'fearless', value: true })}
            >
              <span className="tac-name">Fearless ON</span>
              <span className="tac-blurb">Series winner plays off comfort next game (−1.0 str)</span>
            </button>
            <button
              className={!state.seriesOptions?.fearless ? 'tac active' : 'tac'}
              onClick={() => dispatch({ type: 'SET_SERIES_OPTION', key: 'fearless', value: false })}
            >
              <span className="tac-name">Fearless OFF</span>
              <span className="tac-blurb">Standard draft every game</span>
            </button>
          </div>
          <p className="hint">Applies to all series.</p>
        </div>

        <div className="tac-current">
          Gameplan: <strong>{strat.comp ?? 'Balanced'}</strong> ·{' '}
          <strong>{strat.roam ?? 'Default'}</strong> ·{' '}
          <strong>{strat.swap ? 'Swap' : 'No swap'}</strong> ·{' '}
          <strong>{strat.wincon ?? 'No wincon'}</strong>
        </div>
      </div>

      <div className="card">
        <h3>Live Win Estimate</h3>
        {preview ? (
          <p>
            vs <strong>{preview.oppId}</strong>: base{' '}
            <strong>{Math.round(preview.base * 100)}%</strong> → with gameplan{' '}
            <strong>{Math.round(preview.withStrat * 100)}%</strong>
          </p>
        ) : (
          <p className="hint">No upcoming match (season finished).</p>
        )}
        {preview && preview.why ? (
          <details className="why">
            <summary>Why {Math.round((preview.why.prob ?? 0.5) * 100)}%? — top factors</summary>
            <ul>
              {preview.why.factors.map((f) => (
                <li key={f.label}>
                  {f.label}:{' '}
                  {f.contribution > 0 ? '+' : ''}
                  {f.contribution.toFixed(1)}pp
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      <div className="card">
        <h3>Your Lineup Traits</h3>
        {(() => {
          const chips = (state.teams[state.teamId] || [])
            .filter((p) => Array.isArray(p.traits) && p.traits.some((t) => t.revealed))
            .flatMap((p) => p.traits.filter((t) => t.revealed).map((t) => ({ p, t })))
          if (!chips.length) return <p className="hint">No traits revealed yet. Some players may carry hidden traits that surface when they fire.</p>
          return (
            <ul className="trait-chips">
              {chips.map(({ p, t }, i) => (
                <li key={i}>
                  <span className="trait-badge">⚡ {TRAIT_BY_ID[t.id]?.name ?? t.id}</span>{' '}
                  {p.name} — {TRAIT_BY_ID[t.id]?.desc ?? ''}
                </li>
              ))}
            </ul>
          )
        })()}
      </div>
    </div>
  )
}
