// ModesDashboard — Dashboard for draft / IGL / gauntlet modes.
// Interactive regular seasons reuse the shared postseason Dashboard.
import { useEffect, useState } from 'react'
import Draft from './Draft.jsx'
import Dashboard from './Dashboard.jsx'
import WatchLive from './WatchLive.jsx'
import BoardCard from './BoardCard.jsx'
import Gauntlet from './Gauntlet.jsx'
import MatchDetail from './MatchDetail.jsx'
import MatchReview from './MatchReview.jsx'
import { currentStep, aiDraftMove, DRAFT_PERSONALITIES, draftReadyToPlay } from '../game/draft.js'
import { SIM_SPEEDS } from '../game/useGameState.js'

// Auto-plays AI draft turns with a "thinking" beat; player turns are manual.
function DraftContainer({ state, dispatch }) {
  const ds = state.draftSeries
  const draft = ds?.draft
  const [resolving, setResolving] = useState(false)
  const thinkMs = (SIM_SPEEDS[state?.simSpeed] ?? SIM_SPEEDS.normal).thinkMs

  useEffect(() => {
    if (!draft || draft.done) return
    const step = currentStep(draft)
    if (!step || step.side === draft.userSide) return
    const t = setTimeout(() => {
      const move = aiDraftMove(draft, Math.random, ds.aiPersonality, ds.aiComfort)
      dispatch(move.type === 'ban'
        ? { type: 'DRAFT_BAN', champId: move.champId }
        : move.flex
          ? { type: 'DRAFT_AI_FLEX', champId: move.champId, role: move.role }
          : { type: 'DRAFT_PICK', champId: move.champId, role: move.role })
    }, thinkMs)
    return () => clearTimeout(t)
  }, [draft, dispatch, thinkMs, ds.aiPersonality, ds.aiComfort])

  if (!ds) return null
  const oppName = state.teamMeta?.[ds.userIsHome ? ds.awayId : ds.homeId]?.name ?? 'Opponent'
  const personality = DRAFT_PERSONALITIES[ds.aiPersonality] ?? DRAFT_PERSONALITIES.meta

  // Steps finished and comp ready → sim card; until then keep interactive Draft for flex assign / rearrange.
  if (draft.done && draftReadyToPlay(draft) && !resolving) {
    const myWins = ds.userIsHome ? ds.aWins : ds.bWins
    const opWins = ds.userIsHome ? ds.bWins : ds.aWins
    return (
      <div className="card">
        <h3>Draft complete: Game {ds.gameIndex + 1}</h3>
        <p className="tag">Series {myWins}–{opWins}. Comp locked. Sim the game?</p>
        <Draft
          draft={draft}
          userSide={draft.userSide}
          onBan={() => {}}
          onPick={() => {}}
          onPickFlex={() => {}}
          onAssignFlex={() => {}}
          onRearrange={() => {}}
          disabled
          gameLabel={`Draft — Game ${ds.gameIndex + 1}`}
        />
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="primary big" onClick={() => { setResolving(true); setTimeout(() => { dispatch({ type: 'DRAFT_RESOLVE_GAME' }); setResolving(false) }, 600) }}>
            Sim Game {ds.gameIndex + 1} →
          </button>
        </div>
      </div>
    )
  }

  const lastGame = ds.games[ds.games.length - 1]
  return (
    <div className="stack">
      {lastGame && (
        <div className="card">
          <h3>{lastGame.homeWon === ds.userIsHome ? '✅ Game won' : '❌ Game lost'} (Game {ds.gameIndex})</h3>
          <p className="tag">
            {lastGame.homeWon === ds.userIsHome ? 'Your five took the game.' : 'Regroup and adjust your next draft.'}
            {' '}Series {ds.userIsHome ? ds.aWins : ds.bWins}–{ds.userIsHome ? ds.bWins : ds.aWins}.
          </p>
        </div>
      )}
      <div className="card">
        <p className="eyebrow">🎯 Draft Coach · Game {ds.gameIndex + 1} vs {oppName}</p>
        <p className="hint" style={{ margin: '4px 0 0' }}>
          Enemy coach style: <strong>{personality.label}</strong> — {personality.desc}
        </p>
      </div>
      <Draft
        draft={draft}
        userSide={draft.userSide}
        onBan={(champId) => dispatch({ type: 'DRAFT_BAN', champId })}
        onPick={(champId, role) => dispatch({ type: 'DRAFT_PICK', champId, role })}
        onPickFlex={(champId) => dispatch({ type: 'DRAFT_FLEX', champId })}
        onAssignFlex={(champId, role) => dispatch({ type: 'DRAFT_ASSIGN_FLEX', champId, role })}
        onRearrange={(payload) => dispatch({ type: 'DRAFT_REARRANGE', side: draft.userSide, ...payload })}
        gameLabel={`Draft — Game ${ds.gameIndex + 1}`}
      />
    </div>
  )
}

