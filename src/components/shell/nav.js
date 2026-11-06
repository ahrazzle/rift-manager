// Information architecture for the Broadcast Night shell.
//
// Internal tab ids stay flat (dashboard lineup tactics strategy market squad
// standings results tournament campaign club guide settings) so existing
// setTab('lineup') calls keep working. This module maps them onto the five
// destinations (Hub, Team, Compete, Club, Guide) and their segments.
// Pure functions only: no React, no DOM.

export const TAB_LABELS = {
  dashboard: 'Hub',
  campaign: 'Scenario',
  lineup: 'Lineup',
  tactics: 'Tactics',
  strategy: 'Strategy',
  market: 'Market',
  squad: 'Squad',
  standings: 'Standings',
  results: 'Results',
  tournament: 'Bracket',
  club: 'Club',
  guide: 'How to play',
  settings: 'Settings',
}

/** Walkthrough anchors on segment tabs (contextual tips open on these pages). */
export const SEG_TOUR = {
  tactics: 'tour-tactics-tab',
  strategy: 'tour-strategy-tab',
}

const DEST = {
  hub: { id: 'hub', label: 'Hub', icon: 'hub' },
  team: { id: 'team', label: 'Team', icon: 'team' },
  compete: { id: 'compete', label: 'Compete', icon: 'compete' },
  club: { id: 'club', label: 'Club', icon: 'club' },
  guide: { id: 'guide', label: 'Guide', icon: 'guide' },
}

/** Which flavor of chrome a game state gets. */
export function shellKind(state) {
  if (!state) return 'none'
  if (state.mode === 'campaign') return state.teamId ? 'campaign' : 'replay'
  if (!state.teamId) return 'none'
  if (state.mode === 'gauntlet') return 'gauntlet'
  if (state.mode === 'career') return 'career'
  return 'season'
}

/**
 * Destinations for the current mode, each with its ordered segment tab ids.
 * Returns [] on the New Game screen.
 */
export function navFor(state) {
  const kind = shellKind(state)
  if (kind === 'none') return []
  const dest = (id, tabs) => ({ ...DEST[id], tabs })
  if (kind === 'replay') {
    return [dest('hub', ['campaign']), dest('compete', ['results']), dest('club', ['club']), dest('guide', ['guide', 'settings'])]
  }
  if (kind === 'campaign') {
    return [
      dest('hub', ['campaign']),
      dest('team', ['lineup', 'tactics']),
      dest('compete', ['results']),
      dest('club', ['club']),
      dest('guide', ['guide', 'settings']),
    ]
  }
  const team = ['lineup', 'tactics', 'strategy', kind === 'career' ? 'squad' : 'market']
  const compete = ['standings', 'results']
  if (kind !== 'gauntlet' && state.tournament) compete.push('tournament')
  return [
    dest('hub', ['dashboard']),
    dest('team', team),
    dest('compete', compete),
    dest('club', ['club']),
    dest('guide', ['guide', 'settings']),
  ]
}

/** Destination that owns a flat tab id, or null. */
export function destinationOf(nav, tab) {
  return nav.find((d) => d.tabs.includes(tab)) ?? null
}

/**
 * Resolve a requested flat tab to a valid { destination, tab } for this mode.
 * Unknown or unavailable tabs fall back to the Hub's first tab, like the old
 * flat nav did.
 */
export function resolveRoute(nav, tab) {
  if (!nav.length) return { destination: null, tab: 'dashboard' }
  const destination = destinationOf(nav, tab)
  if (destination) return { destination, tab }
  // A destination id (e.g. 'team') resolves to its first segment.
  const byId = nav.find((d) => d.id === tab)
  if (byId) return { destination: byId, tab: byId.tabs[0] }
  return { destination: nav[0], tab: nav[0].tabs[0] }
}

