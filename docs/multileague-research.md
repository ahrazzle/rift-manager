# Multi-League Research — LPL / LEC / LCS + MSI / Worlds (lck-manager)

> **SCOPE CONTRACT (read first): ALL player ratings/tiers in the game are
> FICTIONAL and game-balanced. This document supplies only REAL team NAMES,
> real player NAMES, and RELATIVE strength tiers (who was strong/weak) so a
> builder can reskin `src/data/lck.js` per league. No real stats, no official
> ratings are implied anywhere below.**

**Author:** Hazen (research) — 2026-10-04.
**Status:** STABLE — research only, no code. `src/` untouched.
**Era anchor:** ~2022–2024 (consistent with the game's present-day dataset).
Confidence scale: **HIGH** = team list + placement verified against ≥2 sources.
**MED** = winners/placement verified, one source for details.
**LOW** = recall, must check before shipping. Uncertain items tagged **[UNCERTAIN]**.

## Sources & verification method

- Liquipedia season pages (`LPL/2024/Summer`, `LEC/2024/Summer`, `LCS/2024/Summer`),
  Leaguepedia (`LPL/2024_Season/...`, `LEC/2024_Season/...`, `LCS/2024_Season/...`),
  Wikipedia 2024 season pages, esports.gg summaries.
- MSI/Worlds 2024 formats + seed allocations cross-checked across Leaguepedia
  `2024_Season_World_Championship`, Liquipedia, and secondary summaries.
- Team lists below are **HIGH** confidence (multi-source agreement).
  Individual starters for non-title teams are recall — tagged **[UNCERTAIN]**
  where not directly verified.

## Stable team-ID scheme (builder: use these as keys)

Prefix IDs by league to avoid collisions with existing LCK ids
(e.g. `LPL:JDG`, `LEC:G2`, `LCS:TL`). Display the **real org name**
(e.g. "JD Gaming", "Fnatic", "Team Liquid") but key data by the stable ID,
mirroring the convention in `historical-year-research.md`.

- LPL ids: `LPL:BLG LPL:TES LPL:JDG LPL:LNG LPL:WBG LPL:FPX LPL:EDG LPL:RNG
  LPL:IG LPL:OMG LPL:WE LPL:TT LPL:NIP LPL:AL LPL:UP LPL:RA LPL:LGD`
- LEC ids: `LEC:G2 LEC:FNC LEC:MDK LEC:BDS LEC:SK LEC:VIT LEC:GX LEC:TH
  LEC:KC LEC:RGE`
- LCS ids: `LCS:FLY LCS:TL LCS:C9 LCS:100T LCS:NRG LCS:DIG LCS:SR LCS:IMT`

---

## 1. LPL (China) — 17 teams, 2024 season

2024 Spring: single round-robin (Bo3), 17 teams. Spring champion **Bilibili
Gaming** over Top Esports; MVP knight (BLG). Summer: group/nirvana-ascend
format, champion **Bilibili Gaming** 3–0 over Weibo Gaming; season MVP Tian
(TES). Summer Spring-season standings order (verified): BLG 15-1, TES 13-3,
JDG 13-3, FPX 11-5, NIP 10-6, LNG 9-7, WBG 8-8, OMG 8-8, WE 8-8, IG 8-8,
AL 7-9, LGD 6-10, TT 6-10, RNG 5-11, RA 4-12, EDG 3-13, UP 2-14.

| ID | Real name | Tier (2022–24 window) | Key players (starters/star) |
|---|---|---|---|
| LPL:BLG | Bilibili Gaming | S (back-to-back 2024 LPL titles, MSI 2024 + Worlds 2024 finalist) | Bin (top), Xun/Wei (jng) [UNCERTAIN split timing], knight (mid), Elk (bot), ON (sup) |
| LPL:TES | Top Esports | S (Spring + Summer finalist 2024, Worlds QF) | 369 (top) [UNCERTAIN], Tian (jng), Creme (mid) [UNCERTAIN], JackeyLove (bot), Meiko (sup) |
| LPL:JDG | JD Gaming | S (2022–23 dynasty: MSI 2023 + LPL Spring/Summer 2023; 2024 3rd) | Sheer (top) [UNCERTAIN], Kanavi (jng), Yagao (mid), Ruler (bot), Missing (sup) |
| LPL:LNG | LNG Esports | A+ (perennial playoffs, Worlds 2024 QF, 3-0 Swiss) | Zika (top), Weiwei (jng), Scout (mid), GALA (bot), Hang (sup) [UNCERTAIN — verify] |
| LPL:WBG | Weibo Gaming | A+ (Worlds 2023 finalist, 2024 Summer finalist, Worlds 2024 SF) | Breathe/Zdz (top) [UNCERTAIN], Tarzan (jng), Xiaohu (mid), Light (bot), Crisp (sup) |
| LPL:FPX | FunPlus Phoenix | A (2024 rebound to 4th Spring) | [UNCERTAIN — verify roster] |
| LPL:NIP | Ninjas in Pyjamas (ex-Victory Five slot) | A- (2024 playoffs) | Rookie (mid) [UNCERTAIN — verify] |
| LPL:EDG | EDward Gaming | A- legacy / B 2024 form (down year 3-13 Summer; 2021 world champions) | Ale/Solokill (top), Jiejie (jng), Cryin/Fisher (mid), Leave (bot) [UNCERTAIN] |
| LPL:RNG | Royal Never Give Up | B (2022 MSI champions; declined to 5-11 by 2024) | [UNCERTAIN — verify roster] |
| LPL:IG | Invictus Gaming | B (2018 world champions; mid-table 2024) | [UNCERTAIN — verify roster] |
| LPL:OMG | Oh My God | B (mid-table 2024, 8-8) | [UNCERTAIN] |
| LPL:WE | Team WE | B (mid-table 2024, 8-8; own home venue) | [UNCERTAIN] |
| LPL:AL | Anyone's Legend | B (7-9 Spring 2024; broke out 2025 — outside era) | Shanks (mid), Hope (bot) [UNCERTAIN] |
| LPL:TT | ThunderTalk Gaming (ex-Dominus) | C+ (6-10) | [UNCERTAIN] |
| LPL:LGD | LGD Gaming | C+ (6-10) | [UNCERTAIN] |
| LPL:RA | Rare Atom (ex-Vici Gaming) | C (4-12) | [UNCERTAIN] |
| LPL:UP | Ultra Prime Esports | C (2-14, bottom 2024) | [UNCERTAIN] |

Notes: 17 is a lot to ship. JDG/LNG home-venue holders with NIP/WE in 2024
(balance pools by these if modeling groups). MAX (MiaoJing) never an LPL
franchise team [UNCERTAIN — user-suggested name not verified; do not ship].

## 2. LEC (EMEA) — 10 teams, 2024 season

2024 format: three splits (Winter/Spring/Summer), each single round-robin Bo1
into playoffs; Season Finals decide Worlds seeds. Summer 2024 regular-season
order (verified): SK 8-1, BDS 8-1, G2 7-2, FNC 6-3, KC 4-5, TH 3-6, GX 3-6,
MDK 2-7, VIT 2-7, RGE 2-7. Full-season outcome: **G2 champions** (all three
splits + Season Finals presumptive), FNC runners-up, BDS/MDK in the mix.

| ID | Real name | Tier (2022–24 window) | Key players |
|---|---|---|---|
| LEC:G2 | G2 Esports | S (dominant: won all 2024 splits, MSI 2024 direct seed) | BrokenBlade (top), Yike (jng), Caps (mid), Hans Sama (bot), Mikyx (sup) |
| LEC:FNC | Fnatic | A+ (perennial #2: 2nd Spring 2024, MSI 2024 play-in→bracket) | Oscarinin (top), Razork (jng), Humanoid (mid), Noah (bot), Jun (sup) |
| LEC:BDS | Team BDS | A (3rd in Winter + Spring 2024, strong summer) | Adam (top), Sheo (jng), nuc (mid), Ice (bot), Labrov (sup) |
| LEC:MDK | MAD Lions KOI (MAD Lions + KOI merger) | A- (2nd Winter 2024, Worlds 2024 play-in→Swiss 0-3) | Myrwn (top) [UNCERTAIN], Elyoya (jng) [UNCERTAIN], Fresskowy (mid) [UNCERTAIN], Supa (bot) [UNCERTAIN], Alvaro (sup) [UNCERTAIN] |
| LEC:SK | SK Gaming | B+ (surprise 8-1 Summer regular season, playoff team) | Irrelevant (top), Isma (jng), Nisqy (mid), Rahel (bot) [UNCERTAIN — verify] |
| LEC:VIT | Team Vitality | B (mid-table; 0-3 summer groups) | Photon (top), Lyncas (jng), Vetheo (mid), Carzzy (bot), Hylissang (sup) [UNCERTAIN — verify] |
| LEC:TH | Team Heretics | B (mid-table 2024) | Wunder (top), Jankos (jng), Zwyroo (mid) [UNCERTAIN], Flakked (bot), Trymbi (sup) |
| LEC:KC | Karmine Corp (joined 2024, ex-Astralis slot) | B- (4-5 summer; hype org, mediocre year 1) | Canna (top), Closer (jng), Saken/Vladi (mid) [UNCERTAIN], Upset (bot), Targamas (sup) |
| LEC:GX | GIANTX (Giants + Excel merger, 2024) | B- (3-6 summer) | Odoamne (top) [UNCERTAIN], Juhan (jng), Jackies (mid), Patrik (bot), IgNar (sup) [UNCERTAIN — verify] |
| LEC:RGE | Rogue (RGE; KOI stint 2023 reverted) | C+ (2-7 summer, bottom) | Finn (top), Markoon (jng), Larssen (mid), Comp (bot) [UNCERTAIN — verify] |

Note: user-suggested "BFX" = SK Gaming's academy-era tag confusion — no BFX
in 2024 LEC [UNCERTAIN — do not ship; ship RGE as 10th].

## 3. LCS (NA) — 8 teams, 2024 season (final LCS year)

2024: last LCS season (became LTA 2025). 8 franchised teams both splits.
Spring: FLY topped regular season 10-4; **TL champions** 3–1 over FLY.
Summer: TL 7-0 (14-3 games) regular season; **FLY champions** 3–1 over TL
(first FLY title). Championship points → Worlds seeds: FLY #1, TL #2,
100T #3 (via lower-bracket run, 3rd place).

| ID | Real name | Tier (2022–24 window) | Key players (Summer 2024 verified) |
|---|---|---|---|
| LCS:FLY | FlyQuest | S (2024 #1 seed: Spring RU + Summer champions, Worlds 2024 QF 3-2 Swiss) | Bwipo (top), Inspired (jng), Jensen/Quad (mid — Jensen Spring, Quad Summer) [VERIFY split], Massu (bot), Busio (sup) |
| LCS:TL | Team Liquid | S (Spring champions, Summer RU, MSI 2024 direct seed, Worlds Swiss 2-3) | Impact (top), UmTi (jng), APA (mid), Yeon (bot), CoreJJ (sup) |
| LCS:C9 | Cloud9 | A+ (perennial top-3, 4th Summer 2024, missed Worlds) | Thanatos/Fudge (top — Fudge Spring) [VERIFY], Blaber (jng), Jojopyun (mid), Berserker (bot), Vulcan (sup) |
| LCS:100T | 100 Thieves | A (Summer lower-bracket run to 3rd, Worlds 2024 play-in 1-3) | Sniper (top), River (jng), Quid (mid), Tomo (bot), Eyla (sup) |
| LCS:DIG | Dignitas | B (5th-ish, playoff gatekeeper) | Licorice (top), Spica (jng), Jensen/Dove (mid — verify split) [UNCERTAIN], Zven/Tomo (bot) [UNCERTAIN], Isles (sup) |
| LCS:NRG | NRG Esports (2023 champions) | B- (6th Summer 2024; fell off after 2023 title) | Dhokla (top), Contractz (jng), Palafox (mid), FBI (bot), huhi (sup) |
| LCS:SR | Shopify Rebellion (ex-TSM slot, 2024 debut) | C+ (7th; All-Pro bot Bvoy bright spot) | FakeGod (top), Bugi (jng), Insanity (mid), Bvoy (bot), Zeyzal (sup) [UNCERTAIN — verify] |
| LCS:IMT | Immortals | C (bottom, 1-6 summer) | Castle (top), Armao (jng), Mask (mid), Tactical (bot), Olleh (sup) |

Notes: EG (Evil Geniuses) exited LCS after 2023 — do NOT ship for 2024.
TIP (Tempo Storm/old TIP) long defunct — do not ship. SR replaces TSM slot.

## 4. International qualification + tournament formats (2024 reference)

### 4a. MSI (Mid-Season Invitational) 2024 — 12 teams

- **Slots:** 1st seeds of LCK/LPL/LEC/LCS direct to Bracket stage (Gen.G, BLG,
  G2, TL). 2nd seeds of the four majors (T1, TES, FNC, FLY... note FLY sent
  spring RU [UNCERTAIN — verify 2nd LCS slot]) + champions of 4 minor regions
  (LLA, CBLOL, PCS, VCS: e.g. PSG Talon + others) into Play-In = 8 teams.
- **Play-In (May 1–5):** 8 teams, two double-elimination (GSL) groups of 4,
  all Bo3. Top 2 per group advance (2024: T1, TES, PSG Talon, FNC).
- **Bracket stage (May 7–19):** 8 teams (4 direct + 4 from play-in),
  double-elimination, all Bo5, regional-separation in early draws.
- **Result 2024:** Gen.G 3–1 BLG final; Gen.G banked direct Worlds seed for LCK.
- **Game model:** 8-team double-elim Bo5 bracket + 8-team play-in; reuse the
  existing playoff bracket code with a second-chance (lower) bracket.

### 4b. Worlds 2024 — 20 teams

- **Slots:** LCK 4 + LPL 4 (all direct to Swiss). LEC 3 (top 2 Swiss, 3rd
  play-in). LCS 3 (top 2 Swiss, 3rd play-in). PCS 2, VCS 2, CBLOL 1, LLA 1
  (all play-in). Total: 12 direct Swiss + 8 play-in.
- **2024 seeds (reference):** LCK: HLE(1) GEN(2) DK(3) T1(4). LPL: BLG(1)
  TES(2) LNG(3) WBG(4). LEC: G2(1) FNC(2) MDK(3). LCS: FLY(1) TL(2) 100T(3).
- **Stage 1 Play-In (Sep 25–29):** 8 teams, two double-elim brackets, Bo3;
  top 4 advance (2024: MDK, PSG, GAM, paiN).
- **Stage 2 Swiss (Oct 3–13):** 16 teams (12 + 4), 5-round Swiss; no rematches;
  advancement/elimination matches Bo3, others Bo1; 3 wins → through, 3 losses → out.
- **Stage 3 Knockout (Oct 17–Nov 2):** 8 teams, single-elim Bo5
  (2024 QF: BLG, TES, GEN, T1, HLE, LNG, WBG, FLY; final T1 3–2 BLG).
- **Game model:** Play-In (2×4-team double-elim Bo3) → Swiss-lite (recommend
  simplified: single group or 2 groups + cut to 8; full Swiss is complex —
  see feasibility) → 8-team single-elim Bo5.

### Cross-league tier mapping (2022–24, for seeding/initial ratings)

- **S+ world:** JDG-23, T1 (LCK), GEN-24, BLG-24 — title contenders.
- **S:** TES-24, LNG, G2 (best West), TL/FLY (best NA, ~world QF ceiling).
- **A:** WBG, DK/HLE (LCK), FNC, BDS, C9, 100T.
- **B and below:** rest of LEC/LCS/LPL mid-bottom as tabled.
- Rule of thumb for fictional ratings: LPL/LCK top (S) > LEC G2/FNC (A+/A)
  > LCS top (A-/B+) > LEC/LCS bottom = LPL bottom (B-/C). Keep gaps small
  (existing engine: tier = rating center; ±4 jitter) so upsets happen.

## 5. Feasibility note for the builder

- **Ship size (recommended):** LPL 10 (BLG TES JDG LNG WBG FPX NIP EDG RNG IG),
  LEC 10 (all), LCS 8 (all) = 28 teams + existing 10 LCK = 38 total.
  Full 17-team LPL is optional DLC; bottom-7 LPL adds little gameplay value.
- **Data shape:** one `src/data/<league>.js` per league reusing the
  `makePlayer`/tier-center pattern in `lck.js`; team objects keyed by the
  stable IDs above. Rosters: 5 starters + 1–2 subs each; non-top teams can
  ship 5-man with generated subs.
- **Season flow:** per-league regular season (reuse round-robin) →
  per-league playoffs (top 6–10) → MSI (Spring winners + runners-up, 8–12
  teams, double-elim bracket) → Summer repeat → Worlds (20 slots per §4b,
  simplify Swiss to group+cut) → offseason.
- **Bracket work:** engine `simulateSeries` is league-agnostic — reuse as-is.
  New code needed: (1) double-elim bracket container (MSI + play-ins),
  (2) Swiss-lite or group-cut stage for Worlds, (3) cross-league seed table
  (§4b). Estimated: moderate — no engine-stat changes, mostly scheduling/UI.
- **Refresh contract:** team lists verified HIGH for 2024; re-pull Leaguepedia
  `2024_Season` pages if extending to 2025+ (slots changed with LTA/merge eras).
  All `[UNCERTAIN]` roster spots must be verified before shipping player names.
