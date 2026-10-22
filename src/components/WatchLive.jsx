// ============================================================================
// WatchLive — the IGL mode broadcast ticker.
//
// A game is simmed twice by the orchestrator (see src/game/igl.js): pass 1
// without the player's macro call, pass 2 with it (the official result).
// This component only presents:
//   early events (pass 1) → decision modal → verdict grade → late events
//   (pass 2) → done. It never sims anything itself.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { SIM_SPEEDS } from '../game/useGameState.js'
import { liveGameState } from '../game/igl.js'

const SPEED_LABEL = { slow: 'Slow', normal: 'Normal', fast: 'Fast', instant: 'Instant' }

function EventRow({ e, colorA, colorB }) {
  const color = e.side === 'A' ? colorA : e.side === 'B' ? colorB : '#5b6675'
  const minute = e.t != null ? `${Math.round(e.t)}'` : ''
  return (
    <div
      style={{
        display: 'flex', gap: 10, alignItems: 'baseline',
        padding: '7px 10px', marginBottom: 6,
        background: 'rgba(255,255,255,0.025)',
        borderLeft: `3px solid ${color}`,
        borderRadius: '0 8px 8px 0',
        animation: 'md-in 0.35s ease both',
      }}
    >
      <span style={{ color: '#8d99a8', fontSize: 12, minWidth: 34, fontVariantNumeric: 'tabular-nums' }}>
        {minute}
      </span>
      <span style={{ fontSize: 13.5, color: '#eef2f7' }}>{e.note}</span>
    </div>
  )
}

