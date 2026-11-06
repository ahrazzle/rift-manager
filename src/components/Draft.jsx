// ============================================================================
// Draft — Active Coach pick/ban UI.
//
// Role-first picks, flex holding area, Fearless lockout display, role swaps/moves.
// Props: draft, userSide, onBan, onPick(champId, role), onPickFlex?, onAssignFlex?,
// onRearrange?( { op, ... } ), disabled, gameLabel?, fearlessCount?, fearlessActive?
// ============================================================================
import { useState, useMemo, useEffect, useRef } from 'react'
import MatchIcon from './MatchIcon.jsx'
import { CHAMPIONS, CHAMP_BY_ID } from '../data/champions.js'
import {
  DRAFT_STEPS, DRAFT_ROLES, currentStep, legalPicks, openEligibleRoles,
  legalCommittedPicksForStep, canApplyFlex, canAssignFlex,
  canSwapPicks, canMovePick, canFlexIntoFilledRole,
  draftReadyToPlay, scoreComp, getDraftDebrief, champPortrait,
} from '../game/draft.js'

const SIDE_COLOR = { BLUE: '#4dd9ed', RED: '#ff786c' }

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

function flexRolesLabel(draft, side, entry) {
  const open = openEligibleRoles(draft, side, entry.champId)
  return open.length ? open.join(' / ') : (CHAMP_BY_ID[entry.champId]?.roles ?? []).join(' / ')
}

