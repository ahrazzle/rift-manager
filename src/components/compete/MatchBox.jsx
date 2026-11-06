import TeamCrest from '../TeamCrest.jsx'
import { Icon } from '../ui/index.js'

/**
 * One series in a bracket: two team rows, with the score when decided.
 * Winner: --win score, a check, and "won" for screen readers (never color alone).
 * rows: [{ teamId, name, seed?, score?, won?, you? }]. A null teamId renders TBD.
 */
export default function MatchBox({ rows, tbdLabels = ['TBD', 'TBD'], you = false, dim = false, label, children }) {
  return (
    <div className={['cmp-mt', you ? 'is-you' : '', dim ? 'is-tbd' : ''].filter(Boolean).join(' ')} role="group" aria-label={label}>
      {rows.map((row, i) => (
        <div
          key={i}
          className={['cmp-mt-row', row.won ? 'is-winner' : '', row.you ? 'is-you' : '', row.lost ? 'is-loser' : ''].filter(Boolean).join(' ')}
          {...(row.you ? { 'aria-current': 'true' } : {})}
        >
          {row.seed != null && <span className="cmp-mt-seed">{row.seed}</span>}
          {row.teamId ? (
            <>
              <TeamCrest teamId={row.teamId} name={row.name} size={20} />
              <span className="cmp-mt-name">{row.name}</span>
              {row.you && <span className="cmp-you-tag">You</span>}
            </>
          ) : (
            <span className="cmp-mt-name cmp-mt-tbd">{tbdLabels[i] ?? 'TBD'}</span>
          )}
          {row.score != null && (
            <span className="cmp-mt-score">
              {row.won && <Icon name="check" size={14} />}
              {row.score}
              {row.won && <span className="sr-only"> (won)</span>}
            </span>
          )}
        </div>
      ))}
      {children}
    </div>
  )
}
