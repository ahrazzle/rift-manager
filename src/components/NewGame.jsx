import { useState } from 'react'
import TeamCrest from './TeamCrest.jsx'
import MatchIcon from './MatchIcon.jsx'
import { SEASONS, SEASON_ORDER, LEAGUES, PRESENT_BY_LEAGUE, seasonsForLeague } from '../data/seasons.js'
import MatchOptions from './MatchOptions.jsx'
import { matchOptions } from '../game/matchSession.js'
import { CAMPAIGNS } from '../data/campaigns.js'
import { GITHUB_CONTRIBUTING, GITHUB_REPO } from '../siteLinks.js'

export default function NewGame({ state, dispatch }) {
  const [options, setOptions] = useState(() => matchOptions(state?.matchOptions))
  const [mode, setMode] = useState('career')
  const [league, setLeague] = useState('LCK')
  const [seasonYear, setSeasonYear] = useState(PRESENT_BY_LEAGUE.LCK)
  const [careerYear, setCareerYear] = useState(PRESENT_BY_LEAGUE.LCK)
  const [teamId, setTeamId] = useState(SEASONS[PRESENT_BY_LEAGUE.LCK].teams[0].id)
  const [managerName, setManagerName] = useState('')
  const [campaignId, setCampaignId] = useState(CAMPAIGNS[0].id)

  const yearTeams = (SEASONS[seasonYear] ?? SEASONS.present).teams
  const careerTeams = (SEASONS[careerYear] ?? SEASONS.present).teams
  const leagueYears = seasonsForLeague(league)
  // Draft/IGL/Gauntlet are season-structured modes sharing the season picker.
  const isSeasonLike = mode === 'season' || mode === 'gauntlet'
  const MODE_START_LABEL = { season: 'Start Season →', gauntlet: 'Start Gauntlet →' }

  function pickMode(next) {
    setMode(next)
    // Ensure the shared teamId is valid for the newly shown year grid.
    if (next === 'season' || next === 'gauntlet') {
      setTeamId((SEASONS[seasonYear] ?? SEASONS.present).teams[0].id)
    } else if (next === 'career') {
      setTeamId((SEASONS[careerYear] ?? SEASONS.present).teams[0].id)
    }
  }

  function pickLeague(next) {
    setLeague(next)
    // Reset year + team selection — datasets differ between leagues.
    const defYear = PRESENT_BY_LEAGUE[next]
    setSeasonYear(defYear)
    setCareerYear(defYear)
    setTeamId((SEASONS[defYear] ?? SEASONS.present).teams[0].id)
  }

  function pickYear(year) {
    setSeasonYear(year)
    // Reset team selection — team ids may differ between years.
    setTeamId((SEASONS[year] ?? SEASONS.present).teams[0].id)
  }

  function pickCareerYear(year) {
    setCareerYear(year)
    // Reset team selection — team ids may differ between years.
    setTeamId((SEASONS[year] ?? SEASONS.present).teams[0].id)
  }

  return (
    <div className="newgame">
      <section className="card hero broadcast-entry" aria-labelledby="entry-title">
        <div className="entry-copy">
          <h1 id="entry-title">
            <img className="entry-brand" src={`${(import.meta.env?.BASE_URL ?? '/')}brand/rift-manager.svg`}
              width="448" height="160" alt="Rift Manager" />
          </h1>
          <p className="tag">Pick a roster and coach your team through the split.</p>
          <p className="entry-community faint">
            Public source on{' '}
            <a href={GITHUB_REPO} target="_blank" rel="noreferrer">
              GitHub
            </a>
            — issues, discussions, and pull requests welcome.{' '}
            <a href={GITHUB_CONTRIBUTING} target="_blank" rel="noreferrer">
              How to contribute
            </a>
          </p>
          <a className="entry-begin" href="#club-setup">Choose your club <MatchIcon name="chevron" size={18} /></a>
        </div>
      </section>

      <div className="card entry-setup" id="club-setup">
        <div className="entry-section-heading"><h2>Set up your team</h2></div>
        <label className="field">
          <span>Your name (coach)</span>
          <input
            value={managerName}
            placeholder="Coach"
            onChange={(e) => setManagerName(e.target.value)}
          />
        </label>

        <div className="field">
          <span>Choose your run</span>
          <div className="team-grid">
            <button
              className={mode === 'season' ? 'team-pick active mode-card' : 'team-pick mode-card'}
              aria-pressed={mode === 'season'} onClick={() => pickMode('season')}
            >
              <span className="tp-name"><MatchIcon name="flag" size={22} /> Season</span>
              <span className="tp-tier">One full split: draft, train, and chase the title.</span>
              {mode === 'season' && <span className="tp-selected">✓</span>}
            </button>
            <button
              className={mode === 'career' ? 'team-pick active mode-card' : 'team-pick mode-card'}
              aria-pressed={mode === 'career'} onClick={() => pickMode('career')}
            >
              <span className="tp-name"><MatchIcon name="trophy" size={22} /> Career</span>
              <span className="tp-tier">Ten seasons, one club. Build a dynasty.</span>
              {mode === 'career' && <span className="tp-selected">✓</span>}
            </button>
            <button
              className={mode === 'campaign' ? 'team-pick active mode-card' : 'team-pick mode-card'}
              aria-pressed={mode === 'campaign'} onClick={() => pickMode('campaign')}
            >
              <span className="tp-name"><MatchIcon name="clock" size={22} /> Scenario</span>
              <span className="tp-tier">Relive legendary runs, series by series.</span>
              {mode === 'campaign' && <span className="tp-selected">✓</span>}
            </button>
            <button
              className={mode === 'gauntlet' ? 'team-pick active mode-card' : 'team-pick mode-card'}
              aria-pressed={mode === 'gauntlet'} onClick={() => pickMode('gauntlet')}
            >
              <span className="tp-name"><MatchIcon name="shield" size={22} /> Gauntlet</span>
              <span className="tp-tier">Five escalating series. One loss ends the run.</span>
              {mode === 'gauntlet' && <span className="tp-selected">✓</span>}
            </button>
          </div>
        </div>

        <MatchOptions options={options} onChange={(key, value) => setOptions((o) => ({ ...o, [key]: value }))} />

        {(mode === 'career' || isSeasonLike) && (
          <div className="field">
            <span>League</span>
            <div className="team-grid">
              {LEAGUES.map((l) => (
                <button
                  key={l}
                  className={league === l ? 'team-pick active mode-card' : 'team-pick mode-card'}
                  onClick={() => pickLeague(l)}
                >
                  <span className="tp-name">{l}</span>
                  <span className="tp-tier">{(SEASONS[PRESENT_BY_LEAGUE[l]]?.teams.length ?? 0)} clubs · road to MSI + Worlds</span>
                  {league === l && <span className="tp-selected">✓</span>}
                </button>
              ))}
            </div>
            <p className="hint">
              Top 2 per league qualify for MSI + Worlds after the regional split.
            </p>
          </div>
        )}

        {isSeasonLike ? (
          <>
            <label className="field" htmlFor="season-year-select">
              <span>Season year</span>
              <select
                id="season-year-select"
                className="year-select"
                value={seasonYear}
                onChange={(e) => pickYear(e.target.value)}
              >
                {leagueYears.map((year) => (
                  <option key={year} value={year}>
                    {SEASONS[year].label}
                  </option>
                ))}
              </select>
              <p className="hint">
                Rosters evoke that year's {league}. Ratings are game-balanced fictional values.
              </p>
            </label>

            <div className="field">
              <span>Choose your team</span>
              <div className="team-grid">
                {yearTeams.map((t) => (
                  <button
                    key={t.id}
                    className={teamId === t.id ? 'team-pick active' : 'team-pick'}
                    aria-pressed={teamId === t.id} onClick={() => setTeamId(t.id)}
                    style={{ borderColor: t.color }}
                  >
                    <TeamCrest teamId={t.id} name={t.name} size={42} />
                    <span className="tp-name">{t.name}</span>
                    <span className="tp-tier">tier {t.tier}</span>
                    {teamId === t.id && <span className="tp-selected">✓</span>}
                    </button>
                ))}
              </div>
            </div>

            <button
              className="primary big"
              onClick={() => dispatch({ type: 'NEW_GAME', teamId, managerName, seasonYear, mode, matchOptions: options })}
            >
              {MODE_START_LABEL[mode] ?? 'Start Season →'}
            </button>
          </>
        ) : mode === 'career' ? (
          <>
            <label className="field" htmlFor="career-year-select">
              <span>Starting year</span>
              <select
                id="career-year-select"
                className="year-select"
                value={careerYear}
                onChange={(e) => pickCareerYear(e.target.value)}
              >
                {leagueYears.map((year) => (
                  <option key={year} value={year}>
                    {SEASONS[year].label}
                  </option>
                ))}
              </select>
              <p className="hint">
                Start with that year’s {league} roster, then build your own timeline. Ratings are fictional; league and tournament formats are simplified.
              </p>
            </label>

            <div className="field">
              <span>Choose your team ({league} {(SEASONS[careerYear] ?? SEASONS.present).label} — 10 seasons, one club)</span>
              <div className="team-grid">
                {careerTeams.map((t) => (
                  <button
                    key={t.id}
                    className={teamId === t.id ? 'team-pick active' : 'team-pick'}
                    aria-pressed={teamId === t.id} onClick={() => setTeamId(t.id)}
                    style={{ borderColor: t.color }}
                  >
                    <TeamCrest teamId={t.id} name={t.name} size={42} />
                    <span className="tp-name">{t.name}</span>
                    <span className="tp-tier">tier {t.tier}</span>
                    {teamId === t.id && <span className="tp-selected">✓</span>}
                  </button>
                ))}
              </div>
              <p className="hint">
                Hire and trade coaches and players across seasons. Retire after
                (or during) season 10.
              </p>
            </div>

            <button
              className="primary big"
              onClick={() => dispatch({ type: 'START_CAREER', teamId, managerName, seasonYear: careerYear, matchOptions: options })}
            >
              Start Career →
            </button>
          </>
        ) : (
          <>
            <div className="field">
              <span>Choose your scenario</span>
              <div className="team-grid">
                {CAMPAIGNS.map((c) => (
                  <button
                    key={c.id}
                    className={campaignId === c.id ? 'team-pick active' : 'team-pick'}
                    onClick={() => setCampaignId(c.id)}
                  >
                    <span className="tp-name">{c.title}</span>
                    <span className="tp-tier">
                      {c.kind === 'season'
                        ? `fixed replay · ${SEASONS[c.seasonYear]?.teams.length ?? 0} teams`
                        : `${c.playerLabel} · ${c.nodes.length} series`}
                    </span>
                    {campaignId === c.id && <span className="tp-selected">✓</span>}
                  </button>
                ))}
              </div>
              {CAMPAIGNS.filter((c) => c.id === campaignId).map((c) => (
                <p key={c.id} className="tag">{c.description}</p>
              ))}
            </div>

            <button
              className="primary big"
              onClick={() => dispatch({ type: 'START_CAMPAIGN', campaignId, managerName, matchOptions: options })}
            >
              Start Scenario →
            </button>
            <p className="hint">
              Rosters use game-balanced fictional ratings; only names and series scores evoke history.
            </p>
          </>
        )}
      </div>
      <p className="foot">
        Historical names. Fictional, game-balanced ratings. Your own timeline.
      </p>
    </div>
  )
}
