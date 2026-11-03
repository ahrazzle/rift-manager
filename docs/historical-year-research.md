# Historical-Year Research — LCK Season Selector (lck-manager)

> **SCOPE CONTRACT (read first): ALL player ratings/tiers in the game are
> FICTIONAL and game-balanced. This document supplies only REAL team NAMES,
> real player NAMES, and RELATIVE strength tiers (who was strong/weak) so a
> builder can reskin `src/data/lck.js` per season. No real stats, no official
> ratings are implied anywhere below.**

**Authors:** sa-0 (dossiers, ID scheme) + Hazen verification pass (2026-10-04).
**Status:** STABLE — research only, no code.

## Sources & verification method

- Base: Leaguepedia season pages (`LCK/<YEAR>_Season/...`, `Champions/...`),
  Liquipedia placements, ESTNN champions list.
- Verification pass: every 2013-Summer → 2024-Summer split re-pulled via the
  Leaguepedia MediaWiki API
  (`api.php?action=parse&page=<Season_Page>&prop=wikitext&format=json`) and the
  `{{TeamRoster}}` blocks (player + role), `|finalorder=` standings orders,
  playoff seeds, and `TournamentResults` placements parsed directly.
  **Team lists + starting fives below are API-verified unless tagged
  [UNCERTAIN].** Stable refresh contract for the builder: re-hit that endpoint;
  page names follow the table in "Verification checklist".
- Data-confidence scale: **HIGH** = winners + rosters + team list verified
  against ≥2 sources (or direct API parse). **MED** = winners verified, one
  source for details. **LOW** = recall, must check before shipping.
  Every uncertain item is tagged **[UNCERTAIN]**.

## Stable team-ID scheme (builder: use these as keys)

