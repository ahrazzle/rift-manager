// ============================================================================
// LCK Manager — Season/year registry (historical-year selector architecture)
// ----------------------------------------------------------------------------
// 'present' reuses the live src/data/lck.js dataset (NO duplication).
// Historical years are DATA-ONLY drops built from
// docs/historical-year-research.md (API-verified team lists + starting fives;
// confidence HIGH unless tagged [UNCERTAIN]).
//
// SCOPE CONTRACT: ALL ratings are game-balanced FICTIONAL values produced by
// the deterministic builder below. Only team NAMES, player NAMES, and
// RELATIVE tiers are historical. No real stats implied anywhere.
//
// Adding a year = one entry in SEASONS + one id in SEASON_ORDER. No consumer
// imports a year by name — everything resolves via getSeason()/SEASON_ORDER.
// Each year's `teams`/`freeAgents` keeps the exact TEAMS/FREE_AGENTS shape
// (same player object fields, same ROLES).
//
// Tier mapping (relative tier -> numeric `tier` field, per the research doc's
// suggested anchors S+ ≈ 89–91, S ≈ 87–89, A ≈ 84–86, B ≈ 80–83,
// C ≈ 76–79; champion sits 2–4 above mid-table like the present dataset):
//   2013-summer: S SKT-K 89 / KT-B 88 · A MVO 86 / CJF+CJB 85 ·
//                B NJS 83 / NJW+MVB 82 / JAF+JAS 81 ·
//                B/C IM1 80 · C IM2 79 / XEB 78 / XES+MIG 77 / CTU 76
//   2015-spring: S+ SKT 90 · A+ GE+KT 87 · A- CJ 85 / JAG 84 ·
//                B SSB 82 / NJ 81 · C IM 78
//   2022: S+ T1 91 · S GEN 89 · A DK 86 / DRX 85 / KT+LSB 84 ·
//         B KDF 82 / BRO 81 / NS 80 · C HLE 77 (wooden spoon)
// ============================================================================
import { TEAMS, FREE_AGENTS, ROLES, makePlayer } from './lck.js'

// Multi-league registry (multi-league design §1.1). 'present' stays the LCK
// entry byte-identical; each new league is one more SEASONS entry built by
// the same expandTeams/expandFAs from RAW defs below (fictional ratings via
// makePlayer; only team/player NAMES + relative tiers follow
// docs/multileague-research.md). Team ids are globally unique across leagues
// (LPL:/LEC:/LCS: prefixes) so they never collide with LCK ids.
export const LEAGUES = ['LCK', 'LPL', 'LEC', 'LCS']

// Present-dataset season id per league (career stays in its starting league;
// tournament snapshots resolve foreign rosters through these).
export const PRESENT_BY_LEAGUE = {
  LCK: 'present',
  LPL: 'present-lpl',
  LEC: 'present-lec',
  LCS: 'present-lcs',
}

// Year ids selectable under each league in NewGame. LCK keeps present +
// historical years; other leagues expose only their present entry (v1 scope).
export function seasonsForLeague(league) {
  if (league === 'LCK') return SEASON_ORDER.filter((id) => id === 'present' || SEASONS[id].league === 'LCK' || SEASONS[id].league === 'OGN Champions')
  return [PRESENT_BY_LEAGUE[league]].filter(Boolean)
}

// Deterministic fictional-rating builder is imported from lck.js (single
// source) so present + historical players share the identical game-balanced
// distribution (tier-centered, hash jitter ±4, subs −6).

// Expand a TEAMS_RAW-shaped array into full team objects (same shape as TEAMS).
function expandTeams(raw) {
  return raw.map((t) => {
    const players = []
    for (const role of ROLES) {
      const names = t.roster[role] || ['Unknown', 'Unknown']
      names.forEach((nm, i) => {
        players.push(makePlayer(t.id, nm, role, t.tier, i === 0))
      })
    }
    return { id: t.id, name: t.name, short: t.short, color: t.color, tier: t.tier, players }
  })
}

function expandFAs(prefix, defs) {
  return defs.map((d, i) => {
    const p = makePlayer('FA', d.name, d.role, d.tier, true)
    return { ...p, id: `FA-${prefix}-${i}-${d.name}` }
  })
}

