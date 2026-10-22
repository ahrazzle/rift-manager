import { useRef, useState } from 'react'
import { useGameState } from './game/useGameState.js'
import NewGame from './components/NewGame.jsx'
import Campaign from './components/Campaign.jsx'
import Dashboard from './components/Dashboard.jsx'
import Tournament from './components/Tournament.jsx'
import Lineup from './components/Lineup.jsx'
import Tactics from './components/Tactics.jsx'
import Strategy from './components/Strategy.jsx'
import Standings from './components/Standings.jsx'
import Results from './components/Results.jsx'
import Market from './components/Market.jsx'
import Squad from './components/Squad.jsx'
import Guide from './components/Guide.jsx'
import { exportPng } from './utils/exportPng.js'
import { streakOf } from './game/hype.js'
import { EventModal, PromotionModal } from './components/CareerModals.jsx'

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
      <h2>{state.managerName} — Career Retired 🏁</h2>
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
        catch { setShotErr('Export failed — try again.') }
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
      Created by{' '}
      <a href="https://github.com/ahrazzle" target="_blank" rel="noreferrer">
        @ahrazzle
      </a>
    </footer>
  )
}

export default function App() {
  const { state, dispatch, TOTAL_ROUNDS } = useGameState()
  const [tab, setTab] = useState('dashboard')
  const [guideOpen, setGuideOpen] = useState(false)

  // Season-replay campaigns carry no managed team — they still get the shell.
  const isSeasonReplay = state.mode === 'campaign' && !state.teamId

  if (!state.teamId && !isSeasonReplay) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="logo">LCK</span> Manager
          </div>
          <div className="who">New coach? Read the guide first.</div>
          <button className="ghost" onClick={() => setGuideOpen(true)}>
            How to Play
          </button>
        </header>

        <NewGame state={state} dispatch={dispatch} />

        <div className="card guide-cta">
          <h3>New to LCK Manager?</h3>
          <p className="tag">
            A quick read of the How to Play guide saves you a lost week. It walks
            through the season loop, tactics, and how to read a match.
          </p>
          <button className="primary" onClick={() => setGuideOpen(true)}>
            Read the How to Play guide →
          </button>
        </div>

        <SiteFooter />
        {guideOpen && <Guide onClose={() => setGuideOpen(false)} />}
      </div>
    )
  }

  const isCampaign = state.mode === 'campaign'
  const isCareer = state.mode === 'career'
  // (isSeasonReplay computed above, before the NewGame early-return.)
  const isRetired = isCareer && state.career?.status === 'retired'
  const nav = isSeasonReplay
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
  // International bracket tab appears once MSI/Worlds exists this season.
  if (!isCampaign && state.tournament) nav.push(['tournament', 'MSI/Worlds'])
  const activeTab = nav.some(([id]) => id === tab) ? tab : nav[0][0]

  const team = state.teams[state.teamId]
  const teamName = team ? team[0]?.team : state.teamId
  const seasonRounds = state.totalRounds ?? TOTAL_ROUNDS
  const st = !isCampaign && state.teamId ? streakOf(state, state.teamId) : null
  const progress = !isCampaign && seasonRounds > 0
    ? Math.min(100, Math.max(0, ((Math.min(state.round, seasonRounds) - 1) / seasonRounds) * 100))
    : 0

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">LCK</span> Manager
        </div>
        {st && st.n >= 2 && (
          <span className={`streak-pill ${st.dir === 'L' ? 'cold' : ''}`} title={st.dir === 'W' ? 'Win streak' : 'Losing streak'}>
            {st.dir === 'W' ? `🔥 W${st.n}` : `❄ L${st.n}`}
          </span>
        )}
        <div className="who">
          {isSeasonReplay ? (
            <><strong>{state.managerName || 'Coach'}</strong> · Season replay — history, unchangeable</>
          ) : (
            <>
              <strong>{state.managerName}</strong> · managing{' '}
              <span style={{ color: '#e2012d' }}>{state.teamId}</span>
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
        <button className="ghost" onClick={() => setGuideOpen(true)}>
          How to Play
        </button>
        <button className="ghost" onClick={() => dispatch({ type: 'RESET' })}>
          New Game
        </button>
      </header>
      {!isCampaign && state.teamId && (
        <div className="top-progress" aria-hidden>
          <span style={{ width: `${progress}%` }} />
        </div>
      )}

      <nav className="tabs">
        {nav.map(([id, label]) => (
          <button
            key={id}
            className={activeTab === id ? 'tab active' : 'tab'}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="content">
        {isRetired ? (
          <CareerEpitaph state={state} dispatch={dispatch} />
        ) : (
          <>
            {activeTab === 'campaign' && isCampaign && (
              <Campaign state={state} dispatch={dispatch} />
            )}
            {activeTab === 'dashboard' && !isCampaign && (
              <Dashboard state={state} dispatch={dispatch} setTab={setTab} totalRounds={seasonRounds} />
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
      {state.pendingEvent && <EventModal state={state} dispatch={dispatch} />}
      {state.pendingPromotion && <PromotionModal state={state} dispatch={dispatch} />}

      <SiteFooter />
      {guideOpen && <Guide onClose={() => setGuideOpen(false)} />}
    </div>
  )
}
