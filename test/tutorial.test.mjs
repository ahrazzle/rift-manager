import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import {
  TUTORIAL_KEY,
  readTutorial,
  writeTutorial,
  replayTutorialState,
  normalizeTutorial,
  hubStepKeys,
  hubStepsForMode,
  allowsAutoTips,
  shouldRunHubTour,
  shouldShowAdvanceTip,
  contextualTipDef,
  markSeen,
} from '../src/game/tutorial.js'
import { tutorialScrollBehavior, TUTORIAL_MOBILE_MAX_WIDTH, tutorialScrollBlock } from '../src/game/tutorialScroll.js'

const values = new Map()
globalThis.localStorage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
}

try {
  const fresh = readTutorial()
  assert.equal(fresh.status, 'pending')
  assert.equal(fresh.mainStep, 0)
  assert.equal(fresh.seen.igl, false)

  writeTutorial({ status: 'completed', mainStep: 3, seen: { ...fresh.seen, igl: true } })
  assert.deepEqual(readTutorial(), {
    version: 1,
    status: 'completed',
    mainStep: 3,
    seen: { matchOptions: false, igl: true, review: false, advance: false, tactics: false, strategy: false },
  })

  values.set(TUTORIAL_KEY, '{not-json')
  assert.equal(readTutorial().status, 'pending')

  const replay = replayTutorialState()
  assert.equal(replay.status, 'pending')
  assert.equal(replay.mainStep, 0)
  assert.equal(replay.seen.igl, false)
  assert.equal(replay.seen.tactics, false)

  const careerKeys = hubStepKeys('career')
  assert.ok(careerKeys.includes('squad'))
  assert.ok(!careerKeys.includes('market'))
  const seasonKeys = hubStepKeys('season')
  assert.ok(seasonKeys.includes('market'))
  assert.ok(!seasonKeys.includes('squad'))

  assert.equal(hubStepsForMode('season').find((s) => s.key === 'squad'), undefined)
  assert.equal(hubStepsForMode('career').find((s) => s.key === 'market'), undefined)

  assert.equal(allowsAutoTips({ status: 'skipped' }), false)
  assert.equal(allowsAutoTips({ status: 'completed' }), true)

  assert.equal(
    shouldRunHubTour({ teamId: 'T1', mode: 'career', matchSession: null }, { status: 'pending' }),
    true,
  )
  assert.equal(
    shouldRunHubTour({ teamId: 'T1', mode: 'gauntlet', matchSession: null }, { status: 'pending' }),
    false,
  )
  assert.equal(
    shouldRunHubTour({ teamId: 'T1', mode: 'career', matchSession: {} }, { status: 'pending' }),
    false,
  )

  assert.equal(
    shouldShowAdvanceTip({ mode: 'season', finished: true, career: { status: 'active' } }, fresh),
    false,
  )
  assert.equal(
    shouldShowAdvanceTip({ mode: 'career', finished: true, career: { status: 'active' }, matchSession: null }, fresh),
    true,
  )

  const advanceCopy = contextualTipDef('advance').copy
  assert.match(advanceCopy, /free-agent market/i)

  const skipped = markSeen(normalizeTutorial({ status: 'skipped' }), 'igl')
  writeTutorial(skipped)
  assert.equal(readTutorial().status, 'skipped')

  assert.equal(readTutorial().status, 'skipped')

  assert.equal(tutorialScrollBehavior({ reducedMotion: true, viewportWidth: 1280 }), 'auto')
  assert.equal(tutorialScrollBehavior({ reducedMotion: false, viewportWidth: 390 }), 'auto')
  assert.equal(tutorialScrollBehavior({ reducedMotion: false, viewportWidth: TUTORIAL_MOBILE_MAX_WIDTH }), 'auto')
  assert.equal(tutorialScrollBehavior({ reducedMotion: false, viewportWidth: TUTORIAL_MOBILE_MAX_WIDTH + 1 }), 'smooth')
  assert.equal(tutorialScrollBlock('tour-lineup-tab', 390), 'center')
  assert.equal(tutorialScrollBlock('tour-lineup-tab', 1280), 'nearest')
  assert.equal(tutorialScrollBlock('tour-prep', 390), 'nearest')

  const temp = await mkdtemp(new URL('./.tutorial-ui-', import.meta.url).pathname)
  let scrollIntoViewCalls = 0
  const mockRect = { top: 120, left: 16, width: 180, height: 36, right: 196, bottom: 156 }
  const mockEl = {
    getBoundingClientRect: () => mockRect,
    scrollIntoView: () => {
      scrollIntoViewCalls++
    },
  }
  let scrollListener
  globalThis.document = {
    querySelector: (sel) => (String(sel).includes('tour-scroll-test') ? mockEl : null),
    addEventListener: (type, fn, capture) => {
      if (type === 'scroll' && capture) scrollListener = fn
    },
    removeEventListener: () => {},
  }
  globalThis.addEventListener = (type, fn, capture) => {
    if (type === 'scroll' && capture) scrollListener = fn
  }
  globalThis.removeEventListener = () => {}
  globalThis.innerWidth = 1280
  globalThis.innerHeight = 800
  await build({
    entryPoints: ['src/components/TutorialOverlay.jsx'],
    outfile: `${temp}/TutorialOverlay.js`,
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    jsx: 'automatic',
  })
  const { default: TutorialOverlay } = await import(`${temp}/TutorialOverlay.js`)

  scrollIntoViewCalls = 0
  await act(async () => {
    create(
      React.createElement(TutorialOverlay, {
        open: true,
        steps: [{ anchor: 'tour-scroll-test', copy: 'Anchored step' }],
        stepIndex: 0,
        totalSteps: 2,
        onNext: () => {},
        onSkip: () => {},
      }),
    )
  })
  assert.equal(scrollIntoViewCalls, 1, 'scrollIntoView runs once when step anchor mounts')
  assert.equal(typeof scrollListener, 'function', 'capture-phase scroll listener is registered')
  scrollIntoViewCalls = 0
  scrollListener(new Event('scroll'))
  assert.equal(scrollIntoViewCalls, 0, 'scroll listener remeasures only; no scrollIntoView')

  let advanced = 0
  let skippedWalk = 0
  await act(async () => {
    create(
      React.createElement(TutorialOverlay, {
        open: true,
        steps: [{ anchor: 'missing-anchor-test', copy: 'Step body' }],
        stepIndex: 0,
        totalSteps: 1,
        onNext: () => {
          advanced++
        },
        onSkip: () => {
          skippedWalk++
        },
      }),
    )
  })
  assert.equal(advanced, 1, 'missing anchor advances without throw')

  const skipTree = create(
    React.createElement(TutorialOverlay, {
      open: true,
      steps: [{ anchor: 'x', copy: 'Body' }],
      stepIndex: 0,
      totalSteps: 1,
      onNext: () => {},
      onSkip: () => {
        skippedWalk++
      },
    }),
  )
  const skip = skipTree.root.findAllByProps({ className: 'ghost' }).find((n) =>
    n.children.join('').includes('Skip walkthrough'),
  )
  await act(async () => skip.props.onClick())
  assert.equal(skippedWalk, 1, 'Skip control fires handler')

  await rm(temp, { recursive: true, force: true })
  delete globalThis.document
  delete globalThis.addEventListener
  delete globalThis.removeEventListener
  console.log('Tutorial persistence, step resolver, and overlay checks pass')
} finally {
  delete globalThis.localStorage
}