// ============================================================================
// 2013 Summer (OGN Champions) — 16 teams, sister-team era.
// Champion SK Telecom T1 K over KT Bullets (3–2); 3rd MVP Ozone; 4th CJ Frost.
// Top-side starters are API-verified (research doc §2013). Qualifier sides
// carry [UNCERTAIN] tags: plausible era names, fictional ratings as always.
// Subs are era-plausible names (SKT-K/KT-B subs drawn from their NLB-bound
// sister squads); names may repeat across teams, harmless in-game.
// ============================================================================
const TEAMS_2013_SUMMER_RAW = [
  {
    id: 'T1', name: 'SK Telecom T1 K', short: 'SKT', color: '#e2012d', tier: 89,
    roster: {
      TOP: ['Impact', 'MaRin'], JNG: ['Bengi', 'H0R0'], MID: ['Faker', 'Easyhoon'],
      BOT: ['Piglet', 'Bang'], SUP: ['PoohManDu', 'Wolf'],
    },
  },
  {
    id: 'KTB', name: 'KT Rolster Bullets', short: 'KTB', color: '#ff6b00', tier: 88,
    roster: {
      TOP: ['inSec', 'Ssumday'], // [UNCERTAIN] sub (sister-squad Arrows side)
      JNG: ['KaKAO', 'Hojin'], // [UNCERTAIN] sub
      MID: ['Ryu', 'Nagne'], // [UNCERTAIN] sub
      BOT: ['Score', 'Arrow'], // [UNCERTAIN] sub
      SUP: ['Mafa', 'Hachani'], // [UNCERTAIN] sub
    },
  },
  {
    id: 'MVO', name: 'MVP Ozone', short: 'MVO', color: '#00a651', tier: 86,
    roster: {
      TOP: ['Homme', 'Smeb'], JNG: ['DanDy', 'Spirit'],
      MID: ['Dade', 'Kuro'], BOT: ['imp', 'Space'], SUP: ['Mata', 'Heart'],
    },
  },
  {
    id: 'CJF', name: 'CJ Entus Frost', short: 'CJF', color: '#1e90ff', tier: 85,
    roster: {
      TOP: ['Shy', 'TrAce'], JNG: ['CloudTemplar', 'Helios'],
      MID: ['RapidStar', 'Sky'], BOT: ['Space', 'Hermes'], // [UNCERTAIN] starter+sub
      SUP: ['MadLife', 'Muse'],
    },
  },
  {
    id: 'CJB', name: 'CJ Entus Blaze', short: 'CJB', color: '#ff2a2a', tier: 85,
    roster: {
      // [UNCERTAIN] all but Flame/Ambition
      TOP: ['Flame', 'Untara'], JNG: ['Helios', 'Daydream'],
      MID: ['Ambition', 'CoCo'], BOT: ['Emperor', 'Cpt Jack'], SUP: ['Muse', 'MadLife'],
    },
  },
  {
    id: 'NJS', name: 'NaJin Black Sword', short: 'NJS', color: '#333399', tier: 83,
    roster: {
      // [UNCERTAIN] full five (mid-table sister side)
      TOP: ['Expession', 'Ssumday'], JNG: ['Watch', 'Chaser'],
      MID: ['Nagne', 'SSONG'], BOT: ['Arrow', 'Ohq'], SUP: ['Cain', 'GorillA'],
    },
  },
  {
    id: 'NJW', name: 'NaJin White Shield', short: 'NJW', color: '#8a8f98', tier: 82,
    roster: {
      // [UNCERTAIN] top/jng/mid; PraY/GorillA via Shield→KOO lineage
      TOP: ['Save', 'Expession'], JNG: ['NoFe', 'Watch'],
      MID: ['SSONG', 'Nagne'], BOT: ['PraY', 'Arrow'], SUP: ['GorillA', 'Cain'],
    },
  },
  {
    id: 'JAF', name: 'Jin Air Falcons', short: 'JAF', color: '#0ea5e9', tier: 81,
    roster: {
      // [UNCERTAIN] full five
      TOP: ['TrAce', 'SoaR'], JNG: ['Winged', 'Seiz'],
      MID: ['Kuzan', 'Grace'], BOT: ['Pilot', 'Fury'], SUP: ['Chei', 'Wraith'],
    },
  },
  {
    id: 'JAS', name: 'Jin Air Stealths', short: 'JAS', color: '#7dd3fc', tier: 81,
    roster: {
      // [UNCERTAIN] full five
      TOP: ['SoaR', 'TrAce'], JNG: ['UmTi', 'Winged'],
      MID: ['Grace', 'Kuzan'], BOT: ['Fury', 'Pilot'], SUP: ['Hachani', 'Chei'],
    },
  },
  {
    id: 'MVB', name: 'MVP Blue', short: 'MVB', color: '#10b981', tier: 82,
    roster: {
      // [UNCERTAIN] all but Deft (debut split)
      TOP: ['Looper', 'Flaw'], JNG: ['Spirit', 'Bless'],
      MID: ['Kuro', 'Tempt'], BOT: ['Deft', 'Ghost'], SUP: ['Heart', 'Key'],
    },
  },
  {
    id: 'IM1', name: 'Incredible Miracle 1', short: 'IM1', color: '#f59e0b', tier: 80,
    roster: {
      // [UNCERTAIN] full five
      TOP: ['Smeb', 'Duke'], JNG: ['Lee', 'Crush'],
      MID: ['CoCo', 'Edge'], BOT: ['Apple', 'LokeN'], SUP: ['Pure', 'Key'],
    },
  },
  {
    id: 'IM2', name: 'Incredible Miracle 2', short: 'IM2', color: '#fbbf24', tier: 79,
    roster: {
      // [UNCERTAIN] full five
      TOP: ['Duke', 'Smeb'], JNG: ['Swift', 'Lee'],
      MID: ['Edge', 'CoCo'], BOT: ['Ohq', 'Apple'], SUP: ['Wraith', 'Pure'],
    },
  },
  {
    id: 'XEB', name: 'Xenics Blast', short: 'XEB', color: '#ef4444', tier: 78,
    roster: {
      // [UNCERTAIN] full five
      TOP: ['Ssumday', 'Untara'], JNG: ['Bless', 'Swift'],
      MID: ['Mickey', 'Edge'], BOT: ['Nuclear', 'Ohq'], SUP: ['SnowFlower', 'Wraith'],
    },
  },
  {
    id: 'XES', name: 'Xenics Storm', short: 'XES', color: '#f97316', tier: 77,
    roster: {
      // [UNCERTAIN] full five
      TOP: ['Untara', 'Duke'], JNG: ['Chaser', 'Bless'],
      MID: ['Fly', 'Mickey'], BOT: ['Sangyoon', 'Nuclear'], SUP: ['Key', 'SnowFlower'],
    },
  },
  {
    id: 'MIG', name: 'MiG Blitz', short: 'MIG', color: '#8b5cf6', tier: 77,
    roster: {
      // [UNCERTAIN] full five
      TOP: ['CuVee', 'Crazy'], JNG: ['Haru', 'Bless'],
      MID: ['Sky', 'Tempt'], BOT: ['Kramer', 'Ghost'], SUP: ['TusiN', 'Totoro'],
    },
  },
  {
    id: 'CTU', name: 'Chunnam Techno University', short: 'CTU', color: '#22c55e', tier: 76,
    roster: {
      // [UNCERTAIN] full five (amateur qualifier side)
      TOP: ['Summit', 'Crazy'], JNG: ['OnFleek', 'Haru'],
      MID: ['Dove', 'Tempt'], BOT: ['Route', 'Ghost'], SUP: ['Joker', 'Totoro'],
    },
  },
]

