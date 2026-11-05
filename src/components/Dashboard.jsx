import { useState, useMemo, useEffect, useRef } from 'react'
import { buildLCKSchedule } from '../engine/season.js'
import { TEAMS, ROLES, ROLE_LABEL } from '../data/lck.js'
import { TEAM_BY_ID, explainWinProb, matchupSeed, matchupOppTactic, seededRng } from '../game/logic.js'
import { orderStandings } from '../game/useGameState.js'
import {
  teamName, teamColor, seriesWon, seriesScore, streakOf, formDots, fanMood,
  rivalryVs, headlines, achievements, mvpOfGames, fmtKDA, coachNote,
} from '../game/hype.js'
import MatchDetail, { recomputeGames } from './MatchDetail.jsx'
import Tournament, { phaseLabel } from './Tournament.jsx'
import Matchday from './Matchday.jsx'
import Preparation from './Preparation.jsx'
import MatchReview from './MatchReview.jsx'
import TeamCrest from './TeamCrest.jsx'
import MatchIcon from './MatchIcon.jsx'

const FALLBACK_SCHEDULE = buildLCKSchedule()
const STATIC_NAME = Object.fromEntries(TEAMS.map((t) => [t.id, t.name]))

function nameOf(state, teamId) {
  return state.teamMeta?.[teamId]?.name ?? STATIC_NAME[teamId] ?? teamId
}

function colorOf(state, teamId) {
  return state.teamMeta?.[teamId]?.color ?? TEAM_BY_ID[teamId]?.color
}

// Regional → Playoffs → MSI → Worlds → Done progress banner.
function PhaseBanner({ phase }) {
  const steps = ['regional', 'playoffs', 'msi', 'worlds', 'done']
  const labels = { regional: 'Regional', playoffs: 'Playoffs', msi: 'MSI', worlds: 'Worlds', done: 'Done' }
  return (
    <div className="card">
      <div className="tabs" role="navigation" aria-label="Season phase">
        {steps.map((s) => (
          <span key={s} className={phase === s ? 'tab active' : 'tab'}>
            {labels[s]}
          </span>
        ))}
      </div>
      <p className="hint">Phase: {phaseLabel(phase)}. Top 2 per league qualify for MSI + Worlds.</p>
    </div>
  )
}

function HypeMeter({ state }) {
  const mood = fanMood(state)
  const dots = formDots(state)
  return (
    <div className="hype">
      <div className="hype-top">
        <span className="hype-label">Fan hype</span>
        <span className={`hype-word ${mood.cls}`}>{mood.word}</span>
      </div>
      <div className="hype-bar"><span style={{ width: `${mood.pct}%` }} /></div>
      <div className="form-dots">
        {dots.map((d, i) => (
          <span key={i} className={`form-dot ${d ?? 'na'}`}>{d ?? '·'}</span>
        ))}
        <span className="form-cap">last five series</span>
      </div>
    </div>
  )
}

