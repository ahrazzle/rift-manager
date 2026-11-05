import { GITHUB_CONTRIBUTING, GITHUB_REPO } from '../siteLinks.js'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <section className="footer-contribute" aria-labelledby="footer-contribute-heading">
        <p className="label" id="footer-contribute-heading">
          Help shape the game
        </p>
        <p className="footer-contribute-copy muted">
          The source is public on GitHub. Open issues, join discussions, or send pull requests
          to help shape Rift Manager.
        </p>
        <p className="footer-contribute-links">
          <a className="btn btn-quiet" href={GITHUB_REPO} target="_blank" rel="noreferrer">
            GitHub repository
          </a>
          <a className="btn btn-quiet" href={GITHUB_CONTRIBUTING} target="_blank" rel="noreferrer">
            Contributing guide
          </a>
        </p>
      </section>
      <p className="footer-disclaimer faint">
        Champion portraits and League names come from Riot&apos;s Data Dragon CDN; third-party
        names and imagery are not original project assets.
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
