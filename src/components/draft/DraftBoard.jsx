// ============================================================================
// DraftBoard: the Active Coach pick/ban screen (Broadcast Night).
//
// Interaction is unchanged from the role-first draft (#42): pick a role (slot
// or role filter) then a champion; a champion with 2+ open roles picked with
// no role goes to the flex list; select a filled slot, then another slot to
// swap or move; "Assign role…" on a flex pick, then a role. Bans and picks
// commit on click. Only the presentation changed: blue | centre | red columns
// on desktop, a sticky strip + bottom sheet on mobile.
//
// Props: draft, userSide, onBan, onPick(champId, role), onPickFlex?,
// onAssignFlex?, onRearrange?({ op, ... }), disabled, gameLabel?,
// fearlessCount?, fearlessActive?, teams? { BLUE|RED: { id, name, lineup } },
// series? { label, needWins, gameNumber, homeId, awayId, aWins, bWins },
// onLock? (renders "Start game N" in the done state).
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { CHAMPIONS, CHAMP_BY_ID } from '../../data/champions.js'
import {
  DRAFT_ROLES, currentStep, legalPicks,
  legalCommittedPicksForStep, canApplyFlex, canAssignFlex,
  canSwapPicks, canMovePick, canFlexIntoFilledRole,
  draftReadyToPlay, scoreComp, getDraftDebrief,
} from '../../game/draft.js'
import { useModeBar, ModeBarActions } from '../shell/modeBar.jsx'
import { Chip } from '../ui/index.js'
import { cx } from '../ui/cx.js'
import { SideColumn } from './SideColumn.jsx'
import { DraftStrip } from './DraftStrip.jsx'
import { TurnBanner } from './TurnBanner.jsx'
import { ChampionPool } from './ChampionPool.jsx'
import { ActionPanel, actionRows } from './ActionPanel.jsx'
import { DraftSummary } from './DraftSummary.jsx'
import { FlexList } from './FlexList.jsx'
import { useMedia, NARROW } from './useMedia.js'
import { champName, otherSide, playerName, teamFor } from './copy.js'

const noop = () => {}