Reuse modern `lck.js` ids wherever lineage is continuous; invent stable ids
for defunct orgs. Display the **year-accurate real name** (e.g. "SK Telecom
T1 K", "KOO Tigers", "DAMWON Gaming") but key data by the stable ID, so
cross-year features (franchise history, player HOF) join cleanly.

| ID (use as key) | Real names over time | Lineage → modern slot |
|---|---|---|
| T1 | SK Telecom T1 1 / SKT T1 S, SKT T1 2 / SKT T1 K (2013–14 sister teams) → SKT T1 → T1 | → T1 |
| KT | KT Rolster Bullets / KT Rolster Arrows (sister teams) → KT Rolster | → KT |
| GEN | Samsung Ozone / Samsung Blue / Samsung White (sister teams) → Samsung Galaxy → KSV → Gen.G | → GEN |
| DRX | Longzhu Gaming → Kingzone DragonX → DragonX → DRX | → DRX |
| KDF | Afreeca Freecs → Kwangdong Freecs | → KDF |
| HLE | Hanwha Life Esports (acquired ROX slot for 2018 Summer [UNCERTAIN — verify]) | → HLE |
| DK | DAMWON Gaming → DWG KIA → Dplus KIA | → DK |
| NS | Team Dynamics → Nongshim RedForce | → NS |
| BRO | hyFresh Blade → Fredit BRION → OK BRION | → BRO |
| FOX | SBENU Sonicboom → … → SANDBOX/Liiv SANDBOX slot → FearX → BNK FEARX [UNCERTAIN full chain] | → FOX |
| ROX | HUYA Tigers / GE Tigers / KOO Tigers → ROX Tigers (defunct after 2018) | defunct |
| CJ | CJ Entus Blaze / CJ Entus Frost (sister teams) → CJ Entus (defunct after 2017) | defunct |
| JAG | Jin Air Greenwings incl. Falcons/Stealths (defunct after 2020) | defunct |
| MVP | MVP Ozone / MVP Blue → MVP (defunct after 2019) | defunct |
| NJ | Najin Black Sword / Najin White Shield → Najin e-mFire (defunct after 2015 [UNCERTAIN exact end]) | defunct |
| KDM | Kongdoo Monster (defunct after 2018) | defunct |
| BBQ | bbq Olivers (defunct after 2018) | defunct |
| GRF | Griffin (relegated 2020) | defunct |
| LSB | SANDBOX Gaming → Liiv SANDBOX (slot becomes FearX 2024; see FOX) | defunct; see builder notes |

## Season-by-season dossiers

Format: split, #teams, teams, champion + runner-up, key starters
(top/jng/mid/bot/sup), relative tiers, storyline, confidence.
Starters = first-listed player per role in the API-verified roster block.

---

### 2013 — OGN Champions Summer (pre-LCK, sister-team era, 16 teams)

- Teams (16, API-verified): SKT T1 2 ("SK Telecom T1 K"), KT Bullets, MVP Ozone,
  CJ Frost, CJ Blaze, NaJin Black Sword, NaJin White Shield, Jin Air Falcons,
  Jin Air Stealths, MVP Blue, Incredible Miracle 1, Incredible Miracle 2,
  Xenics Blast, Xenics Storm, MiG Blitz, Chunnam Techno University.
  (No Samsung / KT Arrows / SKT 1 that split — failed to qualify, NLB-bound.)
- Champion: **SK Telecom T1 2** (Impact / Bengi / Faker / Piglet / PoohManDu)
  3–2 over KT Bullets in the final. Runner-up KT-B
  (inSec / KaKAO / Ryu / Score / Mafa). 3rd MVP Ozone (Homme/DanDy/Dade/imp/Mata),
  4th CJ Frost. Season MVP: Faker.
- Tiers: SKT-2 S · KT-B S · MVP-O/CJ-F/CJ-B A · rest B/C.
- Storyline: Faker's debut split; "best final ever" narrative. Highest
  nostalgia value of any pre-LCK season.
- Confidence: **HIGH** (16-team list + full starters + top-4 API-verified).

### 2014 — OGN Champions (Winter / Spring / Summer; Summer verified at 16 teams)

- Format: still sister teams (SKT S+K, Samsung Blue+White, KT Arrows+Bullets,
  CJ Blaze+Frost, Najin Sword+Shield + qualifiers).
- Summer teams (16, API-verified): CJ Blaze, CJ Frost, KT Arrows, KT Bullets,
  NaJin White Shield, NaJin Black Sword, Samsung Blue, Samsung White, SKT T1 K,
  SKT T1 S, Jin Air Falcons, Jin Air Stealths, Incredible Miracle 1/2,
  Bigfile Miracle, MKZ.
- Champions: Winter — SKT T1 K; Spring — Samsung Blue (Acorn/Spirit/Dade/Deft/Heart);
  **Summer — KT Rolster Arrows** (Ssumday/KaKAO/Rookie/Arrow/Hachani) 3–2 over
  Samsung Blue ("last OGN Champions", contemporary press-verified).
- Notable: Samsung White (Looper/DanDy/PawN/imp/Mata) and SKT T1 S
  (MaRin/H0R0/Easyhoon/Bang/Wolf) as separate squads; KOO Tigers org forms late
  2014 from Najin Shield core [UNCERTAIN exact date].
- Tiers (Summer): KT-A S · SSB S · SSW S- · SKT-K A · rest B/C.
- Storyline: last sister-team year; Rookie/Deft/KaKAO before the LPL exodus;
  KT Arrows miracle run.
- Confidence: **HIGH** for Summer (teams + Arrows title verified); **MED** for
  Winter/Spring per-split rolls (not re-pulled — check `Champions/2014_Season/*`).

### 2015 — SBENU Champions Spring (8 teams) / Summer (10 teams)

- First single-team LCK year. Spring (8): SKT, GE Tigers, CJ, Jin Air, KT,
  NaJin e-mFire, Samsung, IM. Summer (10, API-verified): same 8 (GE→KOO rename)
  + Rebels Anarchy + SBENU Sonicboom.
- Champions: **Spring — SKT** (MaRin / Bengi–Tom / Easyhoon–Faker rotation /
  Bang / Wolf) over GE; **Summer — SKT** (MaRin/Bengi/Faker/Bang/Wolf) 3–0
  over KT. Spring reg-season #1: GE Tigers.
- Key starters: KOO (Smeb/Hojin/Kuro/PraY/GorillA); KT (Ssumday/Score/Nagne/
  Arrow/Hachani spring, Fixer summer); CJ (Shy/Ambition/Coco/Space/MadLife);
  GEN Samsung (CuVee/Eve/Ace→Crown/Fury/Wraith→Luna); Anarchy
  (ikssu/lira/Mickey/Sangyoon/SnowFlower); SBENU (Soul/Catch/SaSin/Nuclear/Secret).
- Tiers: T1 S+ · KOO/KT A+ · CJ/JAG A- · GEN/NJ B · SBENU/ANR C.
- Storyline: post-exodus rebuild; Faker/Easyhoon rotation; MaRin's top-lane
  carry year; KOO's tragedy arc (both finals lost → Worlds final lost).
- Confidence: **HIGH**.

### 2016 — LCK Spring / Summer (10 teams)

- Spring (API-verified): SKT, ROX, KT, Jin Air, Afreeca, Samsung, Longzhu, CJ,
  SBENU, Kongdoo. Summer: ROX, SKT, KT, Samsung, Afreeca, MVP, Jin Air, Longzhu,
  ESC Ever, CJ (Ever + MVP promoted via relegation; SBENU + Kongdoo out).
- Champions: **Spring — SKT** (Duke/Bengi/Faker/Bang/Wolf) 3–1 over ROX;
  **Summer — ROX Tigers** (Smeb/Peanut/Kuro/PraY/GorillA) 3–2 over KT.
- Key: KT (Ssumday/Score/Fly/Arrow/Hachani); Samsung
  (CuVee/Ambition/Crown/Ruler/CoreJJ summer); Afreeca
  (ikssu/LirA/Mickey/Sangyoon/SnowFlower); Longzhu
  (Expession/Chaser/Coco/Cpt Jack→Fury/Pure); CJ
  (Untara/Bubbling→Haru/Sky→Bdd/Kramer/MadLife); MVP summer
  (ADD/Beyond/Ian/MaHa/Max); Ever summer (Crazy/Bless/Tempt/LokeN/Key).
- Tiers: ROX/SKT S+ · KT S · GEN Samsung A · JAG/Afreeca A- · rest B/C.
- Storyline: best-LCK-year argument — ROX vs SKT telecom war, 5-game summer
  final, Worlds SKT champions / Samsung runners-up / ROX semi.
- Confidence: **HIGH** (full standings + MVP votes + full rosters pulled).

### 2017 — LCK Spring / Summer (10 teams)

- Spring: SKT, Samsung, KT, Afreeca, MVP, ROX, Longzhu, bbq, Jin Air, Kongdoo.
  Summer: Longzhu, KT, Samsung, SKT, Afreeca, Jin Air, ROX, MVP, bbq,
  Ever8 Winners (Ever8 replace Kongdoo via relegation — verified).
- Champions: **Spring — SKT** (Huni/Peanut/Faker/Bang/Wolf) 3–0 over KT;
  **Summer — Longzhu** (Khan/Cuzz/Bdd/PraY/GorillA) 3–1 over SKT.
- Key: KT "superteam" (Smeb/Score/PawN/Deft/Mata); Samsung
  (CuVee/Ambition/Crown/Ruler/CoreJJ); Afreeca (MaRin/Spirit/Kuro/Kramer/TusiN);
  MVP (ADD/Beyond/Ian/MaHa/Max); ROX (Lindarang/SeongHwan/Mickey/Sangyoon/Key);
  Jin Air (ikssu/UmTi/Kuzan/Teddy/SnowFlower); bbq (Crazy/Bless/Tempt/Ghost/Totoro).
- Tiers: Spring SKT/KT S+ · Summer LZ/SKT S+ · GEN Samsung A+
  (Worlds winners despite 4th-ish domestic summer) · rest A-/B.
- Storyline: KT superteam swept in spring final; Longzhu summer surge;
  Samsung 3–0 SKT at Worlds.
- Confidence: **HIGH**.

### 2018 — LCK Spring / Summer (10 teams)

- Spring: Kingzone, Afreeca, KT, SKT, KSV (ex-Samsung), ROX, Jin Air, bbq, MVP,
  Kongdoo. Summer: KT, Griffin, Kingzone, Gen.G (KSV→Gen.G rename at/around
  summer — verified as displayed), Afreeca, HLE, SKT, Jin Air, MVP, bbq
  (Griffin + HLE replace Kongdoo + ROX — verified).
- Champions: **Spring — Kingzone DragonX** (Khan/Peanut/Bdd/PraY/GorillA) 3–1
  over Afreeca; **Summer — KT Rolster** (Smeb/Score/Ucal/Deft/Mata) 3–2 over Griffin.
- Key: Griffin summer (Sword/Tarzan/Rather/Viper/Lehends — Chovy joined
  around/after summer; mark mid timeline [UNCERTAIN]); Afreeca (Kiin/Spirit/Kuro/
  Kramer→Aiming/TusiN); T1 down year (Untara→Thal/Blank/Faker/Bang/Effort→Wolf);
  HLE (Lindarang/SeongHwan/Lava/Sangyoon/Key); Jin Air (SoHwan/UmTi/Grace/Teddy/Wraith).
- Tiers: Spring KZ S · Afreeca/KT A+; Summer KT/GRF S · rest A-/B (SKT down year).
- Storyline: Griffin rookie fairytale; KT's first title since 2014; SKT misses Worlds.
- Confidence: **HIGH**.

### 2019 — LCK Spring / Summer (10 teams)

- Both splits: SKT, Griffin, Gen.G, Kingzone, DAMWON (promoted), SANDBOX (promoted),
  KT, Afreeca, Jin Air, HLE.
- Full W-L pulled. Spring: GRF 15-3, SKT 14-4, KZ 13-5, SBG 13-5, DWG 11-7 …
  JAG 1-17. Summer: GRF 13-5, DWG 13-5, SB 12-6, SKT 11-7 … JAG 0-18.
- Champions: **Spring — SKT** (Khan/Clid/Faker/Teddy/Mata) 3–0 over Griffin;
  **Summer — SKT** (Khan/Clid/Faker/Teddy/Mata) 3–1 over Griffin.
- Key: GRF (Sword — not Doran — /Tarzan/Chovy/Viper/Lehends); DWG
  (Nuguri/Canyon/ShowMaker/Nuclear/Hoit→BeryL); KZ (Rascal/Cuzz/PawN→Naehyun/
  Deft/TusiN); SBG (Summit/OnFleek/Dove/Ghost/Joker); Gen.G
  (CuVee/Peanut/Fly→Kuzan/Ruler/Life).
- Tiers: SKT/GRF S · DWG/KZ/SBG A · rest B/C.
- Storyline: Griffin's two lost finals; Clid/Mata SKT reboot; DAMWON arrival.
- Confidence: **HIGH**.

### 2020 — LCK Spring / Summer (10 teams; COVID online stretch)

- Spring W-L: GEN/T1/DRX 14-4, KT 10-8, DWG 9-9, AF 7-11, APK 6-12, HLE 6-12,
  SB 5-13, GRF 5-13 (relegated). Summer W-L: DWG 16-2, DRX 15-3, GEN 14-4,
  T1 13-5, AF 10-8, KT 7-11, SB 7-11, Dynamics 5-13, HLE 2-16, SeolHaeOne 1-17.
- Champions: **Spring — T1** (Canna/Cuzz/Faker/Teddy/Effort) 3–0 over Gen.G;
  **Summer — DAMWON** (Nuguri/Canyon/ShowMaker/Ghost/BeryL) 3–0 over DRX.
- Key: GEN (Rascal/Clid/Bdd/Ruler/Life); DRX (Doran/Pyosik/Chovy/Deft/Keria);
  KT (SoHwan/bonO/Ucal/Aiming/TusiN); AF (Kiin/Spirit/Fly/Mystic or SS/Ben or Jelly
  — mid-table rotation, first-listed kept); HLE (CuVee/Haru/Lava or Tempt/Viper/
  Lehends or Vsta); SB (Summit/OnFleek/Dove/Route/GorillA).
- Tiers: Spring T1/GEN S · Summer DWG S+ (all-time great team) · DRX A+ · rest A-/B.
- Storyline: DAMWON's ascent to a dominant Worlds title; DRX rookies ("Deft +
  four rookies"); Griffin collapse/relegation.
- Confidence: **HIGH** (full W-L + full rosters pulled; no 9/10-slot gap).

### 2021 — LCK Spring / Summer (franchising begins, fixed 10 partners)

- Stable 10: DWG KIA, T1, Gen.G, DRX, HLE, KT, Afreeca, Liiv SANDBOX, Nongshim,
  Fredit BRION.
- Spring seeds: DK #1, GEN #2, HLE #3, T1 #4. Summer order: DK, GEN, NS, T1,
  LSB, AF, KT, HLE, BRO, DRX (full order pulled).
- Champions: **Spring — DWG KIA** (Khan/Canyon/ShowMaker/Ghost/BeryL) over
  Gen.G (HLE 3rd, T1 4th); **Summer — DWG KIA** 3–1 over T1.
- Key: GEN (Rascal/Clid/Bdd/Ruler/Life); HLE (Morgan/Arthur/Chovy/Deft/Vsta);
  NS (Rich/Peanut/Bay→Gori/deokdam/Kellin); LSB
  (Summit/Croco/FATE/Route→Prince/Effort); T1 spring
  (Canna/Ellim/Clozer/Gumayusi/Keria) vs summer (Canna/Cuzz/Faker/Teddy/Keria
  first-listed — Zeus/Oner/Gumayusi rotation timeline [UNCERTAIN]).
- Tiers: DK S+ · GEN/T1 A+ · NS/HLE/LSB A- · rest B/C.
- Storyline: defending world champions dominate; ShowMaker/Canyon peak.
- Confidence: **HIGH** (MED on T1's exact summer starter rotation).

### 2022 — LCK Spring / Summer

- Same 10 orgs (Afreeca→Kwangdong rebrand Dec 2021; display "Afreeca" for 2021,
  "KDF" for 2022 [rebrand date [UNCERTAIN]]).
- Spring full order: T1, GEN, DK, DRX, KDF, BRO, KT, NS, LSB, HLE.
  Summer seeds: GEN #1, T1 #2, LSB #3, DK #4 (bottom order [UNCERTAIN]).
- Champions: **Spring — T1** (Zeus/Oner/Faker/Gumayusi/Keria) 3–1 over Gen.G,
  undefeated 18–0 split [widely reported; W-L not re-pulled — MED];
  **Summer — Gen.G** (Doran/Peanut/Chovy/Ruler/Lehends) 3–0 over T1.
- Key: DK (Hoya spring→Nuguri summer/Canyon/ShowMaker/deokdam/Kellin);
  DRX (Kingen/Pyosik/Zeka/Deft/Beryl — Worlds miracle core); KT
  (Rascal/Cuzz/Aria/Aiming/Life); LSB (Dove/Croco/Clozer/Envyy→Prince/Kael);
  KDF (Kiin/Ellim/FATE/Teddy/Hoit); NS (Canna/Dread/Bdd/Ghost/Effort).
- Tiers: T1 S+ spring (all-time split) · GEN S summer · DK/DRX/LSB/KT A ·
  rest B/C (HLE wooden spoon — fun underdog inversion).
- Storyline: T1 undefeated spring; Gen.G summer revenge; DRX lowest-seed
  Worlds winners ever (run starts from this roster).
- Confidence: **HIGH** (MED on 18-0 record + summer bottom order).

### 2023 — LCK Spring / Summer

- Same 10: GEN, T1, KT, Dplus KIA, HLE, DRX, LSB, NS, BRO, KDF.
- Spring seeds: T1 #1, GEN #2, KT #3. Summer seeds: KT #1, GEN #2, HLE #3
  (bottom order [UNCERTAIN]).
- Champions: **Spring — Gen.G** (Doran/Peanut/Chovy/Peyz/Delight) 3–1 over T1;
  **Summer — Gen.G** 3–0 over T1 (KT 3rd both splits).
- Key: T1 (Zeus/Oner/Faker/Gumayusi/Keria — Faker wrist-injury summer gap,
  Poby sub games [UNCERTAIN exact count]); KT (Kiin/Cuzz/Bdd/Aiming/Lehends);
  HLE (Kingen/Clid/Zeka/Viper/Life); DK (Canna/Canyon/ShowMaker/Deft/Kellin);
  DRX (Rascal/Croco/FATE→kyeahoo/deokdam→Paduck/BeryL).
- Tiers: GEN/T1 S+ · KT S · HLE/DK A · rest B/C.
- Storyline: Gen.G domestic three-peat vs T1's Worlds 2023 revenge —
  "domestic kings vs world champions".
- Confidence: **HIGH** (MED on summer bottom order + Poby details).

### 2024 — LCK Spring / Summer (= modern lck.js set)

- 10: GEN, T1, HLE, Dplus KIA, KT, KDF, DRX, NS, BRO, FearX/BNK FEARX
  (Liiv SANDBOX slot rebranded; display "FearX" spring, "BNK FearX" summer).
- Spring seeds: GEN #1, T1 #2, HLE #3. Summer seeds: GEN #1, HLE #2, DK #3.
- Champions: **Spring — Gen.G** (Kiin/Canyon/Chovy/Peyz/Lehends) 3–2 over T1;
  **Summer — Hanwha Life Esports** (Doran/Peanut/Zeka/Viper/Delight) over Gen.G
  [exact scoreline [UNCERTAIN] — verify].
- Key: T1 (Zeus/Oner/Faker/Gumayusi/Keria — back-to-back Worlds winners despite
  2 domestic final losses); DK (Kingen/Lucid/ShowMaker/Aiming/Kellin);
  KT (PerfecT spring→Casting summer/Pyosik/Bdd/Deft/BeryL); KDF
  (DuDu/Cuzz/BuLLDoG/Taeyoon→Leaper/Andil); DRX (Rascal/Sponge/SeTab→kyeahoo/
  Teddy/Pleata); NS (DnDn/Sylvie/FIESTA→Fisher/Jiwoo/Peter→GuGer).
- Tiers: GEN S+ · T1/HLE S · DK/KT A · rest B/C.
- Storyline: Gen.G MSI champions + denied "golden road"; HLE breakthrough
  summer title; T1 back-to-back Worlds.
- Confidence: **HIGH** (MED on summer-final scoreline).

---

## Recommended first-shipped years (ranked)

1. **2022** — HIGH confidence, fixed 10-team franchise set identical in
   structure to modern `lck.js`, best stories (undefeated T1 spring, Gen.G
   summer, DRX Worlds run, HLE wooden spoon). Cheapest to build.
2. **2016** — HIGH confidence after verification (full standings + MVP votes +
   full rosters); best-story candidate (ROX vs SKT peak-LCK).
3. **2020** — HIGH confidence (full W-L both splits); DAMWON ascent + DRX
   rookies; modern 10-team format.
4. **2015** — HIGH confidence; Summer is a clean 10, Spring is 8 (needs 8-team
   schedule support or 2 fill-ins); huge nostalgia (Faker/Easyhoon rotation,
   MaRin, KOO tragedy arc).
5. **2013 Champions Summer** — maximum myth value (Faker debut, best final
   ever), now HIGH team-list confidence (16 verified) — but the sister-team
   format needs adaptation (fold to 8 orgs or pick 10 of 16). Ship later.
   (Alternate 6th: **2019** — HIGH, Griffin-vs-SKT, DAMWON arrival.)

## Feasibility table

| Year | Split | #Teams | Roster-confidence | Notes |
|---|---|---|---|---|
| 2013 | Champions Summer | 16 | HIGH | Sister-team format; fold to ~8-10 for the game |
| 2014 | Champions Summer | 16 | HIGH | Winter/Spring rolls MED — check `Champions/2014_Season/*` if added |
| 2015 | Spring | 8 | HIGH | Small league; needs 8-team support or fill-ins |
| 2015 | Summer | 10 | HIGH | Clean 10 (adds Anarchy + SBENU) |
| 2016 | Spring | 10 | HIGH | Full standings + MVP votes |
| 2016 | Summer | 10 | HIGH | Best storyline year |
| 2017 | Spring | 10 | HIGH | "Superteam" KT |
| 2017 | Summer | 10 | HIGH | Longzhu surge |
| 2018 | Spring | 10 | HIGH | KZ dominance |
| 2018 | Summer | 10 | HIGH | Griffin joins, HLE replaces ROX (verified swap) |
| 2019 | Spring | 10 | HIGH | Griffin 15-3 era |
| 2019 | Summer | 10 | HIGH | JAG 0-18 |
| 2020 | Spring | 10 | HIGH | Full W-L; GRF relegated |
| 2020 | Summer | 10 | HIGH | DWG 16-2 all-time team |
| 2021 | Spring | 10 (franchised) | HIGH | Fixed partners from here |
| 2021 | Summer | 10 | HIGH | Full order pulled |
| 2022 | Spring | 10 | HIGH | Ship-first pick |
| 2022 | Summer | 10 | HIGH (MED on bottom order) | Gen.G revenge |
| 2023 | Spring | 10 | HIGH (MED on bottom order) | Same orgs |
| 2023 | Summer | 10 | HIGH (MED on bottom order) | GEN 3-0 final |
| 2024 | Spring | 10 (= modern set) | HIGH | Direct lck.js mapping |
| 2024 | Summer | 10 | HIGH (MED on final score) | HLE breakthrough |

No years in 2013–2024 are thin/unavailable. (Pre-2013 OGN and post-2024
format-change years were out of scope and not checked.)

## Builder implementation notes

- One file per season recommended, e.g. `src/data/seasons/2022-summer.js`,
  same `TEAMS_RAW` shape as `lck.js` (id/name/short/color/tier/roster),
  keyed by the stable IDs above with the **year-accurate display name** in
  `name`.
- Suggested fictional-balance tier anchors (relative only, NOT real stats):
  S+ ≈ 89–91, S ≈ 87–89, A ≈ 84–86, B ≈ 80–83, C ≈ 76–79. Tune so the
  champion sits 2–4 above mid-table, mirroring current `lck.js` spreads.
- Pre-LCK years (2013–2014, 16 teams): fold sister squads into 8 org squads
  (SKT K+S, SSB+SSW, CJ B+F, KT A+B, NJ Sword+Shield, JAF+JAS, IM 1+2,
  MVP O+MVP B) + keep 2 qualifier sides as low-tier filler for a 10-team
  league — or pick 10 of 16. Decision needed.
- 2015 Spring needs 8-team schedule/playoff support if the engine assumes 10
  (or backfill SBENU + Anarchy from Summer).
- 2021+ franchised years are structurally identical to the modern game —
  lowest implementation cost; prefer them for the MVP of this feature.
- Verification checklist before marking a season shippable: (1) confirm team
  list on `lol.fandom.com/wiki/LCK/<YEAR>_Season/<Split>_Season` (or
  `Champions/<YEAR>_Season/...` for 2013–14); (2) confirm top-4 starters per
  team from the page's `TeamRoster` blocks (starters listed in each dossier);
  (3) resolve every remaining [UNCERTAIN] tag in that season's section.
