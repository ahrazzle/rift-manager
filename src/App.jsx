import { useRef, useState, useEffect, useCallback } from 'react'
import { useGameState } from './game/useGameState.js'
import NewGame from './components/NewGame.jsx'
import MatchIcon from './components/MatchIcon.jsx'
import Campaign from './components/Campaign.jsx'
import Dashboard from './components/Dashboard.jsx'
import Gauntlet from './components/Gauntlet.jsx'
import MatchExperience from './components/MatchExperience.jsx'
import Tournament from './components/Tournament.jsx'
import Lineup from './components/Lineup.jsx'
import Tactics from './components/Tactics.jsx'
import Strategy from './components/Strategy.jsx'
import Standings from './components/Standings.jsx'
import Results from './components/Results.jsx'
import Market from './components/Market.jsx'
import Squad from './components/Squad.jsx'
import Guide from './components/Guide.jsx'
import TutorialCoach from './components/TutorialCoach.jsx'
import { exportPng } from './utils/exportPng.js'
import { scrollContentToTop } from './utils/scrollToTop.js'
import { shouldShowTutorial } from './game/tutorial.js'
import { streakOf } from './game/hype.js'
import { EventModal, PromotionModal } from './components/CareerModals.jsx'
import PressModal from './components/PressModal.jsx'
import { fmtMoney } from './game/economy.js'
import ConfirmDialog from './components/ConfirmDialog.jsx'

function Brand({ compact = false }) {
  return <div className={`broadcast-brand${compact ? ' broadcast-brand-compact' : ''}`}>
    <img
      src={`${(import.meta.env?.BASE_URL ?? '/')}brand/${compact ? 'rift-mark.svg' : 'rift-manager.svg'}`}
      width={compact ? 40 : 140}
      height={compact ? 40 : 50}
      alt="Rift Manager"
    />
  </div>
}

function SaveError({ error, retrySave, loadError, retryLoad, replaceSave }) {
  const [replacementPending, setReplacementPending] = useState(false)
  if (!error && !loadError) return null
  return <div className="card" role="alert">
    <p>{loadError || error}</p>
    {loadError ? <>
      {error && <p>{error}</p>}
      <button type="button" className="primary" onClick={retryLoad}>Retry loading</button>
      <button type="button" className="ghost" onClick={() => setReplacementPending(true)}>Replace saved game</button>
      {replacementPending && <ConfirmDialog title="Replace saved game?" confirmLabel="Replace saved game"
        onConfirm={() => { setReplacementPending(false); replaceSave() }} onCancel={() => setReplacementPending(false)}>
        This permanently replaces the existing saved game with a new game. Retry loading first if you want to recover your progress.
      </ConfirmDialog>}
    </> : <button type="button" className="primary" onClick={retrySave}>Retry saving</button>}
  </div>
}

