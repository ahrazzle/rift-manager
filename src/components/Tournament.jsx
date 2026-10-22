// ============================================================================
// Tournament — international bracket view (multileague-design §4, §7).
// Read-only 8-team single-elim bracket (QF/SF/F) + one per-round
// Play/Simulate button. Managed-team matches expand via MatchDetail through
// the shared detail seed shape (recomputeGames).
// P0 UX item 1: stage-gated reveal (t.revealedRounds) + keyboard stepping
// (N / →) + manual-resolver winner buttons + PNG export when done.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { TEAMS } from '../data/lck.js'
import MatchDetail, { recomputeGames } from './MatchDetail.jsx'
import Matchday from './Matchday.jsx'
import { exportPng } from '../utils/exportPng.js'

const STATIC_NAME = Object.fromEntries(TEAMS.map((t) => [t.id, t.name]))
const STATIC_COLOR = Object.fromEntries(TEAMS.map((t) => [t.id, t.color]))

function nameOf(state, teamId) {
  if (!teamId) return 'TBD'
  return state.teamMeta?.[teamId]?.name ?? STATIC_NAME[teamId] ?? teamId
}

function colorOf(state, teamId) {
  if (!teamId) return '#3a4150'
  return state.teamMeta?.[teamId]?.color ?? STATIC_COLOR[teamId] ?? '#3a4150'
}

function MatchCard({ state, dispatch, match, roundLabel, roundIndex, matchIndex, openKey, setOpenKey }) {
  const key = `${roundLabel}-${match.homeId}-${match.awayId}`
  const isOpen = openKey === key
  const games = match.detail
    ? recomputeGames({ detail: match.detail, homeId: match.homeId, awayId: match.awayId })
    : null
  const homeWon = match.winner && match.winner === match.homeId
  return (
    <div className="card result" key={key}>
      <div className="result-head">
        <span className="rw">{roundLabel}</span>
        {match.isUser && <span className="hint">🎮 YOUR MATCH</span>}
        {match.winner && (
          <span className="outcome win">{nameOf(state, match.winner)} ✓</span>
        )}
      </div>
      <div className="result-score">
        <span style={{ fontWeight: homeWon ? 800 : 400 }}>
          <span className="dot" style={{ background: colorOf(state, match.homeId) }} />{' '}
          {nameOf(state, match.homeId)}
        </span>
        <span className="rs">
          {match.winner ? `${match.aWins}–${match.bWins}` : 'vs'}
        </span>
        <span style={{ fontWeight: match.winner && !homeWon ? 800 : 400 }}>
          {nameOf(state, match.awayId)}{' '}
          <span className="dot" style={{ background: colorOf(state, match.awayId) }} />
        </span>
      </div>
      {state.tournament?.resolver === 'manual' && !match.winner && match.homeId && match.awayId && (
        <div className="actions">
          <button className="primary" onClick={() =>
            dispatch({ type: 'SET_TOURNAMENT_WINNER', roundIndex, matchIndex, winnerId: match.homeId })}>
            {nameOf(state, match.homeId)} →
          </button>
          <button className="primary" onClick={() =>
            dispatch({ type: 'SET_TOURNAMENT_WINNER', roundIndex, matchIndex, winnerId: match.awayId })}>
            {nameOf(state, match.awayId)} →
          </button>
        </div>
      )}
      {match.detail && games && (
        <div className="md-toggle-row">
          <button
            type="button"
            className="ghost"
            aria-expanded={isOpen}
            onClick={() => setOpenKey(isOpen ? null : key)}
          >
            Match detail →
          </button>
        </div>
      )}
      {isOpen && match.detail && (
        <MatchDetail
          round={roundLabel}
          homeId={match.homeId}
          awayId={match.awayId}
          aWins={match.aWins}
          bWins={match.bWins}
          userSide={match.userSide}
          games={games || []}
          onBack={() => setOpenKey(null)}
          state={state}
        />
      )}
    </div>
  )
}

export function phaseLabel(phase) {
  if (phase === 'msi') return 'MSI'
  if (phase === 'worlds') return 'Worlds'
  if (phase === 'done') return 'Season Done'
  return 'Regional Split'
}

