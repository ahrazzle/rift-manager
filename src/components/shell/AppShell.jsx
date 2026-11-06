import { useCallback, useState } from 'react'
import TeamCrest from '../TeamCrest.jsx'
import { Button, BottomSheet, Chip, Icon } from '../ui/index.js'
import { cx } from '../ui/cx.js'
import Track from './Track.jsx'
import { useModeBarState } from './modeBar.jsx'
import {
  gauntletContext,
  gauntletTrack,
  phaseTrack,
  scenarioTrack,
  seasonContext,
  shellKind,
} from './nav.js'
import { campaignById } from '../../game/useGameState.js'
import { fmtMoney } from '../../game/economy.js'
import { teamColor, teamName } from '../../game/hype.js'

const BASE = import.meta.env?.BASE_URL ?? '/'

export const SIM_SPEED_OPTIONS = [
  ['slow', 'Slow'],
  ['normal', 'Normal'],
  ['fast', 'Fast'],
  ['instant', 'Instant'],
]

export function SimSpeedSelect({ id, value, onChange, className }) {
  return (
    <select id={id} className={cx('ui-select', className)} value={value ?? 'normal'} onChange={(e) => onChange(e.target.value)}>
      {SIM_SPEED_OPTIONS.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  )
}

function Brand({ compact = false }) {
  return (
    <div className={cx('shell-brand', compact && 'shell-brand--compact')}>
      <img
        src={`${BASE}brand/${compact ? 'rift-mark.svg' : 'rift-manager.svg'}`}
        width={compact ? 36 : 126}
        height={compact ? 36 : 45}
        alt="Rift Manager"
      />
    </div>
  )
}

function yearOf(state) {
  const m = String(state?.seasonYear ?? state?.year ?? '').match(/\d{4}/)
  return m ? m[0] : ''
}

function clubLine(state) {
  const coach = state.managerName || 'Coach'
  if (state.mode === 'career') return `${coach} · Season ${state.career?.seasonIndex ?? 1}`
  if (state.mode === 'campaign') return `${coach} · Scenario`
  if (state.mode === 'gauntlet') return `${coach} · Gauntlet`
  return `${coach} · ${[state.league, yearOf(state)].filter(Boolean).join(' ') || 'Season'}`
}

/** Topbar context + track for the current mode. */
function topbarModel(state, totalRounds) {
  const kind = shellKind(state)
  if (kind === 'gauntlet') {
    return { ctx: gauntletContext(state), track: gauntletTrack(state), trackLabel: 'Gauntlet ladder' }
  }
  if (kind === 'campaign' || kind === 'replay') {
    const campaign = state.campaign ? campaignById(state.campaign.campaignId) : null
    const steps = scenarioTrack(state.campaign, campaign)
    const status = state.campaign?.status
    return {
      ctx: {
        primary: kind === 'replay' ? 'Season replay' : 'Scenario',
        secondary: status === 'cleared' ? 'cleared' : status === 'failed' ? 'failed' : '',
        detail: campaign?.title ?? '',
        spoken: `${kind === 'replay' ? 'Season replay' : 'Scenario'}${campaign?.title ? `: ${campaign.title}` : ''}`,
      },
      track: steps,
      trackLabel: 'Scenario path',
    }
  }
  return { ctx: seasonContext(state, totalRounds), track: phaseTrack(state), trackLabel: 'Season progress' }
}

function StatusChips({ state, tour }) {
  if (!state.board && !state.finance && !state.sacked) return null
  const board = state.board
  const low = board && board.confidence < 40
  return (
    <div className="shell-chips" {...(tour ? { 'data-tour': 'tour-board' } : {})}>
      {board && (
        <Chip tone={low ? 'warn' : 'neutral'} title="Board confidence out of 100, and the board's goal">
          Board {board.confidence}
          <span aria-hidden="true">·</span>
          <span className="shell-chip-goal">{board.expectation}</span>
        </Chip>
      )}
      {state.finance && <Chip title="Transfer budget">{fmtMoney(state.finance.budget)}</Chip>}
      {state.sacked && <Chip tone="loss">Sacked</Chip>}
    </div>
  )
}

function NavItems({ nav, activeDest, onNavigate, place }) {
  return nav.map((d) => {
    const current = activeDest === d.id
    const tour = d.id === 'team' ? 'tour-team-nav' : d.id === 'club' && place === 'tabbar' ? 'tour-board' : null
    return (
      <button
        key={d.id}
        type="button"
        className="shell-nav-item"
        aria-current={current ? 'page' : undefined}
        onClick={() => onNavigate(d.id)}
        {...(tour ? { 'data-tour': tour } : {})}
      >
        <Icon name={d.icon} size={place === 'tabbar' ? 22 : 20} />
        <span>{d.label}</span>
      </button>
    )
  })
}

function ModeBar({ state, dispatch }) {
  const mb = useModeBarState()
  const s = state.matchSession
  const c = s?.context ?? {}
  const gameNo = (s?.games?.length ?? 0) + (s?.stage === 'between' ? 0 : 1)
  const stageLabel =
    {
      setup: 'Match setup',
      draft: `Draft · Game ${gameNo}`,
      map: `Game ${gameNo} · Live`,
      decision: `Game ${gameNo} · Your call`,
      game: `Game ${gameNo}`,
      between: 'Between games',
      result: 'Series result',
    }[s?.stage] ?? ''
  const defaults = {
    title: c.homeId && c.awayId ? `${c.homeId} vs ${c.awayId}` : 'Match',
    subtitle: [c.label, stageLabel].filter(Boolean).join(' · '),
    back:
      s?.stage === 'setup'
        ? { label: 'Back', onClick: () => dispatch({ type: 'MATCH_CANCEL' }) }
        : s?.stage === 'result'
          ? { label: 'Done', onClick: () => dispatch({ type: 'MATCH_CLOSE' }) }
          : null,
  }
  const o = mb?.override
  const title = o?.title ?? defaults.title
  const subtitle = o?.subtitle ?? defaults.subtitle
  let back = defaults.back
  if (o?.hasBack) back = { label: o.backLabel ?? 'Back', onClick: () => mb.backRef.current?.() }
  else if (o?.backLabel && back) back = { ...back, label: o.backLabel }
  if (o?.backHidden) back = null
  return (
    <header className="topbar shell-topbar shell-modebar">
      {back ? (
        <Button variant="quiet" icon="back" className="shell-back" onClick={back.onClick}>
          {back.label}
        </Button>
      ) : (
        <span className="shell-back-spacer" aria-hidden="true" />
      )}
      <div className="shell-modebar-title">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <span className="spacer" />
      <div className="shell-modebar-actions" ref={mb?.setActionsEl} />
    </header>
  )
}

/**
 * The app chrome.
 *  variant "game": rail + topbar on desktop; topbar + bottom tabbar under 900px.
 *  variant "mode": full-screen Draft/Matchday — nav hidden, mode bar only.
 *  variant "bare": New Game screen — brand + How to Play only.
 */
export default function AppShell({
  variant = 'game',
  state,
  dispatch,
  nav = [],
  activeDest,
  onNavigate,
  totalRounds,
  onNewGame,
  onOpenGuide,
  footer,
  className,
  children,
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const go = useCallback(
    (id) => {
      setMoreOpen(false)
      onNavigate?.(id)
    },
    [onNavigate],
  )
  const color = state?.teamId ? teamColor(state, state.teamId) : null
  const style = color ? { '--team': color } : undefined
  const setSpeed = (speed) => dispatch({ type: 'SET_SIM_SPEED', speed })

  if (variant === 'bare') {
    return (
      <div className={cx('app broadcast-shell shell shell--bare', className)}>
        <a className="skip" href="#main-content">
          Skip to main content
        </a>
        <div className="shell-main">
          <header className="topbar shell-topbar">
            <Brand />
            <span className="spacer" />
            <Button variant="quiet" icon="guide" onClick={onOpenGuide}>
              How to Play
            </Button>
          </header>
          <main id="main-content" className="content shell-content" tabIndex={-1}>
            {children}
          </main>
          {footer}
        </div>
      </div>
    )
  }

  if (variant === 'mode') {
    return (
      <div className={cx('app broadcast-shell arena-shell shell shell--mode', className)} style={style}>
        <a className="skip" href="#main-content">
          Skip to main content
        </a>
        <div className="shell-main">
          <ModeBar state={state} dispatch={dispatch} />
          <main id="main-content" className="content shell-content" tabIndex={-1}>
            {children}
          </main>
          {footer}
        </div>
      </div>
    )
  }

  const { ctx, track, trackLabel } = topbarModel(state, totalRounds)
  const hasTeam = !!state.teamId

  return (
    <div className={cx('app broadcast-shell shell shell--game', className)} style={style}>
      <a className="skip" href="#main-content">
        Skip to main content
      </a>
      <aside className="shell-rail" aria-label="Sidebar">
        <Brand />
        <div className="shell-club">
          {hasTeam ? (
            <TeamCrest teamId={state.teamId} name={teamName(state, state.teamId)} size={36} />
          ) : (
            <Icon name="compete" size={28} />
          )}
          <div>
            <b>{hasTeam ? teamName(state, state.teamId) : 'Season replay'}</b>
            <span>{clubLine(state)}</span>
          </div>
        </div>
        <nav className="shell-nav" aria-label="Main">
          <NavItems nav={nav} activeDest={activeDest} onNavigate={go} place="rail" />
        </nav>
        <div className="shell-rail-foot">
          <label className="label" htmlFor="sim-speed-select">
            Sim speed
          </label>
          <SimSpeedSelect id="sim-speed-select" value={state.simSpeed} onChange={setSpeed} />
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar shell-topbar">
          {hasTeam && (
            <span className="mob-only shell-top-crest">
              <TeamCrest teamId={state.teamId} name={teamName(state, state.teamId)} size={32} />
            </span>
          )}
          <div className="shell-ctx">
            <b aria-hidden="true">
              {ctx.primary}
              {ctx.secondary && <span className="faint"> {ctx.secondary}</span>}
            </b>
            <span className="sr-only">{ctx.spoken}</span>
            {ctx.detail && <span className="desk-only shell-ctx-detail">{ctx.detail}</span>}
          </div>
          <Track steps={track} label={trackLabel} className="desk-only" />
          <span className="spacer" />
          <div className="desk-only">
            <StatusChips state={state} tour />
          </div>
          <Button
            variant="quiet"
            icon="more"
            iconOnly
            label="More: guide, new game, sim speed"
            className="mob-only"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
          />
        </header>
        <main id="main-content" className="content shell-content" tabIndex={-1}>
          {children}
        </main>
        {footer}
      </div>

      <nav className="shell-tabbar" aria-label="Main (mobile)">
        <NavItems nav={nav} activeDest={activeDest} onNavigate={go} place="tabbar" />
      </nav>

      {moreOpen && (
        <BottomSheet title="More" onClose={() => setMoreOpen(false)}>
          {(state.board || state.finance) && (
            <div className="shell-more-status">
              <StatusChips state={state} />
            </div>
          )}
          <div className="shell-more-list">
            <button type="button" className="shell-more-item" onClick={() => go('guide')}>
              <Icon name="guide" />
              How to Play
            </button>
            <button type="button" className="shell-more-item" onClick={() => go('settings')}>
              <Icon name="settings" />
              Settings
            </button>
            <button
              type="button"
              className="shell-more-item"
              onClick={() => {
                setMoreOpen(false)
                onNewGame?.()
              }}
            >
              <Icon name="arrow" />
              New Game
            </button>
          </div>
          <div className="shell-more-speed">
            <label className="label" htmlFor="sim-speed-select-more">
              Sim speed
            </label>
            <SimSpeedSelect id="sim-speed-select-more" value={state.simSpeed} onChange={setSpeed} />
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
