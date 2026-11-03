// Weekly coaching work. Effects are game-balanced, not real player statistics.
// No random rolls: the player sees exactly what the selected programme does.
const ROLES = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']

export const PREPARATION_FOCI = [
  { id: 'scrims', label: 'Matchup scrims', icon: '◎', description: 'Rehearse your five against the next opponent.', effect: '+2 form for your starters · +0.9 match preparation', form: [2, 2, 2, 2, 2], bonus: 0.9 },
  { id: 'mechanics', label: 'Lane mechanics', icon: '↗', description: 'Give your solo lanes and carry time to sharpen up.', effect: '+6 TOP / MID / BOT form · +2 JNG / SUP · +0.2 preparation', form: [6, 2, 6, 6, 2], bonus: 0.2 },
  { id: 'vision', label: 'Objective setup', icon: '◇', description: 'Rehearse vision, rotations, and jungle–support coordination.', effect: '+5 JNG / SUP form · +2 elsewhere · +0.6 preparation', form: [2, 5, 2, 2, 5], bonus: 0.6 },
  { id: 'recovery', label: 'Recovery week', icon: '◌', description: 'Let an out-of-form lineup reset before match day.', effect: '+7 form for your starters · no matchup bonus', form: [7, 7, 7, 7, 7], bonus: 0 },
]

export function upcomingOpponent(state) {
  if (!state?.teamId || state.finished) return null
  const match = state.schedule?.[state.round - 1]?.find(([h, a]) => h === state.teamId || a === state.teamId)
  return match ? (match[0] === state.teamId ? match[1] : match[0]) : null
}

export function canPrepare(state) {
  return ['season', 'career'].includes(state?.mode)
    && !!upcomingOpponent(state)
    && state.trainedRound !== state.round
    && !state.sacked
    && (state.mode !== 'career' || state.career?.status === 'active')
}

export function preparationBonus(state, opponentId = upcomingOpponent(state)) {
  const prep = state?.preparation
  if (!['season', 'career'].includes(state?.mode) || state.finished || !prep
    || prep.round !== state.round || state.trainedRound !== state.round
    || prep.seasonIndex !== (state.career?.seasonIndex ?? 1)
    || !opponentId || prep.opponentId !== opponentId) return 0
  // A substitute keeps their own form, but cannot inherit another player's rehearsal.
  const trained = new Set(prep.playerIds || [])
  const retained = ROLES.filter((r) => trained.has(state.lineup?.[r])).length
  return Math.round((prep.bonus || 0) * retained / ROLES.length * 100) / 100
}

export function prepareWeek(state, focusId) {
  const focus = PREPARATION_FOCI.find((p) => p.id === focusId)
  if (!focus || !canPrepare(state)) return state
  const roster = state.teams[state.teamId] || []
  const form = { ...state.form }
  const changes = []
  for (const [index, role] of ROLES.entries()) {
    const player = roster.find((p) => p.id === state.lineup[role] && p.role === role)
    if (!player) return state
    const before = form[player.id] ?? player.form ?? 50
    const after = Math.max(15, Math.min(98, before + focus.form[index]))
    form[player.id] = after
    changes.push({ playerId: player.id, name: player.name, role, before, after })
  }
  return {
    ...state,
    form,
    trainedRound: state.round,
    preparation: {
      focus: focus.id,
      round: state.round,
      seasonIndex: state.career?.seasonIndex ?? 1,
      opponentId: upcomingOpponent(state),
      bonus: focus.bonus,
      playerIds: changes.map((c) => c.playerId),
      changes,
    },
  }
}

export function scoutOpponent(state) {
  const opponentId = upcomingOpponent(state)
  if (!opponentId) return null
  const enemy = state.teams[opponentId] || []
  const mine = state.teams[state.teamId] || []
  const starters = ROLES.map((role) => enemy.filter((p) => p.role === role).sort((a, b) => b.ovr - a.ovr)[0]).filter(Boolean)
  if (!starters.length) return null
  const threat = [...starters].sort((a, b) => b.ovr - a.ovr)[0]
  const lanes = starters.map((player) => {
    const ours = mine.find((p) => p.id === state.lineup?.[player.role])
    return { role: player.role, name: player.name, edge: (ours?.ovr ?? 0) - player.ovr }
  }).sort((a, b) => a.edge - b.edge)
  const players = mine.filter((p) => Object.values(state.lineup || {}).includes(p.id))
  const averageForm = players.length ? players.reduce((n, p) => n + (state.form[p.id] ?? 50), 0) / players.length : 50
  const avgMacro = starters.reduce((n, p) => n + p.macro, 0) / starters.length
  const recommended = averageForm < 45 ? 'recovery' : lanes[0]?.edge < -4 ? 'mechanics' : avgMacro >= 82 ? 'vision' : 'scrims'
  const reason = recommended === 'recovery' ? 'Your starters are below neutral form. Recovery has the biggest immediate form lift.'
    : recommended === 'mechanics' ? `${lanes[0].role} is your largest rating deficit. Sharpen the lanes before meeting ${opponentId}.`
    : recommended === 'vision' ? 'Their lineup has strong macro ratings. Jungle–support preparation is worth attention.'
    : 'Your form is steady. Use the week to rehearse this particular matchup.'
  return { opponentId, threat, lanes, averageForm, recommended, reason }
}
