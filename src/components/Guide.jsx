import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import guideMd from '../../docs/GUIDE.md?raw'
import MatchIcon from './MatchIcon.jsx'
import { scrollContentToTop } from '../utils/scrollToTop.js'

const ACCENTS = ['gold', 'blue', 'win', 'neutral']

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseGuideSections(md) {
  const lines = md.split('\n')
  const intro = []
  const sections = []
  let current = null
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      const title = line.slice(3).trim()
      current = { id: slug(title), title, body: '' }
    } else if (line.startsWith('# ')) {
      /* Document title — modal header already shows How to Play */
    } else if (current) {
      current.body += `${line}\n`
    } else if (line.trim()) {
      intro.push(line)
    }
  }
  if (current) sections.push(current)
  return { intro: intro.join('\n').trim(), sections }
}

export default function Guide({ onClose, onReplayWalkthrough }) {
  const { intro, sections } = useMemo(() => parseGuideSections(guideMd), [])
  const [activeId, setActiveId] = useState(sections[0]?.id ?? 'overview')
  const bodyRef = useRef(null)

  useEffect(() => {
    scrollContentToTop()
  }, [])

  useEffect(() => {
    const root = bodyRef.current
    if (!root) return
    const headings = root.querySelectorAll('[data-guide-section]')
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id)
      },
      { root, rootMargin: '-20% 0px -55% 0px', threshold: 0 },
    )
    headings.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [sections])

  const jump = (id) => {
    const el = bodyRef.current?.querySelector(`#${CSS.escape(id)}`)
    if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' })
    setActiveId(id)
  }

  return (
    <div className="modal-backdrop guide-backdrop" onClick={onClose}>
      <div className="modal guide-modal broadcast-guide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head guide-modal-head">
          <div>
            <span className="eyebrow"><MatchIcon name="book" size={16} /> Broadcast guide</span>
            <h2>How to Play</h2>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            Close ✕
          </button>
        </div>
        {intro && (
          <p className="guide-lede">{intro}</p>
        )}
        <nav className="guide-chips" aria-label="Guide sections">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`chip ${activeId === s.id ? 'active' : ''}`}
              aria-current={activeId === s.id ? 'true' : undefined}
              onClick={() => jump(s.id)}
            >
              {s.title}
            </button>
          ))}
        </nav>
        <div className="guide-body guide-sections" ref={bodyRef}>
          {sections.map((s, i) => {
            const html = marked.parse(s.body)
            return (
              <article
                key={s.id}
                id={s.id}
                data-guide-section
                className={`guide-section card accent-${ACCENTS[i % ACCENTS.length]}`}
              >
                <h3>{s.title}</h3>
                <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
              </article>
            )
          })}
          <footer className="guide-section card accent-neutral guide-footer">
            <h3>Contributing &amp; saves</h3>
            <p>
              Want to improve the sim or docs? See <strong>CONTRIBUTING.md</strong> in the repo for setup, tests, and PR expectations.
              Your browser saves automatically; staging uses a separate key from the live site.
            </p>
            {typeof onReplayWalkthrough === 'function' && (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  onReplayWalkthrough()
                  onClose()
                }}
              >
                Replay walkthrough
              </button>
            )}
          </footer>
        </div>
      </div>
    </div>
  )
}