export default function Tournament({ state, dispatch }) {
  const [openKey, setOpenKey] = useState(null)
  const [busy, setBusy] = useState(false)
  const [shotErr, setShotErr] = useState(null)
  const [mdData, setMdData] = useState(null) // { match, roundLabel } — Matchday reveal for the user's series
  const pendingMdRef = useRef(null)
  const shotRef = useRef(null)
  const t = state.tournament

  const ri = t ? t.rounds.findIndex((r) => r.matches.some((m) => !m.winner)) : -1
  const current = t && ri >= 0 ? t.rounds[ri] : null
  const userInRound = current?.matches.some((m) => m.isUser && !m.winner)
  const title = t?.kind === 'msi' ? 'Mid-Season Invitational' : 'World Championship'
  const revealed = t ? (t.revealedRounds ?? t.rounds.length) : 0
  const visible = t ? t.rounds.slice(0, revealed) : []
  const tStatus = t?.status

  function playRound() {
    const um = current?.matches.find((m) => m.isUser && !m.winner)
    if (um) {
      pendingMdRef.current = {
        roundIndex: ri,
        matchIndex: current.matches.indexOf(um),
        roundLabel: current.name,
      }
    }
    setBusy(true)
    setTimeout(() => {
      dispatch({ type: 'PLAY_TOURNAMENT_ROUND' })
      setBusy(false)
    }, 20)
  }

  // After the bracket round sims, unveil the user's series with the Matchday
  // reveal instead of dropping them straight onto the bracket.
  useEffect(() => {
    const p = pendingMdRef.current
    if (!p || !state.tournament) return
    const m = state.tournament.rounds[p.roundIndex]?.matches[p.matchIndex]
    if (m && m.winner) {
      pendingMdRef.current = null
      setMdData({ match: m, roundLabel: p.roundLabel })
    }
  }, [state.tournament])

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'n' && e.key !== 'N' && e.key !== 'ArrowRight') return
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
      if (!current || busy || tStatus !== 'active') return
      // skip when a manual-resolver match in the current round is still undecided
      // (user must click a winner first — see §1d)
      playRound()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, busy, tStatus])

  if (!t) return null

  const mdResult = mdData ? {
    round: mdData.roundLabel,
    homeId: mdData.match.homeId,
    awayId: mdData.match.awayId,
    aWins: mdData.match.aWins,
    bWins: mdData.match.bWins,
    homeWon: mdData.match.winner === mdData.match.homeId,
    userSide: mdData.match.userSide ?? (mdData.match.homeId === state.teamId ? 'home' : 'away'),
  } : null
  const mdGames = mdData?.match.detail
    ? recomputeGames({ detail: mdData.match.detail, homeId: mdData.match.homeId, awayId: mdData.match.awayId })
    : null

  return (
    <div className="stack">
      {mdData && mdResult && (
        <Matchday
          state={state}
          result={mdResult}
          games={mdGames}
          roundLabel={mdData.roundLabel}
          onDone={() => setMdData(null)}
        />
      )}
      <div className="card" ref={shotRef}>
        <h2>
          {t.kind === 'playoffs' ? 'LCK Playoffs — Top 4' : title} {t.status === 'done' ? '🏆' : ''}
        </h2>
        <p className="tag">
          {t.kind === 'playoffs'
            ? 'Top 4 by standings · (1v4, 2v3) · Bo3 semifinals + Bo3 final'
            : 'Top 2 per league · single elimination · each series one Bo3-native sim'}
          {t.status === 'done' && t.championId && (
            <> — <strong>Champion: {nameOf(state, t.championId)}</strong></>
          )}
        </p>
        {current && (
          <div className="actions">
            <button className="primary big" disabled={busy} onClick={playRound}>
              {busy ? 'Simulating…' : userInRound ? `Play ${current.name} →` : `Simulate ${current.name} →`}
            </button>
            {t.status === 'active' && (
              <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Resolver
                <select
                  className="year-select"
                  style={{ width: 'auto', padding: '8px 10px' }}
                  value={t.resolver ?? 'biased'}
                  onChange={(e) => dispatch({ type: 'SET_RESOLVER', resolver: e.target.value })}
                  title="How undecided series are resolved"
                >
                  <option value="biased">Biased — form decides</option>
                  <option value="random">Random — coin flip</option>
                  <option value="manual">Manual — you pick winners</option>
                </select>
              </label>
            )}
          </div>
        )}
        {current && t.status === 'active' && (
          <p className="hint">Press N or → to sim the round.</p>
        )}
        {t.status === 'done' && (
          <p className="hint">
            {t.kind === 'msi'
              ? 'MSI complete — build the Worlds bracket from the Dashboard to continue.'
              : 'Worlds complete — advance from the Dashboard.'}
          </p>
        )}
        {t.status === 'done' && (
          <>
            <button className="ghost" onClick={async () => {
              setShotErr(null)
              try { await exportPng(shotRef, `lck-${t.kind}-bracket.png`) }
              catch { setShotErr('Export failed — try again.') }
            }}>Download PNG ⬇</button>
            {shotErr && <p className="hint">{shotErr}</p>}
          </>
        )}
      </div>

      {visible.map((round, ridx) => (
        <div key={round.name}>
          <h3>{round.name}</h3>
          {round.matches.map((m, i) => (
            <MatchCard
              key={`${round.name}-${i}`}
              state={state}
              dispatch={dispatch}
              match={m}
              roundLabel={round.name}
              roundIndex={ridx}
              matchIndex={i}
              openKey={openKey}
              setOpenKey={setOpenKey}
            />
          ))}
        </div>
      ))}
      {revealed < t.rounds.length && t.status === 'active' && (
        <p className="hint">🔒 {t.rounds.length - revealed} round(s) locked — sim to reveal.</p>
      )}
    </div>
  )
}
