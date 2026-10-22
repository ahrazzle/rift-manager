import { useEffect, useRef } from 'react'
import MatchOptions from './MatchOptions.jsx'
import Draft from './Draft.jsx'
import AnimatedRift from './AnimatedRift.jsx'
import MatchDetail from './MatchDetail.jsx'
import { currentStep } from '../game/draft.js'
import { iglCallById } from '../game/igl.js'
import { simSpeedMs } from '../game/useGameState.js'

export default function MatchExperience({ state, dispatch }) {
  const session = state.matchSession
  const { context: c, stage, options, current } = session
  const callHeading = useRef(null)
  useEffect(() => { if (stage === 'decision') callHeading.current?.focus({ preventScroll: true }) }, [stage])
  const step = session.draft ? currentStep(session.draft) : null
  useEffect(() => {
    if (stage !== 'draft' || !step || step.side === session.draft.userSide) return
    const timer = setTimeout(() => dispatch({ type: 'MATCH_DRAFT_AI' }), simSpeedMs(state, 'thinkMs'))
    return () => clearTimeout(timer)
  }, [stage, session.draft, state.simSpeed, dispatch])
  useEffect(() => {
    if (stage === 'game') dispatch({ type: 'MATCH_FINISH_GAME' })
  }, [stage, dispatch])
  const send = (type) => () => dispatch({ type })
  const decisionPanel = stage === 'decision' ? <section className="igl-decision" aria-labelledby="igl-call-title">
        <span className="eyebrow">IGL · Tactical pause</span><h2 id="igl-call-title" ref={callHeading} tabIndex={-1}>The map is yours. Make the call.</h2><p>{current.prompt.context}</p>
        <div className="igl-call-grid">{current.prompt.options.map((call) => <button type="button" className="igl-call-option" key={call.id} onClick={() => dispatch({ type: 'MATCH_CALL', callId: call.id })}><strong>{call.label}</strong><span>{call.desc}</span></button>)}</div>
        <p className="hint">Choose a call to resume play. The team will move into position; the quality of the call affects its strength for the remainder of this game.</p>
      </section> : null
  const matchProps = { state, homeId: c.homeId, awayId: c.awayId, userSide: c.userSide,
    round: c.label, aWins: session.aWins, bWins: session.bWins, games: session.games }
  return <div className="match-experience">
    <header className={`card match-heading ${['map', 'decision'].includes(stage) ? 'compact' : ''}`}>
      <div><span className="eyebrow">{c.label}</span><h1>{c.homeName} <span className="match-series-score">{stage === 'setup' ? 'vs' : `${session.aWins} — ${session.bWins}`}</span> {c.awayName}</h1>
        <p className="hint">{c.userSide ? `You lead ${c.userSide === 'home' ? c.homeName : c.awayName}` : 'Spectating'} · {c.needWins === 1 ? 'One game' : 'Best of three'}{stage !== 'setup' && stage !== 'result' ? ` · Game ${Math.min(3, session.games.length + (stage === 'between' ? 0 : 1))}` : ''}</p></div>
      <div className="match-badges">{options.draft && <span>Draft</span>}{options.igl && <span>IGL</span>}{(options.showSimulation || options.igl) && <span>Map simulation</span>}</div>
    </header>
    {c.locked && <p className="card match-notice">{c.kind === 'campaign' ? 'Historical result: this slot is a fixed loss. Draft and IGL let you practise within it; the story keeps its recorded outcome.' : 'The bracket resolver has a selected winner. You can still draft, make calls or watch the match; the selected outcome stays fixed.'}</p>}
    {c.kind === 'exhibition' && <p className="card match-notice">Practice with this historical roster. This exhibition does not alter the recorded standings.</p>}
    {stage === 'setup' && <div className="card">
      <MatchOptions options={options} spectator={!c.userSide} onChange={(key, value) => dispatch({ type: 'SET_MATCH_OPTION', key, value })} />
      <div className="match-starting-five">{[['home', c.homeLineup], ['away', c.awayLineup]].map(([side, lineup]) => <div key={side}><h3>{side === 'home' ? c.homeName : c.awayName}</h3>{Object.entries(lineup).map(([role, p]) => <p key={role}><span>{role}</span><strong>{p.name}</strong></p>)}</div>)}</div>
      <div className="actions"><button type="button" className="primary big" onClick={send('MATCH_START')}>{options.draft ? 'Enter draft →' : options.igl || options.showSimulation ? 'Enter the Rift →' : 'Play match →'}</button><button type="button" className="ghost" onClick={send('MATCH_CANCEL')}>Back to preparation</button></div>
    </div>}
    {stage === 'draft' && <>
      <Draft key={session.games.length} draft={session.draft} userSide={session.draft.userSide} gameLabel={`Game ${session.games.length + 1}`}
        onBan={(champId) => dispatch({ type: 'MATCH_DRAFT_BAN', champId })}
        onPick={(champId, role) => dispatch({ type: 'MATCH_DRAFT_PICK', champId, role })} />
      {session.draft.done && <button type="button" className="primary big" onClick={send('MATCH_DRAFT_LOCK')}>{options.igl || options.showSimulation ? 'Take your comp onto the Rift →' : 'Play this game →'}</button>}
    </>}
    {['map', 'decision'].includes(stage) && <>
      <AnimatedRift key={session.games.length} game={current.game} homeName={c.homeName} awayName={c.awayName} speed={state.simSpeed}
        initialTime={current.cursor} decisionAt={options.igl ? current.decisionAt : null} callMade={!!current.callId} decision={stage === 'decision'} decisionPanel={decisionPanel}
        onCheckpoint={send('MATCH_DECISION')} onComplete={send('MATCH_FINISH_GAME')}
        onCursor={(minute) => dispatch({ type: 'MATCH_CURSOR', minute })} onSpeedChange={(speed) => dispatch({ type: 'SET_SIM_SPEED', speed })} />
      {current.callId && <div className="card igl-feedback"><span className="eyebrow">Your call · {iglCallById(current.callId)?.label}</span><p>{current.evaluation?.modifier > 0 ? 'Well read. This call fits the situation.' : `Coach’s read: ${iglCallById(current.evaluation?.optimalCallId)?.label}.`}</p><p className="hint">{current.prompt?.rationale}</p></div>}
    </>}
    {stage === 'game' && <p role="status">Resolving this game…</p>}
    {stage === 'between' && <div className="card match-intermission">
      <span className="eyebrow">{session.games.length ? `Game ${session.games.length} complete` : 'Ready to resume'}</span>
      <h2>{session.games.length ? `${session.games.at(-1).winner === 'A' ? c.homeName : c.awayName} takes the game.` : 'Return to the Rift.'}</h2>
      <p>First to {c.needWins} wins the match.</p><button type="button" className="primary big" onClick={send('MATCH_NEXT_GAME')}>{options.draft ? `Draft game ${session.games.length + 1}` : `Enter game ${session.games.length + 1}`} →</button>
      <details><summary>Review the games so far</summary><MatchDetail {...matchProps} /></details>
    </div>}
    {stage === 'result' && <>
      <div className="card match-intermission"><span className="eyebrow">Match complete</span><h2>{session.aWins > session.bWins ? c.homeName : c.awayName} wins {Math.max(session.aWins, session.bWins)}–{Math.min(session.aWins, session.bWins)}.</h2><button type="button" className="primary big" onClick={send('MATCH_CLOSE')}>Return to {state.mode === 'campaign' ? 'the scenario' : state.mode} →</button></div>
      <MatchDetail {...matchProps} />
    </>}
  </div>
}
