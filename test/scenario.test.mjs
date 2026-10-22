// Historical-season Scenario replays — acceptance checks (LOCKED doc §1–§3).
// Run: node test/scenario.test.mjs
import { CAMPAIGNS } from '../src/data/campaigns.js'
import { getSeason, seasonsForLeague } from '../src/data/seasons.js'
import { reducer } from '../src/game/useGameState.js'

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('ok  :', msg)
  }
}

const HIST_IDS = ['hist-2013-summer', 'hist-2015-spring', 'hist-2022']

// Seed state: any valid reducer state works for START_* (it builds fresh).
const seed = reducer(undefined, { type: '@@INIT' }) ?? reducer({ mode: 'season', campaign: null }, { type: 'NOPE' })

// 1. All three entries exist with locked shape.
for (const id of HIST_IDS) {
  const c = CAMPAIGNS.find((e) => e.id === id)
  assert(!!c, `${id} entry exists`)
  assert(c.kind === 'season', `${id} kind is 'season'`)
  assert(c.league === 'LCK', `${id} league is LCK`)
  assert(typeof c.seasonYear === 'string', `${id} has seasonYear`)
}

// 2. seasonYear resolves; standings cover every team exactly once.
for (const id of HIST_IDS) {
  const c = CAMPAIGNS.find((e) => e.id === id)
  let season = null
  try {
    season = getSeason(c.seasonYear)
  } catch (e) {
    assert(false, `${id} getSeason(${c.seasonYear}) resolves (${e.message})`)
    continue
  }
  assert(!!season, `${id} getSeason(${c.seasonYear}) resolves`)
  const ids = season.teams.map((t) => t.id)
  assert(c.standings.length === ids.length, `${id} standings length ${c.standings.length} == team count ${ids.length}`)
  const seen = new Set(c.standings.map((s) => s.teamId))
  assert(seen.size === ids.length && ids.every((t) => seen.has(t)), `${id} standings cover every team exactly once`)
  for (const s of c.standings) {
    assert(s.pts === null, `${id}/${s.teamId} pts null`)
  }
  // Rosters: 5 starters (first player per role) resolvable for every team.
  for (const t of season.teams) {
    const starters = ['TOP', 'JNG', 'MID', 'BOT', 'SUP'].map((r) => (t.players || []).find((p) => p.role === r))
    assert(starters.every(Boolean), `${id}/${t.id} has 5 starters`)
  }
}
// Only T1 18-0 in hist-2022; all other W-L null everywhere.
{
  const c = CAMPAIGNS.find((e) => e.id === 'hist-2022')
  const t1 = c.standings.find((s) => s.teamId === 'T1')
  assert(t1.wins === 18 && t1.losses === 0, 'hist-2022 T1 18/0')
  assert(c.standings.filter((s) => s.teamId !== 'T1').every((s) => s.wins === null && s.losses === null), 'hist-2022 others W-L null')
  for (const id of ['hist-2013-summer', 'hist-2015-spring']) {
    const e = CAMPAIGNS.find((x) => x.id === id)
    assert(e.standings.every((s) => s.wins === null && s.losses === null), `${id} all W-L null`)
  }
}
// seasonsForLeague covers the 2022 year.
assert(seasonsForLeague('LCK').includes('2022'), 'seasonsForLeague(LCK) includes 2022')

// 3. START_CAMPAIGN per hist id -> spectator replay state.
for (const id of HIST_IDS) {
  const s = reducer(seed, { type: 'START_CAMPAIGN', campaignId: id })
  assert(s.mode === 'campaign', `${id} mode=campaign`)
  assert(s.teamId === null, `${id} teamId=null`)
  assert(s.campaign && s.campaign.campaignId === id, `${id} campaign id set`)
  assert(s.campaign.status === 'active', `${id} status=active`)
  const c = CAMPAIGNS.find((e) => e.id === id)
  assert(c.kind === 'season', `${id} campaign.kind=season`)
}

// 4. COMPLETE_SEASON_REPLAY -> cleared; PLAY_CAMPAIGN_NODE on season = no-op.
for (const id of HIST_IDS) {
  const started = reducer(seed, { type: 'START_CAMPAIGN', campaignId: id })
  const before = JSON.stringify(started)
  const noop = reducer(started, { type: 'PLAY_CAMPAIGN_NODE' })
  assert(JSON.stringify(noop) === before, `${id} PLAY_CAMPAIGN_NODE no-op`)
  const done = reducer(started, { type: 'COMPLETE_SEASON_REPLAY' })
  assert(done.campaign.status === 'cleared', `${id} COMPLETE_SEASON_REPLAY -> cleared`)
  // Completed replay restarts cleanly.
  const again = reducer(done, { type: 'RESTART_CAMPAIGN' })
  assert(again.campaign.status === 'active', `${id} RESTART_CAMPAIGN -> active`)
}
// COMPLETE_SEASON_REPLAY on series campaign / non-campaign = no-op.
{
  const series = reducer(seed, { type: 'START_CAMPAIGN', campaignId: 'faker-first-lck-win' })
  const before = JSON.stringify(series)
  assert(JSON.stringify(reducer(series, { type: 'COMPLETE_SEASON_REPLAY' })) === before, 'COMPLETE_SEASON_REPLAY no-op on series')
  assert(JSON.stringify(reducer(seed, { type: 'COMPLETE_SEASON_REPLAY' })) === JSON.stringify(seed), 'COMPLETE_SEASON_REPLAY no-op outside campaign')
}

// 5. Series path intact: Faker entry has kind series + nodes; START still manages T1.
{
  const c = CAMPAIGNS.find((e) => e.id === 'faker-first-lck-win')
  assert(c.kind === 'series' && Array.isArray(c.nodes) && c.nodes.length === 3, 'faker entry kind=series, 3 nodes')
  const s = reducer(seed, { type: 'START_CAMPAIGN', campaignId: 'faker-first-lck-win' })
  assert(s.mode === 'campaign' && s.teamId === 'T1' && s.campaign.status === 'active', 'series START_CAMPAIGN manages T1, active')
}

console.log('scenario.test.mjs done')
