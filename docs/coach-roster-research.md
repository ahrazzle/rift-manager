# Coach-Roster Research — Real LCK Coaches (lck-manager)

> **SCOPE CONTRACT (read first): ALL coach ratings/tiers in the game are
> FICTIONAL and game-balanced. This document supplies only REAL coach NAMES,
> real team/era associations, and RELATIVE strength tiers (who is
> elite/strong/mid/developing relative to each other) so a builder can reskin
> a coach roster. No real stats, no official ratings are implied anywhere
> below.**

**Author:** Hazen (research) — 2026-10-04.
**Status:** STABLE — research only, no code.
**Method:** Leaguepedia person pages (`lol.fandom.com/wiki/<Name>`, team-history
tables + news logs) pulled via web extract; cross-checked with a second source
(reddit official announcements, InvenGlobal, Liquipedia) where noted.
Every uncertain item is tagged **[UNCERTAIN]**.
Data-confidence scale: **HIGH** = team-history table + dated news on
Leaguepedia (or ≥2 sources). **MED** = one solid source or strong recall
against a verified tenure. **LOW** = recall only, must verify before shipping.

## Stable coach-ID scheme (builder: use these as keys)

Lowercase, no spaces — mirrors `historical-year-research.md`'s team-ID scheme.
`era` is the years the coach was on staff, not necessarily head coach.

| ID (use as key) | Real name | Role(s) | Team(s) + era | Relative tier | Confidence |
|---|---|---|---|---|---|
| kkOma | Kim Jeong-gyun | Head | SKT 2012–19 · VG 2020 · DWG KIA 2020–22 (athletic director, briefly head-coach line) · T1 2023–present | elite | HIGH |
| Bengi | Bae Seong-woong | Coach → Interim/Head → Head | SKT/T1 coach 2017–18 · T1 Challengers 2020–21 · T1 head 2021–23 · DK head 2024–25 | elite | HIGH |
| Tom | Im Jae-hyeon | Coach → Interim Head → Coach | Gen.G coach 2019–20 · T1 coach 2022–23 · T1 interim head mid-2023 · T1 coach under kkOma 2023–present (interim head again Mar 2026) | strong | HIGH |
| Zefa | Lee Jae-min | Coach → Head | Najin/Kongdoo/Afreeca coach 2013–18 · SKT coach 2019 · DWG head 2020 (Worlds win) · T1 coach 2020–21 · DWG KIA coach 2021–22 · DK head 2023–24 | elite | HIGH |
| Edgar | Choi Woo-beom (ex-DoGGi) | Coach → Head | Samsung Blue/White coach 2013–14 · SSG/KSV/Gen.G head 2014–20 · BRION head 2020–25 · LNG 2025–present | elite | HIGH |
| cvMax | Kim Dae-ho | Head | Griffin head 2017–19 · DragonX/DRX head 2019–21 · KDF head 2022–24 · JDG 2024–25 · DK head 2025–present | elite | HIGH |
| NoFe | Jeong No-chul | Coach → Head | KOO/ROX 2015–16 (LCK title) · EDG 2016–18 · Afreeca 2018–19 · HLE 2019–20 | elite | HIGH |
| Ssong | Kim Sang-soo | Coach → Head | ROX 2015–16 · Longzhu 2016–17 · NA years · DRX 2020–22 · DK coach 2023–24 · DRX head 2024–25 · BRION head 2025–present | strong | HIGH |
| Score | Go Dong-bin | Coach (Gen.G) → Head (KT) | Gen.G 2021–23 [UNCERTAIN role — listed on staff; head-coach title unconfirmed] · KT head 2024–present | strong | HIGH (KT); MED (Gen.G) |
| Hirai | Kang Dong-hoon | Head | IM 2012–16 · Longzhu/Kingzone 2016–19 · KT head 2019–24 | strong | HIGH |
| Micro | Kim Mok-kyoung | Coach → Head | Jin Air/IM/Kongdoo staff 2013–16 · DAMWON coach/head 2017–20 (founding coach) · SBX/LSB 2020–22 · DRX head 2022–24 | strong | HIGH |
| Acorn | Choi Cheon-ju | Coach | Kingzone coach 2018–19 · KT coach 2019–22 · DK coach 2022–23 (ex-SSB player) | mid | HIGH |
| Homme | Yoon Sung-young | Coach → Head | SSW sub/coach 2014 · LPL years (VG/WE/JDG/TES) · HLE head 2025–present | strong | HIGH |
| Kezman | Son Dae-young | Coach → Supervisor/GM | CJ Frost/Blaze/CJ 2011–15 · LPL years · HLE supervisor 2019–23 | strong (manager type) | HIGH |
| iloveoov | Choi Yeon-sung | Head | Afreeca head 2016–20 (ex-SC coach) | mid | HIGH |
| Ryu | Ryu Sang-wook | Coach → Head | LSB/FearX/BNK FearX head 2022–25 · Gen.G head 2025–present (ex-player) | developing–strong | HIGH |
| Mafa | Won Sang-yeon | Coach | KT player era · Gen.G coach 2020s [UNCERTAIN exact years — verify] | mid | LOW |
| DanDy | Choi In-kyu | Coach → Head [UNCERTAIN] | HLE staff/head ~2022–24 [UNCERTAIN — verify exact title/years] | strong | LOW |
| RapidStar | Jung Min-sung | Coach → Head [UNCERTAIN] | KDF head from late 2024 (ex-CJ mid) [UNCERTAIN — verify] | mid | LOW |
| Daeny | Yang Dae-in | Analyst → Head | DWG KIA head 2021 (with kkOma as director) [UNCERTAIN details] | mid | MED |
| KimJS | Kim Jeong-soo | Head [UNCERTAIN] | SKT head ~2019–20 between kkOma and Zefa/Daeny [UNCERTAIN — verify] | strong | LOW |
| Comet | Lee Sung-hyun | Coach [UNCERTAIN] | NS staff ~2020s [UNCERTAIN — verify] | mid | LOW |
| Drinker | (staff) | Coach | BRION coach under Edgar [UNCERTAIN full name/years — verify] | developing | LOW |
| Onair | (early CJ) | Head | MiG/Azubu/CJ Frost+Blaze head ~2011–14 (with Kezman) | mid | MED |
| Dopani | (early MVP) | Head | MVP White/Ozone head 2012–13 | mid | MED |
| BanBazi | (early Samsung) | Coach | MVP Blue / Samsung Blue staff 2013–14 | developing | MED |