function CompPanel({
  draft, side, userSide, pickTargetRole, setPickTargetRole, roleFilter, setRoleFilter, yourTurn, step,
  assignTarget, setAssignTarget,
  swapSource, setSwapSource,
  onRearrange, onAssignFlex, canRearrange, setRearrangeHint,
}) {
  const color = SIDE_COLOR[side]
  const isUser = side === userSide
  const canPickTarget = yourTurn && step?.type === 'pick' && step.side === userSide

  const hintCantPlay = (champId, destRole) => {
    const n = CHAMP_BY_ID[champId]?.name ?? champId
    setRearrangeHint(`${n} can’t play ${destRole}`)
  }

  const handleUserFilledRole = (role, cid) => {
    if (assignTarget) {
      if (canFlexIntoFilledRole(draft, userSide, assignTarget, role)) {
        onRearrange({ op: 'flexIntoFilled', flexChampId: assignTarget, targetRole: role })
        setAssignTarget(null)
        setSwapSource(null)
      } else {
        const flexC = CHAMP_BY_ID[assignTarget]
        if (flexC && !flexC.roles.includes(role)) hintCantPlay(assignTarget, role)
        else setRearrangeHint('Can’t flex there — matching or no home for displaced champ.')
      }
      return
    }
    if (!canRearrange) return
    if (swapSource === role) {
      setSwapSource(null)
      return
    }
    if (swapSource) {
      const other = draft.picks[userSide][swapSource]
      if (!other) {
        setSwapSource(role)
        return
      }
      if (canSwapPicks(draft, userSide, swapSource, role)) {
        onRearrange({ op: 'swap', roleA: swapSource, roleB: role })
        setSwapSource(null)
      } else {
        const a = CHAMP_BY_ID[other]
        const b = CHAMP_BY_ID[cid]
        if (a && !a.roles.includes(role)) hintCantPlay(other, role)
        else if (b && !b.roles.includes(swapSource)) hintCantPlay(cid, swapSource)
        else setRearrangeHint('Those champions can’t trade roles.')
      }
      return
    }
    setPickTargetRole(null)
    setSwapSource(role)
  }

  const handleUserEmptyRole = (role) => {
    if (assignTarget) {
      if (canAssignFlex(draft, userSide, assignTarget, role)) {
        onAssignFlex(assignTarget, role)
        setAssignTarget(null)
        setSwapSource(null)
        return
      }
      if (canFlexIntoFilledRole(draft, userSide, assignTarget, role)) {
        onRearrange({ op: 'flexIntoFilled', flexChampId: assignTarget, targetRole: role })
        setAssignTarget(null)
        setSwapSource(null)
        return
      }
      if (swapSource && canMovePick(draft, userSide, swapSource, role)) {
        onRearrange({ op: 'move', fromRole: swapSource, toRole: role })
        setSwapSource(null)
        return
      }
      if (swapSource) {
        const movingId = draft.picks[userSide][swapSource]
        const moving = CHAMP_BY_ID[movingId]
        if (moving && !moving.roles.includes(role)) hintCantPlay(movingId, role)
        else setRearrangeHint('Can’t assign flex there.')
        return
      }
      setRearrangeHint('Can’t assign flex there.')
      return
    }
    if (swapSource) {
      if (canMovePick(draft, userSide, swapSource, role)) {
        onRearrange({ op: 'move', fromRole: swapSource, toRole: role })
        setSwapSource(null)
      } else {
        const movingId = draft.picks[userSide][swapSource]
        const moving = CHAMP_BY_ID[movingId]
        if (moving && !moving.roles.includes(role)) hintCantPlay(movingId, role)
        else setRearrangeHint('Can’t move there.')
      }
      return
    }
    if (!canPickTarget || !isUser) return
    setSwapSource(null)
    setPickTargetRole(role)
    setRoleFilter(role)
  }

  return (
    <div className={`card draft-comp draft-${side.toLowerCase()}`} style={{ borderTop: `3px solid ${color}`, margin: 0 }}>
      <span className="eyebrow" style={{ color }}>
        {isUser ? 'Your comp' : 'Enemy comp'} · {side}
      </span>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {DRAFT_ROLES.map((role) => {
          const cid = draft.picks[side][role]
          const highlightPick = canPickTarget && pickTargetRole === role && isUser
          const highlightSwap = isUser && swapSource === role
          const rowStyle = {
            display: 'flex', alignItems: 'center', gap: 10, minHeight: 44,
            borderRadius: 8, padding: '2px 6px',
            border: (highlightPick || highlightSwap) ? `2px solid ${color}` : '2px solid transparent',
            background: (highlightPick || highlightSwap) ? `${color}14` : 'transparent',
          }
          if (cid) {
            if (isUser && canRearrange) {
              return (
                <button
                  key={role}
                  type="button"
                  className="tac"
                  onClick={() => handleUserFilledRole(role, cid)}
                  style={{
                    ...rowStyle, opacity: 0.95, width: '100%', textAlign: 'left',
                    minHeight: 44, padding: '6px 8px', cursor: 'pointer',
                    border: highlightSwap ? `2px solid ${color}` : rowStyle.border,
                    background: highlightSwap ? `${color}22` : rowStyle.background,
                  }}
                >
                  <span className="badge"><MatchIcon name={role} size={16} />{role}</span>
                  <ChampIcon champId={cid} size={36} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{CHAMP_BY_ID[cid].name}</span>
                  {highlightSwap && (
                    <span className="hint" style={{ marginLeft: 'auto' }}>Tap another role or cancel</span>
                  )}
                </button>
              )
            }
            return (
              <div key={role} style={{ ...rowStyle, opacity: 0.95 }}>
                <span className="badge"><MatchIcon name={role} size={16} />{role}</span>
                <ChampIcon champId={cid} size={36} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>{CHAMP_BY_ID[cid].name}</span>
              </div>
            )
          }
          const openSlotPick = canPickTarget && isUser
          const emptyClickable = isUser && (openSlotPick || canRearrange || assignTarget)
          return (
            <div key={role} style={rowStyle}>
              {emptyClickable ? (
                <button
                  type="button"
                  className="tac"
                  disabled={!emptyClickable}
                  onClick={() => handleUserEmptyRole(role)}
                  style={{
                    width: '100%', textAlign: 'left', minHeight: 44, padding: '8px 10px',
                    border: highlightPick ? `2px solid ${color}` : '1px solid var(--line)',
                    background: highlightPick ? `${color}18` : 'var(--surface-2)',
                  }}
                >
                  <span className="badge"><MatchIcon name={role} size={16} />{role}</span>
                  <span className="hint" style={{ margin: '4px 0 0', display: 'block' }}>
                    {openSlotPick && highlightPick ? 'Pick target — choose a champion below'
                      : openSlotPick ? 'Tap to pick this role'
                        : assignTarget ? 'Tap to assign flex or complete move'
                          : swapSource ? 'Tap to move champ here'
                            : '— open —'}
                  </span>
                </button>
              ) : (
                <>
                  <span className="badge"><MatchIcon name={role} size={16} />{role}</span>
                  <span className="hint" style={{ margin: 0 }}>— open —</span>
                </>
              )}
            </div>
          )
        })}
      </div>
      {/* Enemy / user flex holding */}
      {(draft.flex?.[side] ?? []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <span className="hint" style={{ margin: 0 }}>Flex picks (role hidden)</span>
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 8 }}>
            {(draft.flex[side] ?? []).map((e) => (
              <li
                key={`${e.champId}-${side}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  padding: 8, borderRadius: 8, border: assignTarget === e.champId && isUser
                    ? `2px solid ${color}` : '1px dashed var(--line)',
                  background: isUser ? `${color}0d` : '#0b0e13',
                }}
              >
                <ChampIcon champId={e.champId} size={36} />
                <div style={{ flex: 1, minWidth: 120 }}>
                  <strong>{CHAMP_BY_ID[e.champId]?.name}</strong>
                  <span className="hint" style={{ display: 'block', marginTop: 2 }}>
                    · {flexRolesLabel(draft, side, e)}
                  </span>
                </div>
                {isUser && (
                  <button
                    type="button"
                    className="ghost"
                    style={{ minHeight: 44 }}
                    onClick={() => {
                      setPickTargetRole(null)
                      setSwapSource(null)
                      setAssignTarget(assignTarget === e.champId ? null : e.champId)
                    }}
                  >
                    {assignTarget === e.champId ? 'Cancel assign' : 'Assign role…'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
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

export default function Draft({
  draft, userSide, onBan, onPick, onPickFlex = () => {}, onAssignFlex = () => {}, onRearrange = () => {},
  disabled, gameLabel, fearlessCount = 0, fearlessActive = false,
}) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [pickTargetRole, setPickTargetRole] = useState(null)
  const [assignTarget, setAssignTarget] = useState(null)
  const [swapSource, setSwapSource] = useState(null)
  const [rearrangeHint, setRearrangeHint] = useState(null)
  const hintTimer = useRef(null)

  useEffect(() => {
    const st = currentStep(draft)
    if (!st || st.type !== 'pick' || st.side !== userSide) {
      setPickTargetRole(null)
    }
  }, [draft.step, draft.done, userSide])

  const step = currentStep(draft)
  const yourTurn = !!step && step.side === userSide && !disabled
  const canRearrange = !disabled
  const userHasCommittedPick = DRAFT_ROLES.some((r) => draft.picks[userSide]?.[r])
  const showChampionPool = !draft.done
  const showFlexAssignUi = !!assignTarget && ((!draft.done && step?.type === 'pick' && step.side === userSide)
    || (draft.done && !draftReadyToPlay(draft)))

  const setRearrangeHintTimed = (msg) => {
    if (hintTimer.current) clearTimeout(hintTimer.current)
    setRearrangeHint(msg)
    if (msg) {
      hintTimer.current = setTimeout(() => {
        setRearrangeHint(null)
        hintTimer.current = null
      }, 3200)
    }
  }

  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current)
  }, [])

  useEffect(() => {
    if (swapSource) setPickTargetRole(null)
  }, [swapSource])

  const phase = draft.done
    ? (draftReadyToPlay(draft) ? 'Complete' : 'Post-draft')
    : draft.step < 6 ? 'Ban Phase 1'
      : draft.step < 12 ? 'Pick Phase 1'
        : draft.step < 16 ? 'Ban Phase 2'
          : 'Pick Phase 2'

  const fearlessSet = useMemo(() => new Set(draft.fearless ?? []), [draft.fearless])

  const taken = useMemo(() => {
    const s = new Set()
    for (const sd of ['BLUE', 'RED']) {
      for (const b of draft.bans[sd]) s.add(b)
      for (const c of Object.values(draft.picks[sd])) s.add(c)
      for (const e of draft.flex?.[sd] ?? []) s.add(e.champId)
    }
    return s
  }, [draft])

  const pickable = useMemo(() => {
    if (!step || step.type !== 'pick' || step.side !== userSide) return new Map()
    return new Map(legalPicks(draft, userSide).map((p) => [p.champId, p.roles]))
  }, [draft, step, userSide])

  const committedLegal = useMemo(() => {
    if (!step || step.type !== 'pick' || step.side !== userSide) return new Map()
    const m = new Map()
    for (const { champId, role } of legalCommittedPicksForStep(draft, userSide)) {
      if (!m.has(champId)) m.set(champId, new Set())
      m.get(champId).add(role)
    }
    return m
  }, [draft, step, userSide])

  const visible = CHAMPIONS.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false
    if (roleFilter !== 'ALL' && !c.roles.includes(roleFilter)) return false
    return true
  })

  const handleChampClick = (champId) => {
    if (!yourTurn || taken.has(champId)) return
    setSwapSource(null)
    if (step.type === 'ban') {
      onBan(champId)
      return
    }
    if (assignTarget) return

    const roles = pickable.get(champId)
    if (!roles || roles.length === 0) return

    if (pickTargetRole) {
      const allowed = committedLegal.get(champId)
      if (!allowed?.has(pickTargetRole)) return
      onPick(champId, pickTargetRole)
      setPickTargetRole(null)
      setSwapSource(null)
      return
    }

    if (roleFilter !== 'ALL') {
      const allowed = committedLegal.get(champId)
      if (!allowed?.has(roleFilter)) return
      onPick(champId, roleFilter)
      setSwapSource(null)
      return
    }

    if (canApplyFlex(draft, userSide, champId)) {
      onPickFlex(champId)
      setSwapSource(null)
      return
    }
    const legalRoles = [...(committedLegal.get(champId) ?? [])]
    if (legalRoles.length === 1) {
      onPick(champId, legalRoles[0])
      setSwapSource(null)
    }
  }

  const debrief = draft.done && draftReadyToPlay(draft) ? getDraftDebrief(draft) : []
  const comps = draft.done && draftReadyToPlay(draft)
    ? ['BLUE', 'RED'].map((sd) => ({ side: sd, ...scoreComp(draft.picks[sd]) }))
    : []

  const fearSubtitle = fearlessActive && fearlessCount > 0
    ? `Fearless · ${fearlessCount} champion${fearlessCount === 1 ? '' : 's'} already played in this series`
    : null

  return (
    <div className={`stack broadcast-draft ${yourTurn ? 'your-turn' : 'opponent-turn'}`} style={{ display: 'grid', gap: 14 }}>
      <div className="card draft-phase" key={draft.step} style={{ margin: 0 }}>
        <span className="eyebrow">Active coach · {phase}</span>
        <h2 style={{ marginTop: 4 }}>{gameLabel ? `Draft — ${gameLabel}` : 'Draft'}</h2>
        {fearSubtitle && <p className="hint" style={{ marginTop: 4 }}>{fearSubtitle}</p>}
        <p className="hint" style={{ marginTop: 4 }}>
          {!step
            ? draftReadyToPlay(draft)
              ? 'Both comps are locked in.'
              : draft.done
                ? 'Official picks and bans are finished. Assign flex picks and rearrange roles until every slot is filled.'
                : ''
            : step.side === userSide
              ? step.type === 'ban'
                ? 'Your ban: remove a champion from the pool.'
                : 'Your pick: choose which role is picking, then lock a champion. Or pick without a role to flex a champ that can still go more than one place.'
              : 'Enemy coach is thinking…'}
        </p>
        {step?.side === userSide && step.type === 'pick' && (
          <p className="hint" style={{ marginTop: 6, fontWeight: 600 }}>
            {!pickTargetRole && roleFilter === 'ALL'
              ? 'Choose a role to commit this pick — or pick a flex champ to hide the role.'
              : null}
            {pickTargetRole && (
              <>Committing to <strong>{pickTargetRole}</strong> — pick a legal champion below.</>
            )}
            {!pickTargetRole && roleFilter !== 'ALL' && (
              <>Browsing <strong>{roleFilter}</strong> — tap a portrait to commit to that role.</>
            )}
          </p>
        )}
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
                border: '1px solid var(--line)',
              }}
            >
              {s.type[0].toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="draft-comps">
        <CompPanel
          draft={draft} side="BLUE" userSide={userSide}
          pickTargetRole={pickTargetRole} setPickTargetRole={setPickTargetRole}
          roleFilter={roleFilter} setRoleFilter={setRoleFilter}
          yourTurn={yourTurn} step={step}
          assignTarget={assignTarget} setAssignTarget={setAssignTarget}
          swapSource={swapSource} setSwapSource={setSwapSource}
          onRearrange={onRearrange}
          onAssignFlex={onAssignFlex}
          canRearrange={canRearrange}
          setRearrangeHint={setRearrangeHintTimed}
        />
        <CompPanel
          draft={draft} side="RED" userSide={userSide}
          pickTargetRole={pickTargetRole} setPickTargetRole={setPickTargetRole}
          roleFilter={roleFilter} setRoleFilter={setRoleFilter}
          yourTurn={yourTurn} step={step}
          assignTarget={assignTarget} setAssignTarget={setAssignTarget}
          swapSource={swapSource} setSwapSource={setSwapSource}
          onRearrange={onRearrange}
          onAssignFlex={onAssignFlex}
          canRearrange={canRearrange}
          setRearrangeHint={setRearrangeHintTimed}
        />
      </div>
      {userHasCommittedPick && canRearrange && (
        <p className="hint" style={{ margin: 0 }}>
          Tap two roles to swap their champs, or move a champ into an open role it can play.
        </p>
      )}
      {rearrangeHint && (
        <p className="hint" role="status" style={{ margin: 0, color: 'var(--warning, #f59e0b)' }}>
          {rearrangeHint}
        </p>
      )}

      {draft.done && draftReadyToPlay(draft) && (
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

      {draft.done && draftReadyToPlay(draft) && debrief.length > 0 && (
        <div className="card" style={{ margin: 0 }}>
          <span className="eyebrow">Post-draft debrief</span>
          <h3 style={{ marginTop: 4 }}>What the challenger would have picked</h3>
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            {debrief.map((e, i) => (
              <div key={i} className="tac" style={{ cursor: 'default' }}>
                <span className="tac-name">
                  {e.yourPick.name}
                  {e.yourPick.role && (
                    <span style={{ color: 'var(--text-2)', fontWeight: 400 }}> ({e.yourPick.role})</span>
                  )}
                  {e.yourPick.flex && <span style={{ color: 'var(--text-2)', fontWeight: 400 }}> (flex)</span>}
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

      {showChampionPool && (
        <div className="card" style={{ margin: 0 }}>
          <span className="eyebrow">Champion pool</span>
          <div className="tabs" style={{ padding: '8px 0' }}>
            {['ALL', ...DRAFT_ROLES].map((r) => (
              <button
                key={r}
                type="button"
                className={roleFilter === r ? 'tab active' : 'tab'}
                style={{ minHeight: 44 }}
                onClick={() => {
                  setRoleFilter(r)
                  if (r === 'ALL') setPickTargetRole(null)
                  setSwapSource(null)
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <input
              type="text"
              aria-label="Search champions" placeholder="Search champions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="draft-champion-pool">
            {visible.map((c) => {
              const isTaken = taken.has(c.id)
              const isFearlessLocked = fearlessSet.has(c.id) && !draft.bans.BLUE.includes(c.id) && !draft.bans.RED.includes(c.id)
              const inPool = step?.type === 'ban' || pickable.has(c.id)
              let clickable = yourTurn && !isTaken && inPool
              if (assignTarget) {
                clickable = false
              } else if (step?.type === 'pick' && !isTaken && pickable.has(c.id)) {
                if (pickTargetRole) {
                  clickable = !!committedLegal.get(c.id)?.has(pickTargetRole)
                } else if (roleFilter !== 'ALL') {
                  clickable = !!committedLegal.get(c.id)?.has(roleFilter)
                } else {
                  const canF = canApplyFlex(draft, userSide, c.id)
                  const oneRole = (committedLegal.get(c.id)?.size ?? 0) === 1
                  clickable = canF || oneRole
                }
              }
              const titleBits = [c.name]
              if (isFearlessLocked) titleBits.push('Fearless — picked earlier in the series')
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`tac draft-champion ${isTaken ? 'is-taken' : ''}`}
                  disabled={!clickable}
                  onClick={() => handleChampClick(c.id)}
                  title={titleBits.join(' · ')}
                  style={{
                    textAlign: 'center', padding: '10px 6px',
                    opacity: isTaken ? 0.35 : clickable ? 1 : 0.75,
                    cursor: clickable ? 'pointer' : 'default',
                    boxShadow: isFearlessLocked ? 'inset 0 0 0 2px #a78bfa' : undefined,
                  }}
                >
                  <span style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                    <ChampIcon champId={c.id} size={44} />
                    {isFearlessLocked && (
                      <span
                        style={{
                          position: 'absolute', right: 2, top: 2, fontSize: 9, fontWeight: 800,
                          background: '#4c1d95', color: '#e9d5ff', padding: '1px 4px', borderRadius: 4,
                        }}
                      >FL</span>
                    )}
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
          {showFlexAssignUi && (
            <div style={{ marginTop: 12 }} role="region" aria-label="Assign flex to role">
              <span className="hint">
                Assigning <strong>{CHAMP_BY_ID[assignTarget]?.name}</strong> — tap a legal role on your comp panel (or use the tabs).
              </span>
              <div className="tabs" style={{ paddingTop: 8 }}>
                {DRAFT_ROLES.map((r) => {
                  const ok = canAssignFlex(draft, userSide, assignTarget, r)
                  return (
                    <button
                      key={`as-${r}`}
                      type="button"
                      className={ok ? 'tab active' : 'tab'}
                      style={{ minHeight: 44, opacity: ok ? 1 : 0.45 }}
                      disabled={!ok}
                      onClick={() => {
                        if (!ok) return
                        onAssignFlex(assignTarget, r)
                        setAssignTarget(null)
                        setSwapSource(null)
                      }}
                    >
                      {r}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
