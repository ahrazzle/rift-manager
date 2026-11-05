// ============================================================================
// Matchday — the staged series reveal.
//
// After PLAY_ROUND, the user's series is unveiled like a broadcast:
// walkout → game-by-game reveal → verdict with celebration (or the honest
// debrief). Pure presentation over the already-simmed result.
// ============================================================================
import { useEffect, useMemo, useState } from 'react'
import {
  teamName, seriesWon, seriesScore, streakOf,
  mvpOfGames, fmtKDA, coachNote,
} from '../game/hype.js'
import TeamCrest from './TeamCrest.jsx'
import MatchIcon from './MatchIcon.jsx'
import { SIM_SPEEDS } from '../game/useGameState.js'

function Confetti({ n = 70 }) {
  const pieces = useMemo(() => {
    const colors = ['#58e8ee', '#ff836f', '#e9f4ff', '#2b8eac']
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.9,
      dur: 2.4 + Math.random() * 2.2,
      color: colors[i % colors.length],
      w: 6 + Math.random() * 7,
    }))
  }, [n])
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="cf-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.w,
            height: p.w * 1.5,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function Matchday({ state, result, games, onDone, roundLabel, onSpeedChange }) {
  const [phase, setPhase] = useState('walkout') // walkout | games | verdict
  const [revealed, setRevealed] = useState(0)
  const [celebrate, setCelebrate] = useState(false)

  const speed = SIM_SPEEDS[state?.simSpeed] ?? SIM_SPEEDS.normal
  const WALKOUT_MS = speed.walkoutMs
  const GAME_MS = speed.gameMs

  const me = state.teamId
  const won = seriesWon(result, me)
  const { mine, theirs } = seriesScore(result, me)
  const oppId = result.homeId === me ? result.awayId : result.homeId
  const homeName = teamName(state, result.homeId)
  const awayName = teamName(state, result.awayId)
  const gamesList = games || []
  const isBO = gamesList.length > 3 ? 5 : 3
  const stageLabel = roundLabel ?? `Week ${result.round}`

  useEffect(() => {
    if (phase === 'walkout') {
      const t = setTimeout(() => setPhase(gamesList.length ? 'games' : 'verdict'), WALKOUT_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'games') {
      if (revealed < gamesList.length) {
        if (GAME_MS <= 0) { setRevealed(gamesList.length); return undefined }
        const t = setTimeout(() => setRevealed((r) => r + 1), GAME_MS)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setPhase('verdict'), GAME_MS <= 0 ? 0 : 650)
      return () => clearTimeout(t)
    }
    return undefined
  }, [phase, revealed, gamesList.length, WALKOUT_MS, GAME_MS])

  useEffect(() => {
    if (phase === 'verdict' && won) {
      const t = setTimeout(() => setCelebrate(true), 350)
      return () => clearTimeout(t)
    }
    return undefined
  }, [phase, won])

  const st = streakOf(state, me)
  const mvp = won ? mvpOfGames(gamesList, result.userSide) : null
  const note = phase === 'verdict' ? coachNote(state, result, gamesList) : null

  const skip = () => {
    setRevealed(gamesList.length)
    setPhase('verdict')
  }

  const gameWinnerName = (g) => {
    const youA = result.userSide !== 'away'
    const winnerIsYou = g.winner === (youA ? 'A' : 'B')
    return winnerIsYou ? teamName(state, me) : teamName(state, oppId)
  }
  const youA = result.userSide !== 'away'
  const runningWins = gamesList.slice(0, revealed).filter((g) => g.winner === (youA ? 'A' : 'B')).length
  const runningLosses = revealed - runningWins

  return (
    <div className="matchday broadcast-matchday" role="dialog" aria-label="Matchday reveal">
      {phase !== 'verdict' && (
        <button className="mw-skip" onClick={skip}>Skip ▸▸</button>
      )}
      <select
        className="year-select mw-speed"
        value={state?.simSpeed ?? 'normal'}
        onChange={(e) => onSpeedChange?.(e.target.value)}
        aria-label="Reveal speed" title="Sim speed"
      >
        {Object.keys(SIM_SPEEDS).map((k) => (
          <option key={k} value={k}>{SIM_SPEEDS[k].label}</option>
        ))}
      </select>
      <div className="mw-stage">
        {phase === 'walkout' && (
          <>
            <div className="mw-week">
              <span className="eyebrow">{stageLabel} · Matchday</span>
            </div>
            <div className="mw-walkout">
              <div className="mw-team">
                <TeamCrest teamId={me} name={teamName(state, me)} size={104} />
                <div className="mw-name">{teamName(state, me)} · You</div>
              </div>
              <div className="mw-vs">VS</div>
              <div className="mw-team right">
                <TeamCrest teamId={oppId} name={teamName(state, oppId)} size={104} />
                <div className="mw-name">{teamName(state, oppId)}</div>
              </div>
            </div>
            <div className="mw-bo"><MatchIcon name="trophy" size={18} /> Best of {isBO} <span>·</span> {state.league ?? "Regional"} series</div>
          </>
        )}

        {phase === 'games' && (
          <>
            <div className="mw-week">
              <span className="eyebrow">{homeName} vs {awayName}</span>
            </div>
            <div className="mw-games">
              {gamesList.slice(0, revealed).map((g) => {
                const youWonGame = gameWinnerName(g) === teamName(state, me)
                return (
                  <div key={g.game} className={`mw-game ${youWonGame ? 'won' : 'lost'}`}>
                    <span className="mw-gnum">Game {g.game}</span>
                    <span className="mw-gres">
                      <span className={youWonGame ? 'w' : 'l'}>{gameWinnerName(g)} WIN</span>
                    </span>
                    <span className="mw-gmeta">{g.durationMin > 0 ? `${g.durationMin} min` : ''}</span>
                    <span className="mw-score">{runningWins}–{runningLosses} <span className="hl-dim">series</span></span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {phase === 'verdict' && (
          <div className="mw-verdict">
            {celebrate && <Confetti />}
            <span className="eyebrow">{stageLabel} · Final</span>
            <div className={`mw-verdict-word ${won ? 'win' : 'loss'}`}>
              {won ? 'VICTORY' : 'DEFEAT'}
            </div>
            <p className="mw-verdict-sub">
              <b>{teamName(state, me)} {mine}</b> – <b>{theirs} {teamName(state, oppId)}</b>
            </p>
            {st && st.dir === 'W' && st.n >= 2 && won && (
              <div className="mw-streakline">
                <span className="streak-pill">🔥 {st.n}-series win streak</span>
              </div>
            )}
            {st && st.dir === 'L' && st.n >= 2 && !won && (
              <div className="mw-streakline">
                <span className="streak-pill cold">{st.n} straight defeats. Bounce back next week</span>
              </div>
            )}
            {mvp && mvp.rating >= 7 && (
              <div className="mvp-spot" style={{ maxWidth: 480, margin: '14px auto' }}>
                <span className="mvp-crown">👑</span>
                <div style={{ textAlign: 'left' }}>
                  <div className="mvp-name">{mvp.name} <span className="hl-dim">· MVP</span></div>
                  <div className="mvp-line">{fmtKDA(mvp)} · {mvp.cs}cs · {mvp.rating.toFixed(1)} rating</div>
                </div>
              </div>
            )}
            {note && (
              <div className={`coach-note ${note.tone === 'loss' ? 'cool' : ''}`} style={{ maxWidth: 560, margin: '14px auto', textAlign: 'left' }}>
                <div className="cn-head">{note.head}</div>
                <div dangerouslySetInnerHTML={{ __html: note.body }} />
              </div>
            )}
            <div className="mw-ctas">
              <button className="primary big" onClick={onDone}>
                {won ? 'Savour it: full detail →' : 'Full match detail →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