// FA pool: NLB-bound non-qualifiers (no Samsung / KT Arrows / SKT S that split).
const FA_2013_SUMMER_DEFS = [
  { name: 'MaRin', role: 'TOP', tier: 82 }, { name: 'Acorn', role: 'TOP', tier: 81 },
  { name: 'Spirit', role: 'JNG', tier: 80 }, { name: 'PawN', role: 'MID', tier: 82 },
  { name: 'Easyhoon', role: 'MID', tier: 81 }, { name: 'Bang', role: 'BOT', tier: 83 },
  { name: 'Wolf', role: 'SUP', tier: 82 }, { name: 'Heart', role: 'SUP', tier: 80 },
]

// ============================================================================
// 2015 Spring (SBENU Champions) — 8 teams, first single-team LCK year.
// Champion SKT (MaRin/Bengi/Faker/Bang/Wolf) over GE Tigers; reg-season #1 GE.
// GE Tigers = KOO lineage (Smeb/Hojin/Kuro/PraY/GorillA core). Subs lean on
// doc-verified rotation names (Tom, Easyhoon, Fixer) + SBENU-summer names.
// ============================================================================
const TEAMS_2015_SPRING_RAW = [
  {
    id: 'SKT', name: 'SK Telecom T1', short: 'SKT', color: '#e2012d', tier: 90,
    roster: {
      TOP: ['MaRin', 'Untara'], JNG: ['Bengi', 'Tom'],
      MID: ['Faker', 'Easyhoon'], BOT: ['Bang', 'Soul'], SUP: ['Wolf', 'Secret'],
    },
  },
  {
    id: 'GE', name: 'GE Tigers', short: 'GE', color: '#e63900', tier: 87,
    roster: {
      TOP: ['Smeb', 'Expession'], JNG: ['Hojin', 'Crush'],
      MID: ['Kuro', 'Mickey'], BOT: ['PraY', 'Ohq'], SUP: ['GorillA', 'Pure'],
    },
  },
  {
    id: 'KT', name: 'KT Rolster', short: 'KT', color: '#ff0000', tier: 87,
    roster: {
      TOP: ['Ssumday', 'Flame'], JNG: ['Score', 'Spirit'],
      MID: ['Nagne', 'Fly'], BOT: ['Arrow', 'Fixer'], SUP: ['Hachani', 'Piccaboo'],
    },
  },
  {
    id: 'CJ', name: 'CJ Entus', short: 'CJ', color: '#0066b3', tier: 85,
    roster: {
      TOP: ['Shy', 'TrAce'], JNG: ['Ambition', 'Helios'],
      MID: ['Coco', 'Sky'], BOT: ['Space', 'Emperor'], SUP: ['MadLife', 'Muse'],
    },
  },
  {
    id: 'JAG', name: 'Jin Air Green Wings', short: 'JAG', color: '#0ea5e9', tier: 84,
    roster: {
      // [UNCERTAIN] full five (mid-table 2015 rebuild side)
      TOP: ['TrAce', 'SoaR'], JNG: ['Winged', 'Seiz'],
      MID: ['GBM', 'Kuzan'], BOT: ['Teddy', 'Pilot'], SUP: ['Chei', 'Wraith'],
    },
  },
  {
    id: 'SSB', name: 'Samsung Galaxy', short: 'SSB', color: '#0d2b8f', tier: 82,
    roster: {
      TOP: ['CuVee', 'Ssumday'], JNG: ['Eve', 'Spirit'],
      MID: ['Ace', 'Crown'], BOT: ['Fury', 'Stitch'], SUP: ['Wraith', 'Luna'],
    },
  },
  {
    id: 'NJ', name: 'NaJin e-mFire', short: 'NJ', color: '#6b7280', tier: 81,
    roster: {
      // [UNCERTAIN] full five
      TOP: ['Duke', 'Save'], JNG: ['Watch', 'NoFe'],
      MID: ['Ggoong', 'SSONG'], BOT: ['Ohq', 'Cpt Jack'], SUP: ['Pure', 'Cain'],
    },
  },
  {
    id: 'IM', name: 'Incredible Miracle', short: 'IM', color: '#f59e0b', tier: 78,
    roster: {
      // [UNCERTAIN] full five
      TOP: ['Expession', 'Ikssu'], JNG: ['Chaser', 'Swift'],
      MID: ['CoCo', 'Edge'], BOT: ['LokeN', 'Apple'], SUP: ['Key', 'SnowFlower'],
    },
  },
]

