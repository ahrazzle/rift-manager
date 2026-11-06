import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { scrollTourAnchorIntoView } from '../game/tutorialScroll.js'

const PAD = 10

function prefersReducedMotion() {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  } catch {
    return false
  }
}

const hasDomAnchors = () => typeof globalThis.document?.querySelector === 'function'

// The shell renders some anchors twice (desktop rail and mobile tabbar, one of
// them display:none), so prefer the first one that is actually laid out.
function findAnchor(anchor) {
  if (!anchor || !hasDomAnchors()) return null
  const doc = globalThis.document
  const selector = `[data-tour="${anchor}"]`
  if (typeof doc.querySelectorAll === 'function') {
    const visible = Array.from(doc.querySelectorAll(selector)).find((el) => el.getClientRects?.().length > 0)
    if (visible) return visible
  }
  return doc.querySelector(selector)
}

function rectsOverlap(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export default function TutorialOverlay({
  open,
  steps,
  stepIndex,
  totalSteps,
  copy,
  isEndCard = false,
  placement = 'default',
  eyebrowLabel = 'Coach tip',
  onNext,
  onBack,
  onSkip,
  onDismiss,
}) {
  const cardRef = useRef(null)
  const firstFocusRef = useRef(null)
  const [hole, setHole] = useState(null)
  const [cardPos, setCardPos] = useState({ top: 16, left: 16 })
  const liveId = useId()
  const reducedMotion = prefersReducedMotion()
  const step = steps?.[stepIndex]
  const anchor = isEndCard ? null : step?.anchor

  const applyLayoutFromElement = useCallback(
    (el) => {
      if (isEndCard || !el) {
        setHole(null)
        const vw = globalThis.innerWidth || 800
        setCardPos({
          top: Math.max(24, (globalThis.innerHeight || 600) * 0.2),
          left: clamp(vw / 2 - 180, 12, vw - 372),
        })
        return
      }
      const rect = el.getBoundingClientRect()
      const top = rect.top - PAD
      const left = rect.left - PAD
      const width = rect.width + PAD * 2
      const height = rect.height + PAD * 2
      setHole({ top, left, width, height })

      const cardW = 360
      const cardH = cardRef.current?.offsetHeight || 220
      const vw = globalThis.innerWidth || 800
      const vh = globalThis.innerHeight || 600
      let cardTop = top + height + 12
      let cardLeft = clamp(left, 12, vw - cardW - 12)

      // The IGL decision is a dialog (centred on desktop, bottom sheet on
      // phones). Park the tip beside it, then above it, then below it: never
      // over the call grid.
      const iglPanel = placement === 'igl-safe' ? globalThis.document.querySelector('.igl-decision') : null
      const iglGrid = iglPanel ? globalThis.document.querySelector('.igl-call-grid') : null
      if (iglPanel && iglGrid) {
        const pr = iglPanel.getBoundingClientRect()
        const gr = iglGrid.getBoundingClientRect()
        const fits = (r) => r.top >= 8 && r.left >= 8 && r.left + cardW <= vw - 8 && r.top + cardH <= vh - 8
        const clear = (r) => !rectsOverlap({ top: r.top, left: r.left, right: r.left + cardW, bottom: r.top + cardH }, gr)
        const midTop = clamp(pr.top, 12, Math.max(12, vh - cardH - 12))
        const midLeft = clamp(pr.left + (pr.width - cardW) / 2, 12, Math.max(12, vw - cardW - 12))
        const candidates = [
          { top: midTop, left: pr.left - cardW - 16 },
          { top: midTop, left: pr.right + 16 },
          { top: pr.top - cardH - 12, left: midLeft },
          { top: pr.bottom + 12, left: midLeft },
          { top: gr.top - cardH - 12, left: midLeft },
        ]
        const pick = candidates.find((r) => fits(r) && clear(r)) ?? candidates.find(clear) ?? candidates[4]
        setCardPos({ top: pick.top, left: pick.left })
        return
      }
      if (placement === 'igl-safe') {
        const grid = globalThis.document.querySelector('.igl-call-grid')
        const coaching = globalThis.document.querySelector('.rift-sidebar.rift-coaching')
        const mapWrap = globalThis.document.querySelector('.rift-map-wrap')
        const mapRect = mapWrap?.getBoundingClientRect()
        if (mapRect) {
          cardTop = mapRect.bottom - cardH - 16
          cardLeft = clamp(mapRect.left + (mapRect.width - cardW) / 2, 12, vw - cardW - 12)
        } else {
          cardTop = vh - cardH - 24
          cardLeft = clamp(vw / 2 - cardW / 2, 12, vw - cardW - 12)
        }
        let cardRect = { top: cardTop, left: cardLeft, right: cardLeft + cardW, bottom: cardTop + cardH }
        if (grid) {
          const gr = grid.getBoundingClientRect()
          if (rectsOverlap(cardRect, gr)) cardTop = Math.min(gr.top - cardH - 12, vh - cardH - 12)
        }
        cardRect = { top: cardTop, left: cardLeft, right: cardLeft + cardW, bottom: cardTop + cardH }
        if (coaching) {
          const cr = coaching.getBoundingClientRect()
          if (rectsOverlap(cardRect, cr)) {
            cardLeft = clamp(cr.left - cardW - 16, 12, vw - cardW - 12)
            cardRect = { top: cardTop, left: cardLeft, right: cardLeft + cardW, bottom: cardTop + cardH }
            if (rectsOverlap(cardRect, cr)) cardTop = Math.min(cr.top - cardH - 12, vh - cardH - 12)
          }
        }
      } else if (cardTop + cardH > vh - 8) {
        cardTop = Math.max(12, top - cardH - 12)
      }
      if (placement !== 'igl-safe') {
        cardTop = clamp(cardTop, 12, Math.max(12, vh - cardH - 12))
        cardLeft = clamp(cardLeft, 12, Math.max(12, vw - cardW - 12))
      }
      setCardPos({ top: cardTop, left: cardLeft })
    },
    [isEndCard, placement],
  )

  /** Reposition cutout/card only — never scrolls the document. */
  const remeasure = useCallback(() => {
    if (!open) return
    if (isEndCard) {
      applyLayoutFromElement(null)
      return
    }
    if (!anchor) return
    const el = findAnchor(anchor)
    if (el) applyLayoutFromElement(el)
  }, [open, anchor, isEndCard, applyLayoutFromElement])

  useLayoutEffect(() => {
    if (!open) return
    if (isEndCard) {
      applyLayoutFromElement(null)
      return
    }
    if (!anchor) return
    const el = findAnchor(anchor)
    if (!el) {
      if (import.meta.env?.DEV) console.info('[tutorial] missing anchor', anchor)
      onNext?.({ missingAnchor: true })
      return
    }
    scrollTourAnchorIntoView(el, anchor, { reducedMotion })
    const positioned = findAnchor(anchor) ?? el
    applyLayoutFromElement(positioned)
  }, [open, stepIndex, anchor, isEndCard, reducedMotion, applyLayoutFromElement, onNext])

  useEffect(() => {
    if (!open) return undefined
    globalThis.addEventListener('resize', remeasure)
    globalThis.addEventListener('scroll', remeasure, true)
    return () => {
      globalThis.removeEventListener('resize', remeasure)
      globalThis.removeEventListener('scroll', remeasure, true)
    }
  }, [open, remeasure])

  useEffect(() => {
    if (!open) return undefined
    firstFocusRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onSkip?.()
      }
    }
    globalThis.document.addEventListener('keydown', onKey)
    return () => globalThis.document.removeEventListener('keydown', onKey)
  }, [open, onSkip, stepIndex])

  if (!open) return null
  if (!hasDomAnchors()) return null

  const stepLabel = isEndCard ? 'Complete' : `${stepIndex + 1} of ${totalSteps}`

  return (
    <div className="tutorial-root" aria-hidden={false}>
      {hole ? (
        <div
          className="tutorial-hole"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
        />
      ) : (
        <div className="tutorial-scrim-full" />
      )}
      <div
        ref={cardRef}
        className="tutorial-card card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${liveId}-title`}
        aria-describedby={`${liveId}-body`}
        style={{ top: cardPos.top, left: cardPos.left }}
      >
        <p className="eyebrow" id={`${liveId}-title`} aria-live="polite">
          {eyebrowLabel} · {stepLabel}
        </p>
        <p id={`${liveId}-body`}>{copy ?? step?.copy}</p>
        <div className="tutorial-actions">
          {stepIndex > 0 && !isEndCard && (
            <button type="button" className="ghost" onClick={onBack}>
              Back
            </button>
          )}
          <button type="button" className="ghost" onClick={onSkip}>
            Skip walkthrough
          </button>
          <button
            type="button"
            className="primary"
            ref={firstFocusRef}
            onClick={() => (isEndCard ? onDismiss?.() : onNext?.())}
          >
            {isEndCard ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