export default function DraftBoard({
  draft, userSide, onBan, onPick, onPickFlex = noop, onAssignFlex = noop, onRearrange = noop,
  disabled, gameLabel, fearlessCount = 0, fearlessActive = false,
  teams: teamsProp, series, onLock,
}) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [pickTargetRole, setPickTargetRole] = useState(null)
  const [assignTarget, setAssignTarget] = useState(null)
  const [swapSource, setSwapSource] = useState(null)
  const [rearrangeHint, setRearrangeHint] = useState(null)
  const hintTimer = useRef(null)
  const narrow = useMedia(NARROW)

  useEffect(() => {
    const st = currentStep(draft)
    if (!st || st.type !== 'pick' || st.side !== userSide) {
      setPickTargetRole(null)
    }
  }, [draft.step, draft.done, userSide])

  const step = currentStep(draft)
  const yourTurn = !!step && step.side === userSide && !disabled
  const canRearrange = !disabled
  const canPickTarget = yourTurn && step?.type === 'pick' && step.side === userSide
  const userHasCommittedPick = DRAFT_ROLES.some((r) => draft.picks[userSide]?.[r])
  const showChampionPool = !draft.done
  const ready = draftReadyToPlay(draft)

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

  // Pool filter only: once the role you were browsing is filled on your comp,
  // go back to All so the next pick turn doesn't open on an all-disabled pool.
  const filteredRoleFilled = roleFilter !== 'ALL' && !!draft.picks[userSide]?.[roleFilter]
  useEffect(() => {
    if (filteredRoleFilled) setRoleFilter('ALL')
  }, [filteredRoleFilled])

  // Lock-in pop: champions that landed in a slot since the last render.
  const prevPicked = useRef(null)
  const [just, setJust] = useState(() => new Set())
  useEffect(() => {
    const now = new Set(['BLUE', 'RED'].flatMap((sd) => Object.values(draft.picks[sd])))
    if (prevPicked.current) setJust(new Set([...now].filter((id) => !prevPicked.current.has(id))))
    prevPicked.current = now
  }, [draft.picks])

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

  // ---- Your comp: slot handlers (unchanged logic from the role-first draft) ----
  const hintCantPlay = (champId, destRole) => {
    const n = CHAMP_BY_ID[champId]?.name ?? champId
    setRearrangeHintTimed(`${n} can’t play ${destRole}`)
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
        else setRearrangeHintTimed('Can’t flex there — matching or no home for displaced champ.')
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
        else setRearrangeHintTimed('Those champions can’t trade roles.')
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
        else setRearrangeHintTimed('Can’t assign flex there.')
        return
      }
      setRearrangeHintTimed('Can’t assign flex there.')
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
        else setRearrangeHintTimed('Can’t move there.')
      }
      return
    }
    if (!canPickTarget) return
    setSwapSource(null)
    setPickTargetRole(role)
    setRoleFilter(role)
  }

  const onSlot = (role) => {
    const cid = draft.picks[userSide][role]
    if (cid) handleUserFilledRole(role, cid)
    else handleUserEmptyRole(role)
  }

  const onAssignToggle = (champId) => {
    setPickTargetRole(null)
    setSwapSource(null)
    setAssignTarget(assignTarget === champId ? null : champId)
  }

  // ---- Pool ----
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

  const tileView = (id) => {
    const isTaken = taken.has(id)
    const banned = draft.bans.BLUE.includes(id) || draft.bans.RED.includes(id)
    const isFearlessLocked = fearlessSet.has(id) && !banned
    const inPool = step?.type === 'ban' || pickable.has(id)
    let clickable = yourTurn && !isTaken && inPool
    let reason = null
    if (assignTarget) {
      clickable = false
    } else if (step?.type === 'pick' && !isTaken && pickable.has(id)) {
      if (pickTargetRole) {
        clickable = !!committedLegal.get(id)?.has(pickTargetRole)
        if (!clickable) reason = `can't be committed to ${pickTargetRole}`
      } else if (roleFilter !== 'ALL') {
        clickable = !!committedLegal.get(id)?.has(roleFilter)
        if (!clickable) reason = `can't be committed to ${roleFilter}`
      } else {
        const canF = canApplyFlex(draft, userSide, id)
        const oneRole = (committedLegal.get(id)?.size ?? 0) === 1
        clickable = canF || oneRole
      }
    }
    // A Fearless-locked champion is never a legal ban either (draft.js legalBans);
    // the old tile looked clickable on a ban turn and silently did nothing.
    if (isFearlessLocked) clickable = false
    const state = banned ? 'Banned' : isTaken ? 'Picked' : isFearlessLocked ? 'Fearless' : null
    return { clickable, state, reason }
  }

  const onRole = (r) => {
    setRoleFilter(r)
    if (r === 'ALL') setPickTargetRole(null)
    setSwapSource(null)
  }

  // ---- Shared slot view for the desktop columns and the mobile strip ----
  const teams = {
    BLUE: teamFor(teamsProp, 'BLUE', userSide),
    RED: teamFor(teamsProp, 'RED', userSide),
  }

  const slotView = (side, role) => {
    const cid = draft.picks[side][role] ?? null
    const isUser = side === userSide
    const player = playerName(teams[side], role)
    const highlightPick = canPickTarget && pickTargetRole === role && isUser
    const highlightSwap = isUser && swapSource === role
    const openSlotPick = canPickTarget && isUser && !cid
    const interactive = isUser && (cid ? canRearrange : openSlotPick || canRearrange || !!assignTarget)
    // Same priority the slot handler uses (assign, then move/swap, then pick);
    // a destination hint only shows where that step is legal.
    let hint = null
    if (isUser && !cid) {
      hint = assignTarget
        ? (canAssignFlex(draft, userSide, assignTarget, role) || canFlexIntoFilledRole(draft, userSide, assignTarget, role) ? 'Assign flex here' : null)
        : swapSource
          ? (canMovePick(draft, userSide, swapSource, role) ? 'Move here' : null)
          : openSlotPick && !highlightPick
            ? 'Select to pick here'
            : null
    } else if (isUser && cid) {
      hint = highlightSwap
        ? 'Selected'
        : assignTarget
          ? (canFlexIntoFilledRole(draft, userSide, assignTarget, role) ? 'Flex into this role' : null)
          : swapSource
            ? (canSwapPicks(draft, userSide, swapSource, role) ? 'Swap here' : null)
            : null
    }
    const what = cid ? champName(cid) : highlightPick ? 'pick target' : 'open'
    const label = [
      `${teams[side].abbr} ${role}${player ? `, ${player}` : ''}: ${what}`,
      isUser && interactive && hint ? (hint === 'Selected' ? 'Selected to move; choose another role' : hint) : null,
    ].filter(Boolean).join('. ')
    return {
      role,
      champId: cid,
      player,
      interactive,
      active: highlightPick || highlightSwap,
      openTurn: openSlotPick && !highlightPick,
      just: !!cid && just.has(cid),
      hint,
      label,
    }
  }

  // ---- Detail bar / sheet for move-swap and flex-assign selections ----
  const panelModel = assignTarget
    ? {
        mode: 'assign',
        champId: assignTarget,
        rows: actionRows({
          draft, userSide, mode: 'assign', champId: assignTarget,
          legal: (r) => canAssignFlex(draft, userSide, assignTarget, r) || canFlexIntoFilledRole(draft, userSide, assignTarget, r),
        }),
      }
    : swapSource && draft.picks[userSide][swapSource]
      ? {
          mode: 'move',
          champId: draft.picks[userSide][swapSource],
          sourceRole: swapSource,
          rows: actionRows({
            draft, userSide, mode: 'move', champId: draft.picks[userSide][swapSource], sourceRole: swapSource,
            legal: (r) => (draft.picks[userSide][r]
              ? canSwapPicks(draft, userSide, swapSource, r)
              : canMovePick(draft, userSide, swapSource, r)),
          }),
        }
      : null
  const cancelPanel = () => {
    setAssignTarget(null)
    setSwapSource(null)
    setRearrangeHint(null)
  }
  // Esc cancels the desktop detail bar too (the mobile sheet handles its own Esc).
  useEffect(() => {
    if (!panelModel || narrow || typeof document === 'undefined') return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') cancelPanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // ---- Mode bar: "Draft" + game of series, score chip on the right ----
  const gameNumber = series?.gameNumber ?? (Number(String(gameLabel ?? '').replace(/\D+/g, '')) || 1)
  const bestOf = series?.needWins ? series.needWins * 2 - 1 : null
  useModeBar({
    title: 'Draft',
    subtitle: [bestOf && bestOf > 1 ? `Game ${gameNumber} of ${bestOf}` : `Game ${gameNumber}`, series?.label]
      .filter(Boolean)
      .join(' · '),
  })

  const debrief = draft.done && ready ? getDraftDebrief(draft) : []
  const comps = draft.done && ready ? ['BLUE', 'RED'].map((sd) => ({ side: sd, ...scoreComp(draft.picks[sd]) })) : []
  const flexProps = { userSide, assignTarget, onAssignToggle }
  const anyFlex = (draft.flex?.BLUE?.length ?? 0) + (draft.flex?.RED?.length ?? 0) > 0
  const columnProps = {
    draft, userSide, slotView, onSlot, step, flexProps,
    showRearrangeHelp: userHasCommittedPick && canRearrange,
  }

  return (
    <div
      className={cx('draft-board', yourTurn ? 'your-turn' : 'opponent-turn', draft.done && 'is-done')}
      data-user-side={userSide.toLowerCase()}
    >
      {series?.homeId && (
        <ModeBarActions>
          <Chip className="desk-only draft-score-chip">
            {series.homeId} {series.aWins ?? 0}–{series.bWins ?? 0} {series.awayId}
          </Chip>
        </ModeBarActions>
      )}
      <DraftStrip draft={draft} userSide={userSide} teams={teams} slotView={slotView} onSlot={onSlot} step={step} />
      <SideColumn side="BLUE" team={teams.BLUE} {...columnProps} />
      <div className="draft-centre">
        <TurnBanner
          draft={draft}
          step={step}
          userSide={userSide}
          teams={teams}
          ready={ready}
          pickTargetRole={pickTargetRole}
          roleFilter={roleFilter}
          fearlessActive={fearlessActive}
          fearlessCount={fearlessCount}
          gameNumber={gameNumber}
          onLock={onLock}
        />
        {anyFlex && (
          <div className="draft-flex-mobile">
            <FlexList draft={draft} side={userSide} {...flexProps} title="Your flex picks · role hidden" />
            <FlexList draft={draft} side={otherSide(userSide)} {...flexProps} title={`${teams[otherSide(userSide)].abbr} flex picks · role hidden`} />
          </div>
        )}
        {rearrangeHint && !panelModel && (
          <p className="draft-hint" role="status">
            {rearrangeHint}
          </p>
        )}
        {draft.done && ready && <DraftSummary comps={comps} debrief={debrief} userSide={userSide} teams={teams} />}
        {showChampionPool && (
          <ChampionPool
            visible={visible}
            roleFilter={roleFilter}
            onRole={onRole}
            search={search}
            onSearch={setSearch}
            tileView={tileView}
            onTile={handleChampClick}
          />
        )}
        {panelModel && !narrow && (
          <ActionPanel model={panelModel} onSlot={onSlot} onCancel={cancelPanel} hint={rearrangeHint} />
        )}
      </div>
      <SideColumn side="RED" team={teams.RED} {...columnProps} />
      {panelModel && narrow && (
        <ActionPanel model={panelModel} onSlot={onSlot} onCancel={cancelPanel} hint={rearrangeHint} sheet />
      )}
    </div>
  )
}
