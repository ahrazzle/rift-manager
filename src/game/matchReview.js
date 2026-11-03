// Coaching notes derived only from recorded simulation events, never a claim
// about the real players or a causal explanation of the engine's sampled win.
export function reviewSeries(games = [], userSide = 'home') {
  const side = userSide === 'away' ? 'B' : 'A'
  const opponent = side === 'A' ? 'B' : 'A'
  const played = games.filter((g) => g && ['A', 'B'].includes(g.winner))
  if (!played.length) return null
  const stats = { games: played.length, wins: 0, dragons: 0, enemyDragons: 0, towers: 0, enemyTowers: 0, barons: 0, enemyBarons: 0, lostLeads: 0, slowStarts: 0 }
  for (const game of played) {
    if (game.winner === side) stats.wins++
    for (const event of game.events || []) {
      if (event.side !== side && event.side !== opponent) continue
      const key = { dragon: ['dragons', 'enemyDragons'], tower: ['towers', 'enemyTowers'], baron: ['barons', 'enemyBarons'] }[event.type]
      if (key) stats[key[event.side === side ? 0 : 1]]++
    }
    const timeline = (game.goldTimeline || []).filter((p) => Number.isFinite(p.t) && Number.isFinite(p.diff))
      .map((p) => ({ t: p.t, gold: p.diff * (side === 'A' ? 1 : -1) })).sort((a, b) => a.t - b.t)
    const early = timeline.filter((p) => p.t <= 15)
    if (early.length && early[early.length - 1].gold < -1500) stats.slowStarts++
    if (game.winner !== side && timeline.some((p) => p.gold >= 2500)) stats.lostLeads++
  }
  const notes = []
  let focus = 'scrims'
  if (stats.enemyDragons > stats.dragons) {
    notes.push({ kind: 'work', title: 'Review your dragon setup', text: `You secured ${stats.dragons} of ${stats.dragons + stats.enemyDragons} recorded dragons. Rehearse jungle–support rotations before the next series.` })
    focus = 'vision'
  } else if (stats.dragons > stats.enemyDragons) {
    notes.push({ kind: 'good', title: 'You controlled more dragons', text: `${stats.dragons} secured to their ${stats.enemyDragons}. Keep the objective setup that supported this series.` })
  }
  if (stats.slowStarts) {
    notes.push({ kind: 'work', title: 'Your lanes need an earlier foothold', text: `Behind by more than 1.5k at the last recorded point by 15 minutes in ${stats.slowStarts} game${stats.slowStarts === 1 ? '' : 's'}. Give your laners a mechanics session.` })
    if (focus !== 'vision') focus = 'mechanics'
  }
  if (stats.lostLeads) {
    notes.push({ kind: 'work', title: 'Practise closing with a lead', text: `Lost ${stats.lostLeads} game${stats.lostLeads === 1 ? '' : 's'} after leading by at least 2.5k. Use scrims to rehearse safer rotations while ahead.` })
  }
  if (!notes.length) notes.push({ kind: stats.wins > played.length / 2 ? 'good' : 'neutral', title: 'Build on the series', text: `You won ${stats.wins} of ${played.length} games. The recorded events do not point to a clear recurring problem; rehearse the next matchup.` })
  return { stats, notes: notes.slice(0, 3), focus }
}
