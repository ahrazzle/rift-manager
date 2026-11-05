/** First-run coach overlay — persisted on save; legacy saves skip automatically. */

export const TUTORIAL_STEPS_FULL = ['welcome', 'hub', 'lineup', 'prep', 'play', 'result', 'done']
export const TUTORIAL_STEPS_SHORT = ['welcome', 'hub', 'play', 'result', 'done']

export function freshTutorial(mode) {
  const short = mode === 'gauntlet' || mode === 'campaign'
  return { step: 'welcome', dismissed: false, completed: false, short: !!short }
}

/** Old saves without a tutorial field should not be forced through onboarding. */
export function legacyTutorial() {
  return { step: 'done', dismissed: true, completed: true, short: false }
}

export function stepsFor(tutorial) {
  return tutorial?.short ? TUTORIAL_STEPS_SHORT : TUTORIAL_STEPS_FULL
}

export function nextTutorialStep(tutorial) {
  const steps = stepsFor(tutorial)
  const idx = steps.indexOf(tutorial.step)
  if (idx < 0 || idx >= steps.length - 1) {
    return { step: 'done', completed: true, dismissed: tutorial.dismissed, short: tutorial.short }
  }
  const step = steps[idx + 1]
  return { ...tutorial, step, completed: step === 'done' }
}

export function normalizeTutorial(raw, { hasManagedTeam }) {
  if (raw && typeof raw === 'object' && raw.step) {
    return {
      step: raw.step,
      dismissed: !!raw.dismissed,
      completed: !!raw.completed || raw.step === 'done',
      short: !!raw.short,
    }
  }
  if (!hasManagedTeam) return legacyTutorial()
  return legacyTutorial()
}

export function shouldShowTutorial(state, { resetPending = false, guideOpen = false } = {}) {
  const t = state?.tutorial
  if (!t || t.completed || t.dismissed || t.step === 'done') return false
  if (!state.teamId && state.mode !== 'campaign') return false
  if (state.mode === 'campaign' && !state.teamId) return false
  if (resetPending || guideOpen) return false
  if (state.press?.pending) return false
  if (state.pendingEvent || state.pendingPromotion) return false
  const session = state.matchSession
  if (session) {
    if (t.step === 'result' && session.stage === 'result') return true
    if (t.step === 'play' && session.stage === 'setup') return true
    return false
  }
  return true
}

export function preparationApplies(state) {
  return state.mode === 'season' || state.mode === 'career'
}