// FA pool: summer-promoted sides' names (Rebels Anarchy + SBENU Sonicboom).
const FA_2015_SPRING_DEFS = [
  { name: 'ikssu', role: 'TOP', tier: 78 }, { name: 'Soul', role: 'TOP', tier: 77 },
  { name: 'lira', role: 'JNG', tier: 79 }, { name: 'Catch', role: 'JNG', tier: 77 },
  { name: 'Mickey', role: 'MID', tier: 80 }, { name: 'SaSin', role: 'MID', tier: 77 },
  { name: 'Sangyoon', role: 'BOT', tier: 79 }, { name: 'Nuclear', role: 'BOT', tier: 78 },
  { name: 'SnowFlower', role: 'SUP', tier: 79 }, { name: 'Secret', role: 'SUP', tier: 77 },
]

// ============================================================================
// 2022 (LCK) — 10 franchised orgs. Spring: T1 undefeated 18–0 over Gen.G;
// Summer: Gen.G 3–0 over T1. DK top: Hoya started spring, Nuguri summer
// (Nuguri listed first, Hoya sub). BRO is the verified 10th org (not FOX;
// FearX enters 2024). HLE/BRO lower-table fives partly [UNCERTAIN].
// ============================================================================
const TEAMS_2022_RAW = [
  {
    id: 'T1', name: 'T1', short: 'T1', color: '#e2012d', tier: 91,
    roster: {
      TOP: ['Zeus', 'Canna'], JNG: ['Oner', 'Cuzz'], MID: ['Faker', 'Clozer'],
      BOT: ['Gumayusi', 'Teddy'], SUP: ['Keria', 'Effort'],
    },
  },
  {
    id: 'GEN', name: 'Gen.G', short: 'GEN', color: '#aa8a00', tier: 89,
    roster: {
      TOP: ['Doran', 'Burdol'], JNG: ['Peanut', 'YoungJae'],
      MID: ['Chovy', 'Karis'], BOT: ['Ruler', 'Peyz'], SUP: ['Lehends', 'Delight'],
    },
  },
  {
    id: 'DK', name: 'DWG KIA', short: 'DK', color: '#002fa7', tier: 86,
    roster: {
      TOP: ['Nuguri', 'Hoya'], // Hoya started spring, Nuguri summer
      JNG: ['Canyon', 'Sylvie'], MID: ['ShowMaker', 'FATE'],
      BOT: ['deokdam', 'Ghost'], SUP: ['Kellin', 'BeryL'],
    },
  },
  {
    id: 'DRX', name: 'DRX', short: 'DRX', color: '#1f4fff', tier: 85,
    roster: {
      TOP: ['Kingen', 'Dudu'], JNG: ['Pyosik', 'Juhan'],
      MID: ['Zeka', 'kyeahoo'], BOT: ['Deft', 'Taeyoon'], SUP: ['Beryl', 'Jun'],
    },
  },
  {
    id: 'KT', name: 'KT Rolster', short: 'KT', color: '#ff0000', tier: 84,
    roster: {
      TOP: ['Rascal', 'Kiin'], JNG: ['Cuzz', 'Ellim'],
      MID: ['Aria', 'Ucal'], BOT: ['Aiming', 'Noah'], SUP: ['Life', 'Harp'],
    },
  },
  {
    id: 'LSB', name: 'Liiv SANDBOX', short: 'LSB', color: '#eab308', tier: 84,
    roster: {
      TOP: ['Dove', 'Summit'], JNG: ['Croco', 'OnFleek'],
      MID: ['Clozer', 'FATE'], BOT: ['Prince', 'Envyy'], SUP: ['Kael', 'Effort'],
    },
  },
  {
    id: 'KDF', name: 'Kwangdong Freecs', short: 'KDF', color: '#00b3a4', tier: 82,
    roster: {
      TOP: ['Kiin', 'Dudu'], JNG: ['Ellim', 'Cuzz'],
      MID: ['FATE', 'BuLLDoG'], BOT: ['Teddy', 'Leaper'], SUP: ['Hoit', 'Andil'],
    },
  },
  {
    id: 'BRO', name: 'Fredit BRION', short: 'BRO', color: '#7a00ff', tier: 81,
    roster: {
      // [UNCERTAIN] full five (bottom-table side, thin sourcing)
      TOP: ['Lonely', 'Morgan'], JNG: ['UmTi', 'Chieftain'],
      MID: ['Yaharong', 'Lava'], BOT: ['Hena', 'SamD'], SUP: ['Delight', 'Vsta'],
    },
  },
  {
    id: 'NS', name: 'Nongshim RedForce', short: 'NS', color: '#d6001c', tier: 80,
    roster: {
      TOP: ['Canna', 'DnDn'], JNG: ['Dread', 'Sylvie'],
      MID: ['Bdd', 'FIESTA'], BOT: ['Ghost', 'Jiwoo'], SUP: ['Effort', 'Peter'],
    },
  },
  {
    id: 'HLE', name: 'Hanwha Life Esports', short: 'HLE', color: '#ff7a00', tier: 77,
    roster: {
      // [UNCERTAIN] full five (wooden-spoon side, thin sourcing)
      TOP: ['Morgan', 'DuDu'], JNG: ['OnFleek', 'Willer'],
      MID: ['Mireu', 'Karis'], BOT: ['SamD', 'Cheoni'], SUP: ['Vsta', 'Bible'],
    },
  },
]

