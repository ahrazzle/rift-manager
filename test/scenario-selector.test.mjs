// Regression guard: every CAMPAIGNS entry must render in the NewGame Scenario
// selector without throwing. The historical-season entries (kind:'season') have
// NO playerLabel/nodes — a selector that reads c.nodes.length or c.playerLabel
// for all entries blanks the whole app (the bug fixed 2026-10-04). This mirrors
// the exact selector expression.
import { CAMPAIGNS } from '../src/data/campaigns.js'
import { SEASONS } from '../src/data/seasons.js'

function assert(c, m) { if (!c) throw new Error('ASSERT FAIL: ' + m) }

// 1) All campaigns must have a kind discriminator.
for (const c of CAMPAIGNS) {
  assert(c.kind === 'series' || c.kind === 'season', `${c.id} has a kind`)
}

// 2) The exact NewGame Scenario tier-label expression must not throw for ANY entry.
for (const c of CAMPAIGNS) {
  const label = c.kind === 'season'
    ? `fixed replay · ${SEASONS[c.seasonYear]?.teams.length ?? 0} teams`
    : `${c.playerLabel} · ${c.nodes.length} series`
  assert(typeof label === 'string' && label.length > 0, `${c.id} label renders`)
}

console.log('scenario-selector.test.mjs done — all campaign entries render safe')
