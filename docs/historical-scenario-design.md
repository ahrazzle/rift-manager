# Historical-Season Scenario Design (LOCKED — Leo)

> Status: LOCKED schema for the builder. Scenario Mode gains 3 fixed
> single-season replays (`hist-2013-summer`, `hist-2015-spring`, `hist-2022`).
> Read-only design doc — no code here. Engine (`sim.js`, `season.js`) stays
> UNTOUCHED (§4). Season/Career year dropdown is Mozi's job (separate) — this
> doc covers Scenario entries only (§5).

## 0. Core principle

A historical-season scenario is a **replay, not a managed season**. The final
standings are LOCKED to the real historical order below. The player has no
agency over outcomes: no sim, no lineup/tactic effect, no win/loss state.
`simulateSeries` is NEVER called for a `kind: 'season'` entry.

## 1. `campaigns.js` schema + the 3 concrete entries

### 1.1 Locked entry shape

Extend `CAMPAIGNS` with a `kind` discriminator. The existing Faker entry gets
`kind: 'series'` backfilled (reducer treats a missing `kind` as `'series'`
defensively — §3).

```js
{
  id: 'hist-2022',            // string, unique across CAMPAIGNS
  title: '...',              // display title
  kind: 'season',            // LOCKED: 'series' | 'season'
  league: 'LCK',             // LOCKED 'LCK' for all three (display scope)
  seasonYear: '2022',        // LOCKED: must satisfy getSeason(seasonYear);
                             // rosters/players/tiers/coaches resolve from it
  description: '...',        // 1–2 sentence historical frame (incl. finals score)
  championId: 'T1',          // team id inside getSeason(seasonYear).teams
  runnerUpId: 'GEN',         // same
  standings: [               // LOCKED final order; rank = index + 1. Length MUST
    { teamId: 'T1', wins: 18, losses: 0, pts: null }, // equal the year's team count.
    // ...
  ],
}
```

Field rules (locked):

- `teamId` MUST exist in `getSeason(seasonYear).teams`; `standings` MUST cover
  every team exactly once (builder: assert both at module load in dev).
- `wins` / `losses` are numbers **only where Hazen's doc verifies them**,
  otherwise `null`. Never invent W-L. `pts` is `null` everywhere for now (pts
  is a live-game construct; the replay is display-only and never writes
  live standings — §3).
- Positions NOT verified in the doc keep Hazen's team-list order and carry a
  `// [UNCERTAIN: list order, not verified placement]` comment. Do not
  reorder them silently.

### 1.2 The 3 entries (copy-pasteable data)

**A — `hist-2013-summer`** (`seasonYear: '2013-summer'`, 16 teams).
Verified: champion SKT T1 K (3–2 over KTB), 3rd MVO, 4th CJF. Rest = doc
team-list order, UNVERIFIED placement. No W-L in doc → all `null`.

```js
{
  id: 'hist-2013-summer',
  title: '2013: Faker’s Debut Summer',
  kind: 'season',
  league: 'LCK',
  seasonYear: '2013-summer',
  description:
    'Re-enact OGN Champions Summer 2013 — Faker’s debut split. SK Telecom T1 K beat KT Rolster Bullets 3–2 in “the best final ever”; MVP Ozone took 3rd, CJ Frost 4th. Final order below is history, locked.',
  championId: 'T1',
  runnerUpId: 'KTB',
  standings: [
    { teamId: 'T1', wins: null, losses: null, pts: null },
    { teamId: 'KTB', wins: null, losses: null, pts: null },
    { teamId: 'MVO', wins: null, losses: null, pts: null },
    { teamId: 'CJF', wins: null, losses: null, pts: null },
    // [UNCERTAIN: list order, not verified placement]
    { teamId: 'CJB', wins: null, losses: null, pts: null },
    { teamId: 'NJS', wins: null, losses: null, pts: null },
    { teamId: 'NJW', wins: null, losses: null, pts: null },
    { teamId: 'JAF', wins: null, losses: null, pts: null },
    { teamId: 'JAS', wins: null, losses: null, pts: null },
    { teamId: 'MVB', wins: null, losses: null, pts: null },
    { teamId: 'IM1', wins: null, losses: null, pts: null },
    { teamId: 'IM2', wins: null, losses: null, pts: null },
    { teamId: 'XEB', wins: null, losses: null, pts: null },
    { teamId: 'XES', wins: null, losses: null, pts: null },
    { teamId: 'MIG', wins: null, losses: null, pts: null },
    { teamId: 'CTU', wins: null, losses: null, pts: null },
  ],
},
```

