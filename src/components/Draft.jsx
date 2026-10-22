// ============================================================================
// Draft — Active Coach pick/ban UI.
//
// Props: draft (from createDraft/applyBan/applyPick), userSide ('BLUE'|'RED'),
// onBan(champId), onPick(champId, role), disabled, gameLabel? ("Game 1").
// The parent owns the draft state and drives AI moves; this is pure UI.
// Champion portraits come from Riot's ddragon CDN with an initials fallback.
// ============================================================================
import { useState, useMemo } from 'react'
import { CHAMPIONS, CHAMP_BY_ID } from '../data/champions.js'
import {
  DRAFT_STEPS, DRAFT_ROLES, currentStep, legalPicks,
  scoreComp, getDraftDebrief, champPortrait,
} from '../game/draft.js'

const SIDE_COLOR = { BLUE: '#3f8cff', RED: '#e2012d' }

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function ChampIcon({ champId, size = 40 }) {
  const [err, setErr] = useState(false)
  const champ = CHAMP_BY_ID[champId]
  const url = champPortrait(champId)
  const box = {
    width: size, height: size, borderRadius: 8, flexShrink: 0,
    background: '#0b0e13', objectFit: 'cover', display: 'block',
  }
  if (!champ || !url || err) {
    return (
      <span style={{ ...box, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: Math.max(10, size * 0.32), color: '#8b93a5' }}>
        {champ ? champ.name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() : '??'}
      </span>
    )
  }
  return <img src={url} alt={champ.name} title={champ.name} loading="lazy" onError={() => setErr(true)} style={box} />
}