// Game-state panel: everything the coach needs to make the call.
// Shown during the ticker and the decision phase.
function GameStatePanel({ gs }) {
  if (!gs) return null
  const goldTxt = gs.goldDiff >= 0 ? `+${(gs.goldDiff / 1000).toFixed(1)}k` : `${(gs.goldDiff / 1000).toFixed(1)}k`
  const goldCls = gs.goldDiff >= 0 ? 'ok' : 'bad'
  const stat = (label, mine, foe) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
      <span style={{ color: '#eef2f7', fontWeight: 700 }}>{mine}</span>
      <span style={{ color: '#8d99a8' }}>{label}</span>
      <span style={{ color: '#eef2f7', fontWeight: 700 }}>{foe}</span>
    </div>
  )
  return (
    <div style={{ background: '#0d1117', border: '1px solid #232d3d', borderRadius: 12, padding: 12, marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span className="eyebrow">📊 Game state · {gs.minute}'</span>
        <span className={goldCls} style={{ fontWeight: 800, fontSize: 15 }}>{goldTxt} gold</span>
      </div>
      {stat('Kills', gs.myKills, gs.foeKills)}
      {stat('Dragons', gs.myDrakes, gs.foeDrakes)}
      {stat('Towers', gs.myTowers, gs.foeTowers)}
      {stat('Barons', gs.myBarons, gs.foeBarons)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
        {[['You', gs.myPlayers], ['Enemy', gs.foePlayers]].map(([label, players]) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: '#8d99a8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
            {(players || []).map((p) => (
              <div key={p.name + p.role} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                <span style={{ color: '#eef2f7' }}>{p.name} <span style={{ color: '#5b6675' }}>{p.role}</span></span>
                <span style={{ color: '#9fb0c7', fontVariantNumeric: 'tabular-nums' }}>{p.kills}/{p.deaths}/{p.assists}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WatchLive({
  earlyEvents = [],
  lateEvents = [],
  prompt,
  resolvedCallId = null,
  onCall,
  onDone,
  gameLabel,
  userWon,
  teamColorA,
  teamColorB,
  simSpeed = 'normal',
  onSpeedChange,
  earlyGame = null, // pass-1 game (players, goldTimeline, full early events)
  lateGame = null, // pass-2 game (set after the call; players/gold may differ)
  userIsA = true,
}) {
  const [phase, setPhase] = useState(resolvedCallId ? 'verdict' : 'early') // early | decide | verdict | late | done
  const [revealedEarly, setRevealedEarly] = useState(resolvedCallId ? earlyEvents.length : 0)
  const [revealedLate, setRevealedLate] = useState(0)
  const [pickedId, setPickedId] = useState(resolvedCallId)
  const feedRef = useRef(null)

  const speed = SIM_SPEEDS[simSpeed] ?? SIM_SPEEDS.normal
  const REVEAL_MS = speed.revealMs

  const colorA = teamColorA ?? '#e2012d'
  const colorB = teamColorB ?? '#3b82f6'
  const options = prompt?.options ?? []

  // Staggered reveal for the active ticker phase (instant = reveal all at once).
  useEffect(() => {
    if (phase === 'early' && revealedEarly < earlyEvents.length) {
      if (REVEAL_MS <= 0) { setRevealedEarly(earlyEvents.length); return undefined }
      const t = setTimeout(() => setRevealedEarly((r) => r + 1), REVEAL_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'early' && revealedEarly >= earlyEvents.length) {
      const t = setTimeout(() => setPhase('decide'), REVEAL_MS <= 0 ? 0 : 500)
      return () => clearTimeout(t)
    }
    if (phase === 'late' && revealedLate < lateEvents.length) {
      if (REVEAL_MS <= 0) { setRevealedLate(lateEvents.length); return undefined }
      const t = setTimeout(() => setRevealedLate((r) => r + 1), REVEAL_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'late' && revealedLate >= lateEvents.length) {
      const t = setTimeout(() => setPhase('done'), REVEAL_MS <= 0 ? 0 : 500)
      return () => clearTimeout(t)
    }
    return undefined
  }, [phase, revealedEarly, revealedLate, earlyEvents.length, lateEvents.length, REVEAL_MS])

  // Auto-scroll the feed to the newest event.
  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [revealedEarly, revealedLate, phase])

  const skip = () => {
    if (phase === 'early') setRevealedEarly(earlyEvents.length)
    else if (phase === 'late') setRevealedLate(lateEvents.length)
  }

  const pick = (id) => {
    setPickedId(id)
    if (onCall) onCall(id)
    setPhase('verdict')
  }

  const startLate = () => {
    setRevealedLate(0)
    setPhase('late')
  }

  const isOptimal = pickedId && prompt && pickedId === prompt.optimalCallId
  const shownEarly = earlyEvents.slice(0, revealedEarly)
  const shownLate = lateEvents.slice(0, revealedLate)
  const feedEvents = phase === 'late' || phase === 'done' ? shownLate : shownEarly

  // The game-state panel recomputes from revealed events, so it ticks up live
  // as the game sims. Late phase merges pass-1 early events with revealed
  // pass-2 events and reads pass-2's gold (the call changed the game).
  const panelEvents = phase === 'late' || phase === 'done'
    ? [...earlyEvents, ...shownLate]
    : shownEarly
  const panelGame = phase === 'late' || phase === 'done' ? (lateGame ?? earlyGame) : earlyGame
  const liveGs = panelGame ? liveGameState({
    events: panelEvents,
    goldTimeline: panelGame.goldTimeline ?? [],
    players: panelGame.players ?? [],
    userIsA,
  }) : null

  return (
    <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
        <span className="eyebrow"><span className="hot">●</span> Live · {gameLabel ?? 'Match'}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onSpeedChange && (
            <select
              className="year-select"
              value={simSpeed}
              onChange={(e) => onSpeedChange(e.target.value)}
              title="Sim speed"
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              {Object.keys(SIM_SPEEDS).map((k) => (
                <option key={k} value={k}>{SPEED_LABEL[k]}</option>
              ))}
            </select>
          )}
          {(phase === 'early' || phase === 'late') && (
            <button className="ghost" onClick={skip} style={{ padding: '6px 12px', fontSize: 12.5 }}>
              Skip ▸▸
            </button>
          )}
        </div>
      </div>

      {liveGs && phase !== 'verdict' && phase !== 'done' && (
        <GameStatePanel gs={liveGs} />
      )}

      {phase !== 'decide' && phase !== 'verdict' && (
        <div
          ref={feedRef}
          role="log"
          aria-live="polite"
          aria-label="Live match feed"
          style={{
            maxHeight: 340, overflowY: 'auto',
            background: '#06080c', border: '1px solid #232d3d', borderRadius: 12,
            padding: 10, marginTop: 8,
          }}
        >
          {feedEvents.length === 0 && (
            <p className="hint" style={{ margin: 4 }}>
              {phase === 'late' ? 'Simulating the rest of the game…' : 'The game is about to begin…'}
            </p>
          )}
          {feedEvents.map((e, i) => (
            <EventRow key={i} e={e} colorA={colorA} colorB={colorB} />
          ))}
        </div>
      )}

      {phase === 'decide' && (
        <div style={{ marginTop: 8 }}>
          <div className="coach-note">
            <div className="cn-head">🎙️ IGL decision</div>
            <div style={{ fontSize: 14 }}>{prompt?.context ?? 'Make the call, coach.'}</div>
          </div>
          <div className="tac-grid" style={{ marginTop: 12 }}>
            {options.map((c) => (
              <button key={c.id} className="tac" onClick={() => pick(c.id)} style={{ textAlign: 'left' }}>
                <span className="tac-name">{c.label}</span>
                <span className="tac-blurb">{c.desc}</span>
                <span className="tac-blurb" style={{ color: '#f5b301' }}>{c.edge}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'verdict' && (
        <div style={{ marginTop: 8 }}>
          <div className={`coach-note ${isOptimal ? '' : 'cool'}`}>
            <div className="cn-head">{isOptimal ? '✅ Optimal call' : '❌ Suboptimal call'}</div>
            <div style={{ fontSize: 14 }}>
              {isOptimal
                ? 'Textbook. That is exactly what the position demanded.'
                : prompt?.rationale ?? 'The game state pointed elsewhere.'}
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="primary" onClick={startLate}>Watch the rest →</button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <span className={`outcome ${userWon ? 'win' : 'loss'}`}>
            {userWon ? 'VICTORY' : 'DEFEAT'}
          </span>
          <div style={{ marginTop: 14 }}>
            <button className="primary big" onClick={onDone}>Continue →</button>
          </div>
        </div>
      )}
    </div>
  )
}
