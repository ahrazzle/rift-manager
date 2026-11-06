// ============================================================================
// Squad — career-only screen: My Staff (coach hire/trade), Transfer Market
// (FA signings, reuses Market verbatim), Trade Board (player swaps).
// ============================================================================
import { useState } from 'react'
import Market from './Market.jsx'
import { COACH_BY_ID, coachBonus } from '../data/coaches.js'
import { ROLE_LABEL } from '../data/lck.js'
import { Button, Card, Chip, Icon } from './ui/index.js'
import TeamCrest from './TeamCrest.jsx'
import PlayerList from './team/PlayerList.jsx'

function teamName(state, teamId) {
  return state.teamMeta?.[teamId]?.name ?? teamId
}

function coachOf(state, teamId) {
  const id = state.career?.staff?.[teamId]
  const pooled = state.career?.coachPool?.find((c) => c.id === id)
  if (pooled) return pooled
  return (id && COACH_BY_ID[id]) || null
}

function fmtBonus(rating) {
  const b = coachBonus(rating)
  return `${b >= 0 ? '+' : ''}${b.toFixed(2)}`
}

export default function Squad({ state, dispatch }) {
  const career = state.career
  const myId = state.teamId
  const myCoach = coachOf(state, myId)
  const aiTeamIds = Object.keys(state.teams).filter((t) => t !== myId)

  const [giveId, setGiveId] = useState(null)
  const [getTeamId, setGetTeamId] = useState(aiTeamIds[0] || null)
  const [getId, setGetId] = useState(null)

  const myRoster = state.teams[myId] || []
  const giveP = myRoster.find((p) => p.id === giveId) || null
  const theirRoster = (getTeamId && state.teams[getTeamId]) || []
  const getP = theirRoster.find((p) => p.id === getId) || null
  const roleOk = giveP && getP && giveP.role === getP.role
  const delta = giveP && getP ? getP.ovr - giveP.ovr : null
  const tradeOk = roleOk && delta <= 3

  const starterIds = new Set(Object.values(state.lineup || {}))

  return (
    <div className="team-stack">
      {state.lastEventLog && <p className="opt-hint">{state.lastEventLog}</p>}
      <Card title="My roster">
        <p className="opt-lede">Age and potential (Pot) — fixed cap in data; growth happens on Career Advance Season only.</p>
        <PlayerList label="My roster" players={myRoster} starterIds={starterIds} showMorale actionsHeader="Morale" />
      </Card>

      {/* ---- 1. My Staff ---- */}
      <Card title="My staff: head coach">
        {myCoach ? (
          <div className="sq-coach" key={myCoach.id}>
            <div className="sq-coach-id">
              <strong>{myCoach.name}</strong>
              <span className="pl-role">{myCoach.style}</span>
            </div>
            <div className="pl-chips">
              <Chip title="Rating">RTG {myCoach.rating}</Chip>
              <Chip title="Strength bonus">Bonus {fmtBonus(myCoach.rating)}</Chip>
            </div>
            <p className="opt-hint">
              Bonus {(myCoach.rating - 75) >= 0 ? 'adds' : 'costs'} your team{' '}
              {fmtBonus(myCoach.rating)} strength every series.
            </p>
          </div>
        ) : (
          <p className="opt-hint">No head coach assigned.</p>
        )}

        <h3 className="sq-sub">Hire from free agents</h3>
        {career.coachPool.length === 0 ? (
          <p className="opt-hint">No free-agent coaches available.</p>
        ) : (
          <ul className="sq-grid">
            {career.coachPool.map((c) => (
              <li className="sq-tile" key={c.id}>
                <div className="sq-tile-top">
                  <strong>{c.name}</strong>
                  <span className="pl-role">{c.style}</span>
                </div>
                <div className="pl-chips">
                  <Chip>RTG {c.rating}</Chip>
                  <Chip>Bonus {fmtBonus(c.rating)}</Chip>
                </div>
                <Button onClick={() => dispatch({ type: 'HIRE_COACH', coachId: c.id })}>
                  Hire
                </Button>
              </li>
            ))}
          </ul>
        )}

        <h3 className="sq-sub">Trade coaches</h3>
        <ul className="sq-grid">
          {aiTeamIds.map((tid) => {
            const c = coachOf(state, tid)
            if (!c) return null
            const accepts = myCoach ? myCoach.rating >= c.rating - 5 : false
            return (
              <li className="sq-tile" key={tid}>
                <div className="sq-tile-top">
                  <span className="sq-team"><TeamCrest teamId={tid} name={teamName(state, tid)} size={28} /><strong>{teamName(state, tid)}</strong></span>
                  <span className="pl-role">{c.style}</span>
                </div>
                <div className="pl-chips">
                  <Chip>{c.name}</Chip>
                  <Chip>RTG {c.rating}</Chip>
                </div>
                <p className="opt-hint sq-verdict">
                  <Icon name={accepts ? 'check' : 'close'} size={14} /> {accepts ? 'AI likely accepts' : 'AI likely declines'}
                </p>
                <Button onClick={() => dispatch({ type: 'TRADE_COACH', otherTeamId: tid })}>
                  Propose swap
                </Button>
              </li>
            )
          })}
        </ul>
      </Card>

      {/* ---- 2. Transfer Market (verbatim reuse) ---- */}
      <Market state={state} dispatch={dispatch} />

      {/* ---- 3. Trade Board ---- */}
      <Card title="Trade board: player swaps">
        <p className="opt-lede">
          1-for-1 swaps, same role only. The AI accepts unless it loses more
          than 3 OVR. If you trade a starter, the incoming player takes their
          lineup slot.
        </p>
        <h3 className="sq-sub">1. Your player</h3>
        <PlayerList
          label="Your players to offer"
          players={myRoster}
          starterIds={starterIds}
          selectedId={giveId}
          actionsHeader="Offer"
          getActions={(p) => [
            { id: 'offer', label: giveId === p.id ? 'Selected' : 'Offer', icon: giveId === p.id ? 'check' : undefined, pressed: giveId === p.id, variant: giveId === p.id ? 'primary' : 'secondary', ariaLabel: `Offer ${p.name}`, onClick: () => setGiveId(p.id) },
          ]}
        />

        <h3 className="sq-sub">2. Target team</h3>
        <ul className="sq-teams" aria-label="Target team">
          {aiTeamIds.map((tid) => (
            <li key={tid}>
              <button
                type="button"
                className="sq-team-pick"
                aria-pressed={getTeamId === tid}
                onClick={() => { setGetTeamId(tid); setGetId(null) }}
              >
                <TeamCrest teamId={tid} name={teamName(state, tid)} size={32} />
                <span>{teamName(state, tid)}</span>
                {getTeamId === tid && <Icon name="check" size={16} />}
              </button>
            </li>
          ))}
        </ul>

        {getTeamId && (
          <>
            <h3 className="sq-sub">3. Their player ({teamName(state, getTeamId)})</h3>
            <PlayerList
              label={`${teamName(state, getTeamId)} players`}
              players={theirRoster}
              selectedId={getId}
              actionsHeader="Want"
              getActions={(p) => [
                { id: 'want', label: getId === p.id ? 'Selected' : 'Want', icon: getId === p.id ? 'check' : undefined, pressed: getId === p.id, variant: getId === p.id ? 'primary' : 'secondary', ariaLabel: `Want ${p.name}`, onClick: () => setGetId(p.id) },
              ]}
            />
          </>
        )}

        {giveP && getP && (
          <Card variant="inset" title="Trade preview" titleAs="h3" className="sq-preview">
            <p>
              {giveP.name} (OVR {giveP.ovr}, {ROLE_LABEL[giveP.role]}) ⇄{' '}
              {getP.name} (OVR {getP.ovr}, {ROLE_LABEL[getP.role]}): delta{' '}
              {delta >= 0 ? '+' : ''}{delta} OVR
            </p>
            {!roleOk ? (
              <p className="opt-hint">Cross-role trades are not allowed.</p>
            ) : (
              <p className="opt-hint">{tradeOk ? 'AI likely accepts ✓' : 'AI likely declines ✗ (loses 4+ OVR)'}</p>
            )}
            <Button
              variant="primary"
              size="lg"
              disabled={!tradeOk}
              onClick={() => {
                dispatch({ type: 'TRADE_PLAYER', giveId: giveP.id, getId: getP.id })
                setGiveId(null)
                setGetId(null)
              }}
            >
              Propose trade →
            </Button>
          </Card>
        )}
      </Card>
    </div>
  )
}
