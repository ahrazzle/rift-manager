// ============================================================================
// Tournament: Compete › Bracket (regional playoffs, MSI, Worlds).
// A real bracket: one column per round, connectors between rounds, BO length
// on each round header, winners in --win with a check and text, your path in
// --team. Keeps every action the old list had: Enter next match, per-match
// Enter/Watch, the resolver select (biased / random / manual), manual winner
// buttons, N / → stepping, Match detail via recomputeGames, PNG export.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import MatchDetail, { recomputeGames } from './MatchDetail.jsx'
import { exportPng } from '../utils/exportPng.js'
import { Button, Card, Chip } from './ui/index.js'
import MatchBox from './compete/MatchBox.jsx'
import { teamNameOf } from './compete/model.js'

const ABBR = { Quarterfinal: 'QF', Semifinal: 'SF', Final: 'F' }

export function phaseLabel(phase) {
  if (phase === 'msi') return 'MSI'
  if (phase === 'worlds') return 'Worlds'
  if (phase === 'done') return 'Season Done'
  return 'Regional Split'
}

function matchRows(state, t, m) {
  const decided = !!m.winner
  const mk = (id, score) => ({
    teamId: id || null,
    name: teamNameOf(state, id),
    seed: t.kind === 'playoffs' && id && t.qualifies ? t.qualifies.indexOf(id) + 1 || null : null,
    score: decided && id ? score : null,
    won: decided && m.winner === id,
    lost: decided && m.winner !== id,
    you: !!id && id === state.teamId,
  })
  return [mk(m.homeId, m.aWins), mk(m.awayId, m.bWins)]
}

function MatchActions({ state, dispatch, match, roundIndex, matchIndex, isOpen, canDetail, onToggle }) {
  const manual = state.tournament?.resolver === 'manual'
  const ready = !match.winner && match.homeId && match.awayId
  const pick = (winnerId) => dispatch({ type: 'SELECT_MATCH_WINNER', roundIndex, matchIndex, winnerId })
  if (!ready && !canDetail) return null
  return (
    <div className="cmp-mt-actions">
      {manual && ready && (
        <div className="cmp-mt-pick">
          <Button onClick={() => pick(match.homeId)}>{match.forcedWinner === 'home' ? '✓ ' : ''}{teamNameOf(state, match.homeId)} wins</Button>
          <Button onClick={() => pick(match.awayId)}>{match.forcedWinner === 'away' ? '✓ ' : ''}{teamNameOf(state, match.awayId)} wins</Button>
        </div>
      )}
      {ready && (
        <Button
          // One primary per view: the bracket's "Enter next match" below is the primary.
          variant="secondary"
          disabled={manual && !match.forcedWinner}
          onClick={() => dispatch({ type: 'PREVIEW_MATCH', action: { type: 'PLAY_TOURNAMENT_ROUND', matchIndex } })}
        >
          {match.isUser ? 'Enter match →' : 'Watch match →'}
        </Button>
      )}
      {canDetail && (
        <Button variant="quiet" aria-expanded={isOpen} onClick={onToggle}>Match detail</Button>
      )}
    </div>
  )
}

