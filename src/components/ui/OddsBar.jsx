import { Meter } from './Meter.jsx'
import { oddsWord } from './odds.js'

export { oddsWord }

/**
 * "Why N%?" disclosure for a win estimate. `why` is explainWinProb() output
 * (game/logic.js): factors in percentage points, plus Coach's office prep.
 * Hub and Team › Strategy render the same list, so the numbers read alike.
 */
export function OddsWhy({ pct, why }) {
  if (!why) return null
  const shown = pct ?? Math.round((why.prob ?? 0.5) * 100)
  return (
    <details className="ui-why">
      <summary>Why {shown}%? Top factors</summary>
      <ul className="ui-why-factors">
        {why.factors.map((f) => (
          <li key={f.label}>
            <span>{f.label}</span>
            {f.dash || !f.contribution ? (
              <span className="faint num">±0</span>
            ) : (
              <span className={`num ${f.contribution > 0 ? 'is-up' : 'is-down'}`}>
                {f.contribution > 0 ? '+' : '−'}
                {Math.abs(f.contribution).toFixed(1)} pts
              </span>
            )}
          </li>
        ))}
      </ul>
      {why.preparation > 0 && (
        <p className="ui-why-note">Coach’s office adds {why.preparation.toFixed(2)} team strength to this forecast and to the series.</p>
      )}
      <p className="ui-why-note">A forecast, not a promise: the series is simulated when you play it.</p>
    </details>
  )
}

/**
 * Two-sided win chance: a split meter with a plain word, a spoken summary and
 * the optional "Why N%" disclosure. Neutral colours only (the sides are clubs,
 * not the blue/red map sides).
 */
export function OddsBar({ pct, leftLabel, rightLabel, why, className }) {
  return (
    <div className={className ? `ui-odds ${className}` : 'ui-odds'}>
      <Meter variant="split" value={pct} leftLabel={leftLabel} rightLabel={rightLabel} label={oddsWord(pct)} />
      <p className="sr-only">{`Estimated win chance: ${leftLabel} ${pct} percent, ${rightLabel} ${100 - pct} percent. ${oddsWord(pct)}.`}</p>
      {why && <OddsWhy pct={pct} why={why} />}
    </div>
  )
}