const FA_2022_DEFS = [
  { name: 'Canna', role: 'TOP', tier: 83 }, { name: 'Rascal', role: 'TOP', tier: 82 },
  { name: 'Croco', role: 'JNG', tier: 81 }, { name: 'Sylvie', role: 'JNG', tier: 80 },
  { name: 'Clozer', role: 'MID', tier: 81 }, { name: 'Aria', role: 'MID', tier: 80 },
  { name: 'Teddy', role: 'BOT', tier: 83 }, { name: 'SamD', role: 'BOT', tier: 79 },
  { name: 'Life', role: 'SUP', tier: 81 }, { name: 'Vsta', role: 'SUP', tier: 78 },
]

// ============================================================================
// present-lpl (LPL) — 10 teams, 2024 era per docs/multileague-research.md §1.
// Champion lineage: BLG back-to-back 2024 titles. Tiers: S BLG/TES/JDG,
// A+ LNG/WBG, A FPX, A- NIP, B EDG/RNG/IG (down-year legacy orgs).
// Non-title-team starters below the first name per role are [UNCERTAIN]
// era-plausible fills; ALL ratings fictional via makePlayer as always.
// ============================================================================
const TEAMS_LPL_RAW = [
  {
    id: 'LPL:BLG', name: 'Bilibili Gaming', short: 'BLG', color: '#e36', tier: 89,
    roster: {
      TOP: ['Bin', 'Breathe'], JNG: ['Xun', 'Wei'],
      MID: ['knight', 'Yagao'], BOT: ['Elk', 'Light'], SUP: ['ON', 'Crisp'],
    },
  },
  {
    id: 'LPL:TES', name: 'Top Esports', short: 'TES', color: '#e00', tier: 87,
    roster: {
      TOP: ['369', 'Qingtian'], JNG: ['Tian', 'Xiaopeng'],
      MID: ['Creme', 'Rookie'], BOT: ['JackeyLove', 'Deft'], SUP: ['Meiko', 'Hang'],
    },
  },
  {
    id: 'LPL:JDG', name: 'JD Gaming', short: 'JDG', color: '#c41230', tier: 87,
    roster: {
      TOP: ['Sheer', 'Flandre'], JNG: ['Kanavi', 'Xun'],
      MID: ['Yagao', 'Scout'], BOT: ['Ruler', 'GALA'], SUP: ['Missing', 'Ming'],
    },
  },
  {
    id: 'LPL:LNG', name: 'LNG Esports', short: 'LNG', color: '#0a84ff', tier: 86,
    roster: {
      TOP: ['Zika', 'Ale'], JNG: ['Weiwei', 'Tarzan'], // [UNCERTAIN] sub
      MID: ['Scout', 'Xiaohu'], BOT: ['GALA', 'Hope'], SUP: ['Hang', 'ON'], // [UNCERTAIN] sub
    },
  },
  {
    id: 'LPL:WBG', name: 'Weibo Gaming', short: 'WBG', color: '#7b2ff7', tier: 85,
    roster: {
      TOP: ['Breathe', 'Zdz'], // [UNCERTAIN] order
      JNG: ['Tarzan', 'Karsa'], MID: ['Xiaohu', 'Shanks'],
      BOT: ['Light', 'Elk'], SUP: ['Crisp', 'Meiko'],
    },
  },
  {
    id: 'LPL:FPX', name: 'FunPlus Phoenix', short: 'FPX', color: '#ff5a00', tier: 83,
    roster: {
      // [UNCERTAIN] full five (2024 rebound side, thin sourcing)
      TOP: ['Care', 'Xiaolaohu'], JNG: ['H4cker', 'Beichuan'],
      MID: ['Gori', 'Cryin'], BOT: ['Lwx', 'Assum'], SUP: ['Life', 'Shanji'],
    },
  },
  {
    id: 'LPL:NIP', name: 'Ninjas in Pyjamas', short: 'NIP', color: '#8a8f98', tier: 82,
    roster: {
      // [UNCERTAIN] all but Rookie (mid)
      TOP: ['Shanji', 'Invincible'], JNG: ['Aki', 'Xiaopeng'],
      MID: ['Rookie', 'Creme'], BOT: ['Photic', 'Samd'], SUP: ['Zhuo', 'Nikap'],
    },
  },
  {
    id: 'LPL:EDG', name: 'EDward Gaming', short: 'EDG', color: '#1a1a1a', tier: 80,
    roster: {
      // [UNCERTAIN] full five (down year 2024)
      TOP: ['Ale', 'Solokill'], JNG: ['Jiejie', 'Monki'],
      MID: ['Fisher', 'Cryin'], BOT: ['Leave', 'Ahn'], SUP: ['Vampire', 'Ming'],
    },
  },
  {
    id: 'LPL:RNG', name: 'Royal Never Give Up', short: 'RNG', color: '#c9a227', tier: 79,
    roster: {
      // [UNCERTAIN] full five (declined by 2024)
      TOP: ['Breathe', 'Tangyuan'], JNG: ['Wei', 'XLB'],
      MID: ['Tangyuan', 'Cryin'], BOT: ['Lwx', 'Doggo'], SUP: ['Ming', 'LvMao'],
    },
  },
  {
    id: 'LPL:IG', name: 'Invictus Gaming', short: 'IG', color: '#a41e22', tier: 79,
    roster: {
      // [UNCERTAIN] full five (mid-table 2024)
      TOP: ['YSKM', 'Wen'], JNG: ['Xun', 'Tianzhen'],
      MID: ['Cryin', 'Yuekai'], BOT: ['Ahn', 'Lucas'], SUP: ['Wink', 'XinLiu'],
    },
  },
]

