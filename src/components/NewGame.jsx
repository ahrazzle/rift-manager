import { useEffect, useRef, useState } from 'react'
import TeamCrest from './TeamCrest.jsx'
import MatchIcon from './MatchIcon.jsx'
import { SEASONS, SEASON_ORDER, LEAGUES, PRESENT_BY_LEAGUE, seasonsForLeague } from '../data/seasons.js'
import MatchOptions from './MatchOptions.jsx'
import { matchOptions } from '../game/matchSession.js'
import { CAMPAIGNS } from '../data/campaigns.js'
import { GITHUB_CONTRIBUTING, GITHUB_REPO } from '../siteLinks.js'
import { Button, Icon, cx } from './ui/index.js'
import Stepper from './team/Stepper.jsx'

const MODES = [
  { id: 'season', icon: 'flag', name: 'Season', blurb: 'One full split: draft, train, and chase the title.' },
  { id: 'career', icon: 'trophy', name: 'Career', blurb: 'Ten seasons, one club. Build a dynasty.' },
  { id: 'campaign', icon: 'clock', name: 'Scenario', blurb: 'Relive legendary runs, series by series.' },
  { id: 'gauntlet', icon: 'shield', name: 'Gauntlet', blurb: 'Five escalating series. One loss ends the run.' },
]