## Present 10 teams — head coach by recent season

`lck.js` id in brackets. These are the "hireable" present-day anchors.

- **T1 [T1]**: Bengi (head 2021–23) → Tom (interim mid-2023) → **kkOma (head Nov 2023–present)**. Tom stays on staff. Confidence HIGH.
- **Gen.G [GEN]**: Edgar (to 2020) → Score on staff 2021–23 [UNCERTAIN title] + Mafa [UNCERTAIN] → 2024 head [UNCERTAIN — verify; do not ship a name] → **Ryu (head Nov 2025–present)**. Confidence MED overall.
- **Hanwha Life [HLE]**: NoFe (2019–20) → Kezman supervisor era (2019–23) → DanDy [UNCERTAIN ~2023–24] → **Homme (head Nov 2025–present)**. Confidence MED.
- **Dplus KIA [DK]**: Micro (2017–20) → Zefa (2020 title) → Daeny head + kkOma director (2021) → Zefa/Acorn era (2022–23) → Zefa head (2023–24) → Bengi head (2024–25) → **cvMax (head 2025–present)**. 2025 handover details [UNCERTAIN]. Confidence HIGH except 2025 handover (MED).
- **KT Rolster [KT]**: ZanDarC era (to 2019) → Hirai head (2019–24) + Acorn coach (2019–22) → **Score (head Nov 2024–present)**. Confidence HIGH.
- **DRX [DRX]**: cvMax (2019–21) → Ssong (2020–21 overlap) → 2022 title staff [UNCERTAIN — candidates Mowgli/Shine, verify] → Micro head (Dec 2022–Nov 2024) → Ssong head (2024–25). Confidence MED (HIGH for cvMax/Micro/Ssong tenures).
- **Nongshim RedForce [NS]**: staff ~2020s includes Comet [UNCERTAIN]; full head-coach lineage [UNCERTAIN — verify before shipping]. Confidence LOW.
- **Kwangdong Freecs [KDF]**: cvMax head (Sep 2022–Nov 2024) → RapidStar head (late 2024–) [UNCERTAIN]. Pre-cvMax lineage [UNCERTAIN]. Confidence MED.
- **FearX / BNK FearX [FOX]**: Micro-era SBX/LSB (2020–22) → **Ryu head (Oct 2022–Nov 2025)** → post-Ryu [UNCERTAIN]. Confidence HIGH for Ryu tenure.
- **OK BRION [BRO]**: **Edgar head (Nov 2020–2025)** + Drinker coach → Ssong head (Nov 2025–present). Confidence HIGH.

## Historical orgs — coaches by era

