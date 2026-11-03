// ============================================================================
// BoardCard — the board's expectations and your job security.
//
// Reads state.board { expectation, confidence } (reducer-owned). Renders
// gracefully when absent (returns null — the card simply doesn't exist yet).
// ============================================================================

function verdictFor(confidence) {
  if (confidence >= 70) return { text: 'Your job is safe', cls: 'edge' }
  if (confidence >= 40) return { text: 'Under pressure', cls: 'hot' }
  return { text: 'One bad split from the sack', cls: 'risk' }
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export default function BoardCard({ state }) {
  const board = state?.board
  if (!board) return null

  const confidence = Math.max(0, Math.min(100, board.confidence ?? 50))
  const verdict = verdictFor(confidence)
  const barColor =
    confidence >= 70 ? 'var(--good)' : confidence >= 40 ? 'var(--warn)' : 'var(--bad)'

  return (
    <div className="card">
      <span className="eyebrow">🏛️ Boardroom</span>
      <h2 style={{ marginTop: 6 }}>Board expects: {cap(board.expectation) ?? '—'}</h2>
      <div className="hype" style={{ marginTop: 10 }}>
        <div className="hype-top">
          <span className="hype-label">Board confidence</span>
          <span className="hype-word" style={{ color: barColor }}>{confidence}%</span>
        </div>
        <div className="hype-bar">
          <span style={{ width: `${confidence}%`, background: barColor, boxShadow: 'none' }} />
        </div>
      </div>
      <div className="tale" style={{ marginTop: 12 }}>
        <span className={`tale-chip ${verdict.cls}`}>{verdict.text}</span>
      </div>
    </div>
  )
}
