import { useMemo } from 'react'
import { Button, Card, Chip, Icon, Meter, TrophyMark } from '../ui/index.js'
import { achievements } from '../../game/hype.js'
import { fmtMoneyExact } from '../../game/economy.js'
import { recomputeGames } from '../MatchDetail.jsx'
import { ordinal } from './nav.js'

function boardStatus(confidence) {
  if (confidence >= 70) return { text: 'Job secure', tone: 'neutral' }
  if (confidence >= 40) return { text: 'Under pressure', tone: 'warn' }
  return { text: 'At risk of the sack', tone: 'warn' }
}

/** Titles won: completed career seasons plus the season in progress. */
function trophiesOf(state) {
  const me = state.teamId
  const out = []
  for (const h of state.career?.history ?? []) {
    const label = `${h.league ?? state.league ?? 'LCK'} ${h.seasonIndex ? `· season ${h.seasonIndex}` : ''}`.trim()
    if (h.regionalTitle ?? h.championId === me) out.push({ id: `r-${h.seasonIndex}`, name: 'Regional title', when: label })
    if (h.msiTitle) out.push({ id: `m-${h.seasonIndex}`, name: 'MSI', when: label })
    if (h.worldsTitle) out.push({ id: `w-${h.seasonIndex}`, name: 'Worlds', when: label })
  }
  const now = state.mode === 'career' ? `this season` : `${state.league ?? 'LCK'} this season`
  if (state.playoffChampionId && state.playoffChampionId === me) out.push({ id: 'r-now', name: 'Regional title', when: now })
  const t = state.tournament
  if (t?.status === 'done' && t.championId === me && t.kind !== 'playoffs') {
    out.push({ id: `${t.kind}-now`, name: t.kind === 'msi' ? 'MSI' : 'Worlds', when: now })
  }
  if (t?.kind === 'worlds' && t.msiChampionId === me && !out.some((x) => x.id === 'msi-now')) {
    out.push({ id: 'msi-now', name: 'MSI', when: now })
  }
  return out
}

/**
 * Club: the board's job and confidence, the transfer budget, trophies and
 * achievements (locked ones collapsed to a count), and save / new game.
 * Built only from existing state; every section hides when its data is absent.
 */
export default function ClubPage({ state, onNewGame }) {
  const lastUser = useMemo(
    () => [...(state.results ?? [])].reverse().find((r) => r.isUser && r.detail),
    [state.results],
  )
  const gamesByRound = useMemo(() => {
    if (!lastUser) return null
    try {
      return { [lastUser.round]: recomputeGames(lastUser) }
    } catch {
      return null
    }
  }, [lastUser])
  const achs = state.teamId && state.mode !== 'campaign' ? achievements(state, gamesByRound) : []
  const unlocked = achs.filter((a) => a.unlocked)
  const locked = achs.filter((a) => !a.unlocked)
  const trophies = state.teamId ? trophiesOf(state) : []
  const board = state.board
  const confidence = board ? Math.max(0, Math.min(100, board.confidence ?? 50)) : 0
  const status = board ? boardStatus(confidence) : null
  const history = state.career?.history ?? []
  const showHonours = state.teamId && state.mode !== 'campaign'

  return (
    <div className="shell-club-grid">
      {board && (
        <Card title="Board">
          <p className="shell-club-goal">
            <span className="label">Goal</span>
            <strong>{board.expectation}</strong>
          </p>
          <Meter label="Board confidence" value={confidence} valueText={`${confidence} / 100`} />
          <p className="shell-club-note">
            <Chip tone={status.tone}>{status.text}</Chip>
            {state.mode === 'career'
              ? 'Confidence moves with press answers and the end-of-split review. At zero, you are sacked.'
              : 'Confidence moves with press answers and the end-of-split review.'}
          </p>
          {state.sacked && (
            <p className="shell-club-note">
              <Chip tone="loss">Sacked</Chip> The board ended your tenure.
            </p>
          )}
        </Card>
      )}

      {state.finance && (
        <Card title="Finances">
          <dl className="shell-stats">
            <div>
              <dt>Transfer budget</dt>
              <dd className="num">{fmtMoneyExact(state.finance.budget)}</dd>
            </div>
            <div>
              <dt>Squad size</dt>
              <dd className="num">{(state.teams?.[state.teamId] ?? []).length} players</dd>
            </div>
          </dl>
          <p className="shell-club-note">Signing fees come out of the transfer budget. A deal you cannot afford stays disabled in the market.</p>
        </Card>
      )}

      {showHonours && (
        <Card title="Trophies and achievements" className="shell-club-wide">
          {trophies.length > 0 ? (
            <ul className="shell-trophies">
              {trophies.map((t) => (
                <li key={t.id}>
                  <TrophyMark className="shell-trophy-icon" />
                  <span>
                    <strong>{t.name}</strong>
                    <small>{t.when}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="shell-club-note">No titles yet. Win the playoffs to put the first one here.</p>
          )}
          {achs.length > 0 && (
            <>
              <h3 className="shell-subhead">
                Achievements <span className="faint num">{unlocked.length} of {achs.length}</span>
              </h3>
              {unlocked.length > 0 ? (
                <ul className="shell-achs">
                  {unlocked.map((a) => (
                    <li key={a.id}>
                      <Icon name="star" size={18} className="shell-ach-icon" />
                      <span>
                        <strong>{a.name}</strong>
                        <small>{a.desc}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="shell-club-note">None unlocked yet.</p>
              )}
              {locked.length > 0 && (
                <details className="shell-locked">
                  <summary>Show {locked.length} locked</summary>
                  <ul className="shell-achs is-locked">
                    {locked.map((a) => (
                      <li key={a.id}>
                        <span>
                          <strong>{a.name}</strong>
                          <small>{a.desc}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </Card>
      )}

      {history.length > 0 && (
        <Card title="Career history" className="shell-club-wide">
          <div className="shell-table-wrap">
            <table className="primitive-table">
              <caption className="sr-only">Completed seasons</caption>
              <thead>
                <tr>
                  <th scope="col">Season</th>
                  <th scope="col">League</th>
                  <th scope="col">Finish</th>
                  <th scope="col">Record</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.seasonIndex}>
                    <td>{h.seasonIndex}</td>
                    <td>{h.league ?? state.league ?? 'LCK'}</td>
                    <td className="num">{h.userPlacement ? ordinal(h.userPlacement) : '–'}</td>
                    <td className="num">
                      {h.userW}–{h.userL}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Save and new game" className="shell-club-wide">
        <p className="shell-club-note">
          Progress saves automatically in this browser after every action. Starting a new game replaces this save.
        </p>
        <div className="shell-club-actions">
          <Button variant="secondary" icon="arrow" onClick={onNewGame}>
            New Game
          </Button>
        </div>
      </Card>
    </div>
  )
}