> Note: `seasonYear '2013-summer'` resolves via `getSeason` even though its
> registry `league` is `'OGN Champions'`. The scenario's `league: 'LCK'` is
> display scope only (LCK-only v1, §5) — it does not change data resolution.

**B — `hist-2015-spring`** (`seasonYear: '2015-spring'`, 8 teams).
Verified: champion SKT over GE; regular-season #1 GE Tigers. Positions 3–8 =
doc list order, UNVERIFIED. No W-L in doc → all `null`.

```js
{
  id: 'hist-2015-spring',
  title: '2015 Spring: SKT’s Rebuild Title',
  kind: 'season',
  league: 'LCK',
  seasonYear: '2015-spring',
  description:
    'Re-enact SBENU Champions Spring 2015 — the first single-team LCK year. GE Tigers finished #1 in the regular season, but SKT (MaRin/Bengi/Faker–Easyhoon/Bang/Wolf) took the title. Final order below is history, locked.',
  championId: 'SKT',
  runnerUpId: 'GE',
  standings: [
    { teamId: 'SKT', wins: null, losses: null, pts: null },
    { teamId: 'GE', wins: null, losses: null, pts: null },
    // [UNCERTAIN: list order, not verified placement]
    { teamId: 'CJ', wins: null, losses: null, pts: null },
    { teamId: 'JAG', wins: null, losses: null, pts: null },
    { teamId: 'KT', wins: null, losses: null, pts: null },
    { teamId: 'NJ', wins: null, losses: null, pts: null },
    { teamId: 'SSB', wins: null, losses: null, pts: null },
    { teamId: 'IM', wins: null, losses: null, pts: null },
  ],
},
```

**C — `hist-2022`** (`seasonYear: '2022'`, 10 teams).
Standings = **Spring 2022 final order** (the only full verified order in the
doc: T1, GEN, DK, DRX, KDF, BRO, KT, NS, LSB, HLE). Only T1 18–0 is reported
([MED]) → all other W-L `null`. Summer result (GEN 3–0 over T1) lives in the
description as framing, not in the table.

```js
{
  id: 'hist-2022',
  title: '2022: The Undefeated Spring',
  kind: 'season',
  league: 'LCK',
  seasonYear: '2022',
  description:
    'Re-enact LCK 2022 — T1’s undefeated 18–0 spring (3–1 over Gen.G in the final), answered by Gen.G’s 3–0 summer revenge over T1. Table shows the locked Spring final order.',
  championId: 'T1',
  runnerUpId: 'GEN',
  standings: [
    { teamId: 'T1', wins: 18, losses: 0, pts: null }, // [MED per research doc]
    { teamId: 'GEN', wins: null, losses: null, pts: null },
    { teamId: 'DK', wins: null, losses: null, pts: null },
    { teamId: 'DRX', wins: null, losses: null, pts: null },
    { teamId: 'KDF', wins: null, losses: null, pts: null },
    { teamId: 'BRO', wins: null, losses: null, pts: null },
    { teamId: 'KT', wins: null, losses: null, pts: null },
    { teamId: 'NS', wins: null, losses: null, pts: null },
    { teamId: 'LSB', wins: null, losses: null, pts: null },
    { teamId: 'HLE', wins: null, losses: null, pts: null },
  ],
},
```

## 2. `Campaign.jsx` rendering / play flow for `kind: 'season'`

