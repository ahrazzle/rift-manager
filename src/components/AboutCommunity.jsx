import { useEffect } from 'react'
import MatchIcon from './MatchIcon.jsx'
import { GITHUB_CONTRIBUTING, GITHUB_DISCUSSIONS, GITHUB_REPO, LIVE_PLAY_URL } from '../siteLinks.js'
import { scrollContentToTop } from '../utils/scrollToTop.js'

export default function AboutCommunity({ onClose }) {
  useEffect(() => {
    scrollContentToTop()
  }, [])

  return (
    <div className="modal-backdrop about-backdrop" onClick={onClose}>
      <div
        className="modal about-modal broadcast-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-community-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head guide-modal-head">
          <div>
            <span className="eyebrow"><MatchIcon name="book" size={16} /> Community</span>
            <h2 id="about-community-title">About / Community</h2>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            Close ✕
          </button>
        </div>

        <div className="guide-body guide-sections about-sections">
          <article className="guide-section card accent-gold">
            <h3>What it is</h3>
            <p>
              Rift Manager is a free browser League of Legends esports management sim.
              You coach a club through <strong>prepare → decide → watch → adjust</strong>.
              Play free at{' '}
              <a href={LIVE_PLAY_URL} target="_blank" rel="noreferrer">{LIVE_PLAY_URL.replace(/^https:\/\//, '')}</a>.
            </p>
          </article>

          <article className="guide-section card accent-blue">
            <h3>Modes</h3>
            <ul className="about-list">
              <li><strong>Season</strong> — one full split: weeks, playoffs, MSI, Worlds.</li>
              <li><strong>Career</strong> — multi-season dynasty with aging, contracts, and board pressure.</li>
              <li><strong>Scenario</strong> — short authored story campaigns.</li>
              <li><strong>Gauntlet</strong> — escalating best-of ladder; one loss ends the run.</li>
              <li><strong>Draft / IGL</strong> — optional pick/ban and one macro call per game. Show simulation watches the map without changing the result.</li>
            </ul>
          </article>

          <article className="guide-section card accent-win">
            <h3>Public repository</h3>
            <p>
              Source lives on GitHub at{' '}
              <a href={GITHUB_REPO} target="_blank" rel="noreferrer">{GITHUB_REPO.replace(/^https:\/\//, '')}</a>.
              The repository is public. Issues, discussions, and pull requests are welcome.
              There is no license file yet — treat this as a public repository on GitHub.
            </p>
            <p className="footer-contribute-links about-links">
              <a className="btn btn-quiet" href={GITHUB_REPO} target="_blank" rel="noreferrer">GitHub repository</a>
              <a className="btn btn-quiet" href={GITHUB_DISCUSSIONS} target="_blank" rel="noreferrer">Discussions</a>
              <a className="btn btn-quiet" href={GITHUB_CONTRIBUTING} target="_blank" rel="noreferrer">Contributing guide</a>
            </p>
          </article>

          <article className="guide-section card accent-neutral">
            <h3>How to contribute</h3>
            <p>
              Read <strong>CONTRIBUTING.md</strong> first. Use Discussions for open-ended ideas;
              open issues for bugs and concrete work. Keep each pull request focused. Add or update
              tests when behavior changes. Keep old browser saves loading across versions.
            </p>
          </article>

          <article className="guide-section card accent-gold">
            <h3>What feedback helps</h3>
            <p>
              Tell us what hurt, what sang, and what would keep you coaching: draft feel,
              player development visibility, transfers with real tradeoffs, morale and board
              consequences. We are not building a chemistry meter.
            </p>
          </article>

          <article className="guide-section card accent-blue">
            <h3>Art and trademarks</h3>
            <p>
              League of Legends names are Riot Games trademarks used as third-party references.
              Champion portraits, when shown in draft or map display, load from Riot&apos;s Data Dragon
              CDN with initials or role-icon fallbacks. Club crests and many UI glyphs are original
              project art. This project is not affiliated with Riot Games. Original champion icons
              and team crests are especially welcome.
            </p>
          </article>

          <article className="guide-section card accent-neutral">
            <h3>License</h3>
            <p>
              The source is public on GitHub. Until a license file is added, please treat it as a
              public repository only.
            </p>
          </article>
        </div>
      </div>
    </div>
  )
}
