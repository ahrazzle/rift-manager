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
// opponentId MUST be a valid team id in src/data/lck.js (ratings source),
// OR in the campaign's own `extraTeams` (Los Ratones campaigns). Rosters use
// game-balanced fictional ratings; only names and series scores evoke history.
// opponentLabel is free-text historical flavor. Rosters use game-balanced
// fictional ratings; only names and series scores evoke history.
// ============================================================================

import { makePlayer, ROLES } from './lck.js'


// ============================================================================
// Los Ratones teams (shared by both Ratones campaigns). Fictional ratings via
// makePlayer as always; only NAMES evoke history. Opponent rosters are
// era-plausible; [UNCERTAIN] where the real ERL lineups could not be verified.
// ============================================================================
function ratonesTeam(id, name, short, color, tier, roster) {
  const players = []
  for (const role of ROLES) {
    const names = roster[role] || ['Unknown', 'Unknown']
    players.push(makePlayer(id, names[0], role, tier, true))
    players.push(makePlayer(id, names[1], role, tier, false))
  }
  return { id, name, short, color, tier, players }
}

const RATONES_TEAMS = [
  ratonesTeam('LR', 'Los Ratones', 'LR', '#f5c518', 85, {
    TOP: ['Baus', 'Thebausffs'], JNG: ['Velja', 'Moleman'], MID: ['Nemesis', 'Caedrel'],
    BOT: ['Crownie', 'Shaves'], SUP: ['Rekkles', 'YamatoCannon'],
  }),
  // --- Reality opponents ---
  ratonesTeam('LR_5PIGS', '5 Pigs 1 Team', '5P1T', '#9ca3af', 76, { // [UNCERTAIN] roster
    TOP: ['Piglet1', 'Piglet2'], JNG: ['BoarOff', 'Tusker'], MID: ['Ham Solo', 'Bacon'],
    BOT: ['Snout', 'Oink'], SUP: ['Trough', 'Sty'],
  }),
  ratonesTeam('LR_NORD', 'NORD Esports', 'NORD', '#0ea5e9', 80, { // [UNCERTAIN] most names
    TOP: ['Vizicsacsi', 'Mihile'], JNG: ['Jankos', 'Xerxe'], MID: ['Larssen', 'Nuc'],
    BOT: ['Patrik', 'Exakick'], SUP: ['Labrov', 'Kasing'],
  }),
  ratonesTeam('LR_IJC', 'Ici Japon Corp', 'IJC', '#ef4444', 81, { // [UNCERTAIN] roster
    TOP: ['Shigeki', 'Katsuro'], JNG: ['Takeshi', 'Riku'], MID: ['Hiroto', 'Kenji'],
    BOT: ['Sora', 'Daichi'], SUP: ['Ren', 'Akira'],
  }),
  ratonesTeam('LR_BARCA', 'Barça eSports', 'BAR', '#a50044', 82, { // [UNCERTAIN] most names
    TOP: ['WhiteKnight', 'Oscar'], JNG: ['Maxlore', 'Isma'], MID: ['Twohoyrz', 'Diplex'],
    BOT: ['Flakked', 'Carlsen'], SUP: ['Efias', 'Hustlin'],
  }),
  ratonesTeam('LR_VERDANT', 'Verdant', 'VRD', '#16a34a', 79, { // [UNCERTAIN] roster
    TOP: ['Fern', 'Moss'], JNG: ['Thicket', 'Grove'], MID: ['Clover', 'Heath'],
    BOT: ['Brook', 'Reed'], SUP: ['Alder', 'Birch'],
  }),
  ratonesTeam('LR_KCB', 'Karmine Corp Blue', 'KCB', '#3b82f6', 87, { // [UNCERTAIN] most names
    TOP: ['Maynter', 'Cabochard'], JNG: ['Lyncas', 'Yike'], MID: ['Vladi', 'Saken'],
    BOT: ['Caliste', 'Jeandel'], SUP: ['Fleshy', 'Targamas'],
  }),
  ratonesTeam('LR_KOI', 'Movistar KOI', 'MKOI', '#7c3aed', 85, {
    TOP: ['Myrwn', 'Oscarinin'], JNG: ['Elyoya', 'Markoon'], MID: ['Jojopyun', 'Larssen'],
    BOT: ['Supa', 'Hans Sama'], SUP: ['Alvaro', 'Mikyx'],
  }),
  ratonesTeam('LR_VIT', 'Team Vitality', 'VIT', '#84cc16', 84, { // [UNCERTAIN] 2026 roster
    TOP: ['Photon', 'Naak Nako'], JNG: ['Lynz', 'Daglas'], MID: ['Czajek', 'Vetheo'],
    BOT: ['Carzzy', 'Upset'], SUP: ['Hylissang', 'Kaiser'],
  }),
  // --- Dream opponents (2025 landscape) ---
  ratonesTeam('LR_FNC', 'Fnatic', 'FNC', '#f97316', 85, {
    TOP: ['Oscarinin', 'Wunder'], JNG: ['Razork', 'Selfmade'], MID: ['Humanoid', 'Poby'],
    BOT: ['Upset', 'Rekkles'], SUP: ['Mikyx', 'Hylissang'],
  }),
  ratonesTeam('LR_G2', 'G2 Esports', 'G2', '#e11d2e', 88, {
    TOP: ['BrokenBlade', 'Odoamne'], JNG: ['SkewMond', 'Yike'], MID: ['Caps', 'Ulid'],
    BOT: ['Hans Sama', 'Flakked'], SUP: ['Labrov', 'Mikyx'],
  }),
  ratonesTeam('LR_HLE', 'Hanwha Life Esports', 'HLE', '#f59e0b', 89, {
    TOP: ['Zeus', 'Doran'], JNG: ['Peanut', 'Grizzly'], MID: ['Zeka', 'Karis'],
    BOT: ['Viper', 'Deokdam'], SUP: ['Delight', 'Kellin'],
  }),
  ratonesTeam('LR_GEN', 'Gen.G', 'GEN', '#aa8a2e', 91, {
    TOP: ['Kiin', 'Morgan'], JNG: ['Canyon', 'Sponge'], MID: ['Chovy', 'Karis'],
    BOT: ['Ruler', 'Peyz'], SUP: ['Duro', 'Lehends'],
  }),
  ratonesTeam('LR_T1', 'T1', 'T1', '#e2012d', 92, {
    TOP: ['Doran', 'Zeus'], JNG: ['Oner', 'Cuzz'], MID: ['Faker', 'Poby'],
    BOT: ['Gumayusi', 'Smash'], SUP: ['Keria', 'Rekkles'],
  }),
]