function CompPanel({ draft, side, userSide }) {
  const color = SIDE_COLOR[side]
  const isUser = side === userSide
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}`, margin: 0 }}>
      <span className="eyebrow" style={{ color }}>
        {isUser ? 'Your comp' : 'Enemy comp'} · {side}
      </span>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {DRAFT_ROLES.map((role) => {
          const cid = draft.picks[side][role]
          return (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 40 }}>
              <span className="badge" style={isUser ? undefined : { background: '#2a3346' }}>{role}</span>
              {cid ? (
                <>
                  <ChampIcon champId={cid} size={36} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{CHAMP_BY_ID[cid].name}</span>
                </>
              ) : (
                <span className="hint" style={{ margin: 0 }}>— open —</span>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 12 }}>
        <span className="hint" style={{ margin: 0 }}>Bans</span>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', minHeight: 30 }}>
          {draft.bans[side].map((cid) => (
            <span key={cid} style={{ opacity: 0.55, filter: 'grayscale(0.6)' }}>
              <ChampIcon champId={cid} size={30} />
            </span>
          ))}
          {draft.bans[side].length === 0 && <span className="hint" style={{ margin: 0 }}>—</span>}
        </div>
      </div>
    </div>
  )
}

export default function Draft({ draft, userSide, onBan, onPick, disabled, gameLabel }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [pickTarget, setPickTarget] = useState(null)

  const step = currentStep(draft)
  const yourTurn = !!step && step.side === userSide && !disabled

  const phase = !step
    ? 'Complete'
    : draft.step < 6 ? 'Ban Phase 1'
      : draft.step < 12 ? 'Pick Phase 1'
        : draft.step < 16 ? 'Ban Phase 2'
          : 'Pick Phase 2'

  const taken = useMemo(() => {
    const s = new Set()
    for (const sd of ['BLUE', 'RED']) {
      for (const b of draft.bans[sd]) s.add(b)
      for (const c of Object.values(draft.picks[sd])) s.add(c)
    }
    return s
  }, [draft])

  // On the player's pick turns: champId → eligible unfilled roles.
  const pickable = useMemo(() => {
    if (!step || step.type !== 'pick' || step.side !== userSide) return new Map()
    return new Map(legalPicks(draft, userSide).map((p) => [p.champId, p.roles]))
  }, [draft, step, userSide])

  const visible = CHAMPIONS.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false
    if (roleFilter !== 'ALL' && !c.roles.includes(roleFilter)) return false
    return true
  })

  const handleChampClick = (champId) => {
    if (!yourTurn || taken.has(champId)) return
    if (step.type === 'ban') {
      onBan(champId)
      return
    }
    const roles = pickable.get(champId)
    if (!roles || roles.length === 0) return
    if (roles.length === 1) {
      onPick(champId, roles[0])
      return
    }
    setPickTarget(champId)
  }

  const debrief = draft.done ? getDraftDebrief(draft) : []
  const comps = draft.done
    ? ['BLUE', 'RED'].map((sd) => ({ side: sd, ...scoreComp(draft.picks[sd]) }))
    : []

  return (
    <div className="stack" style={{ display: 'grid', gap: 14 }}>
      {/* Header */}
      <div className="card" style={{ margin: 0 }}>
        <span className="eyebrow">Active coach · {phase}</span>
        <h2 style={{ marginTop: 4 }}>{gameLabel ? `Draft — ${gameLabel}` : 'Draft'}</h2>
        <p className="hint" style={{ marginTop: 4 }}>
          {!step
            ? 'Both comps are locked in.'
            : step.side === userSide
              ? step.type === 'ban'
                ? 'Your ban: remove a champion from the pool.'
                : 'Your pick: choose a champion, then assign the role.'
              : 'Enemy coach is thinking…'}
        </p>
        <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }} aria-hidden>
          {DRAFT_STEPS.map((s, i) => (
            <span
              key={i}
              title={`Step ${i + 1}: ${s.type} ${s.side}`}
              style={{
                width: 22, height: 22, borderRadius: 6, fontSize: 10, fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: i < draft.step ? '#1a2230' : i === draft.step ? SIDE_COLOR[s.side] : '#0b0e13',
                color: i <= draft.step ? '#fff' : '#5b6474',
                border: '1px solid var(--line-soft)',
              }}
            >
              {s.type[0].toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Comp panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 14 }}>
        <CompPanel draft={draft} side="BLUE" userSide={userSide} />
        <CompPanel draft={draft} side="RED" userSide={userSide} />
      </div>

      {/* Done: comp verdicts + debrief */}
      {draft.done && (
        <div className="card" style={{ margin: 0 }}>
          <span className="eyebrow">Draft complete</span>
          <h3 style={{ marginTop: 4 }}>Comps are locked</h3>
          <div className="tac-grid" style={{ marginTop: 8 }}>
            {comps.map((c) => (
              <div key={c.side} className="tac" style={{ cursor: 'default' }}>
                <span className="tac-name" style={{ color: SIDE_COLOR[c.side] }}>
                  {c.side === userSide ? 'Your comp' : 'Enemy comp'} · {cap(c.identity)}
                </span>
                <span className="tac-blurb">Comp bonus +{c.bonus.toFixed(2)}</span>
                {c.notes.map((n, i) => (
                  <span key={i} className="tac-blurb">· {n}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {draft.done && debrief.length > 0 && (
        <div className="card" style={{ margin: 0 }}>
          <span className="eyebrow">Post-draft debrief</span>
          <h3 style={{ marginTop: 4 }}>What the challenger would have picked</h3>
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            {debrief.map((e, i) => (
              <div key={i} className="tac" style={{ cursor: 'default' }}>
                <span className="tac-name">
                  {e.yourPick.name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({e.yourPick.role})</span>
                </span>
                {e.delta > 0 && e.optimalPick ? (
                  <span className="tac-blurb">
                    Challenger pick: <b style={{ color: 'var(--text)' }}>{e.optimalPick.name}</b> ({e.optimalPick.role}) — {e.note}
                  </span>
                ) : (
                  <span className="tac-blurb">Matches the data-optimal pick.</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Champion pool */}
      {!draft.done && (
        <div className="card" style={{ margin: 0 }}>
          <span className="eyebrow">Champion pool</span>
          <div className="tabs" style={{ padding: '8px 0' }}>
            {['ALL', ...DRAFT_ROLES].map((r) => (
              <button
                key={r}
                className={roleFilter === r ? 'tab active' : 'tab'}
                onClick={() => setRoleFilter(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Search champions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8, maxHeight: 430, overflowY: 'auto', paddingRight: 2 }}>
            {visible.map((c) => {
              const isTaken = taken.has(c.id)
              const clickable = yourTurn && !isTaken && (step.type === 'ban' || pickable.has(c.id))
              return (
                <button
                  key={c.id}
                  className="tac"
                  disabled={!clickable}
                  onClick={() => handleChampClick(c.id)}
                  title={isTaken ? `${c.name} (unavailable)` : c.name}
                  style={{
                    textAlign: 'center', padding: '10px 6px',
                    opacity: isTaken ? 0.35 : clickable ? 1 : 0.75,
                    cursor: clickable ? 'pointer' : 'default',
                  }}
                >
                  <span style={{ display: 'flex', justifyContent: 'center' }}>
                    <ChampIcon champId={c.id} size={44} />
                  </span>
                  <span className="tac-name" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>{c.name}</span>
                  <span className="tac-blurb" style={{ display: 'block' }}>{c.roles.join(' / ')}</span>
                </button>
              )
            })}
            {visible.length === 0 && (
              <p className="hint">No champions match that filter.</p>
            )}
          </div>
        </div>
      )}

      {/* Role selector popup */}
      {pickTarget && (
        <div className="modal-backdrop" onClick={() => setPickTarget(null)}>
          <div className="modal" style={{ width: 'min(420px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="card" style={{ margin: 0, border: 'none', background: 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ChampIcon champId={pickTarget} size={48} />
                <h3 style={{ margin: 0 }}>Pick {CHAMP_BY_ID[pickTarget].name} as…</h3>
              </div>
              <div className="tac-grid" style={{ marginTop: 12 }}>
                {(pickable.get(pickTarget) || []).map((role) => (
                  <button
                    key={role}
                    className="tac"
                    disabled={disabled}
                    onClick={() => { onPick(pickTarget, role); setPickTarget(null) }}
                  >
                    <span className="tac-name">{role}</span>
                    <span className="tac-blurb">
                      {draft.picks[userSide][role] ? 'filled' : 'open slot'}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="ghost" onClick={() => setPickTarget(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