export default function NewGame({ state, dispatch, onOpenAbout }) {
  const [options, setOptions] = useState(() => matchOptions(state?.matchOptions))
  const [seriesFearless, setSeriesFearless] = useState(() => !!state?.seriesOptions?.fearless)
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
  const MODE_START_LABEL = { season: 'Start Season →', career: 'Start Career →', gauntlet: 'Start Gauntlet →', campaign: 'Start Scenario →' }
  const [step, setStep] = useState(0)
  const stepHeading = useRef(null)
  const stepMounted = useRef(false)
  useEffect(() => {
    // Move focus to the new step's heading so keyboard and screen-reader users land on it.
    if (stepMounted.current) stepHeading.current?.focus?.({ preventScroll: false })
    stepMounted.current = true
  }, [step])

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

  const teamStepLabel = mode === 'campaign' ? 'Scenario' : 'Team'
  const steps = [
    { id: 'mode', label: 'Mode' },
    { id: 'team', label: teamStepLabel },
    { id: 'options', label: 'Options' },
  ]
  const stepTitles = ['Choose your run', mode === 'campaign' ? 'Choose your scenario' : 'Choose your club', 'Match options']

  function start() {
    if (mode === 'career') dispatch({ type: 'START_CAREER', teamId, managerName, seasonYear: careerYear, matchOptions: options, seriesFearless })
    else if (mode === 'campaign') dispatch({ type: 'START_CAMPAIGN', campaignId, managerName, matchOptions: options, seriesFearless })
    else dispatch({ type: 'NEW_GAME', teamId, managerName, seasonYear, mode, matchOptions: options, seriesFearless })
  }

  const teams = isSeasonLike ? yearTeams : careerTeams
  const teamYearLabel = (SEASONS[isSeasonLike ? seasonYear : careerYear] ?? SEASONS.present).label
  const chosenTeam = teams.find((t) => t.id === teamId)
  const chosenCampaign = CAMPAIGNS.find((c) => c.id === campaignId)
  const summary =
    mode === 'campaign'
      ? chosenCampaign?.title
      : `${chosenTeam?.name ?? teamId} · ${league} ${teamYearLabel}`

  return (
    <div className={cx('ng', `ng-step-${step + 1}`)}>
      {step === 0 ? (
        <section className="ng-hero" aria-labelledby="entry-title">
          <div className="ng-hero-copy">
            <h1 id="entry-title">
              <img className="ng-brand" src={`${(import.meta.env?.BASE_URL ?? '/')}brand/rift-manager.svg`}
                width="448" height="160" alt="Rift Manager" />
            </h1>
            <p className="ng-tag">Pick a roster and coach your team through the split.</p>
            <p className="ng-community">
              Public source on{' '}
              <a href={GITHUB_REPO} target="_blank" rel="noreferrer">
                GitHub
              </a>
              {' '}— issues, discussions, and pull requests welcome.{' '}
              <a href={GITHUB_CONTRIBUTING} target="_blank" rel="noreferrer">
                How to contribute
              </a>
              {typeof onOpenAbout === 'function' && (
                <>
                  {' · '}
                  <button type="button" className="linkish" onClick={onOpenAbout}>
                    About / Community
                  </button>
                </>
              )}
            </p>
          </div>
        </section>
      ) : (
        <h1 className="sr-only" id="entry-title">Rift Manager: new game</h1>
      )}

      <Stepper steps={steps} current={step} />

      <section className="ng-panel" aria-labelledby="ng-step-title" id="club-setup">
        <h2 id="ng-step-title" ref={stepHeading} tabIndex={-1}>
          <span className="ng-step-count">Step {step + 1} of 3</span>
          {stepTitles[step]}
        </h2>

        {step === 0 && (
          <div className="ng-modes" role="group" aria-label="Run mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={cx('ng-mode', mode === m.id && 'is-on')}
                aria-pressed={mode === m.id}
                onClick={() => pickMode(m.id)}
              >
                <span className="ng-mode-name">
                  <MatchIcon name={m.icon} size={22} /> {m.name}
                </span>
                <span className="ng-mode-blurb">{m.blurb}</span>
                {mode === m.id && <Icon name="check" size={18} className="ng-check" />}
              </button>
            ))}
          </div>
        )}

        {step === 1 && mode !== 'campaign' && (
          <>
            <div className="ng-field">
              <span className="label" id="league-label">League</span>
              <div className="ng-leagues" role="group" aria-labelledby="league-label">
                {LEAGUES.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={cx('ng-league', league === l && 'is-on')}
                    aria-pressed={league === l}
                    onClick={() => pickLeague(l)}
                  >
                    <strong>{l}</strong>
                    <span>{SEASONS[PRESENT_BY_LEAGUE[l]]?.teams.length ?? 0} clubs · road to MSI + Worlds</span>
                  </button>
                ))}
              </div>
              <p className="ng-hint">Top 2 per league qualify for MSI + Worlds after the regional split.</p>
            </div>

            <div className="ng-field">
              <label className="label" htmlFor={isSeasonLike ? 'season-year-select' : 'career-year-select'}>
                {isSeasonLike ? 'Season year' : 'Starting year'}
              </label>
              <select
                id={isSeasonLike ? 'season-year-select' : 'career-year-select'}
                className="ui-select"
                value={isSeasonLike ? seasonYear : careerYear}
                onChange={(e) => (isSeasonLike ? pickYear(e.target.value) : pickCareerYear(e.target.value))}
              >
                {leagueYears.map((year) => (
                  <option key={year} value={year}>
                    {SEASONS[year].label}
                  </option>
                ))}
              </select>
              <p className="ng-hint">
                {isSeasonLike
                  ? `Rosters evoke that year's ${league}. Ratings are game-balanced fictional values.`
                  : `Start with that year’s ${league} roster, then build your own timeline. Ratings are fictional; league and tournament formats are simplified.`}
              </p>
            </div>

            <div className="ng-field">
              <span className="label" id="team-label">
                {isSeasonLike ? 'Choose your team' : `Choose your team (${league} ${teamYearLabel} — 10 seasons, one club)`}
              </span>
              <div className="ng-teams" role="group" aria-labelledby="team-label">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={cx('ng-team', teamId === t.id && 'is-on')}
                    aria-pressed={teamId === t.id}
                    onClick={() => setTeamId(t.id)}
                    style={{ '--club': t.color }}
                  >
                    <TeamCrest teamId={t.id} name={t.name} size={56} />
                    <span className="ng-team-name">{t.name}</span>
                    <span className="ng-team-tier">tier {t.tier}</span>
                    {teamId === t.id && <Icon name="check" size={16} className="ng-check" />}
                  </button>
                ))}
              </div>
              {mode === 'career' && (
                <p className="ng-hint">Hire and trade coaches and players across seasons. Retire after (or during) season 10.</p>
              )}
            </div>
          </>
        )}

        {step === 1 && mode === 'campaign' && (
          <div className="ng-field">
            <span className="label" id="scenario-label">Scenarios</span>
            <div className="ng-scenarios" role="group" aria-labelledby="scenario-label">
              {CAMPAIGNS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={cx('ng-mode', campaignId === c.id && 'is-on')}
                  aria-pressed={campaignId === c.id}
                  onClick={() => setCampaignId(c.id)}
                >
                  <span className="ng-mode-name">{c.title}</span>
                  <span className="ng-mode-blurb">
                    {c.kind === 'season'
                      ? `fixed replay · ${SEASONS[c.seasonYear]?.teams.length ?? 0} teams`
                      : `${c.playerLabel} · ${c.nodes.length} series`}
                  </span>
                  {campaignId === c.id && <Icon name="check" size={18} className="ng-check" />}
                </button>
              ))}
            </div>
            {chosenCampaign && <p className="ng-hint">{chosenCampaign.description}</p>}
            <p className="ng-hint">Rosters use game-balanced fictional ratings; only names and series scores evoke history.</p>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="ng-field">
              <label className="label" htmlFor="coach-name">Your name (coach)</label>
              <input
                id="coach-name"
                className="ng-input"
                value={managerName}
                placeholder="Coach"
                autoComplete="off"
                onChange={(e) => setManagerName(e.target.value)}
              />
            </div>
            <MatchOptions
              options={options}
              onChange={(key, value) => setOptions((o) => ({ ...o, [key]: value }))}
              seriesFearless={seriesFearless}
              onSeriesFearlessChange={setSeriesFearless}
              draftEnabled={!!options.draft}
            />
            <p className="ng-summary">
              <span className="label">Your run</span>
              <strong>{MODES.find((m) => m.id === mode)?.name}</strong> · {summary}
            </p>
          </>
        )}
      </section>

      <div className="ng-nav">
        {step > 0 ? (
          <Button variant="quiet" icon="back" onClick={() => setStep(step - 1)}>Back</Button>
        ) : (
          <span />
        )}
        {step < 2 ? (
          <Button variant="primary" size="lg" onClick={() => setStep(step + 1)}>
            Next: {steps[step + 1].label} →
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={start}>
            {MODE_START_LABEL[mode] ?? 'Start Season →'}
          </Button>
        )}
      </div>
      <p className="ng-foot">Historical names. Fictional, game-balanced ratings. Your own timeline.</p>
    </div>
  )
}