Branch at the top of `Campaign`, right after the existing `prog`/`campaign`
resolve: `if (campaign.kind === 'season') return <SeasonReplay …/>`. The
existing series flow (NodeCard / SlotDetail / cleared / failed) is untouched
and series-only.

**What the player sees** (`SeasonReplay`, passive replay view):

1. Header card: `campaign.title`, year label from `getSeason(seasonYear).label`,
   `campaign.description`, champion banner —
   `🏆 {championName} — champions` (names via `getSeason(seasonYear).teams`).
2. `Final standings (locked — history decided)` table: rank (index+1),
   team name, W / L / Pts with `—` for `null`. Rendered **only** from
   `campaign.standings` — never from live `state.standings`.
3. Rosters section (read-only): `getSeason(seasonYear).teams` → team name +
   5 starters (first player per role). Collapsible per team.

**Buttons (the complete list — nothing else):**

- Status `active`: [Complete replay →] (dispatches `COMPLETE_SEASON_REPLAY`),
  [← Back to menu] (dispatches `QUIT_CAMPAIGN`).
- Status `cleared`: recap line (`{title} — replayed. History kept its order.`),
  [Replay again →] (`RESTART_CAMPAIGN`), [Back to menu] (`QUIT_CAMPAIGN`).
- There is NO `failed` state, NO `PLAY_CAMPAIGN_NODE` button, NO per-game
  detail, NO `MatchDetail` usage for season kind. Deliberately no
  matchweek-stepping: the doc has no per-match historical scores, so there is
  nothing truthful to step through — the locked table IS the replay.

## 3. Minimal reducer / state changes (`useGameState.js`)

`campaign` progress shape is UNCHANGED (`freshCampaign` as-is; season entries
simply never populate `nodeResults`/`failedNodeId`).

1. `START_CAMPAIGN` — branch on `kind` after `campaignById`:
   - `series` (or missing `kind`): current behavior, byte-identical.
   - `season`: `base = freshState(campaign.seasonYear)` (loads that year's
     rosters, `teamMeta`, schedule via `getSeason` — used for roster display;
     live standings stay empty, the replay never writes them);
     `base.teamId = null` (spectator replay — no managed team, so
     SET_LINEUP/TRAIN/SIGN are natural no-ops); `base.mode = 'campaign'`;
     `base.campaign = freshCampaign(campaign.id)` (status `active`).
2. `PLAY_CAMPAIGN_NODE` — first-line guard: `if (campaign.kind !== 'series'`
   `|| !campaign.nodes) return state`. Series-only from here on; otherwise
   untouched.
3. New `COMPLETE_SEASON_REPLAY` — only when `state.mode === 'campaign'`,
   campaign `kind === 'season'`, status `active` → status `'cleared'`.
   Anything else → no-op.
4. `RETRY_CAMPAIGN_NODE` (series-only by status precondition),
   `RESTART_CAMPAIGN`, `QUIT_CAMPAIGN`, `load()` — UNCHANGED.
5. `PLAY_ROUND` already early-returns in campaign mode — no change needed.

## 4. Engine untouched — confirmation

- `src/engine/sim.js` (`simulateSeries`): zero changes, zero new call sites
  (season replay never sims).
- `src/engine/season.js` (`roundRobin`, `buildLCKSchedule`, standings
  helpers): zero changes. `freshState(campaign.seasonYear)` reuses the
  existing `roundRobin(yearTeams…)` path — that is a data-loading call in
  `useGameState.js`, not an engine change.
- No new tiebreaks, no standings writes, no schedule-gen changes.

## 5. Scope guard

- Historical-season scenarios are **LCK-only for v1** (`league: 'LCK'` on all
  three entries; no LPL/LEC/LCS scenario entries).
- Season & Career year dropdown = Mozi's work, separate doc. No engine change
  is needed there by design: `NEW_GAME` already takes `seasonYear` into
  `freshState(seasonYear)` and `START_CAREER` already resolves `seasonYear`
  through `getSeason` — both fix rosters/players/tiers via the year dataset
  today. The dropdown only passes a different year id.