const FA_LPL_DEFS = [
  { name: 'TheShy', role: 'TOP', tier: 82 }, { name: 'Flandre', role: 'TOP', tier: 81 },
  { name: 'Ning', role: 'JNG', tier: 80 }, { name: 'Karsa', role: 'JNG', tier: 81 },
  { name: 'Doinb', role: 'MID', tier: 81 }, { name: 'Xiaohu', role: 'MID', tier: 80 },
  { name: 'Uzi', role: 'BOT', tier: 82 }, { name: 'Ming', role: 'SUP', tier: 80 },
]

// ============================================================================
// present-lec (LEC) — 10 teams, 2024 era per docs/multileague-research.md §2.
// G2 won all three 2024 splits; FNC perennial #2. Tiers: S G2, A+ FNC,
// A BDS, A- MDK, B+ SK, B VIT/TH, B- KC/GX, C+ RGE.
// [UNCERTAIN] tags mirror the research doc's verify-before-ship roster spots.
// ============================================================================
const TEAMS_LEC_RAW = [
  {
    id: 'LEC:G2', name: 'G2 Esports', short: 'G2', color: '#e11d48', tier: 86,
    roster: {
      TOP: ['BrokenBlade', 'Babu'], JNG: ['Yike', 'Skeanz'],
      MID: ['Caps', 'Ulid'], BOT: ['Hans Sama', 'Flakked'], SUP: ['Mikyx', 'Labrov'],
    },
  },
  {
    id: 'LEC:FNC', name: 'Fnatic', short: 'FNC', color: '#ff7a00', tier: 85,
    roster: {
      TOP: ['Oscarinin', 'Wunder'], JNG: ['Razork', 'Markoon'],
      MID: ['Humanoid', 'Nisqy'], BOT: ['Noah', 'Upset'], SUP: ['Jun', 'Trymbi'],
    },
  },
  {
    id: 'LEC:BDS', name: 'Team BDS', short: 'BDS', color: '#0ea5e9', tier: 84,
    roster: {
      TOP: ['Adam', 'Agresivoo'], JNG: ['Sheo', 'Elyoya'],
      MID: ['nuc', 'Fresskowy'], BOT: ['Ice', 'Crownie'], SUP: ['Labrov', 'Alvaro'],
    },
  },
  {
    id: 'LEC:MDK', name: 'MAD Lions KOI', short: 'MDK', color: '#f59e0b', tier: 82,
    roster: {
      // [UNCERTAIN] full five (merger year)
      TOP: ['Myrwn', 'Irrelevant'], JNG: ['Elyoya', 'Isma'],
      MID: ['Fresskowy', 'Larssen'], BOT: ['Supa', 'Comp'], SUP: ['Alvaro', 'Jun'],
    },
  },
  {
    id: 'LEC:SK', name: 'SK Gaming', short: 'SK', color: '#7c3aed', tier: 81,
    roster: {
      TOP: ['Irrelevant', 'JNX'], JNG: ['Isma', 'Boukada'], // [UNCERTAIN] sub
      MID: ['Nisqy', 'Sertuss'], BOT: ['Rahel', 'Exakick'], // [UNCERTAIN] bot
      SUP: ['Loopy', 'Doss'], // [UNCERTAIN] full pair
    },
  },
  {
    id: 'LEC:VIT', name: 'Team Vitality', short: 'VIT', color: '#facc15', tier: 80,
    roster: {
      // [UNCERTAIN] full five (mid-table 2024)
      TOP: ['Photon', 'Cabo'], JNG: ['Lyncas', 'Daglas'],
      MID: ['Vetheo', 'Jackies'], BOT: ['Carzzy', 'Tomo'], SUP: ['Hylissang', 'Kaiser'],
    },
  },
  {
    id: 'LEC:TH', name: 'Team Heretics', short: 'TH', color: '#14b8a6', tier: 80,
    roster: {
      TOP: ['Wunder', 'Evi'], JNG: ['Jankos', 'Marlon'],
      MID: ['Zwyroo', 'Saken'], // [UNCERTAIN] mid
      BOT: ['Flakked', 'Patrik'], SUP: ['Trymbi', 'IgNar'],
    },
  },
  {
    id: 'LEC:KC', name: 'Karmine Corp', short: 'KC', color: '#22d3ee', tier: 79,
    roster: {
      // [UNCERTAIN] mid (Saken/Vladi split timing)
      TOP: ['Canna', 'Cabochard'], JNG: ['Closer', 'Yike'],
      MID: ['Vladi', 'Saken'], BOT: ['Upset', 'Noah'], SUP: ['Targamas', 'Hylissang'],
    },
  },
  {
    id: 'LEC:GX', name: 'GIANTX', short: 'GX', color: '#ef4444', tier: 78,
    roster: {
      // [UNCERTAIN] top/sup (verify)
      TOP: ['Odoamne', 'Th3Antonio'], JNG: ['Juhan', 'Peach'],
      MID: ['Jackies', 'Vetheo'], BOT: ['Patrik', 'Flakked'], SUP: ['IgNar', 'Advienne'],
    },
  },
  {
    id: 'LEC:RGE', name: 'Rogue', short: 'RGE', color: '#3b82f6', tier: 77,
    roster: {
      // [UNCERTAIN] bot/sup (verify)
      TOP: ['Finn', 'Szygenda'], JNG: ['Markoon', 'Malrang'],
      MID: ['Larssen', 'Nisqy'], BOT: ['Comp', 'Jezu'], SUP: ['Wood', 'Trymbi'],
    },
  },
]

