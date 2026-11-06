// ============================================================================
// Hub (internal tab id `dashboard`). Composition root for src/components/hub.
//
// Layout follows prototypes/hub.html: a main column (next-match hero,
// starting five, Coach's office, fixtures) and a right rail (table, inbox,
// fan hype, career). After the regular season the hero becomes the season
// status card and any live bracket. The shell renders the page <h1>.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { explainWinProb, matchupSeed, matchupOppTactic, seededRng } from '../game/logic.js'
import { recomputeGames } from './MatchDetail.jsx'
import Tournament from './Tournament.jsx'
import HubHero, { NoFixture } from './hub/HubHero.jsx'
import StartingFive from './hub/StartingFive.jsx'
import Fixtures from './hub/Fixtures.jsx'
import TableMini from './hub/TableMini.jsx'
import Inbox from './hub/Inbox.jsx'
import HypeCard from './hub/HypeCard.jsx'
import PrepCard from './hub/PrepCard.jsx'
import OffseasonReport from './hub/OffseasonReport.jsx'
import CareerCard from './hub/CareerCard.jsx'
import SeasonStatus, { seasonStatusModel } from './hub/SeasonStatus.jsx'
import AchievementToasts from './hub/AchievementToasts.jsx'
import { nextMatch } from './hub/hubData.js'
import { takeNewAchievements, takePrepIntent } from './hub/hubMemory.js'

const TOAST_MS = 6500

function scrollToId(id) {
  const el = globalThis.document?.getElementById?.(id)
  if (!el) return
  const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  el.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  el.focus?.({ preventScroll: true })
}

export default function Dashboard({ state, dispatch, setTab, totalRounds }) {
  const [toasts, setToasts] = useState([])
  // "Plan next week" from the review room arrives once, on mount.
  const [prepFocus] = useState(() => takePrepIntent())
  const prepFocusRef = useRef(prepFocus)

  const match = nextMatch(state)
  const oppId = match?.oppId ?? null
  const rounds = totalRounds ?? state.totalRounds

  const preview = useMemo(() => {
    if (!oppId) return null
    // One seeded estimate: the hero %, the Why panel and Strategy agree exactly.
    const seed = matchupSeed(state, oppId)
    const oppTactic = matchupOppTactic(state, oppId)
    const why = explainWinProb(state, oppId, { n: 300, rng: seededRng(seed), oppTactic })
    return { pct: Math.round(why.prob * 100), why }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oppId, state.round, state.lineup, state.form, state.tactic, state.strategy, state.teams, state.teamId, state.career, state.seriesOptions, state.preparation])

  // Achievement unlocks that did not already show on the Result stage.
  const lastUser = useMemo(() => [...(state.results ?? [])].reverse().find((r) => r.isUser), [state.results])
  useEffect(() => {
    let gamesByRound = null
    if (lastUser) {
      try {
        const games = recomputeGames(lastUser)
        if (games) gamesByRound = { [lastUser.round]: games }
      } catch {
        gamesByRound = null
      }
    }
    const fresh = takeNewAchievements(state, gamesByRound)
    if (!fresh.length) return undefined
    setToasts(fresh)
    const t = setTimeout(() => setToasts([]), TOAST_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.results, state.playoffChampionId, state.tournament, state.phase, state.career, state.teams])

  useEffect(() => {
    if (prepFocusRef.current) {
      prepFocusRef.current = null
      scrollToId('weekly-preparation')
    }
  }, [])

  const play = () => dispatch({ type: 'PREVIEW_MATCH', action: { type: 'PLAY_ROUND' } })
  const report = state.mode === 'career' && state.offseasonReport ? (
    <OffseasonReport report={state.offseasonReport} dispatch={dispatch} />
  ) : null

  const rail = (
    <div className="hub-col hub-rail">
      <TableMini state={state} setTab={setTab} />
      <Inbox state={state} dispatch={dispatch} onOpenHref={(href) => scrollToId(href.slice(1))} />
      <HypeCard state={state} />
      <CareerCard state={state} dispatch={dispatch} />
    </div>
  )

  if (state.finished) {
    const model = seasonStatusModel(state)
    return (
      <div className="hub">
        <div className="hub-col hub-main">
          <SeasonStatus state={state} dispatch={dispatch} setTab={setTab} card={model.card} />
          {report}
          {model.bracket && state.tournament && <Tournament state={state} dispatch={dispatch} />}
        </div>
        {rail}
        <AchievementToasts toasts={toasts} />
      </div>
    )
  }

  return (
    <div className="hub">
      <div className="hub-col hub-main">
        {match && preview ? (
          <HubHero
            state={state}
            match={match}
            pct={preview.pct}
            why={preview.why}
            totalRounds={rounds}
            onPlay={play}
            setTab={setTab}
            dispatch={dispatch}
            onJumpToPrep={() => scrollToId('weekly-preparation')}
          />
        ) : (
          <NoFixture state={state} />
        )}
        {report}
        <StartingFive state={state} setTab={setTab} />
        <PrepCard
          key={`${state.career?.seasonIndex ?? 1}-${state.round}`}
          state={state}
          dispatch={dispatch}
          suggestedFocus={prepFocus}
        />
        <Fixtures state={state} matches={match?.matches} week={state.round} />
      </div>
      {rail}
      <AchievementToasts toasts={toasts} />
    </div>
  )
}
