import { useRef, useState, useEffect, useCallback } from 'react'
import { useGameState } from './game/useGameState.js'
import NewGame from './components/NewGame.jsx'
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
import Guide, { GuideSections } from './components/Guide.jsx'
import { exportPng } from './utils/exportPng.js'
import { scrollContentToTop } from './utils/scrollToTop.js'
import { EventModal, PromotionModal } from './components/CareerModals.jsx'
import PressModal from './components/PressModal.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import AboutCommunity from './components/AboutCommunity.jsx'
import TutorialHost, { TutorialIglTip } from './components/TutorialHost.jsx'
import { normalizeTutorial, readTutorial, writeTutorial } from './game/tutorial.js'
import AppShell from './components/shell/AppShell.jsx'
import PageHeader from './components/shell/PageHeader.jsx'
import ClubPage from './components/shell/ClubPage.jsx'
import SettingsPanel from './components/shell/SettingsPanel.jsx'
import { ModeBarProvider } from './components/shell/modeBar.jsx'
import { navFor, resolveRoute, seasonContext, SEG_TOUR, shellKind, TAB_LABELS } from './components/shell/nav.js'
import { applyUiPrefs, readUiPrefs, writeUiPrefs } from './components/shell/uiPrefs.js'
import { segTabId } from './components/ui/Seg.jsx'
import { campaignById } from './game/useGameState.js'
import { teamName } from './game/hype.js'

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
/** Page title + context line for each destination. */
function pageMeta(dest, state, seasonRounds) {
  const kind = shellKind(state)
  const club = state.teamId ? teamName(state, state.teamId) : ''
  if (dest === 'team') return { title: 'Team', sub: club ? `${club} · roster, game plan and transfers` : 'Roster and game plan' }
  if (dest === 'compete') {
    if (kind === 'campaign' || kind === 'replay') {
      const c = state.campaign ? campaignById(state.campaign.campaignId) : null
      return { title: 'Compete', sub: c?.title ?? 'Scenario results' }
    }
    if (kind === 'gauntlet') return { title: 'Compete', sub: 'Gauntlet · standings and results' }
    const ctx = seasonContext(state, seasonRounds)
    const played = Math.max(0, Math.min((state.round ?? 1) - 1, seasonRounds))
    const sub = !state.finished
      ? played === 0
        ? `${state.league ?? 'LCK'} Regional Split · week 1 of ${seasonRounds} up next`
        : `${state.league ?? 'LCK'} Regional Split · after week ${played} of ${seasonRounds}`
      : `${ctx.primary} ${ctx.secondary}`.trim()
    return { title: 'Compete', sub }
  }
  if (dest === 'club') return { title: 'Club', sub: club ? `${club} · board, money, honours` : 'Save and honours' }
  if (dest === 'guide') return { title: 'Guide', sub: 'How Rift Manager plays, and your settings' }
  return { title: 'Hub', sub: '' }
}

