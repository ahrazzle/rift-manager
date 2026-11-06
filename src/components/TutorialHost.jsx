import { useCallback, useEffect, useMemo, useState } from 'react'
import TutorialOverlay from './TutorialOverlay.jsx'
import {
  allowsAutoTips,
  contextualTipDef,
  END_CARD_COPY,
  hubModesForState,
  hubStepsForMode,
  markSeen,
  replayTutorialState,
  shouldRunHubTour,
  shouldShowAdvanceTip,
} from '../game/tutorial.js'

const hasDomAnchors = () => typeof globalThis.document?.querySelector === 'function'

export default function TutorialHost({
  state,
  activeTab,
  setTab,
  onNewGameScreen,
  tutorial,
  persistTutorial,
  skipTutorial,
  hubTourRequest,
  onHubTourRequestHandled,
}) {
  const [showEndCard, setShowEndCard] = useState(false)
  const [contextual, setContextual] = useState(null)
  const [hubActive, setHubActive] = useState(false)
  const [hubQueued, setHubQueued] = useState(false)

  const skipAll = useCallback(() => {
    skipTutorial()
    setHubActive(false)
    setHubQueued(false)
    setShowEndCard(false)
    setContextual(null)
  }, [skipTutorial])

  const startHubIfReady = useCallback(
    (nextTutorial) => {
      if (!shouldRunHubTour(state, nextTutorial)) {
        setHubQueued(true)
        return
      }
      if (activeTab !== 'dashboard') {
        setHubQueued(true)
        setTab('dashboard')
        return
      }
      setHubQueued(false)
      setHubActive(true)
      if (nextTutorial.mainStep >= hubStepsForMode(hubModesForState(state)).length) {
        setShowEndCard(true)
      } else {
        setShowEndCard(false)
      }
    },
    [activeTab, setTab, state],
  )

  const replay = useCallback(() => {
    const next = replayTutorialState()
    persistTutorial(next)
    setShowEndCard(false)
    setContextual(null)
    if (onNewGameScreen) {
      setHubQueued(true)
      setHubActive(false)
      return
    }
    startHubIfReady(next)
  }, [onNewGameScreen, persistTutorial, startHubIfReady])

  useEffect(() => {
    if (!hubTourRequest) return
    replay()
    onHubTourRequestHandled?.()
  }, [hubTourRequest, replay, onHubTourRequestHandled])

  useEffect(() => {
    if (tutorial.status !== 'pending') {
      if (tutorial.status === 'skipped') {
        setHubActive(false)
        setShowEndCard(false)
        setContextual(null)
      }
      return
    }
    if (onNewGameScreen || state.matchSession) return
    if (!shouldRunHubTour(state, tutorial)) return
    if (hubActive || showEndCard) return
    if (tutorial.mainStep >= hubStepsForMode(hubModesForState(state)).length) {
      setHubActive(true)
      setShowEndCard(true)
      return
    }
    if (hubQueued || activeTab === 'dashboard') startHubIfReady(tutorial)
  }, [activeTab, hubActive, hubQueued, onNewGameScreen, showEndCard, startHubIfReady, state, tutorial])

  useEffect(() => {
    if (!hubQueued || state.matchSession || onNewGameScreen) return
    if (shouldRunHubTour(state, tutorial) && activeTab === 'dashboard') {
      setHubQueued(false)
      setHubActive(true)
    }
  }, [activeTab, hubQueued, onNewGameScreen, state, tutorial])

  const hubMode = hubModesForState(state)
  const hubSteps = useMemo(() => (hubMode ? hubStepsForMode(hubMode) : []), [hubMode])
  const hubStepIndex = Math.min(tutorial.mainStep, Math.max(hubSteps.length - 1, 0))

  useEffect(() => {
    if (!allowsAutoTips(tutorial) || tutorial.seen.matchOptions || !onNewGameScreen) return
    if (tutorial.status !== 'pending') return
    setContextual(contextualTipDef('matchOptions'))
  }, [onNewGameScreen, tutorial])

  useEffect(() => {
    if (!allowsAutoTips(tutorial) || tutorial.seen.tactics || hubActive || showEndCard) return
    if (activeTab !== 'tactics') return
    setContextual(contextualTipDef('tactics'))
  }, [activeTab, hubActive, showEndCard, tutorial])

  useEffect(() => {
    if (!allowsAutoTips(tutorial) || tutorial.seen.strategy || hubActive || showEndCard) return
    if (activeTab !== 'strategy') return
    setContextual(contextualTipDef('strategy'))
  }, [activeTab, hubActive, showEndCard, tutorial])

  useEffect(() => {
    if (!allowsAutoTips(tutorial) || tutorial.seen.advance) return
    if (!shouldShowAdvanceTip(state, tutorial)) return
    setContextual(contextualTipDef('advance'))
  }, [state, tutorial])

  const dismissContextual = useCallback(() => {
    if (!contextual) return
    persistTutorial(markSeen(tutorial, contextual.seenKey))
    setContextual(null)
  }, [contextual, persistTutorial, tutorial])

  useEffect(() => {
    if (!hubActive || showEndCard || !hubSteps[hubStepIndex]) return
    const step = hubSteps[hubStepIndex]
    if (step.ensureTab && activeTab !== step.ensureTab) setTab(step.ensureTab)
  }, [hubActive, hubStepIndex, hubSteps, activeTab, setTab, showEndCard])

  const advanceHub = useCallback(
    ({ missingAnchor } = {}) => {
      void missingAnchor
      const nextIndex = hubStepIndex + 1
      if (nextIndex >= hubSteps.length) {
        setShowEndCard(true)
        persistTutorial({ ...tutorial, mainStep: nextIndex })
        return
      }
      persistTutorial({ ...tutorial, mainStep: nextIndex })
    },
    [hubStepIndex, hubSteps.length, persistTutorial, tutorial],
  )

  const backHub = useCallback(() => {
    if (hubStepIndex <= 0) return
    persistTutorial({ ...tutorial, mainStep: hubStepIndex - 1 })
  }, [hubStepIndex, persistTutorial, tutorial])

  const finishHub = useCallback(() => {
    persistTutorial({ ...tutorial, status: 'completed', mainStep: 0 })
    setHubActive(false)
    setShowEndCard(false)
  }, [persistTutorial, tutorial])

  if (!hasDomAnchors()) return null

  const showHubOverlay =
    hubActive && !showEndCard && hubSteps.length > 0 && !onNewGameScreen && !state.matchSession

  return (
    <>
      {showHubOverlay && (
        <TutorialOverlay
          open
          steps={hubSteps}
          stepIndex={hubStepIndex}
          totalSteps={hubSteps.length}
          onNext={advanceHub}
          onBack={backHub}
          onSkip={skipAll}
        />
      )}
      {hubActive && showEndCard && (
        <TutorialOverlay
          open
          isEndCard
          copy={END_CARD_COPY}
          stepIndex={0}
          totalSteps={hubSteps.length}
          onDismiss={finishHub}
          onSkip={skipAll}
        />
      )}
      {contextual && (
        <TutorialOverlay
          open
          steps={[contextual]}
          stepIndex={0}
          totalSteps={1}
          onNext={dismissContextual}
          onSkip={skipAll}
        />
      )}
    </>
  )
}