export const CAMPAIGNS = [
  {
    id: 'faker-first-lck-win',
    title: "Faker's First LCK Win",
    kind: 'series',
    description:
      'Take SKT T1 through the HOT6iX Champions Summer 2013 bracket. The playoff run that gave Faker his first Korean title. Walk the real path: sweep Jin Air, avenge Spring against MVP Ozone, then reverse-sweep KT Bullets in the final. History decides the lost games. You must win the rest.',
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
        blurb: '2013-08-23 · Dropped Game 1, then took three straight. Revenge for the Spring semifinal.',
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
      'Re-enact OGN Champions Summer 2013. Faker’s debut split. SK Telecom T1 K beat KT Rolster Bullets 3–2 in “the best final ever.” MVP Ozone took 3rd, CJ Frost 4th. Final order below is history, locked.',
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
      'Re-enact SBENU Champions Spring 2015. The first single-team LCK year. GE Tigers finished #1 in the regular season, but SKT (MaRin/Bengi/Faker–Easyhoon/Bang/Wolf) took the title. Final order below is history, locked.',
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
      'Re-enact LCK 2022. T1’s undefeated 18–0 spring (3–1 over Gen.G in the final), answered by Gen.G’s 3–0 summer revenge over T1. Table shows the locked Spring final order.',
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

  {
    id: 'los-ratones-reality',
    title: 'Los Ratones: Reality',
    kind: 'series',
    description:
      'Relive the actual Los Ratones journey. Caedrel\u2019s streamer team from its December 2024 debut through three NLC titles, two EMEA Masters crowns, the Karmine Corp Blue demolition, and the LEC Versus 2026 heartbreak. Same five players the whole way: Baus, Velja, Nemesis, Crownie, Rekkles.',
    playerTeamId: 'LR',
    playerLabel: 'Los Ratones',
    extraTeams: RATONES_TEAMS,
    nodes: [
      {
        id: 'lr-nno-cup',
        round: 'NNO Cup S2 Final',
        opponentId: 'LR_5PIGS',
        opponentLabel: '5 Pigs 1 Team',
        bestOf: 5,
        hardLossSlots: [],
        blurb: 'Dec 2024 · The competitive debut. Caedrel himself filled in at support, and the stream team went undefeated to lift the €10k cup.',
      },
      {
        id: 'lr-nlc-winter',
        round: 'NLC Winter Final',
        opponentId: 'LR_NORD',
        opponentLabel: 'NORD Esports',
        bestOf: 5,
        hardLossSlots: [],
        blurb: 'Mar 2025, Nottingham · Lost one game all tournament. 3–0 in the final. A Tier-2 viewership record.',
      },
      {
        id: 'lr-em-winter',
        round: 'EMEA Masters Winter Final',
        opponentId: 'LR_IJC',
        opponentLabel: 'Ici Japon Corp',
        bestOf: 5,
        hardLossSlots: [],
        blurb: 'Mar 2025 · First UK org to win EMEA Masters. Velja tournament MVP. Rekkles the first player to win it in two roles.',
      },
      {
        id: 'lr-nlc-spring',
        round: 'NLC Spring Final',
        opponentId: 'LR_NORD',
        opponentLabel: 'NORD Esports',
        bestOf: 5,
        hardLossSlots: [2],
        blurb: 'Jun 2025, Copenhagen · NORD finally beat them in the upper semifinal. The first series loss ever. The lower-bracket revenge final was 3–0.',
      },
      {
        id: 'lr-em-spring',
        round: 'EMEA Masters Spring Final',
        opponentId: 'LR_BARCA',
        opponentLabel: 'Barça eSports',
        bestOf: 5,
        hardLossSlots: [],
        blurb: 'Jun 2025 · Barça had beaten them 0–2 in groups. The final was 3–0. Nemesis finals MVP. Back-to-back EMEA Masters.',
      },
      {
        id: 'lr-nlc-summer',
        round: 'NLC Summer Final',
        opponentId: 'LR_VERDANT',
        opponentLabel: 'Verdant',
        bestOf: 5,
        hardLossSlots: [],
        blurb: 'Aug 2025, Stockholm · First org to win all three NLC splits in a year. The domestic three-peat.',
      },
      {
        id: 'lr-em-summer',
        round: 'EMEA Masters Summer Semifinal',
        opponentId: 'LR_KCB',
        opponentLabel: 'Karmine Corp Blue',
        bestOf: 5,
        hardLossSlots: [],
        blurb: 'Oct 2025 · The Blue Wall. In reality: 0–3, games of 27/27/25 minutes, six kills total. Rewrite history, or live it.',
      },
      {
        id: 'lr-lec-comeback',
        round: 'LEC Versus 2026',
        opponentId: 'LR_KOI',
        opponentLabel: 'Movistar KOI',
        bestOf: 5,
        hardLossSlots: [1],
        blurb: 'Jan 2026 · The Tier-1 welcome was brutal: 0–4. Then four straight wins, including over KOI and G2. The dream was alive.',
      },
      {
        id: 'lr-lec-final-day',
        round: 'LEC Versus Final Day',
        opponentId: 'LR_VIT',
        opponentLabel: 'Team Vitality',
        bestOf: 5,
        hardLossSlots: [],
        blurb: 'Feb 2026 · Win and you\u2019re in the playoffs. In reality they lost, and every other result went against them. One game for the fairytale.',
      },
    ],
  },
  {
    id: 'los-ratones-dream',
    title: 'Los Ratones: Dream',
    kind: 'series',
    description:
      '[FANTASY] What if the fairytale never ended? Los Ratones take a full LEC slot for 2025, dethrone G2 to become champions of Europe, then march through Worlds in Chengdu to face T1, and end the three-peat in game five.',
    playerTeamId: 'LR',
    playerLabel: 'Los Ratones',
    extraTeams: RATONES_TEAMS,
    nodes: [
      {
        id: 'lrd-lec-qf',
        round: 'LEC Summer Upper Round',
        opponentId: 'LR_FNC',
        opponentLabel: 'Fnatic',
        bestOf: 5,
        hardLossSlots: [3],
        blurb: '[FANTASY] The LEC playoff debut. Fnatic, the old kings of Europe, take a game, but the Ratones take the series 3–1.',
      },
      {
        id: 'lrd-lec-sf',
        round: 'LEC Summer Upper Final',
        opponentId: 'LR_KOI',
        opponentLabel: 'Movistar KOI',
        bestOf: 5,
        hardLossSlots: [2, 4],
        blurb: '[FANTASY] Spring champions Movistar KOI. Five games, every one a brawl. Los Ratones through 3–2.',
      },
      {
        id: 'lrd-lec-final',
        round: 'LEC Summer Grand Final',
        opponentId: 'LR_G2',
        opponentLabel: 'G2 Esports',
        bestOf: 5,
        hardLossSlots: [1, 4],
        blurb: '[FANTASY] G2 Esports. The kings of Europe. Down 0–1, level, behind again. Then the reverse sweep completes. LEC CHAMPIONS.',
      },
      {
        id: 'lrd-worlds-qf',
        round: 'Worlds Quarterfinal',
        opponentId: 'LR_HLE',
        opponentLabel: 'Hanwha Life Esports',
        bestOf: 5,
        hardLossSlots: [1, 3],
        blurb: '[FANTASY] Worlds 2025, Chengdu. Hanwha Life with Zeus and Viper. 3–2. The dream survives the LPL.',
      },
      {
        id: 'lrd-worlds-sf',
        round: 'Worlds Semifinal',
        opponentId: 'LR_GEN',
        opponentLabel: 'Gen.G',
        bestOf: 5,
        hardLossSlots: [2],
        blurb: '[FANTASY] Gen.G: Chovy, Canyon, Ruler. The best team in the world on paper. Los Ratones win 3–1. One series left.',
      },
      {
        id: 'lrd-worlds-final',
        round: 'Worlds Grand Final',
        opponentId: 'LR_T1',
        opponentLabel: 'T1',
        bestOf: 5,
        hardLossSlots: [1, 2],
        blurb: '[FANTASY] T1. Faker. The three-peat on the line. Down 0–2. Then the greatest reverse sweep ever told. FOR THE DREAM.',
      },
    ],
  },
]