function HeadlinesCard({ state, userGames }) {
  const lines = headlines(state, userGames)
  if (!lines.length) return null
  return (
    <div className="card">
      <span className="eyebrow">📰 Around the league</span>
      <ul className="headlines">
        {lines.map((l, i) => (
          <li key={i}>
            <span className={`hl-icon ${l.cls}`}>{l.icon}</span>
            <span className="hl-text" dangerouslySetInnerHTML={{ __html: l.text }} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function AchievementsCard({ state, gamesByRound }) {
  const achs = achievements(state, gamesByRound)
  const unlocked = achs.filter((a) => a.unlocked)
  const locked = achs.filter((a) => !a.unlocked)
  return (
    <div className="card">
      <span className="eyebrow">🏅 Trophy cabinet · {unlocked.length}/{achs.length}</span>
      <div className="ach-grid">
        {[...unlocked, ...locked].map((a) => (
          <div key={a.id} className={`ach ${a.unlocked ? '' : 'locked'}`} title={a.desc}>
            <span className="ach-icon">{a.unlocked ? a.icon : '🔒'}</span>
            <div>
              <div className="ach-name">{a.name}</div>
              <div className="ach-desc">{a.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Toasts({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="ach-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="ach-toast" role="status">
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          <span><b>Achievement unlocked:</b> {t.name}</span>
        </div>
      ))}
    </div>
  )
}

function OffseasonReportPanel({ report, dispatch }) {
  if (!report) return null
  const { seasonIndexCompleted, roster, lineupChanges, released, aiChurn } = report
  return (
    <div className="card offseason-panel" aria-label="Off-season development report">
      <div className="offseason-head">
        <span className="eyebrow">📋 Off-season report · split {seasonIndexCompleted} complete</span>
        <button type="button" className="ghost" onClick={() => dispatch({ type: 'DISMISS_OFFSEASON_REPORT' })}>
          Dismiss
        </button>
      </div>
      <p className="hint">Career-only annual growth from Advance Season. Potential is a fixed cap — not chemistry or mentoring.</p>
      <h3>Roster development</h3>
      <ul className="offseason-roster">
        {roster.map((p) => {
          const delta = p.ovrAfter - p.ovrBefore
          const deltaStr = delta === 0 ? '±0' : `${delta > 0 ? '+' : ''}${delta}`
          return (
            <li key={p.id}>
              <span className="os-name">{p.name}</span>
              <span className="os-meta">{ROLE_LABEL[p.role] ?? p.role}</span>
              <span className="os-meta">Age {p.ageBefore}→{p.ageAfter}</span>
              <span className="os-delta">{deltaStr} OVR ({p.ovrBefore}→{p.ovrAfter})</span>
              {p.atCeiling && <span className="tale-chip outlook-ceiling">At ceiling (Pot {p.potential})</span>}
              {p.oswSpike != null && (
                <span className="tale-chip hot" title="Revealed one-season-wonder spike">OSW +{p.oswSpike}</span>
              )}
            </li>
          )
        })}
      </ul>
      {lineupChanges.length > 0 && (
        <>
          <h3>Starter changes</h3>
          <ul className="offseason-list">
            {lineupChanges.map((c) => (
              <li key={c.role}>
                {ROLE_LABEL[c.role] ?? c.role}: {c.outName} → {c.inName}
              </li>
            ))}
          </ul>
        </>
      )}
      {released.length > 0 && (
        <>
          <h3>Released (contracts)</h3>
          <ul className="offseason-list">
            {released.map((p) => (
              <li key={p.id}>{p.name} ({ROLE_LABEL[p.role] ?? p.role}, OVR {p.ovr})</li>
            ))}
          </ul>
        </>
      )}
      <h3>League churn</h3>
      {aiChurn.length === 0 ? (
        <p className="hint">No AI churn this off-season.</p>
      ) : (
        <ul className="offseason-list">
          {aiChurn.map((c, i) => (
            <li key={i}>
              {c.teamId}: cut {c.cutName}, signed {c.signedName} ({ROLE_LABEL[c.role] ?? c.role})
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Dashboard({ state, dispatch, setTab, totalRounds }) {
  const [busy, setBusy] = useState(false)
  // view: 'preview' shows the upcoming week's matchup; 'result' shows the
  // week just simulated inline (full MatchDetail) so the player never has to
  // jump to a separate Results page.
  const [view, setView] = useState('preview')
  const [showDetail, setShowDetail] = useState(true)
  const [matchday, setMatchday] = useState(false)
  const [toasts, setToasts] = useState([])
  const [preparationFocus, setPreparationFocus] = useState(null)
  const prevAchRef = useRef(null)

  const round = state.round
  const schedule = state.schedule ?? FALLBACK_SCHEDULE
  const matches = state.finished ? [] : schedule[round - 1] || []
  const myMatch = matches.find(([h, a]) => h === state.teamId || a === state.teamId)

  const oppId = myMatch
    ? myMatch[0] === state.teamId ? myMatch[1] : myMatch[0]
    : null
  const iAmHome = myMatch ? myMatch[0] === state.teamId : false

  const preview = useMemo(() => {
    if (!myMatch) return null
    // Single deterministic estimate: the hero %, the Why-panel, and the
    // Strategy tab all derive from the same seeded draw, so they agree exactly.
    const seed = matchupSeed(state, oppId)
    const oppTactic = matchupOppTactic(state, oppId)
    const why = explainWinProb(state, oppId, { n: 300, rng: seededRng(seed), oppTactic })
    return { p: why.prob, oppTactic, why }
  }, [myMatch, oppId, round, state.lineup, state.form, state.tactic, state.strategy, state.teams, state.teamId, state.career, state.seriesOptions, state.preparation])

  // The just-played round (state.round was already advanced by PLAY_ROUND).
  const lastRound = state.round - 1
  const lastMatches = lastRound > 0 ? (schedule[lastRound - 1] || []) : []
  const userResult = state.results.find((r) => r.round === lastRound && r.isUser)
  const otherResults = state.results.filter((r) => r.round === lastRound && !r.isUser)
  const userGames = useMemo(
    () => (userResult ? recomputeGames(userResult) : null),
    [userResult],
  )
  const gamesByRound = useMemo(
    () => (userResult && userGames ? { [userResult.round]: userGames } : null),
    [userResult, userGames],
  )

  // Achievement toasts: snapshot ids before the sim, diff after it lands.
  useEffect(() => {
    if (prevAchRef.current === null) {
      prevAchRef.current = achievements(state).filter((a) => a.unlocked).map((a) => a.id)
      return
    }
    const now = achievements(state, gamesByRound).filter((a) => a.unlocked).map((a) => a.id)
    const freshIds = now.filter((id) => !prevAchRef.current.includes(id))
    if (freshIds.length) {
      const fresh = achievements(state, gamesByRound).filter((a) => freshIds.includes(a.id))
      setToasts(fresh)
      const t = setTimeout(() => setToasts([]), 6500)
      prevAchRef.current = now
      return () => clearTimeout(t)
    }
    prevAchRef.current = now
    return undefined
  }, [state.results, state.playoffChampionId, state.tournament, state.phase])

  function playWeek() {
    dispatch({ type: 'PREVIEW_MATCH', action: { type: 'PLAY_ROUND' } })
  }

  function closeMatchday() {
    setMatchday(false)
    setView('result')
  }

  // The Matchday reveal sits above every branch (preview, result, finished).
  if (matchday && userResult) {
    return <Matchday state={state} result={userResult} games={userGames} onDone={closeMatchday} onSpeedChange={(speed) => dispatch({ type: 'SET_SIM_SPEED', speed })} />
  }

  if (state.finished && view === 'preview') {
    const myRow = state.standings[state.teamId]
    const isCareer = state.mode === 'career' && state.career
    const t = state.tournament
    const rows = orderStandings(state.standings)
    const qualified = rows.slice(0, 2).some((r) => r.teamId === state.teamId)
    const banner = <PhaseBanner phase={state.phase} />

    // Active international bracket — play it here.
    if (t && t.status === 'active') {
      return (
        <div className="stack">
          {banner}
          <Tournament state={state} dispatch={dispatch} />
          <Toasts toasts={toasts} />
        </div>
      )
    }

    const advanceOrNew = isCareer ? (
      <button className="primary big" onClick={() => dispatch({ type: 'ADVANCE_SEASON' })}>
        Advance to Season {state.career.seasonIndex + 1} →
      </button>
    ) : (
      <button className="primary" onClick={() => dispatch({ type: 'RESET' })}>
        Start a New Season
      </button>
    )

    // MSI done — Worlds unlocks (same qualifier set).
    if (t && t.kind === 'msi' && t.status === 'done') {
      return (
        <div className="stack">
          {banner}
          <div className="card">
            <h2>MSI Complete 🏆</h2>
            <p>
              {t.championId === state.teamId
                ? 'You won MSI! '
                : `${t.championId} won MSI. `}
              {qualified
                ? 'The World Championship bracket is ready.'
                : 'You did not qualify. Sim Worlds as a spectator or move on.'}
            </p>
            <div className="actions">
              <button className="primary big" onClick={() => dispatch({ type: 'BUILD_TOURNAMENT', kind: 'worlds' })}>
                Start Worlds →
              </button>
              {advanceOrNew}
            </div>
          </div>
          <Tournament state={state} dispatch={dispatch} />
          <AchievementsCard state={state} gamesByRound={gamesByRound} />
          <Toasts toasts={toasts} />
        </div>
      )
    }

    // Worlds done — season over.
    if (t && t.kind === 'worlds' && t.status === 'done') {
      if (isCareer) {
        const idx = state.career.seasonIndex
        const max = state.career.maxSeasons
        if (idx >= max) {
          return (
            <div className="stack">
              {banner}
              <div className="card">
                <h2>Season {idx} Complete — End of the Road 🏁</h2>
                <p>
                  Regional {myRow.W}–{myRow.L}
                  {t.championId === state.teamId ? ' · 🌍 WORLD CHAMPIONS' : ''}.
                  Time to hang up the clipboard?
                </p>
                <button className="primary big" onClick={() => dispatch({ type: 'RETIRE' })}>
                  Retire →
                </button>
              </div>
              <AchievementsCard state={state} gamesByRound={gamesByRound} />
              <Toasts toasts={toasts} />
            </div>
          )
        }
        return (
          <div className="stack">
            {banner}
            <div className="card">
              <h2>Season {idx} Complete 🏆</h2>
              <p>
                Regional {myRow.W}–{myRow.L} ({myRow.points} pts)
                {t.championId === state.teamId ? ' · 🌍 WORLD CHAMPIONS' : ''}. See the{' '}
                <button className="link" onClick={() => setTab('standings')}>Standings</button> and{' '}
                <button className="link" onClick={() => setTab('results')}>Results</button> tabs.
              </p>
              {advanceOrNew}
            </div>
            <AchievementsCard state={state} gamesByRound={gamesByRound} />
            <Toasts toasts={toasts} />
          </div>
        )
      }
      return (
        <div className="stack">
          {banner}
          <div className="card">
            <h2>Season Complete 🏆</h2>
            <p>
              You finished {myRow.W}–{myRow.L} ({myRow.points} pts)
              {t.championId === state.teamId ? ' and won Worlds! 🌍' : '.'} See the{' '}
              <button className="link" onClick={() => setTab('standings')}>Standings</button> and{' '}
              <button className="link" onClick={() => setTab('results')}>Results</button> tabs.
            </p>
            {advanceOrNew}
          </div>
          <AchievementsCard state={state} gamesByRound={gamesByRound} />
          <Toasts toasts={toasts} />
        </div>
      )
    }

    // Regional finished. If playoffs are active, route straight to the bracket.
    if (state.phase === 'playoffs' && state.tournament && state.tournament.status === 'active') {
      return (
        <div className="stack">
          {banner}
          <Tournament state={state} dispatch={dispatch} />
          <Toasts toasts={toasts} />
        </div>
      )
    }

    // Regional finished, no tournament yet — offer MSI (skippable).
    if (isCareer) {
      const idx = state.career.seasonIndex
      const max = state.career.maxSeasons
      const titles = state.career.history.filter((h) => h.championId === state.teamId).length
      if (idx >= max) {
        return (
          <div className="stack">
            {banner}
            <div className="card">
              <h2>Season {idx} Complete — End of the Road 🏁</h2>
              <p>
                You finished {myRow.W}–{myRow.L} ({myRow.points} pts) in season {idx} of {max}.
                Career record: {state.career.history.length} past season(s), {titles} title(s).
                Time to hang up the clipboard?
              </p>
              <button className="primary big" onClick={() => dispatch({ type: 'RETIRE' })}>
                Retire →
              </button>
            </div>
            <AchievementsCard state={state} gamesByRound={gamesByRound} />
            <Toasts toasts={toasts} />
          </div>
        )
      }
      return (
        <div className="stack">
          {banner}
          <div className="card">
            <h2>Regional Split Complete 🏆</h2>
            <p>
              You finished {myRow.W}–{myRow.L} ({myRow.points} pts).{' '}
              {qualified
                ? 'You qualified for MSI — top 2 in your league!'
                : 'You missed the top 2 — MSI sims without you.'}{' '}
              See the{' '}
              <button className="link" onClick={() => setTab('standings')}>Standings</button> and{' '}
              <button className="link" onClick={() => setTab('results')}>Results</button> tabs.
            </p>
            <div className="actions">
              <button className="primary big" onClick={() => dispatch({ type: 'BUILD_TOURNAMENT', kind: 'msi' })}>
                Start MSI →
              </button>
              {advanceOrNew}
            </div>
          </div>
          <AchievementsCard state={state} gamesByRound={gamesByRound} />
          <Toasts toasts={toasts} />
        </div>
      )
    }
    return (
      <div className="stack">
        {banner}
        <div className="card">
          <h2>Regional Split Complete 🏆</h2>
          <p>
            You finished {myRow.W}–{myRow.L} ({myRow.points} pts).{' '}
            {qualified ? 'You qualified for MSI!' : 'You missed the top 2.'} See the{' '}
            <button className="link" onClick={() => setTab('standings')}>Standings</button> and{' '}
            <button className="link" onClick={() => setTab('results')}>Results</button> tabs.
          </p>
          <div className="actions">
            <button className="primary big" onClick={() => dispatch({ type: 'BUILD_TOURNAMENT', kind: 'msi' })}>
              Start MSI →
            </button>
            {advanceOrNew}
          </div>
        </div>
        <AchievementsCard state={state} gamesByRound={gamesByRound} />
        <Toasts toasts={toasts} />
      </div>
    )
  }

  // --- RESULT VIEW: the week just simulated, inline, with Next button ---
  if (view === 'result' && userResult) {
    const youHome = userResult.userSide === 'home'
    const youWon = youHome ? userResult.homeWon : !userResult.homeWon
    const { mine, theirs } = seriesScore(userResult, state.teamId)
    const st = streakOf(state, state.teamId)
    const mvp = mvpOfGames(userGames, userResult.userSide)
    const note = coachNote(state, userResult, userGames)
    return (
      <div className="stack">
        <div className={`card verdict-card ${youWon ? 'win' : 'loss'}`}>
          <div className="result-head">
            <span className="rw">Week {lastRound} — Result</span>
            <span className={youWon ? 'outcome win' : 'outcome loss'}>
              {youWon ? 'YOU WIN' : 'YOU LOSE'}
            </span>
          </div>
          <div className={`verdict-word ${youWon ? 'win' : 'loss'}`}>
            {youWon ? 'VICTORY' : 'DEFEAT'}
          </div>
          <div className="result-score">
            <span>{nameOf(state, userResult.homeId)}</span>
            <span className="rs">{userResult.aWins}–{userResult.bWins}</span>
            <span>{nameOf(state, userResult.awayId)}</span>
          </div>
          {st && st.n >= 2 && (
            <div className="mw-streakline">
              <span className={`streak-pill ${st.dir === 'L' ? 'cold' : ''}`}>
                {st.dir === 'W' ? `🔥 ${st.n}-series win streak` : `${st.n} straight defeats`}
              </span>
            </div>
          )}
          {mvp && mvp.rating >= 7 && (
            <div className="mvp-spot">
              <span className="mvp-crown">👑</span>
              <div>
                <div className="mvp-name">{mvp.name} <span className="hl-dim">· series MVP</span></div>
                <div className="mvp-line">{fmtKDA(mvp)} · {mvp.cs}cs · {mvp.rating.toFixed(1)} rating</div>
              </div>
            </div>
          )}
          <div className={`coach-note ${note.tone === 'loss' ? 'cool' : ''}`}>
            <div className="cn-head">{note.head}</div>
            <div dangerouslySetInnerHTML={{ __html: note.body }} />
          </div>
        </div>

        <MatchReview games={userGames || []} userSide={userResult.userSide} onPrepare={!state.finished ? (focus) => { setPreparationFocus(focus); setView('preview') } : null} />
        <HeadlinesCard state={state} userGames={userGames} />
        <AchievementsCard state={state} gamesByRound={gamesByRound} />

        <div className="card">
          <h3>Match Detail</h3>
          {showDetail && (
            <MatchDetail
              round={lastRound}
              homeId={userResult.homeId}
              awayId={userResult.awayId}
              aWins={userResult.aWins}
              bWins={userResult.bWins}
              userSide={userResult.userSide}
              games={userGames || []}
              showReview={false}
              onBack={() => setShowDetail(false)}
              state={state}
            />
          )}
          {!showDetail && (
            <button className="ghost" onClick={() => setShowDetail(true)}>
              Show match detail →
            </button>
          )}
        </div>

        {otherResults.length > 0 && (
          <div className="card">
            <h3>Other Results — Week {lastRound}</h3>
            <ul className="fixtures">
              {otherResults.map((r, i) => (
                <li key={i}>
                  <span>{nameOf(state, r.homeId)}</span>
                  <span className="score">{r.aWins}–{r.bWins}</span>
                  <span>{nameOf(state, r.awayId)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="actions">
          <button
            className="primary big"
            onClick={() => setView('preview')}
          >
            {state.finished ? 'See Season Summary →' : `Next Game — Week ${state.round} →`}
          </button>
        </div>
        <Toasts toasts={toasts} />
      </div>
    )
  }

  // --- PREVIEW VIEW: upcoming week's matchup ---
  const stPrev = streakOf(state, state.teamId)
  const riv = oppId ? rivalryVs(state, oppId) : null
  const probPct = Math.round((preview?.p ?? 0) * 100)
  return (
    <div className="stack">
      <h1 className="sr-only">Dashboard</h1>
      <PhaseBanner phase={state.phase} />
      {state.mode === 'career' && state.offseasonReport && (
        <OffseasonReportPanel report={state.offseasonReport} dispatch={dispatch} />
      )}
      <div
        className="card matchup-card broadcast-next-match"
        style={{
          '--glow-a': `${colorOf(state, state.teamId)}33`,
          '--glow-b': `${colorOf(state, oppId)}2e`,
        }}
      >
        <span className="eyebrow">Week {round} of {totalRounds}{state.league ? ` · ${state.league}` : ''}</span>
        {myMatch ? (
          <div className="matchup">
            <div className="side">
              <TeamCrest teamId={state.teamId} name={nameOf(state, state.teamId)} size={88} />
              <div className="side-sub"><strong>{nameOf(state, state.teamId)}</strong> · You</div>
            </div>
            <div className="vs">
              <div className="vs-label">vs</div>
              <div className={`prob ${probPct < 45 ? 'longshot' : ''}`}>
                {probPct}%
                <span className="prob-sub">est. win</span>
              </div>
            </div>
            <div className="side">
              <TeamCrest teamId={oppId} name={nameOf(state, oppId)} size={88} />
              <div className="side-sub">{nameOf(state, oppId)}</div>
            </div>
          </div>
        ) : (
          <p>No match found.</p>
        )}

        <div className="tale">
          {stPrev && stPrev.n >= 2 && (
            <span className={`tale-chip ${stPrev.dir === 'W' ? 'hot' : 'risk'}`}>
              {stPrev.dir === 'W' ? '🔥' : '❄'} <b>{stPrev.dir}{stPrev.n}</b> streak
            </span>
          )}
          {riv && riv.played > 0 && (
            <span className="tale-chip">⚔️ H2H <b>{riv.myW}–{riv.oppW}</b> this season</span>
          )}
          {probPct >= 65 && <span className="tale-chip">📈 Heavy favourite</span>}
          {probPct < 40 && <span className="tale-chip risk">🎲 Underdog — steal one</span>}
          {state.seriesOptions?.fearless && <span className="tale-chip hot">🙈 Fearless draft ON</span>}
        </div>

        <HypeMeter state={state} />

        {preview?.why && (
          <details className="why">
            <summary>Why {probPct}%? — top factors</summary>
            <ul>
              {preview.why.factors.map((f) => (
                <li key={f.label}>
                  {f.label}:{' '}
                  {f.dash ? '—' : `${f.contribution > 0 ? '+' : ''}${f.contribution.toFixed(1)}pp`}
                </li>
              ))}
            </ul>
            {preview.why.preparation > 0 && <p className="hint">Weekly preparation adds {preview.why.preparation.toFixed(2)} team strength to this forecast and your next series.</p>}
          </details>
        )}

        <label className="broadcast-watch-option">
          <MatchIcon name="eye" size={22} />
          <span><strong>Show simulation</strong><small>Watch your next series on the animated Rift.</small></span>
          <input type="checkbox" role="switch" checked={!!state.matchOptions?.showSimulation || !!state.matchOptions?.igl}
            disabled={!!state.matchOptions?.igl}
            onChange={(e) => dispatch({ type: 'SET_MATCH_OPTION', key: 'showSimulation', value: e.target.checked })} />
        </label>
        <div className="actions" style={{ marginTop: 14 }}>
          <button
            className="primary big"
            disabled={busy || !myMatch}
            onClick={playWeek}
          >
            {busy ? 'Simulating…' : 'Play Week →'}
          </button>
          <a className="prep-jump" href="#weekly-preparation">{state.trainedRound === state.round ? 'Preparation complete ✓' : 'Prepare your team ↓'}</a>
          {state.mode === 'career' && state.career?.status === 'active' && (
            <button
              className="ghost"
              onClick={() => dispatch({ type: 'RETIRE' })}
              title="End your managerial career now (completed seasons are kept)"
            >
              Retire Career
            </button>
          )}
        </div>
        <p className="hint">
          Tactic: <strong>{state.tactic.style}/{state.tactic.phase}</strong> — adjust in{' '}
          <button className="link" onClick={() => setTab('tactics')}>Tactics</button>. Lineup set in{' '}
          <button className="link" onClick={() => setTab('lineup')}>Lineup</button>. Gameplan in{' '}
          <button className="link" onClick={() => setTab('strategy')}>Strategy</button>.
          {iAmHome ? ' (home)' : ' (away)'}
        </p>
      </div>

      <Preparation key={`${state.career?.seasonIndex ?? 1}-${state.round}`} state={state} dispatch={dispatch} suggestedFocus={preparationFocus} />
      <HeadlinesCard state={state} />
      <AchievementsCard state={state} gamesByRound={gamesByRound} />

      <div className="card">
        <h3>This Week’s Fixtures</h3>
        <ul className="fixtures">
          {matches.map(([h, a], i) => (
            <li key={i} className={h === state.teamId || a === state.teamId ? 'me' : ''}>
              <span>{nameOf(state, h)}</span>
              <span className="score">–</span>
              <span>{nameOf(state, a)}</span>
            </li>
          ))}
        </ul>
      </div>
      <Toasts toasts={toasts} />
    </div>
  )
}