export function TutorialIglTip({ stage, tutorial, persistTutorial, onSkipAll }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (stage !== 'decision') {
      setOpen(false)
      return
    }
    if (!allowsAutoTips(tutorial) || tutorial.seen.igl) return
    setOpen(true)
  }, [stage, tutorial])

  const dismiss = useCallback(() => {
    persistTutorial(markSeen(tutorial, 'igl'))
    setOpen(false)
  }, [persistTutorial, tutorial])

  if (!open) return null
  const tip = contextualTipDef('igl')
  return (
    <TutorialOverlay
      open
      placement="igl-safe"
      steps={[tip]}
      stepIndex={0}
      totalSteps={1}
      onNext={dismiss}
      onSkip={() => {
        onSkipAll?.()
        setOpen(false)
      }}
    />
  )
}

export function TutorialReviewTip({ show, tutorial, persistTutorial, onSkipAll }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!show) {
      setOpen(false)
      return
    }
    if (!allowsAutoTips(tutorial) || tutorial.seen.review) return
    setOpen(true)
  }, [show, tutorial])

  const dismiss = useCallback(() => {
    persistTutorial(markSeen(tutorial, 'review'))
    setOpen(false)
  }, [persistTutorial, tutorial])

  if (!open) return null
  const tip = contextualTipDef('review')
  return (
    <TutorialOverlay
      open
      steps={[tip]}
      stepIndex={0}
      totalSteps={1}
      onNext={dismiss}
      onSkip={() => {
        onSkipAll?.()
        setOpen(false)
      }}
    />
  )
}