- **SKT/T1 [T1]**: kkOma (2012–19, 3 Worlds) → KimJS [UNCERTAIN 2019–20] → Zefa + Daeny (2020–21) → Bengi/Tom (2021–23) → kkOma (2023–). Assistants: Bengi, PoohManDu, Zefa, Fly, Tom, Sky, Roach (various years, HIGH where in news logs).
- **Samsung → SSG → KSV → Gen.G [GEN]**: Choi (head) + DoGGi/Edgar (2013–14, sister teams; Acorn-era player coach line) → Edgar head (2014–20; 2016 runner-up, 2017 title) → Score/Mafa era [UNCERTAIN] → Ryu (2025–). Confidence HIGH to 2020.
- **KT (Bullets/Arrows → KT) [KT]**: Lee Ji-hoon (2012–14, both sister teams) → post-merge staff [UNCERTAIN 2015–17] → ZanDarC (to 2019) → Hirai (2019–24) → Score (2024–). Confidence HIGH from 2019.
- **Tigers line: HUYA/GE/KOO → ROX (defunct) [ROX]**: NoFe (2014–16, 2016 LCK title) + Ssong (2015–16). Confidence HIGH.
- **CJ Entus (Frost/Blaze → CJ, defunct) [CJ]**: Onair head + Kezman coach (2011–14) → Kezman (2014–15). Post-2015 [UNCERTAIN]. Confidence MED.
- **Najin (Sword/Shield → e-mFire, defunct) [NJ]**: Ssong (player/staff 2012–14) · Zefa (coach 2013–15). Head-coach titles [UNCERTAIN]. Confidence MED.
- **MVP (White/Blue/Ozone, defunct) [MVP]**: Dopani head + BanBazi coach (2012–13); Homme/DanDy-era player line. Confidence MED.
- **Longzhu → Kingzone → DragonX → DRX [DRX]**: Hirai (2016–19) + Acorn (2018–19) → cvMax (2019–21) → Ssong/Micro eras (above). Confidence HIGH.
- **Afreeca → Kwangdong [KDF]**: iloveoov head (2016–20) · Zefa coach (2018) · NoFe (2018–19) → cvMax (2022–24) → RapidStar [UNCERTAIN]. Confidence HIGH except ends.
- **DAMWON → DWG KIA → DK [DK]**: Micro founding coach/head (2017–20) → Zefa (2020) → Daeny/kkOma (2021) → Zefa/Acorn (2022–23) → Zefa (2023–24) → Bengi (2024–25) → cvMax (2025–). Confidence HIGH.
- **ROX slot → Hanwha [HLE]**: Kezman supervisor (2019–23), NoFe (2019–20), DanDy [UNCERTAIN], Homme (2025–). Confidence MED.
- **Jin Air / Kongdoo / bbq / IM / Griffin (defunct, flavor pool)**: Micro (JAG/IM/KDM), Zefa (KDM), Hirai (IM), cvMax (GRF 2017–19), iloveoov n/a. Griffin's cvMax is the famous developer-of-talent story — good "developing"-tier narrative coach. Confidence HIGH for the named tenures.

## Feasibility note — mapping to game ids

- **Modern `src/data/lck.js` ids** — T1, GEN, HLE, DK, KT, DRX, NS, KDF, FOX, BRO: every slot has ≥1 HIGH-confidence hireable head coach above **except NS** (no verified head — ship NS with a generated stand-in or leave slot empty until verified) and partial gaps at GEN 2021–24 and DRX 2022 (ship surrounding tenures; mark the gap years [UNCERTAIN] in-game or skip).
- **Historical-year ids** — ROX (NoFe, Ssong), CJ (Kezman, Onair), NJ (Ssong, Zefa as staff), MVP (Dopani, BanBazi): all covered. JAG/KDM/BBQ/GRF/LSB have no dedicated builder id in the current scheme; treat Micro/Zefa/Hirai/cvMax/Ryu stints there as cross-team resume lines, not new team keys.
- **Suggested builder use**: `coaches` table keyed by coach-ID above with fields `{ name, role, teamId, era, tier, confidence }`; free-agent pool per season = coaches whose era includes that year and whose team ≠ active-team coach that year. Tiers map to fictional rating bands set by the builder (this doc does not set numbers).
- **Do-not-ship list** (LOW confidence — verify on Leaguepedia person pages first): Mafa years, DanDy @ HLE title/years, RapidStar @ KDF, KimJS @ SKT, Comet @ NS, Drinker full name, GEN 2024 head, DRX 2022 title staff.

## Sources

- Leaguepedia person pages: KkOma, Edgar, Cvmax, Score, Bengi, Homme, Zefa, NoFe, Tom, Iloveoov, Acorn, Ssong, Hirai, Micro (Kim Mok-kyoung), Kezman, Ryu — team-history tables + news logs (HIGH).
- Cross-checks: r/leagueoflegends official-join posts (Score→KT Nov 2024; cvMax→DK 2024/25); InvenGlobal (Edgar Samsung feature; KDF cvMax); Homme→HLE 2025 (ggesports/official X).