export default function Tournament({ state, dispatch }) {
  const [openKey, setOpenKey] = useState(null)
  const busy = false
  const [shotErr, setShotErr] = useState(null)
  const shotRef = useRef(null)
  const t = state.tournament

  const ri = t ? t.rounds.findIndex((r) => r.matches.some((m) => !m.winner)) : -1
  const current = t && ri >= 0 ? t.rounds[ri] : null
  const userInRound = current?.matches.some((m) => m.isUser && !m.winner)
  const title = t?.kind === 'playoffs' ? `${state.league} Playoffs` : t?.kind === 'msi' ? 'Mid-Season Invitational' : 'World Championship'
  const revealed = t ? (t.revealedRounds ?? t.rounds.length) : 0
  const tStatus = t?.status

  function playRound() {
    dispatch({ type: 'PREVIEW_MATCH', action: { type: 'PLAY_TOURNAMENT_ROUND' } })
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'n' && e.key !== 'N' && e.key !== 'ArrowRight') return
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
      // → also drives the Compete segment tabs and the scrollable bracket, so
      // it only steps the bracket when nothing else has focus.
      if (e.key === 'ArrowRight' && e.target !== document.body) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (!current || busy || tStatus !== 'active') return
      playRound()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, busy, tStatus])

  if (!t) return null

  const manualBlocked = t.resolver === 'manual' && !current?.matches.find((m) => !m.winner && (m.isUser || !userInRound))?.forcedWinner
  const cols = t.rounds.length
  let openMatch = null
  t.rounds.forEach((round) => round.matches.forEach((m) => {
    if (`${round.name}-${m.homeId}-${m.awayId}` === openKey) openMatch = { round, m }
  }))
  const openGames = openMatch && openMatch.m.winner ? recomputeGames(openMatch.m) : null

  return (
    <div className="cmp-bracket-page">
      <Card className="cmp-br-head">
        <div ref={shotRef} className="cmp-shot">
          <div className="cmp-br-title">
            <div>
              <h2>{title}</h2>
              <p className="cmp-sub">
                {t.kind === 'playoffs'
                  ? 'Top 4 by standings. Semifinals 1v4 and 2v3, then the final. Every series is BO3.'
                  : 'Top 2 per league. Single elimination, every series BO3.'}
              </p>
            </div>
            {t.status === 'done' && t.championId && (
              <Chip tone="gold" icon="star">Champion: {teamNameOf(state, t.championId)}</Chip>
            )}
          </div>
          <p className="cmp-note cmp-scroll-hint">Scroll sideways to follow the bracket.</p>
          <div className="cmp-br-scroll" role="region" aria-label={`${title} bracket`} tabIndex={0}>
            <ol className="cmp-bracket" style={{ '--cols': cols }}>
              {t.rounds.map((round, ridx) => {
                const prev = t.rounds[ridx - 1]
                const isLast = ridx === cols - 1
                return (
                  <li key={round.name} className="cmp-br-col">
                    <h3 className="cmp-br-round">
                      {round.name}
                      <span>BO3</span>
                    </h3>
                    <ul className="cmp-br-slots">
                      {round.matches.map((m, i) => {
                        const key = `${round.name}-${m.homeId}-${m.awayId}`
                        const rows = matchRows(state, t, m)
                        const tbd = prev ? [`Winner ${ABBR[prev.name] ?? ''}${2 * i + 1}`, `Winner ${ABBR[prev.name] ?? ''}${2 * i + 2}`] : ['TBD', 'TBD']
                        const path = m.isUser && (!m.winner || m.winner === state.teamId)
                        return (
                          <li key={i} className={['cmp-br-slot', isLast ? 'is-last' : '', ridx > 0 ? 'has-feed' : '', path ? 'on-path' : ''].filter(Boolean).join(' ')}>
                            {ridx > 0 && <span className="cmp-br-feed" aria-hidden="true" />}
                            <MatchBox
                              rows={rows}
                              tbdLabels={tbd}
                              you={!!m.isUser}
                              dim={!m.homeId && !m.awayId}
                              label={`${round.name} ${i + 1}`}
                            >
                              <MatchActions
                                state={state}
                                dispatch={dispatch}
                                match={m}
                                roundIndex={ridx}
                                matchIndex={i}
                                isOpen={openKey === key}
                                canDetail={!!m.winner && !!m.homeId}
                                onToggle={() => setOpenKey(openKey === key ? null : key)}
                              />
                            </MatchBox>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
        <div className="cmp-br-foot">
          {current && (
            <div className="cmp-br-controls">
              <Button variant="primary" size="lg" disabled={busy || manualBlocked} onClick={playRound}>
                {busy ? 'Simulating…' : 'Enter next match →'}
              </Button>
              {t.status === 'active' && (
                <label className="cmp-resolver">
                  <span>Resolver</span>
                  <select
                    className="year-select"
                    value={t.resolver ?? 'biased'}
                    onChange={(e) => dispatch({ type: 'SET_RESOLVER', resolver: e.target.value })}
                    title="How undecided series are resolved"
                  >
                    <option value="biased">Biased: form decides</option>
                    <option value="random">Random: coin flip</option>
                    <option value="manual">Manual: you pick winners</option>
                  </select>
                </label>
              )}
            </div>
          )}
          {current && t.status === 'active' && (
            <p className="cmp-note">Enter each match to choose Draft, IGL and map simulation. Press N for the next match.</p>
          )}
          {revealed < t.rounds.length && t.status === 'active' && (
            <p className="cmp-note">{t.rounds.length - revealed} {t.rounds.length - revealed === 1 ? 'round is' : 'rounds are'} locked until the earlier series are played.</p>
          )}
          {t.status === 'done' && (
            <>
              <p className="cmp-note">
                {t.kind === 'msi'
                  ? 'MSI complete. Build the Worlds bracket from the Hub to continue.'
                  : t.kind === 'playoffs' ? 'Playoffs complete. Continue to MSI from the Hub.' : 'Worlds complete. Advance from the Hub.'}
              </p>
              <div className="cmp-br-controls">
                <Button variant="quiet" onClick={async () => {
                  setShotErr(null)
                  try { await exportPng(shotRef, `lck-${t.kind}-bracket.png`) }
                  catch { setShotErr('Export failed. Try again.') }
                }}>Download PNG</Button>
                {shotErr && <span className="cmp-note" role="status">{shotErr}</span>}
              </div>
            </>
          )}
        </div>
      </Card>
      {openMatch && (
        <Card className="cmp-br-detail">
          <MatchDetail
            round={openMatch.round.name}
            homeId={openMatch.m.homeId}
            awayId={openMatch.m.awayId}
            aWins={openMatch.m.aWins}
            bWins={openMatch.m.bWins}
            userSide={openMatch.m.userSide}
            games={openGames || []}
            onBack={() => setOpenKey(null)}
            state={state}
          />
        </Card>
      )}
    </div>
  )
}
