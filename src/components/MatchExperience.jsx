import { useEffect, useRef, useState } from 'react'
import MatchOptions from './MatchOptions.jsx'
import Draft from './Draft.jsx'
import AnimatedRift from './AnimatedRift.jsx'
import MatchDetail from './MatchDetail.jsx'
import { currentStep } from '../game/draft.js'
import { iglCallById } from '../game/igl.js'
import { physicalSide } from '../game/mapSimulation.js'
import { allowsAutoTips } from '../game/tutorial.js'
import MatchIcon from './MatchIcon.jsx'
import TeamCrest from './TeamCrest.jsx'
import { Button, Card, Icon, RoleIcon } from './ui/index.js'
import SeriesHeader from './match/SeriesHeader.jsx'
import DecisionDialog from './match/DecisionDialog.jsx'
import { clockLabel, ROLE_ORDER } from './match/matchModel.js'
import { simSpeedMs } from '../game/useGameState.js'
import { scrollContentToTop } from '../utils/scrollToTop.js'
import { TutorialIglTip } from './TutorialHost.jsx'

export default function MatchExperience({ state, dispatch, tutorial, persistTutorial, skipTutorial }) {
  const session = state.matchSession
  const { context: c, stage, options, current } = session

  useEffect(() => {
    scrollContentToTop()
  }, [stage])
  const step = session.draft ? currentStep(session.draft) : null
  useEffect(() => {
    if (stage !== 'draft' || !step || step.side === session.draft.userSide) return
    const timer = setTimeout(() => dispatch({ type: 'MATCH_DRAFT_AI' }), simSpeedMs(state, 'thinkMs'))
    return () => clearTimeout(timer)
  }, [stage, session.draft, state.simSpeed, dispatch])
  useEffect(() => {
    if (stage === 'game') dispatch({ type: 'MATCH_FINISH_GAME' })
  }, [stage, dispatch])

  // IGL decision dialog: opens at every tactical pause. Esc or Close hides it;
  // the callout beside the map reopens it. Play stays paused either way.
  const [dialogOpen, setDialogOpen] = useState(true)
  const [delegated, setDelegated] = useState({})
  useEffect(() => {
    if (stage === 'decision') setDialogOpen(true)
  }, [stage, session.games.length])
  // Closing the dialog hands focus to the callout that reopens it.
  const makeCallRef = useRef(null)
  const closeDialog = () => {
    setDialogOpen(false)
    setTimeout(() => makeCallRef.current?.focus(), 0)
  }
  // While the first-run IGL tip is up, the dialog stays open under it (so the
  // tip can point at it) and is not dismissible; Esc belongs to the tip.
  const iglTipPending =
    stage === 'decision' && !!(tutorial && persistTutorial && allowsAutoTips(tutorial) && !tutorial.seen?.igl)

  const send = (type) => () => dispatch({ type })
  // Draft ownership is relative to the coach; engine A/B remains home/away.
  const draftHomeBlue =
    stage === 'draft' && session.draft ? (session.draft.userSide === 'BLUE') === (c.userSide !== 'away') : null
  const gameNumber = session.games.length + (stage === 'between' ? 0 : 1)
  const userEngine = c.userSide === 'away' ? 'B' : 'A'
  const userLineup = c.userSide === 'away' ? c.awayLineup : c.homeLineup
  const iglName = userLineup?.SUP?.name ?? 'your support'
  const winnerSide = session.aWins > session.bWins ? 'home' : 'away'
  const winnerName = winnerSide === 'home' ? c.homeName : c.awayName
  const badges = [
    options.draft && 'Draft',
    session.fearlessActive && 'Fearless',
    options.igl && 'IGL',
    (options.showSimulation || options.igl) && 'Map simulation',
  ].filter(Boolean)

  const makeCall = (callId, byIgl = false) => {
    if (byIgl) setDelegated((d) => ({ ...d, [session.games.length]: true }))
    dispatch({ type: 'MATCH_CALL', callId })
  }
  // "Let the IGL decide": the shotcaller picks one of the same calls, chosen
  // from this game's seed. It is graded like any other call (fit or misread).
  const delegateCall = () => {
    const calls = current?.prompt?.options ?? []
    if (!calls.length) return
    makeCall(calls[(current.seed >>> 0) % calls.length].id, true)
  }

  // Live-stage callout (beside the map, inside the Objectives card).
  let callout = null
  let extraFeed = []
  if (['map', 'decision'].includes(stage) && options.igl && current) {
    const evaluation = current.evaluation
    const chosen = current.callId ? iglCallById(current.callId) : null
    const byIgl = !!delegated[session.games.length]
    if (stage === 'decision') {
      callout = (
        <div className="match-callout is-warn">
          <Icon name="alert" size={20} />
          <p>
            <b>Tactical pause.</b> {iglName} wants your call. The game waits while you decide.
          </p>
          <Button ref={makeCallRef} variant="primary" onClick={() => setDialogOpen(true)}>
            Make the call
          </Button>
        </div>
      )
    } else if (chosen) {
      const verdict =
        evaluation?.modifier > 0
          ? 'Well read. This call fits the game.'
          : `Coach’s read: ${iglCallById(evaluation?.optimalCallId)?.label ?? 'a different call'}.`
      callout = (
        <div className="match-callout is-done" role="status">
          <Icon name="check" size={20} />
          <p>
            <b>
              {byIgl ? `${iglName}’s call` : 'Your call'}: {chosen.label}.
            </b>{' '}
            {verdict}
            {current.prompt?.rationale && <span className="callout-note">{current.prompt.rationale}</span>}
          </p>
        </div>
      )
      const tone = physicalSide(current.game, userEngine) === 'A' ? 'blue' : 'red'
      extraFeed = [
        {
          key: `igl-${session.games.length}`,
          t: current.decisionAt,
          side: tone,
          actor: byIgl ? `${iglName}’s call` : 'Your call',
          text: `${chosen.label}. ${evaluation?.modifier > 0 ? 'Well read.' : 'A misread; small penalty.'}`,
          pin: true,
        },
      ]
    } else {
      callout = (
        <p className="match-callout is-quiet">
          <Icon name="alert" size={18} />
          <span>
            Your IGL call comes at about <b className="num">{clockLabel(current.decisionAt)}</b>. Play pauses there.
          </span>
        </p>
      )
    }
  }

  const gameTape = (
    <div className="broadcast-game-tape" aria-label="Completed games">
      {session.games.map((game, index) => (
        <div
          key={index}
          className={game.blueSide ? (game.winner === game.blueSide ? 'side-blue' : 'side-red') : 'side-neutral'}
        >
          <span>Game {index + 1}</span>
          <strong>{game.winner === 'A' ? c.homeName : c.awayName}</strong>
          <small>
            <MatchIcon name="clock" size={12} /> {game.durationMin} min
          </small>
        </div>
      ))}
    </div>
  )
  const matchProps = {
    state,
    homeId: c.homeId,
    awayId: c.awayId,
    userSide: c.userSide,
    round: c.label,
    aWins: session.aWins,
    bWins: session.bWins,
    games: session.games,
  }
  const lastGame = session.games.at(-1)
  // Sides alternate by game (engine A is home); watch-only series carry their own.
  const nextBlueHome =
    (session.automatic
      ? session.automatic.games[session.games.length]?.blueSide
      : session.games.length % 2 === 0
        ? 'A'
        : 'B') !== 'B'
  const skipSeries = session.automatic
    ? () => {
        // Watch-only series are fully simulated up front; finishing the
        // remaining games in order reaches the same result.
        dispatch({ type: 'MATCH_FINISH_GAME' })
        for (let i = session.games.length + 1; i < session.automatic.games.length; i++) {
          dispatch({ type: 'MATCH_NEXT_GAME' })
          dispatch({ type: 'MATCH_FINISH_GAME' })
        }
      }
    : null

  return (
    <div className={`match-experience broadcast-match stage-${stage}`}>
      {tutorial && persistTutorial && (
        <TutorialIglTip stage={stage} tutorial={tutorial} persistTutorial={persistTutorial} onSkipAll={skipTutorial} />
      )}
      <h1 className="sr-only">
        {c.homeName} versus {c.awayName} · {c.label}
        {stage === 'setup' ? ' · Match setup' : stage === 'result' ? ' · Match result' : ` · Game ${gameNumber}`}
        {stage === 'decision' ? ' · Tactical pause' : ''}
      </h1>
      {(c.locked || c.kind === 'exhibition') && stage !== 'result' && (
        <p className="match-notice">
          <Icon name="alert" size={18} />
          <span>
            {c.kind === 'exhibition'
              ? 'Practice with this historical roster. This exhibition does not alter the recorded standings.'
              : c.kind === 'campaign'
                ? 'Historical result: this slot is a fixed loss. Draft and IGL let you practise within it; the story keeps its recorded outcome.'
                : 'The bracket resolver has a selected winner. You can still draft, make calls or watch the match; the selected outcome stays fixed.'}
          </span>
        </p>
      )}

      {stage === 'setup' && (
        <>
          <SeriesHeader context={c} preview badges={badges} />
          <Card className="match-setup-options">
            <MatchOptions
              options={options}
              spectator={!c.userSide}
              onChange={(key, value) => dispatch({ type: 'SET_MATCH_OPTION', key, value })}
              seriesFearless={!!state.seriesOptions?.fearless}
              onSeriesFearlessChange={
                c.userSide ? (value) => dispatch({ type: 'SET_SERIES_OPTION', key: 'fearless', value }) : null
              }
              draftEnabled={!!options.draft}
            />
          </Card>
          <div className="match-starting-five">
            {[
              ['home', c.homeId, c.homeName, c.homeLineup],
              ['away', c.awayId, c.awayName, c.awayLineup],
            ].map(([side, id, name, lineup]) => (
              <Card
                key={side}
                className={`lineup-card lineup-${side}`}
                title={
                  <>
                    <TeamCrest teamId={id} name={name} size={28} />
                    <span>{name}</span>
                  </>
                }
                action={<span className="label">Starting five</span>}
              >
                <ul className="lineup-list">
                  {ROLE_ORDER.filter((role) => lineup[role]).map((role) => (
                    <li key={role}>
                      <span className="ll-role">
                        <RoleIcon role={role} size={16} />
                        {role}
                      </span>
                      <b>{lineup[role].name}</b>
                      <span className="ll-ovr num">{lineup[role].ovr} OVR</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <div className="match-actions">
            <Button variant="quiet" className="desk-only" onClick={send('MATCH_CANCEL')}>
              Back to preparation
            </Button>
            <Button variant="primary" size="lg" onClick={send('MATCH_START')}>
              {options.draft ? 'Enter draft →' : options.igl || options.showSimulation ? 'Enter the Rift →' : 'Play match →'}
            </Button>
          </div>
        </>
      )}

      {stage === 'draft' && (
        <Draft
          key={session.games.length}
          draft={session.draft}
          userSide={session.draft.userSide}
          gameLabel={`Game ${session.games.length + 1}`}
          fearlessCount={session.fearlessUsed?.length ?? 0}
          fearlessActive={!!session.fearlessActive}
          teams={
            draftHomeBlue
              ? { BLUE: { id: c.homeId, name: c.homeName, lineup: c.homeLineup }, RED: { id: c.awayId, name: c.awayName, lineup: c.awayLineup } }
              : { BLUE: { id: c.awayId, name: c.awayName, lineup: c.awayLineup }, RED: { id: c.homeId, name: c.homeName, lineup: c.homeLineup } }
          }
          series={{ label: c.label, needWins: c.needWins, gameNumber: session.games.length + 1, homeId: c.homeId, awayId: c.awayId, aWins: session.aWins, bWins: session.bWins }}
          onBan={(champId) => dispatch({ type: 'MATCH_DRAFT_BAN', champId })}
          onPick={(champId, role) => dispatch({ type: 'MATCH_DRAFT_PICK', champId, role })}
          onPickFlex={(champId) => dispatch({ type: 'MATCH_DRAFT_FLEX', champId })}
          onAssignFlex={(champId, role) => dispatch({ type: 'MATCH_DRAFT_ASSIGN_FLEX', champId, role })}
          onRearrange={(payload) => dispatch({ type: 'MATCH_DRAFT_REARRANGE', side: session.draft.userSide, ...payload })}
          onLock={send('MATCH_DRAFT_LOCK')}
        />
      )}

      {['map', 'decision'].includes(stage) && (
        <>
          <AnimatedRift
            key={session.games.length}
            game={current.game}
            homeName={c.homeName}
            awayName={c.awayName}
            homeId={c.homeId}
            awayId={c.awayId}
            userSide={c.userSide}
            homeWins={session.aWins}
            awayWins={session.bWins}
            needWins={c.needWins}
            speed={state.simSpeed}
            initialTime={current.cursor}
            decisionAt={options.igl ? current.decisionAt : null}
            callMade={!!current.callId}
            decision={stage === 'decision'}
            callout={callout}
            extraFeed={extraFeed}
            onSkipSeries={skipSeries}
            onCheckpoint={send('MATCH_DECISION')}
            onComplete={send('MATCH_FINISH_GAME')}
            onCursor={(minute) => dispatch({ type: 'MATCH_CURSOR', minute })}
            onSpeedChange={(speed) => dispatch({ type: 'SET_SIM_SPEED', speed })}
          />
          {stage === 'decision' && dialogOpen && current.prompt && (
            <DecisionDialog
              prompt={current.prompt}
              clock={clockLabel(current.cursor)}
              gameNumber={gameNumber}
              iglName={iglName}
              holdOpen={iglTipPending}
              withTip={iglTipPending}
              onChoose={(callId) => makeCall(callId)}
              onDelegate={delegateCall}
              onClose={closeDialog}
            />
          )}
        </>
      )}

      {stage === 'game' && <p role="status">Resolving this game…</p>}

      {stage === 'between' && (
        <>
          <SeriesHeader
            context={c}
            homeWins={session.aWins}
            awayWins={session.bWins}
            caption={`After game ${session.games.length}`}
          />
          <Card className="match-between">
            <p className="label">
              {session.games.length ? `Game ${session.games.length} complete` : 'Ready to resume'}
            </p>
            <h2 className="between-title">
              {session.games.length
                ? `${session.games.at(-1).winner === 'A' ? c.homeName : c.awayName} take game ${session.games.length}`
                : 'Return to the Rift'}
            </h2>
            <p className="between-lede">
              {lastGame && (
                <>
                  {lastGame.winner === 'A' ? c.homeName : c.awayName} closed it in {lastGame.durationMin} minutes
                  {Number.isFinite(lastGame.killsA) && Number.isFinite(lastGame.killsB)
                    ? `, ${Math.max(lastGame.killsA, lastGame.killsB)}–${Math.min(lastGame.killsA, lastGame.killsB)} on kills`
                    : ''}
                  .{' '}
                </>
              )}
              First to {c.needWins} wins the series.
              {session.fearlessActive && session.games.length > 0 && (
                <>
                  {' '}
                  Fearless: champions locked in earlier games stay out of the pool for the rest of this series. Bans
                  reset each game.
                </>
              )}
            </p>
            {gameTape}
            <p className="between-next">
              <b>Game {session.games.length + 1}:</b> {nextBlueHome ? c.homeName : c.awayName} on blue side,{' '}
              {nextBlueHome ? c.awayName : c.homeName} on red side.
            </p>
            <div className="match-actions">
              <Button variant="primary" size="lg" onClick={send('MATCH_NEXT_GAME')}>
                {options.draft ? `Draft game ${session.games.length + 1}` : `Enter game ${session.games.length + 1}`} →
              </Button>
            </div>
            <details className="match-review-details">
              <summary>Review the games so far</summary>
              <MatchDetail {...matchProps} />
            </details>
          </Card>
        </>
      )}

      {/* ---- Result stage: one block. The Result stage lane mounts <ResultStage /> here. ---- */}
      {stage === 'result' && (
        <>
          <SeriesHeader context={c} homeWins={session.aWins} awayWins={session.bWins} caption="Final" />
          <div className={`card match-intermission broadcast-intermission broadcast-victory victory-${winnerSide}`}>
            <div className="winner-seal">
              <TeamCrest teamId={winnerSide === 'home' ? c.homeId : c.awayId} name={winnerName} size={72} />
              <MatchIcon name="trophy" size={30} />
            </div>
            <span className="eyebrow">Match complete</span>
            <h2>
              {winnerName} wins {Math.max(session.aWins, session.bWins)}–{Math.min(session.aWins, session.bWins)}.
            </h2>
            <p className="result-perspective">
              {!c.userSide
                ? 'Spectator view · Series winner confirmed.'
                : c.userSide === winnerSide
                  ? 'Your team takes the series.'
                  : 'Your team falls in this series. Review the games before your next match.'}
            </p>
            {gameTape}
            <button type="button" className="primary big" onClick={send('MATCH_CLOSE')}>
              Return to {state.mode === 'campaign' ? 'the scenario' : state.mode} →
            </button>
          </div>
          <MatchDetail {...matchProps} />
        </>
      )}
      {/* ---- End result stage ---- */}
    </div>
  )
}