// WatchLive orchestration: pass-1 early events → call → pass-2 late events.
function IglContainer({ state, dispatch }) {
  const lv = state.live
  if (!lv) return null
  const cur = lv.current

  if (!cur) {
    const lastGame = lv.games[lv.games.length - 1]
    return (
      <div className="stack">
        {lastGame && (
          <div className="card">
            <h3>{lastGame.homeWon === lv.userIsHome ? '✅ Game won' : '❌ Game lost'}</h3>
            <p className="tag">Series {lv.userIsHome ? lv.aWins : lv.bWins}–{lv.userIsHome ? lv.bWins : lv.aWins}.</p>
          </div>
        )}
        <div className="card">
          <h3>📻 Game {lv.gameIndex + 1} — go live</h3>
          <p className="tag">The broadcast is starting. You'll make the mid-game call when the moment comes.</p>
          <button className="primary big" onClick={() => dispatch({ type: 'LIVE_START_GAME' })}>
            Go Live →
          </button>
        </div>
      </div>
    )
  }

  const evts = cur.pass1.events || []
  const split = cur.split ?? Math.max(3, Math.floor(evts.length * 0.4))
  const earlyEvents = evts.slice(0, split)
  const splitTime = earlyEvents.at(-1)?.t ?? 0
  const lateEvents = cur.final ? (cur.final.events || []).filter((e) => e.t > splitTime) : []
  const userWon = cur.final ? (cur.homeWon === lv.userIsHome ? true : false) : null
  const oppName = state.teamMeta?.[lv.userIsHome ? lv.awayId : lv.homeId]?.name ?? 'Opponent'

  return (
    <WatchLive
      key={lv.gameIndex}
      earlyEvents={earlyEvents}
      lateEvents={lateEvents}
      prompt={cur.prompt}
      resolvedCallId={cur.callId}
      onCall={(callId) => dispatch({ type: 'LIVE_MAKE_CALL', callId })}
      onDone={() => dispatch({ type: 'LIVE_ADVANCE' })}
      gameLabel={`Game ${lv.gameIndex + 1} vs ${oppName}`}
      userWon={userWon}
      simSpeed={state.simSpeed}
      onSpeedChange={(speed) => dispatch({ type: 'SET_SIM_SPEED', speed })}
      earlyGame={cur.pass1}
      lateGame={cur.final ?? null}
      userIsA={lv.userIsHome}
    />
  )
}

function CompletedSeries({ state, result }) {
  const [open, setOpen] = useState(false)
  const nameOf = (id) => state.teamMeta?.[id]?.name ?? id
  const won = result.userSide === 'home' ? result.homeWon : !result.homeWon
  return (
    <div className="stack">
      <div className="card">
        <div className="result-head"><span className="rw">Week {result.round} — Series complete</span><span className={`outcome ${won ? 'win' : 'loss'}`}>{won ? 'YOU WIN' : 'YOU LOSE'}</span></div>
        <div className="result-score"><span>{nameOf(result.homeId)}</span><strong className="rs">{result.aWins}–{result.bWins}</strong><span>{nameOf(result.awayId)}</span></div>
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="ghost" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Hide match detail' : 'Review match detail →'}</button>
        </div>
      </div>
      <MatchReview games={result.games || []} userSide={result.userSide} />
      {open && <MatchDetail {...result} state={state} games={result.games || []} showReview={false} onBack={() => setOpen(false)} />}
    </div>
  )
}

export default function ModesDashboard({ state, dispatch, setTab, totalRounds }) {
  const mode = state.mode
  const previous = state.results.find((r) => r.isUser && r.round === state.round - 1)
  if (state.finished && mode !== 'gauntlet') return <div className="stack">
    {previous && <CompletedSeries key={previous.round} state={state} result={previous} />}
    <Dashboard state={state} dispatch={dispatch} setTab={setTab} totalRounds={totalRounds} />
  </div>

  // Post-match presser renders globally in App.jsx; nothing local needed.

  if (state.sacked) {
    return (
      <div className="stack">
        <div className="card">
          <h2>📰 You're sacked</h2>
          <p className="tag">
            The board has seen enough. Confidence hit zero after you missed "{state.board?.expectation}".
            The fans will forget. The spreadsheets won't.
          </p>
          <button className="primary big" onClick={() => dispatch({ type: 'RESET' })}>Start Over →</button>
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      {mode === 'gauntlet' && <Gauntlet state={state} dispatch={dispatch} />}

      {mode === 'draft' && !state.finished && (
        state.draftSeries
          ? <DraftContainer state={state} dispatch={dispatch} />
          : (
            <div className="card">
              <h3>🎯 Week {state.round} — draft day</h3>
              <p className="tag">Every game starts in champion select. Out-draft the enemy coach, then let your five execute.</p>
              <button className="primary big" onClick={() => dispatch({ type: 'DRAFT_WEEK_START' })}>
                Start Draft Week →
              </button>
            </div>
          )
      )}

      {mode === 'igl' && !state.finished && (
        state.live
          ? <IglContainer state={state} dispatch={dispatch} />
          : (
            <div className="card">
              <h3>📻 Week {state.round} — broadcast day</h3>
              <p className="tag">Watch the game live and make the mid-game call when it matters: drakes, baron, split or group.</p>
              <button className="primary big" onClick={() => dispatch({ type: 'LIVE_WEEK_START' })}>
                Go Live →
              </button>
            </div>
          )
      )}

      {previous && !state.draftSeries && !state.live && mode !== 'gauntlet' && <CompletedSeries key={previous.round} state={state} result={previous} />}

      <BoardCard state={state} />
    </div>
  )
}