function CareerEpitaph({ state, dispatch }) {
  const shotRef = useRef(null)
  const [shotErr, setShotErr] = useState(null)
  const history = state.career?.history ?? []
  const titles = history.filter((h) => h.championId === state.teamId).length
  const best = history.length
    ? Math.min(...history.map((h) => h.userPlacement))
    : null
  return (
    <div className="card" ref={shotRef}>
      <h2>{state.managerName} : Career Retired 🏁</h2>
      <p>
        {history.length} season{history.length === 1 ? '' : 's'} with {state.teamId} ·{' '}
        {titles} title{titles === 1 ? '' : 's'}
        {best ? ` · best finish ${best}${best === 1 ? 'st' : best === 2 ? 'nd' : best === 3 ? 'rd' : 'th'}` : ''}.
      </p>
      {history.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Season</th>
              <th>League</th>
              <th>Champion</th>
              <th>Your Finish</th>
              <th>Record</th>
              <th>Titles</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => {
              const regional = h.regionalTitle ?? h.championId === state.teamId
              const flags = [
                regional ? '🏆 Regional' : null,
                h.msiTitle ? 'MSI' : null,
                h.worldsTitle ? '🌍 Worlds' : null,
              ].filter(Boolean)
              return (
                <tr key={h.seasonIndex} className={h.championId === state.teamId ? 'me' : ''}>
                  <td>{h.seasonIndex}</td>
                  <td>{h.league ?? 'LCK'}</td>
                  <td>{h.championId}</td>
                  <td>{h.userPlacement}</td>
                  <td>{h.userW}–{h.userL}</td>
                  <td>{flags.length ? flags.join(' · ') : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <button className="ghost" onClick={async () => {
        setShotErr(null)
        try { await exportPng(shotRef, 'lck-career-history.png') }
        catch { setShotErr('Export failed. Try again.') }
      }}>Download PNG ⬇</button>
      {shotErr && <p className="hint">{shotErr}</p>}
      <button className="primary big" onClick={() => dispatch({ type: 'RESET' })}>
        New Game →
      </button>
    </div>
  )
}
function SiteFooter() {
  return (
    <footer className="site-footer">
      <a className="aska-signature" href="https://digital.askaconsult.com/" target="_blank" rel="noreferrer">
        <span>Made by</span> Aska Digital
      </a>
      <span className="footer-credit">
        Created by{' '}
        <a href="https://github.com/ahrazzle" target="_blank" rel="noreferrer">
          @ahrazzle
        </a>
      </span>
    </footer>
  )
}

export default function App() {
  const { state, dispatch: gameDispatch, TOTAL_ROUNDS, storageError, retrySave, loadError, retryLoad, replaceSave } = useGameState()
  const [tab, setTabRaw] = useState('dashboard')
  const [guideOpen, setGuideOpen] = useState(false)
  const [resetPending, setResetPending] = useState(false)
  const prevActiveTab = useRef(null)
  const setTab = useCallback((id) => {
    setTabRaw(id)
    scrollContentToTop()
  }, [])
  const openGuide = useCallback(() => {
    setGuideOpen(true)
    scrollContentToTop()
  }, [])
  const dispatch = (action) => {
    if (action.type === 'RESET' && (state.teamId || state.campaign)) {
      setResetPending(true)
      return
    }
    if (action.type === 'RESET') setTab('dashboard')
    gameDispatch(action)
  }

  // Season-replay campaigns carry no managed team — they still get the shell.
  const isSeasonReplay = state.mode === 'campaign' && !state.teamId
  const onNewGameScreen = !state.teamId && !isSeasonReplay
  const isCampaign = state.mode === 'campaign'
  const isCareer = state.mode === 'career'
  const isRetired = isCareer && state.career?.status === 'retired'
  const nav = onNewGameScreen
    ? [['dashboard', 'Dashboard']]
    : isSeasonReplay
    ? [
        ['campaign', 'Scenario'],
        ['results', 'Results'],
      ]
    : isCampaign
    ? [
        ['campaign', 'Scenario Mode'],
        ['lineup', 'Lineup'],
        ['tactics', 'Tactics'],
        ['results', 'Results'],
      ]
    : isCareer
      ? [
          ['dashboard', 'Dashboard'],
          ['lineup', 'Lineup'],
          ['tactics', 'Tactics'],
          ['strategy', 'Strategy'],
          ['standings', 'Standings'],
          ['results', 'Results'],
          ['squad', 'Squad'],
        ]
      : [
          ['dashboard', 'Dashboard'],
          ['lineup', 'Lineup'],
          ['tactics', 'Tactics'],
          ['strategy', 'Strategy'],
          ['standings', 'Standings'],
          ['results', 'Results'],
          ['market', 'Market'],
        ]
  if (!onNewGameScreen && !isCampaign && state.tournament) {
    nav.push(['tournament', state.tournament.kind === 'playoffs' ? 'Playoffs' : 'MSI/Worlds'])
  }
  const activeTab = nav.some(([id]) => id === tab) ? tab : nav[0][0]

  useEffect(() => {
    scrollContentToTop()
  }, [state.matchSession, state.teamId])

  useEffect(() => {
    if (prevActiveTab.current !== null && prevActiveTab.current !== activeTab) {
      scrollContentToTop()
    }
    prevActiveTab.current = activeTab
  }, [activeTab])

  const showTutorial = !onNewGameScreen && shouldShowTutorial(state, { resetPending, guideOpen })

  if (onNewGameScreen) {
    return (
      <div className="app broadcast-shell">
        <a className="skip" href="#main-content">Skip to main content</a>
        <header className="topbar">
          <Brand compact />
          <div className="topbar-spacer" />
          <button className="ghost" onClick={openGuide}>
            How to Play
          </button>
        </header>

        <SaveError error={storageError} retrySave={retrySave} loadError={loadError} retryLoad={retryLoad} replaceSave={replaceSave} />
        <main id="main-content" className="content">
          <NewGame state={state} dispatch={dispatch} />

        </main>

        <SiteFooter />
        {guideOpen && <Guide onClose={() => setGuideOpen(false)} />}
      </div>
    )
  }

  const seasonRounds = state.totalRounds ?? TOTAL_ROUNDS
  const st = !isCampaign && state.teamId ? streakOf(state, state.teamId) : null
  const progress = !isCampaign && seasonRounds > 0
    ? Math.min(100, Math.max(0, ((Math.min(state.round, seasonRounds) - 1) / seasonRounds) * 100))
    : 0

  return (
    <div className={`app broadcast-shell${state.matchSession ? ' arena-shell' : ''}`}>
      <a className="skip" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <Brand />
        {st && st.n >= 2 && (
          <span className={`streak-pill ${st.dir === 'L' ? 'cold' : ''}`} title={st.dir === 'W' ? 'Win streak' : 'Losing streak'}>
            <MatchIcon name={st.dir === 'W' ? 'flame' : 'snow'} size={14} /> {st.dir}{st.n}
          </span>
        )}
        <div className="who">
          {isSeasonReplay ? (
            <><strong>{state.managerName || 'Coach'}</strong> · Season replay: history, unchangeable</>
          ) : (
            <>
              <strong>{state.managerName}</strong> · managing{' '}
              <span>{state.teamId}</span>
              {state.league ? <> · {state.league}</> : null}
              {isCampaign ? (
                <> · Scenario Mode</>
              ) : isCareer ? (
                <> · Season {state.career?.seasonIndex ?? 1} · Week {Math.min(state.round, seasonRounds)}/{seasonRounds}</>
              ) : (
                <> · Week {Math.min(state.round, seasonRounds)}/{seasonRounds}</>
              )}
            </>
          )}
        </div>
        <label className="sr-only" htmlFor="sim-speed-select">Simulation speed</label>
        <select
          id="sim-speed-select"
          className="year-select"
          value={state.simSpeed ?? 'normal'}
          onChange={(e) => dispatch({ type: 'SET_SIM_SPEED', speed: e.target.value })}
          title="Sim speed — how fast games reveal"
          style={{ fontSize: 12, padding: '6px 10px' }}
        >
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
          <option value="instant">Instant</option>
        </select>
        <button className="ghost" onClick={openGuide}>
          How to Play
        </button>
        <button className="ghost" onClick={() => dispatch({ type: 'RESET' })}>
          New Game
        </button>
      </header>
      <main id="main-content" className="content">
        <SaveError error={storageError} retrySave={retrySave} loadError={loadError} retryLoad={retryLoad} replaceSave={replaceSave} />
        {!state.matchSession && !isCampaign && state.teamId && (
          <div className="top-progress" aria-hidden>
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
        {!state.matchSession && !isCampaign && !isSeasonReplay && state.board && (
          <div className="manager-strip">
            <span><MatchIcon name="target" size={16} /> <strong>{state.board.expectation}</strong></span>
            {/* Warn below 40 matches BoardCard pressure band; sack at ≤0 in useGameState ADVANCE_SEASON */}
            <span className={state.board.confidence < 40 ? 'board-trust-warn' : 'board-trust'}>
              Board {state.board.confidence}
            </span>
            {state.finance && <span><MatchIcon name="gold" size={16} /> {fmtMoney(state.finance.budget)}</span>}
            {state.sacked && <span className="bad">SACKED</span>}
          </div>
        )}

        {!state.matchSession && <nav className="tabs" aria-label="Season navigation">
          {nav.map(([id, label]) => (
            <button
              key={id}
              className={activeTab === id ? 'tab active' : 'tab'}
              aria-current={activeTab === id ? 'page' : undefined} onClick={() => setTab(id)}
            >
              <MatchIcon name={id} size={15} />{label}
            </button>
          ))}
        </nav>}

        {state.matchSession ? <MatchExperience state={state} dispatch={dispatch} /> : isRetired ? (
          <CareerEpitaph state={state} dispatch={dispatch} />
        ) : (
          <>
            {activeTab === 'campaign' && isCampaign && (
              <Campaign state={state} dispatch={dispatch} />
            )}
            {activeTab === 'dashboard' && !isCampaign && (
              state.mode === 'gauntlet'
                ? <Gauntlet state={state} dispatch={dispatch} />
                : <Dashboard state={state} dispatch={dispatch} setTab={setTab} totalRounds={seasonRounds} />
            )}
            {activeTab === 'lineup' && <Lineup state={state} dispatch={dispatch} />}
            {activeTab === 'tactics' && <Tactics state={state} dispatch={dispatch} />}
            {activeTab === 'strategy' && !isCampaign && <Strategy state={state} dispatch={dispatch} />}
            {activeTab === 'standings' && !isCampaign && <Standings state={state} />}
            {activeTab === 'results' && <Results state={state} />}
            {activeTab === 'market' && !isCampaign && !isCareer && <Market state={state} dispatch={dispatch} />}
            {activeTab === 'squad' && isCareer && <Squad state={state} dispatch={dispatch} />}
            {activeTab === 'tournament' && !isCampaign && state.tournament && (
              <Tournament state={state} dispatch={dispatch} />
            )}
          </>
        )}
      </main>

      {/* Career modals render globally — a pending dilemma/promotion blocks
          ADVANCE_SEASON, and that button lives on the Dashboard. */}
      {!state.matchSession && state.pendingEvent && <EventModal state={state} dispatch={dispatch} />}
      {!state.matchSession && state.pendingPromotion && <PromotionModal state={state} dispatch={dispatch} />}
      {!state.matchSession && state.press?.pending && !isSeasonReplay && (
        <PressModal state={state} dispatch={dispatch} onClose={() => dispatch({ type: 'PRESS_SKIP' })} />
      )}

      <SiteFooter />
      {resetPending && <ConfirmDialog title="Start a new game?" confirmLabel="Start new game"
        onCancel={() => setResetPending(false)}
        onConfirm={() => {
          setResetPending(false)
          setTab('dashboard')
          gameDispatch({ type: 'RESET' })
        }}>
        This replaces your current saved session. Your progress will be lost.
      </ConfirmDialog>}
      {guideOpen && <Guide onClose={() => setGuideOpen(false)} />}
      {showTutorial && (
        <TutorialCoach state={state} dispatch={dispatch} activeTab={activeTab} setTab={setTab} />
      )}
    </div>
  )
}
