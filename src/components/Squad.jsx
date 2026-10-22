// ============================================================================
// Squad — career-only screen: My Staff (coach hire/trade), Transfer Market
// (FA signings, reuses Market verbatim), Trade Board (player swaps).
// ============================================================================
import { useState } from 'react'
import Market from './Market.jsx'
import { COACH_BY_ID, coachBonus } from '../data/coaches.js'
import { ROLE_LABEL } from '../data/lck.js'

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

  return (
    <div className="stack">
      {state.lastEventLog && <p className="hint">{state.lastEventLog}</p>}
      {/* ---- 1. My Staff ---- */}
      <div className="card">
        <h2>My Staff — Head Coach</h2>
        {myCoach ? (
          <div className="fa-card" key={myCoach.id}>
            <div className="fa-top">
              <span className="fa-name">{myCoach.name}</span>
              <span className="fa-role">{myCoach.style}</span>
            </div>
            <div className="fa-stats">
              <span title="Rating">RTG {myCoach.rating}</span>
              <span title="Strength bonus">Bonus {fmtBonus(myCoach.rating)}</span>
            </div>
            <p className="hint">
              Bonus {(myCoach.rating - 75) >= 0 ? 'adds' : 'costs'} your team{' '}
              {fmtBonus(myCoach.rating)} strength every series.
            </p>
          </div>
        ) : (
          <p className="hint">No head coach assigned.</p>
        )}

        <h3>Hire from Free Agents</h3>
        {career.coachPool.length === 0 ? (
          <p className="hint">No free-agent coaches available.</p>
        ) : (
          <div className="market-grid">
            {career.coachPool.map((c) => (
              <div className="fa-card" key={c.id}>
                <div className="fa-top">
                  <span className="fa-name">{c.name}</span>
                  <span className="fa-role">{c.style}</span>
                </div>
                <div className="fa-stats">
                  <span>RTG {c.rating}</span>
                  <span>Bonus {fmtBonus(c.rating)}</span>
                </div>
                <button
                  className="primary"
                  onClick={() => dispatch({ type: 'HIRE_COACH', coachId: c.id })}
                >
                  Hire
                </button>
              </div>
            ))}
          </div>
        )}

        <h3>Trade Coaches</h3>
        <div className="market-grid">
          {aiTeamIds.map((tid) => {
            const c = coachOf(state, tid)
            if (!c) return null
            const accepts = myCoach ? myCoach.rating >= c.rating - 5 : false
            return (
              <div className="fa-card" key={tid}>
                <div className="fa-top">
                  <span className="fa-name">{teamName(state, tid)}</span>
                  <span className="fa-role">{c.style}</span>
                </div>
                <div className="fa-stats">
                  <span>{c.name}</span>
                  <span>RTG {c.rating}</span>
                </div>
                <p className="hint">{accepts ? 'AI likely accepts ✓' : 'AI likely declines ✗'}</p>
                <button
                  className="ghost"
                  onClick={() => dispatch({ type: 'TRADE_COACH', otherTeamId: tid })}
                >
                  Propose Swap
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ---- 2. Transfer Market (verbatim reuse) ---- */}
      <Market state={state} dispatch={dispatch} />

      {/* ---- 3. Trade Board ---- */}
      <div className="card">
        <h2>Trade Board — Player Swaps</h2>
        <p className="hint">
          1-for-1 swaps, same role only. The AI accepts unless it loses more
          than 3 OVR. If you trade a starter, the incoming player takes their
          lineup slot.
        </p>
        <h3>1. Your player</h3>
        <div className="market-grid">
          {myRoster.map((p) => (
            <div className="fa-card" key={p.id}>
              <div className="fa-top">
                <span className="fa-name">{p.name}</span>
                <span className="fa-role">{ROLE_LABEL[p.role]}</span>
              </div>
              <div className="fa-stats">
                <span>OVR {p.ovr}</span>
                {state.lineup[p.role] === p.id && <span>Starter</span>}
              </div>
              <button
                className={giveId === p.id ? 'primary' : 'ghost'}
                onClick={() => setGiveId(p.id)}
              >
                {giveId === p.id ? 'Selected ✓' : 'Offer'}
              </button>
            </div>
          ))}
        </div>

        <h3>2. Target team</h3>
        <div className="team-grid">
          {aiTeamIds.map((tid) => (
            <button
              key={tid}
              className={getTeamId === tid ? 'team-pick active' : 'team-pick'}
              onClick={() => { setGetTeamId(tid); setGetId(null) }}
            >
              <span className="tp-name">{teamName(state, tid)}</span>
              {getTeamId === tid && <span className="tp-selected">✓</span>}
            </button>
          ))}
        </div>

        {getTeamId && (
          <>
            <h3>3. Their player ({teamName(state, getTeamId)})</h3>
            <div className="market-grid">
              {theirRoster.map((p) => (
                <div className="fa-card" key={p.id}>
                  <div className="fa-top">
                    <span className="fa-name">{p.name}</span>
                    <span className="fa-role">{ROLE_LABEL[p.role]}</span>
                  </div>
                  <div className="fa-stats">
                    <span>OVR {p.ovr}</span>
                  </div>
                  <button
                    className={getId === p.id ? 'primary' : 'ghost'}
                    onClick={() => setGetId(p.id)}
                  >
                    {getId === p.id ? 'Selected ✓' : 'Want'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {giveP && getP && (
          <div className="card">
            <h3>Trade Preview</h3>
            <p>
              {giveP.name} (OVR {giveP.ovr}, {ROLE_LABEL[giveP.role]}) ⇄{' '}
              {getP.name} (OVR {getP.ovr}, {ROLE_LABEL[getP.role]}) — delta{' '}
              {delta >= 0 ? '+' : ''}{delta} OVR
            </p>
            {!roleOk ? (
              <p className="hint">Cross-role trades are not allowed.</p>
            ) : (
              <p className="hint">{tradeOk ? 'AI likely accepts ✓' : 'AI likely declines ✗ (loses 4+ OVR)'}</p>
            )}
            <button
              className="primary big"
              disabled={!tradeOk}
              onClick={() => {
                dispatch({ type: 'TRADE_PLAYER', giveId: giveP.id, getId: getP.id })
                setGiveId(null)
                setGetId(null)
              }}
            >
              Propose Trade →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
