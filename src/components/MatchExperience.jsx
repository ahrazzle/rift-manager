import { useEffect, useRef } from 'react'
import MatchOptions from './MatchOptions.jsx'
import Draft from './Draft.jsx'
import AnimatedRift from './AnimatedRift.jsx'
import MatchDetail from './MatchDetail.jsx'
import { currentStep, draftReadyToPlay } from '../game/draft.js'
import { iglCallById } from '../game/igl.js'
import MatchIcon from './MatchIcon.jsx'
import TeamCrest from './TeamCrest.jsx'
import venue from '../assets/rift-venue.webp'
import { simSpeedMs } from '../game/useGameState.js'
import { scrollContentToTop } from '../utils/scrollToTop.js'
import { TutorialIglTip } from './TutorialHost.jsx'

export default function MatchExperience({ state, dispatch, tutorial, persistTutorial, skipTutorial }) {
  const session = state.matchSession
  const { context: c, stage, options, current } = session

  useEffect(() => {
    scrollContentToTop()
  }, [stage])
  const callHeading = useRef(null)
  useEffect(() => {
    if (stage === 'decision') callHeading.current?.focus({ preventScroll: true })
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
  const liveMap = ['map', 'decision'].includes(stage)
  // Draft ownership is relative to the coach; engine A/B remains home/away.
  // Setup and series results have no single physical map side to advertise.
  const draftHomeBlue =
    stage === 'draft' && session.draft ? (session.draft.userSide === 'BLUE') === (c.userSide !== 'away') : null
  const displayedGame = stage === 'between' ? session.games.at(-1) : current?.game
  const homeBlue =
    draftHomeBlue ??
    (stage !== 'setup' && stage !== 'result' && displayedGame?.blueSide ? displayedGame.blueSide === 'A' : null)
  const teamSide = (side) => (homeBlue == null ? 'neutral' : (side === 'home') === homeBlue ? 'blue' : 'red')
  const winnerSide = session.aWins > session.bWins ? 'home' : 'away'
  const winnerName = winnerSide === 'home' ? c.homeName : c.awayName
  const send = (type) => () => dispatch({ type })
  const decisionPanel =
    stage === 'decision' ? (
      <section className="igl-decision" aria-labelledby="igl-call-title">
        <span className="eyebrow">
          <MatchIcon name="flag" size={16} /> IGL · Tactical pause · {Math.floor(current.cursor)}:
          {String(Math.floor((current.cursor % 1) * 60)).padStart(2, '0')}
        </span>
        <h2 id="igl-call-title" ref={callHeading} tabIndex={-1} data-tour="tour-igl-decision">
          The map is yours. Make the call.
        </h2>
        <p>{current.prompt.context}</p>
        <div className="igl-call-grid">
          {current.prompt.options.map((call, index) => (
            <button
              type="button"
              className="igl-call-option"
              key={call.id}
              onClick={() => dispatch({ type: 'MATCH_CALL', callId: call.id })}
            >
              <span className="call-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <strong>{call.label}</strong>
              <span>{call.desc}</span>
              <MatchIcon name="chevron" size={18} />
            </button>
          ))}
        </div>
        <p className="hint">
          Choose a call to resume play. The team will move into position; the quality of the call affects its
          strength for the remainder of this game.
        </p>
      </section>
    ) : null
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
  return (
    <div className={`match-experience broadcast-match stage-${stage}`} style={{ '--venue': `url(${venue})` }}>
      {tutorial && persistTutorial && (
        <TutorialIglTip
          stage={stage}
          tutorial={tutorial}
          persistTutorial={persistTutorial}
          onSkipAll={skipTutorial}
        />
      )}
      <h1 className="sr-only">
        {c.homeName} versus {c.awayName} · {c.label}
        {stage === 'setup'
          ? ' · Match setup'
          : stage === 'result'
            ? ' · Match result'
            : ` · Game ${session.games.length + (stage === 'between' ? 0 : 1)}`}
        {stage === 'decision' ? ' · Tactical pause' : ''}
      </h1>
      {!liveMap && (
        <header
          className={`match-heading broadcast-billboard home-${teamSide('home')} ${stage === 'setup' ? 'is-prematch' : ''}`}
        >
          <div className="broadcast-context">
            <span className="eyebrow">{c.label}</span>
            <span>
              {c.userSide ? `Coaching ${c.userSide === 'home' ? c.homeName : c.awayName}` : 'Spectating'} · First
              to {c.needWins}
            </span>
          </div>
          <div className="broadcast-faceoff">
            <div className={`broadcast-club side-${teamSide('home')}`}>
              <TeamCrest teamId={c.homeId} name={c.homeName} size={76} />
              <strong className="broadcast-club-name">{c.homeName}</strong>
              <span>{homeBlue == null ? 'Home team' : `${homeBlue ? 'Blue' : 'Red'} side`}</span>
            </div>
            <div className="broadcast-series">
              <span className="eyebrow">{stage === 'setup' ? 'Series preview' : 'Series score'}</span>
              <strong>{stage === 'setup' ? 'VS' : `${session.aWins} : ${session.bWins}`}</strong>
              <span>
                {stage === 'result'
                  ? 'Final'
                  : stage === 'setup'
                    ? ''
                    : `Game ${session.games.length + (stage === 'between' ? 0 : 1)}`}
              </span>
            </div>
            <div className={`broadcast-club side-${teamSide('away')}`}>
              <TeamCrest teamId={c.awayId} name={c.awayName} size={76} />
              <strong className="broadcast-club-name">{c.awayName}</strong>
              <span>{homeBlue == null ? 'Away team' : `${homeBlue ? 'Red' : 'Blue'} side`}</span>
            </div>
          </div>
          <div className="match-badges">
            {options.draft && (
              <span>
                <MatchIcon name="draft" size={14} /> Draft
              </span>
            )}
            {session.fearlessActive && (
              <span title="Fearless draft — champions picked in earlier games cannot be chosen again this series">
                <MatchIcon name="eye" size={14} /> Fearless
              </span>
            )}
            {options.igl && (
              <span>
                <MatchIcon name="flag" size={14} /> IGL
              </span>
            )}
            {(options.showSimulation || options.igl) && (
              <span>
                <MatchIcon name="eye" size={14} /> Map simulation
              </span>
            )}
          </div>
        </header>
      )}
      {c.locked && (
        <p className="card match-notice">
          {c.kind === 'campaign'
            ? 'Historical result: this slot is a fixed loss. Draft and IGL let you practise within it; the story keeps its recorded outcome.'
            : 'The bracket resolver has a selected winner. You can still draft, make calls or watch the match; the selected outcome stays fixed.'}
        </p>
      )}
      {c.kind === 'exhibition' && (
        <p className="card match-notice">
          Practice with this historical roster. This exhibition does not alter the recorded standings.
        </p>
      )}
      {stage === 'setup' && (
        <div className="card broadcast-setup">
          <MatchOptions
            options={options}
            spectator={!c.userSide}
            onChange={(key, value) => dispatch({ type: 'SET_MATCH_OPTION', key, value })}
          />
          <div className="match-starting-five">
            {[
              ['home', c.homeLineup],
              ['away', c.awayLineup],
            ].map(([side, lineup]) => (
              <div key={side} className={`lineup-${side}`}>
                <h2>
                  <TeamCrest
                    teamId={side === 'home' ? c.homeId : c.awayId}
                    name={side === 'home' ? c.homeName : c.awayName}
                    size={28}
                  />
                  {side === 'home' ? c.homeName : c.awayName}
                  <small>Starting five</small>
                </h2>
                {Object.entries(lineup).map(([role, p]) => (
                  <p key={role}>
                    <span>
                      <MatchIcon name={role} size={17} />
                      {role}
                    </span>
                    <strong>{p.name}</strong>
                    <small>{p.ovr} OVR</small>
                  </p>
                ))}
              </div>
            ))}
          </div>
          <div className="actions">
            <button type="button" className="primary big" onClick={send('MATCH_START')}>
              {options.draft
                ? 'Enter draft →'
                : options.igl || options.showSimulation
                  ? 'Enter the Rift →'
                  : 'Play match →'}
            </button>
            <button type="button" className="ghost" onClick={send('MATCH_CANCEL')}>
              Back to preparation
            </button>
          </div>
        </div>
      )}
      {stage === 'draft' && (
        <>
          <Draft
            key={session.games.length}
            draft={session.draft}
            userSide={session.draft.userSide}
            gameLabel={`Game ${session.games.length + 1}`}
            fearlessCount={session.fearlessUsed?.length ?? 0}
            fearlessActive={!!session.fearlessActive}
            onBan={(champId) => dispatch({ type: 'MATCH_DRAFT_BAN', champId })}
            onPick={(champId, role) => dispatch({ type: 'MATCH_DRAFT_PICK', champId, role })}
            onPickFlex={(champId) => dispatch({ type: 'MATCH_DRAFT_FLEX', champId })}
            onAssignFlex={(champId, role) => dispatch({ type: 'MATCH_DRAFT_ASSIGN_FLEX', champId, role })}
            onRearrange={(payload) => dispatch({ type: 'MATCH_DRAFT_REARRANGE', side: session.draft.userSide, ...payload })}
          />
          {session.draft.done && (
            <>
              {!draftReadyToPlay(session.draft) && (
                <p className="hint" role="status">
                  Assign every flex pick to a role before you lock. Open roles and the flex list are above.
                </p>
              )}
              <button
                type="button"
                className="primary big"
                disabled={!draftReadyToPlay(session.draft)}
                onClick={send('MATCH_DRAFT_LOCK')}
              >
                {options.igl || options.showSimulation ? 'Take your comp onto the Rift →' : 'Play this game →'}
              </button>
            </>
          )}
        </>
      )}
      {['map', 'decision'].includes(stage) && (
        <>
          {stage === 'map' && (
            <h2 className="sr-only">Game {session.games.length + 1} map simulation and player tracker</h2>
          )}
          <AnimatedRift
            key={session.games.length}
            seriesLabel={`${c.label} · FIRST TO ${c.needWins}`}
            homeWins={session.aWins}
            awayWins={session.bWins}
            game={current.game}
            homeName={c.homeName}
            awayName={c.awayName}
            speed={state.simSpeed}
            initialTime={current.cursor}
            decisionAt={options.igl ? current.decisionAt : null}
            callMade={!!current.callId}
            decision={stage === 'decision'}
            decisionPanel={decisionPanel}
            onCheckpoint={send('MATCH_DECISION')}
            onComplete={send('MATCH_FINISH_GAME')}
            onCursor={(minute) => dispatch({ type: 'MATCH_CURSOR', minute })}
            onSpeedChange={(speed) => dispatch({ type: 'SET_SIM_SPEED', speed })}
          />
          {current.callId && (
            <div className="card igl-feedback">
              <span className="eyebrow">Your call · {iglCallById(current.callId)?.label}</span>
              <p>
                {current.evaluation?.modifier > 0
                  ? 'Well read. This call fits the situation.'
                  : `Coach’s read: ${iglCallById(current.evaluation?.optimalCallId)?.label}.`}
              </p>
              <p className="hint">{current.prompt?.rationale}</p>
            </div>
          )}
        </>
      )}
      {stage === 'game' && <p role="status">Resolving this game…</p>}
      {stage === 'between' && (
        <div className="card match-intermission broadcast-intermission">
          <span className="eyebrow">
            <MatchIcon name="flag" size={16} />{' '}
            {session.games.length ? `Game ${session.games.length} complete` : 'Ready to resume'}
          </span>
          <h2>
            {session.games.length
              ? `${session.games.at(-1).winner === 'A' ? c.homeName : c.awayName} takes the game.`
              : 'Return to the Rift.'}
          </h2>
          <p>First to {c.needWins} wins the match.</p>
          {session.fearlessActive && session.games.length > 0 && (
            <p className="hint">
              Fearless: champions your teams locked in earlier games stay out of the pool for the rest of this
              series. Bans reset each game.
            </p>
          )}
          {gameTape}
          <button type="button" className="primary big" onClick={send('MATCH_NEXT_GAME')}>
            {options.draft ? `Draft game ${session.games.length + 1}` : `Enter game ${session.games.length + 1}`} →
          </button>
          <details>
            <summary>Review the games so far</summary>
            <MatchDetail {...matchProps} />
          </details>
        </div>
      )}
      {stage === 'result' && (
        <>
          <div
            className={`card match-intermission broadcast-intermission broadcast-victory victory-${winnerSide}`}
          >
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
    </div>
  )
}