export default function App() {
  const { state, dispatch: gameDispatch, TOTAL_ROUNDS, storageError, retrySave, loadError, retryLoad, replaceSave } = useGameState()
  const [tab, setTabRaw] = useState('dashboard')
  const [lastTabs, setLastTabs] = useState({})
  const [guideOpen, setGuideOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [resetPending, setResetPending] = useState(false)
  const [tutorial, setTutorial] = useState(() => readTutorial())
  const [hubTourRequest, setHubTourRequest] = useState(0)
  const [uiPrefs, setUiPrefs] = useState(() => readUiPrefs())
  const persistTutorial = useCallback((next) => {
    const base = typeof next === 'function' ? next(readTutorial()) : next
    const normalized = normalizeTutorial(base)
    writeTutorial(normalized)
    setTutorial(normalized)
  }, [])
  const skipTutorial = useCallback(() => {
    persistTutorial({ ...readTutorial(), status: 'skipped' })
  }, [persistTutorial])
  const changeUiPrefs = useCallback((next) => {
    writeUiPrefs(next)
    setUiPrefs(next)
  }, [])
  useEffect(() => {
    applyUiPrefs(uiPrefs)
  }, [uiPrefs])
  const prevActiveTab = useRef(null)
  const setTab = useCallback((id) => {
    setTabRaw(id)
    scrollContentToTop()
  }, [])
  const openGuide = useCallback(() => {
    setGuideOpen(true)
    scrollContentToTop()
  }, [])
  const openAbout = useCallback(() => {
    setAboutOpen(true)
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
  const requestNewGame = () => dispatch({ type: 'RESET' })

  // Season-replay campaigns carry no managed team — they still get the shell.
  const isSeasonReplay = state.mode === 'campaign' && !state.teamId
  const onNewGameScreen = !state.teamId && !isSeasonReplay
  const isCampaign = state.mode === 'campaign'
  const isCareer = state.mode === 'career'
  const isRetired = isCareer && state.career?.status === 'retired'

  // Five destinations; flat tab ids map onto them (see components/shell/nav.js).
  const nav = navFor(state)
  const route = resolveRoute(nav, tab)
  const activeTab = route.tab
  const activeDest = route.destination?.id ?? 'hub'

  // Clicking a destination reopens its last segment; a flat id goes straight there.
  const navigate = useCallback(
    (id) => {
      const byDest = nav.find((d) => d.id === id)
      setTab(byDest ? (lastTabs[id] && byDest.tabs.includes(lastTabs[id]) ? lastTabs[id] : byDest.tabs[0]) : id)
    },
    [nav, lastTabs, setTab],
  )
  useEffect(() => {
    if (!route.destination) return
    setLastTabs((prev) => (prev[route.destination.id] === activeTab ? prev : { ...prev, [route.destination.id]: activeTab }))
  }, [route.destination, activeTab])

  useEffect(() => {
    scrollContentToTop()
  }, [state.matchSession, state.teamId])

  useEffect(() => {
    if (prevActiveTab.current !== null && prevActiveTab.current !== activeTab) {
      scrollContentToTop()
    }
    prevActiveTab.current = activeTab
  }, [activeTab])

  const footer = <SiteFooter onOpenAbout={openAbout} />

  if (onNewGameScreen) {
    return (
      <>
        <AppShell variant="bare" state={state} dispatch={dispatch} onOpenGuide={openGuide} footer={footer}>
          <SaveError error={storageError} retrySave={retrySave} loadError={loadError} retryLoad={retryLoad} replaceSave={replaceSave} />
          <NewGame state={state} dispatch={dispatch} onOpenAbout={openAbout} />
        </AppShell>
        {guideOpen && (
          <Guide
            onClose={() => setGuideOpen(false)}
            onReplayWalkthrough={() => setHubTourRequest((n) => n + 1)}
          />
        )}
        {aboutOpen && <AboutCommunity onClose={() => setAboutOpen(false)} />}
        <TutorialHost
          state={state}
          activeTab="dashboard"
          setTab={() => {}}
          onNewGameScreen
          tutorial={tutorial}
          persistTutorial={persistTutorial}
          skipTutorial={skipTutorial}
          hubTourRequest={hubTourRequest}
          onHubTourRequestHandled={() => {}}
        />
      </>
    )
  }

  const seasonRounds = state.totalRounds ?? TOTAL_ROUNDS
  const meta = pageMeta(activeDest, state, seasonRounds)
  const segTabs = route.destination?.tabs ?? []
  const panelId = `${activeDest}-panel`
  const seg = segTabs.length > 1
    ? {
        name: activeDest,
        label: `${meta.title} pages`,
        items: segTabs.map((id) => ({ id, label: TAB_LABELS[id] ?? id, tour: SEG_TOUR[id] })),
        value: activeTab,
        onChange: setTab,
        panelId,
      }
    : null
  const panelProps = seg
    ? { role: 'tabpanel', id: panelId, 'aria-labelledby': segTabId(activeDest, activeTab) }
    : {}

  const screen = isRetired ? (
    <CareerEpitaph state={state} dispatch={dispatch} />
  ) : (
    <>
      {activeTab === 'campaign' && isCampaign && (
        <Campaign state={state} dispatch={dispatch} />
      )}
      {activeTab === 'dashboard' && !isCampaign && (
        state.mode === 'gauntlet'
          ? <Gauntlet state={state} dispatch={dispatch} />
          : <Dashboard
              state={state}
              dispatch={dispatch}
              setTab={setTab}
              totalRounds={seasonRounds}
              tutorial={tutorial}
              persistTutorial={persistTutorial}
              skipTutorial={skipTutorial}
            />
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
      {activeTab === 'club' && <ClubPage state={state} onNewGame={requestNewGame} />}
      {activeTab === 'guide' && (
        <div className="guide-page">
          <GuideSections variant="page" onReplayWalkthrough={() => setHubTourRequest((n) => n + 1)} />
        </div>
      )}
      {activeTab === 'settings' && (
        <SettingsPanel state={state} dispatch={dispatch} uiPrefs={uiPrefs} onUiPrefsChange={changeUiPrefs} />
      )}
    </>
  )

  return (
    <ModeBarProvider>
      {state.matchSession ? (
        <AppShell variant="mode" state={state} dispatch={dispatch} footer={footer}>
          <SaveError error={storageError} retrySave={retrySave} loadError={loadError} retryLoad={retryLoad} replaceSave={replaceSave} />
          <MatchExperience
            state={state}
            dispatch={dispatch}
            tutorial={tutorial}
            persistTutorial={persistTutorial}
            skipTutorial={skipTutorial}
          />
        </AppShell>
      ) : (
        <AppShell
          variant="game"
          state={state}
          dispatch={dispatch}
          nav={nav}
          activeDest={activeDest}
          onNavigate={navigate}
          totalRounds={seasonRounds}
          onNewGame={requestNewGame}
          footer={footer}
        >
          <SaveError error={storageError} retrySave={retrySave} loadError={loadError} retryLoad={retryLoad} replaceSave={replaceSave} />
          <PageHeader
            title={isSeasonReplay && activeDest === 'hub' ? 'Scenario' : meta.title}
            sub={meta.sub}
            seg={seg}
            hidden={activeDest === 'hub'}
          />
          <div className={`shell-panel shell-panel--${activeDest}`} {...panelProps}>
            {screen}
          </div>
        </AppShell>
      )}

      {/* Career modals render globally — a pending dilemma/promotion blocks
          ADVANCE_SEASON, and that button lives on the Dashboard. */}
      {!state.matchSession && state.pendingEvent && <EventModal state={state} dispatch={dispatch} />}
      {!state.matchSession && state.pendingPromotion && <PromotionModal state={state} dispatch={dispatch} />}
      {!state.matchSession && state.press?.pending && !isSeasonReplay && (
        <PressModal state={state} dispatch={dispatch} onClose={() => dispatch({ type: 'PRESS_SKIP' })} />
      )}

      {resetPending && <ConfirmDialog title="Start a new game?" confirmLabel="Start new game"
        onCancel={() => setResetPending(false)}
        onConfirm={() => {
          setResetPending(false)
          setTab('dashboard')
          gameDispatch({ type: 'RESET' })
        }}>
        This replaces your current saved session. Your progress will be lost.
      </ConfirmDialog>}
      {guideOpen && (
        <Guide onClose={() => setGuideOpen(false)} onReplayWalkthrough={() => setHubTourRequest((n) => n + 1)} />
      )}
      {aboutOpen && <AboutCommunity onClose={() => setAboutOpen(false)} />}
      <TutorialHost
        state={state}
        activeTab={activeTab}
        setTab={setTab}
        onNewGameScreen={false}
        tutorial={tutorial}
        persistTutorial={persistTutorial}
        skipTutorial={skipTutorial}
        hubTourRequest={hubTourRequest}
        onHubTourRequestHandled={() => {}}
      />
    </ModeBarProvider>
  )
}
