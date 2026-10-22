// ============================================================================
// Campaign data — pure data + labels only. No sim logic, no RNG, no imports
// from engine/game. See docs/campaign-faker-first-lck.md (Hazen, STABLE) for
// the researched bracket and docs/campaign-mode-design.md (Leo, STABLE) for
// the schema discussion.
//
// DEVIATION (per-game model): Leo's design models forced losses at SERIES
// level (forcedLoss boolean per node). That does not fit Summer 2013 — SKT
// never lost a series (3-0, 3-1, 3-2). Losses are PER-GAME, so each node
// carries hardLossSlots: the 1-based game-slot numbers the real team lost.
// Those slots auto-resolve as losses the player cannot change; every other
// slot is winnable and the player must win it (losing one ends the campaign).
//
// opponentId MUST be a valid team id in src/data/lck.js (ratings source).
// opponentLabel is free-text historical flavor. Rosters use game-balanced
// fictional ratings; only names and series scores evoke history.
// ============================================================================

export const CAMPAIGNS = [
  {
    id: 'faker-first-lck-win',
    title: "Faker's First LCK Win",
    kind: 'series',
    description:
      'Take SKT T1 through the HOT6iX Champions Summer 2013 bracket — the playoff run that gave Faker his first Korean title. Walk the real path: sweep Jin Air, avenge Spring against MVP Ozone, then reverse-sweep KT Bullets in the final. History decides the lost games; you must win the rest.',
    playerTeamId: 'T1',
    playerLabel: 'SKT T1',
    nodes: [
      {
        id: 'qf-vs-jin-air',
        round: 'Quarterfinal',
        opponentId: 'FOX',
        opponentLabel: 'Jin Air Falcons',
        bestOf: 5,
        hardLossSlots: [],
        blurb: '2013-08-14 · SKT swept 3–0 to open the run.',
      },
      {
        id: 'sf-vs-mvp-ozone',
        round: 'Semifinal',
        opponentId: 'NS',
        opponentLabel: 'MVP Ozone',
        bestOf: 5,
        hardLossSlots: [1],
        blurb: '2013-08-23 · Dropped Game 1, then took three straight — revenge for the Spring semifinal.',
      },
      {
        id: 'final-vs-kt-bullets',
        round: 'Final',
        opponentId: 'KT',
        opponentLabel: 'KT Rolster Bullets',
        bestOf: 5,
        hardLossSlots: [1, 2],
        blurb: '2013-08-31 · Down 0–2, SKT reverse-swept 3–2. The Faker–Ryu Zed games.',
      },
    ],
  },
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
]
