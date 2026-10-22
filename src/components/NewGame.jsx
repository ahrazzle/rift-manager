import { useState } from 'react'
import { SEASONS, SEASON_ORDER, LEAGUES, PRESENT_BY_LEAGUE, seasonsForLeague } from '../data/seasons.js'
import { CAMPAIGNS } from '../data/campaigns.js'

export default function NewGame({ state, dispatch }) {
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

  function pickMode(next) {
    setMode(next)
    // Ensure the shared teamId is valid for the newly shown year grid.
    if (next === 'season') {
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
      <div className="card hero">
        <span className="eyebrow"><span className="hot">●</span> Live from the LCK arena</span>
        <h1>
          <span className="logo">LCK</span> Manager
        </h1>
        <p className="tag">
          The dugout is yours. Draft the roster, set the tactics, train your
          five — then take on the split, the playoffs, MSI and Worlds.
          No mechanics, no grinding: <strong>pure head-coach craft</strong>.
        </p>
      </div>

      <div className="card">
        <label className="field">
          <span>Your name (coach)</span>
          <input
            value={managerName}
            placeholder="Coach"
            onChange={(e) => setManagerName(e.target.value)}
          />
        </label>

        <div className="field">
          <span>Mode</span>
          <div className="team-grid">
            <button
              className={mode === 'season' ? 'team-pick active mode-card' : 'team-pick mode-card'}
              onClick={() => pickMode('season')}
            >
              <span className="tp-name">⚡ Season</span>
              <span className="tp-tier">One full split: draft, train, and chase the title.</span>
              {mode === 'season' && <span className="tp-selected">✓</span>}
            </button>
            <button
              className={mode === 'career' ? 'team-pick active mode-card' : 'team-pick mode-card'}
              onClick={() => pickMode('career')}
            >
              <span className="tp-name">🏆 Career</span>
              <span className="tp-tier">Ten seasons, one club. Build a dynasty.</span>
              {mode === 'career' && <span className="tp-selected">✓</span>}
            </button>
            <button
              className={mode === 'campaign' ? 'team-pick active mode-card' : 'team-pick mode-card'}
              onClick={() => pickMode('campaign')}
            >
              <span className="tp-name">📜 Scenario</span>
              <span className="tp-tier">Relive legendary runs, series by series.</span>
              {mode === 'campaign' && <span className="tp-selected">✓</span>}
            </button>
          </div>
        </div>

        {(mode === 'season' || mode === 'career') && (
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

        {mode === 'season' ? (
          <>
            <div className="field">
              <span>Season year</span>
              <select
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
                Rosters evoke that year's {league}; ratings are game-balanced fictional values.
              </p>
            </div>

            <div className="field">
              <span>Choose your team</span>
              <div className="team-grid">
                {yearTeams.map((t) => (
                  <button
                    key={t.id}
                    className={teamId === t.id ? 'team-pick active' : 'team-pick'}
                    onClick={() => setTeamId(t.id)}
                    style={{ borderColor: t.color }}
                  >
                    <span className="dot" style={{ background: t.color }} />
                    <span className="tp-name">{t.name}</span>
                    <span className="tp-tier">tier {t.tier}</span>
                    {teamId === t.id && <span className="tp-selected">✓</span>}
                    </button>
                ))}
              </div>
            </div>

            <button
              className="primary big"
              onClick={() => dispatch({ type: 'NEW_GAME', teamId, managerName, seasonYear })}
            >
              Start Season →
            </button>
          </>
        ) : mode === 'career' ? (
          <>
            <div className="field">
              <span>Starting year</span>
              <select
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
                Rosters evoke that year's {league}; ratings are game-balanced fictional values.
              </p>
            </div>

            <div className="field">
              <span>Choose your team ({league} {(SEASONS[careerYear] ?? SEASONS.present).label} — 10 seasons, one club)</span>
              <div className="team-grid">
                {careerTeams.map((t) => (
                  <button
                    key={t.id}
                    className={teamId === t.id ? 'team-pick active' : 'team-pick'}
                    onClick={() => setTeamId(t.id)}
                    style={{ borderColor: t.color }}
                  >
                    <span className="dot" style={{ background: t.color }} />
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
              onClick={() => dispatch({ type: 'START_CAREER', teamId, managerName, seasonYear: careerYear })}
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
              onClick={() => dispatch({ type: 'START_CAMPAIGN', campaignId, managerName })}
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
        Ratings are game-balanced fictional values for simulation. All names live in
        <code> src/data/lck.js</code> and are easy to edit.
      </p>
    </div>
  )
}