const FA_LEC_DEFS = [
  { name: 'Wunder', role: 'TOP', tier: 80 }, { name: 'Odoamne', role: 'TOP', tier: 79 },
  { name: 'Jankos', role: 'JNG', tier: 80 }, { name: 'Malrang', role: 'JNG', tier: 78 },
  { name: 'Nisqy', role: 'MID', tier: 79 }, { name: 'Larssen', role: 'MID', tier: 80 },
  { name: 'Upset', role: 'BOT', tier: 81 }, { name: 'Hylissang', role: 'SUP', tier: 79 },
]

// ============================================================================
// present-lcs (LCS) — 8 teams, 2024 era (final LCS year) per
// docs/multileague-research.md §3. FLY Summer champions, TL Spring champions.
// Tiers: S FLY/TL, A+ C9, A 100T, B DIG, B- NRG, C+ SR, C IMT.
// 8 teams (even count) keeps the proven roundRobin path; EG/TIP excluded per
// research (exited/defunct — do not ship).
// ============================================================================
const TEAMS_LCS_RAW = [
  {
    id: 'LCS:FLY', name: 'FlyQuest', short: 'FLY', color: '#16a34a', tier: 84,
    roster: {
      TOP: ['Bwipo', 'Gamsu'], JNG: ['Inspired', 'Spica'],
      MID: ['Quad', 'Jensen'], BOT: ['Massu', 'Tomo'], SUP: ['Busio', 'Isles'],
    },
  },
  {
    id: 'LCS:TL', name: 'Team Liquid', short: 'TL', color: '#1d4ed8', tier: 84,
    roster: {
      TOP: ['Impact', 'Ssumday'], JNG: ['UmTi', 'Pyosik'],
      MID: ['APA', 'Palafox'], BOT: ['Yeon', 'Berserker'], SUP: ['CoreJJ', 'Vulcan'],
    },
  },
  {
    id: 'LCS:C9', name: 'Cloud9', short: 'C9', color: '#0ea5e9', tier: 83,
    roster: {
      TOP: ['Thanatos', 'Fudge'], // [VERIFY] split timing
      JNG: ['Blaber', 'Contractz'], MID: ['Jojopyun', 'Insanity'],
      BOT: ['Berserker', 'Yeon'], SUP: ['Vulcan', 'CoreJJ'],
    },
  },
  {
    id: 'LCS:100T', name: '100 Thieves', short: '100T', color: '#dc2626', tier: 81,
    roster: {
      TOP: ['Sniper', 'Dhokla'], JNG: ['River', 'Closer'],
      MID: ['Quid', 'Mask'], BOT: ['Tomo', 'Bvoy'], SUP: ['Eyla', 'Zeyzal'],
    },
  },
  {
    id: 'LCS:DIG', name: 'Dignitas', short: 'DIG', color: '#facc15', tier: 79,
    roster: {
      // [UNCERTAIN] mid/bot split timing
      TOP: ['Licorice', 'Rich'], JNG: ['Spica', 'Armao'],
      MID: ['Dove', 'Jensen'], BOT: ['Zven', 'Tactical'], SUP: ['Isles', 'Olleh'],
    },
  },
  {
    id: 'LCS:NRG', name: 'NRG Esports', short: 'NRG', color: '#6b7280', tier: 78,
    roster: {
      TOP: ['Dhokla', 'Castle'], JNG: ['Contractz', 'Bugi'],
      MID: ['Palafox', 'APA'], BOT: ['FBI', 'Bvoy'], SUP: ['huhi', 'Zeyzal'],
    },
  },
  {
    id: 'LCS:SR', name: 'Shopify Rebellion', short: 'SR', color: '#10b981', tier: 77,
    roster: {
      // [UNCERTAIN] full five (2024 debut side)
      TOP: ['FakeGod', 'Licorice'], JNG: ['Bugi', 'Armao'],
      MID: ['Insanity', 'Dove'], BOT: ['Bvoy', 'Tactical'], SUP: ['Zeyzal', 'Olleh'],
    },
  },
  {
    id: 'LCS:IMT', name: 'Immortals', short: 'IMT', color: '#083344', tier: 76,
    roster: {
      TOP: ['Castle', 'FakeGod'], JNG: ['Armao', 'Bugi'],
      MID: ['Mask', 'Insanity'], BOT: ['Tactical', 'Bvoy'], SUP: ['Olleh', 'Zeyzal'],
    },
  },
]

