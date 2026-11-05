import { GITHUB_CONTRIBUTING, GITHUB_REPO } from '../siteLinks.js'

export default function SiteFooter({ onOpenAbout }) {
  return (
    <footer className="site-footer">
      <section className="footer-contribute" aria-labelledby="footer-contribute-heading">
        <p className="label" id="footer-contribute-heading">
          Help shape the game
        </p>
        <p className="footer-contribute-copy muted">
          Free LoL esports management sim — prepare, decide, watch, adjust. Source is public on
          GitHub. Issues, discussions, and focused pull requests welcome.
        </p>
        <p className="footer-contribute-links">
          {typeof onOpenAbout === 'function' && (
            <button type="button" className="btn btn-quiet" onClick={onOpenAbout}>
              About / Community
            </button>
          )}
          <a className="btn btn-quiet" href={GITHUB_REPO} target="_blank" rel="noreferrer">
            GitHub repository
          </a>
          <a className="btn btn-quiet" href={GITHUB_CONTRIBUTING} target="_blank" rel="noreferrer">
            Contributing guide
          </a>
        </p>
      </section>
      <p className="footer-disclaimer faint">
        League of Legends names are Riot Games trademarks used as third-party references.
        Champion portraits, when shown in draft or map display, load from Riot&apos;s Data Dragon
        CDN with initials or role-icon fallbacks. Club crests and many UI glyphs are original
        project art. Not affiliated with Riot. Original champion icons and crests are welcome.
      </p>
      <a className="aska-signature" href="https://digital.askaconsult.com/" target="_blank" rel="noreferrer">
        <span>Made by</span> Aska Digital
      </a>
      <span className="footer-credit">
        Created by{' '}
        <a href="https://github.com/ahrazzle" target="_blank" rel="noreferrer">
          @ahrazzle
        </a>
      </span>
    </footer>
  )
}
