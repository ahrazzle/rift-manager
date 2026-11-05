import { useEffect } from 'react'
import MatchIcon from './MatchIcon.jsx'
import { nextTutorialStep, preparationApplies, stepsFor } from '../game/tutorial.js'

const COPY = {
  welcome: {
    title: 'Welcome, Coach',
    body: 'Rift Manager is prepare → decide → watch → adjust. Each week you set the roster and tactics, optionally train, then play the series and read what changed.',
    cta: 'Show me the hub',
  },
  hub: {
    title: 'Your command center',
    body: 'The Dashboard shows your next opponent and win outlook. Play Week is the heartbeat — that button kicks off the series when you are ready.',
    cta: 'Next',
    alt: 'See Lineup',
  },
  lineup: {
    title: 'Your five starters',
    body: 'Lineup is where you pick one starter per role. Subs sit ready if form crashes after a loss.',
    cta: 'Got it',
  },
  prep: {
    title: 'One prep session',
    body: 'In Season and Career, run one optional coaching session before Play Week — scrims, lane work, objectives, or recovery. It shows exact bonuses before you commit.',
    cta: 'Next',
  },
  play: {
    title: 'Time to play',
    body: 'Press Play Week on the Dashboard (or your mode’s play button). Choose match add-ons, then enter draft or the Rift. Outcomes are never rewritten for the tutorial.',
    cta: 'Understood',
  },
  result: {
    title: 'What changed',
    body: 'After the series, open Results or the review room for dragons, gold swings, and training hints. Plan next week, then come back to the Dashboard for the next opponent.',
    cta: 'Finish tour',
  },
}

export default function TutorialCoach({ state, dispatch, activeTab, setTab }) {
  const tutorial = state.tutorial
  const step = tutorial?.step
  const copy = COPY[step]
  const userSeries = (state.results || []).filter((r) => r.isUser).length

  useEffect(() => {
    if (!tutorial || tutorial.completed || tutorial.dismissed) return
    if (step === 'play' && state.matchSession?.stage === 'result') {
      dispatch({ type: 'TUTORIAL_SET_STEP', step: 'result' })
    }
  }, [step, state.matchSession, tutorial, dispatch])

  useEffect(() => {
    if (step === 'prep' && preparationApplies(state) && state.trainedRound === state.round) {
      /* Player finished prep — no auto-skip; they still click Next */
    }
  }, [step, state.trainedRound, state.round, state])

  if (!copy || step === 'done') return null

  const dismiss = () => dispatch({ type: 'TUTORIAL_DISMISS' })
  const advance = () => dispatch({ type: 'TUTORIAL_ADVANCE' })

  const onPrimary = () => {
    if (step === 'welcome' || step === 'hub') {
      if (activeTab !== 'dashboard' && activeTab !== 'campaign') setTab(state.mode === 'campaign' ? 'campaign' : 'dashboard')
    }
    if (step === 'hub' && copy.alt) {
      /* primary just advances */
    }
    if (step === 'lineup' && activeTab !== 'lineup') setTab('lineup')
    if (step === 'prep' && preparationApplies(state)) {
      const el = document.getElementById('weekly-preparation')
      if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
    if (step === 'play' && !state.matchSession) {
      if (activeTab !== 'dashboard' && activeTab !== 'campaign') setTab(state.mode === 'campaign' ? 'campaign' : 'dashboard')
    }
    if (step === 'result') {
      dispatch({ type: 'TUTORIAL_ADVANCE' })
      return
    }
    advance()
  }

  const stepIndex = stepsFor(tutorial).indexOf(step)
  const stepTotal = stepsFor(tutorial).filter((s) => s !== 'done').length

  return (
    <div className="tutorial-coach" role="dialog" aria-labelledby="tutorial-title" aria-modal="false">
      <div className="tutorial-card card">
        <div className="tutorial-head">
          <span className="tutorial-kicker">
            <MatchIcon name="target" size={14} /> Coach tour · {stepIndex + 1}/{stepTotal}
          </span>
          <div className="tutorial-actions-top">
            <button type="button" className="ghost" onClick={dismiss}>
              Skip
            </button>
          </div>
        </div>
        <h2 id="tutorial-title">{copy.title}</h2>
        <p className="hint">{copy.body}</p>
        {step === 'result' && userSeries > 0 && (
          <p className="tutorial-note">
            You have {userSeries} series logged — check <strong>Results</strong> for the latest breakdown.
          </p>
        )}
        <div className="tutorial-foot">
          <button type="button" className="primary" onClick={onPrimary}>
            {copy.cta} →
          </button>
          {step === 'hub' && !tutorial.short && (
            <button type="button" className="ghost" onClick={() => { setTab('lineup'); advance() }}>
              Open Lineup
            </button>
          )}
          <button type="button" className="ghost" onClick={dismiss} title="Never show this tour again for this save">
            Don&apos;t show again
          </button>
        </div>
      </div>
    </div>
  )
}