const FA_LCS_DEFS = [
  { name: 'Ssumday', role: 'TOP', tier: 78 }, { name: 'Fudge', role: 'TOP', tier: 79 },
  { name: 'Pyosik', role: 'JNG', tier: 79 }, { name: 'Spica', role: 'JNG', tier: 78 },
  { name: 'Jensen', role: 'MID', tier: 80 }, { name: 'Palafox', role: 'MID', tier: 78 },
  { name: 'Doublelift', role: 'BOT', tier: 79 }, { name: 'Olleh', role: 'SUP', tier: 77 },
]

// ============================================================================
// Registry
// ============================================================================
export const SEASONS = {
  present: {
    id: 'present',
    label: '2026 (Present)',
    sublabel: 'current LCK',
    league: 'LCK',
    teams: TEAMS,
    freeAgents: FREE_AGENTS,
  },
  '2022': {
    id: '2022',
    label: '2022 (LCK)',
    sublabel: 'T1 undefeated spring · GEN summer',
    league: 'LCK',
    teams: expandTeams(TEAMS_2022_RAW),
    freeAgents: expandFAs('2022', FA_2022_DEFS),
  },
  '2015-spring': {
    id: '2015-spring',
    label: '2015 Spring (LCK)',
    sublabel: 'first single-team year · SKT',
    league: 'LCK',
    teams: expandTeams(TEAMS_2015_SPRING_RAW),
    freeAgents: expandFAs('2015s', FA_2015_SPRING_DEFS),
  },
  '2013-summer': {
    id: '2013-summer',
    label: '2013 Summer (OGN Champions)',
    sublabel: 'Faker debut · SKT T1 K',
    league: 'OGN Champions',
    teams: expandTeams(TEAMS_2013_SUMMER_RAW),
    freeAgents: expandFAs('2013s', FA_2013_SUMMER_DEFS),
  },
  'present-lpl': {
    id: 'present-lpl',
    label: '2026 (LPL Present)',
    sublabel: 'BLG back-to-back · 10 teams',
    league: 'LPL',
    teams: expandTeams(TEAMS_LPL_RAW),
    freeAgents: expandFAs('lpl', FA_LPL_DEFS),
  },
  'present-lec': {
    id: 'present-lec',
    label: '2026 (LEC Present)',
    sublabel: 'G2 dominant · 10 teams',
    league: 'LEC',
    teams: expandTeams(TEAMS_LEC_RAW),
    freeAgents: expandFAs('lec', FA_LEC_DEFS),
  },
  'present-lcs': {
    id: 'present-lcs',
    label: '2026 (LCS Present)',
    sublabel: 'FLY/TL top · 8 teams',
    league: 'LCS',
    teams: expandTeams(TEAMS_LCS_RAW),
    freeAgents: expandFAs('lcs', FA_LCS_DEFS),
  },
}

export const SEASON_ORDER = ['present', '2022', '2015-spring', '2013-summer', 'present-lpl', 'present-lec', 'present-lcs']

// Resolve a year id to its dataset; unknown/missing years fall back to present.
export function getSeason(year) {
  return SEASONS[year] ?? SEASONS.present
}