/** Ordinal suffix: 1st, 2nd, 3rd, 4th. */
export function ordinal(n) {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

const PHASES = [
  ['regional', 'Regional'],
  ['playoffs', 'Playoffs'],
  ['msi', 'MSI'],
  ['worlds', 'Worlds'],
]

/**
 * Season phase track (Regional › Playoffs › MSI › Worlds), read-only from
 * state.phase. Each step: { id, label, status: 'done' | 'now' | 'next' }.
 */
export function phaseTrack(state) {
  const phase = state?.phase ?? 'regional'
  const current = phase === 'done' ? PHASES.length : Math.max(0, PHASES.findIndex(([id]) => id === phase))
  return PHASES.map(([id, label], i) => ({
    id,
    label,
    status: i < current ? 'done' : i === current ? 'now' : 'next',
  }))
}

/**
 * Topbar context. `primary` + `secondary` render as "Week 3 of 9";
 * `detail` is the quieter line beside it (desktop only).
 *
 * state.round is the NEXT round to play (1-based), so "Week 3 of 9" always
 * names the week the Hub's Play button will play, never the one just shown
 * in the result.
 */
export function seasonContext(state, totalRounds) {
  const total = state?.totalRounds ?? totalRounds ?? 0
  const league = state?.league ?? 'LCK'
  const phase = state?.phase ?? 'regional'
  const career = state?.mode === 'career' ? `Season ${state.career?.seasonIndex ?? 1} · ` : ''
  if (!state?.finished && phase === 'regional') {
    const week = Math.min(Math.max(state?.round ?? 1, 1), Math.max(total, 1))
    return { primary: `Week ${week}`, secondary: total ? `of ${total}` : '', detail: `${career}${league} Regional Split`, spoken: `Next to play: week ${week} of ${total}` }
  }
  const t = state?.tournament
  const tLive = t && t.status === 'active'
  if (phase === 'playoffs') return { primary: 'Playoffs', secondary: tLive ? 'in progress' : 'complete', detail: `${career}${league} Regional Split`, spoken: `Playoffs ${tLive ? 'in progress' : 'complete'}` }
  if (phase === 'msi') return { primary: 'MSI', secondary: tLive ? 'in progress' : 'complete', detail: `${career}International`, spoken: `MSI ${tLive ? 'in progress' : 'complete'}` }
  if (phase === 'worlds') return { primary: 'Worlds', secondary: tLive ? 'in progress' : 'complete', detail: `${career}International`, spoken: `Worlds ${tLive ? 'in progress' : 'complete'}` }
  if (phase === 'done') return { primary: 'Season', secondary: 'complete', detail: `${career}${league}`, spoken: 'Season complete' }
  return { primary: 'Regular season', secondary: 'complete', detail: `${career}${league} Regional Split`, spoken: 'Regular season complete' }
}

/** Gauntlet ladder: one step per opponent. */
export function gauntletTrack(state) {
  const g = state?.gauntlet
  if (!g) return []
  return (g.opponents ?? []).map((id, i) => ({
    id: `${id}-${i}`,
    label: id,
    status:
      i < g.wins ? 'done' : i === g.round && g.status === 'active' ? 'now' : g.status === 'lost' && i === g.round - 1 ? 'lost' : 'next',
  }))
}

export function gauntletContext(state) {
  const g = state?.gauntlet
  if (!g) return { primary: 'Gauntlet', secondary: '', detail: 'Knockout ladder · run not started', spoken: 'Gauntlet, run not started' }
  const target = g.target ?? g.opponents?.length ?? 5
  if (g.status === 'won') return { primary: 'Gauntlet', secondary: 'cleared', detail: `${g.wins} of ${target} wins`, spoken: 'Gauntlet cleared' }
  if (g.status === 'lost') return { primary: 'Gauntlet', secondary: 'over', detail: `${g.wins} of ${target} wins`, spoken: `Gauntlet over after ${g.wins} wins` }
  return { primary: `Round ${g.round + 1}`, secondary: `of ${target}`, detail: 'Gauntlet ladder', spoken: `Gauntlet round ${g.round + 1} of ${target}` }
}

/** Scenario objective track from campaign nodes (pass the campaign definition). */
export function scenarioTrack(progress, campaign) {
  if (!progress || !campaign?.nodes?.length) return []
  return campaign.nodes.map((node, i) => ({
    id: node.id,
    label: node.round ?? `Step ${i + 1}`,
    status:
      progress.status === 'cleared' || i < progress.nodeIndex
        ? 'done'
        : progress.status === 'failed' && progress.failedNodeId === node.id
          ? 'lost'
          : i === progress.nodeIndex && progress.status === 'active'
            ? 'now'
            : 'next',
  }))
}
