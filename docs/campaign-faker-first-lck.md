# Campaign Research: Faker's First Korean Title (SK Telecom T1)

STABLE research doc for campaign mode. No code. Sources: Leaguepedia (lol.fandom.com),
Liquipedia, rft.gg per-game scoreboards, GosuGamers, contemporary Reddit post-match threads.

## 1. Which season was Faker's FIRST title? (correction to the brief)

Faker (Lee Sang-hyeok) debuted in **OLYMPUS Champions Spring 2013** on **SK Telecom T1 2**,
but that team did **NOT** win Spring 2013. Verified Spring 2013 final standings
(Leaguepedia prize-pool table): 1st MVP Ozone, 2nd CJ Entus Blaze, **3rd SK Telecom T1 2**,
4th CJ Entus Frost. SKT 2's Spring 2013 playoff run: QF 3-0 vs NaJin Shield (2013-05-08),
SF **1-3 loss** vs MVP Ozone (2013-05-29), 3rd-place match 3-0 vs CJ Entus Frost (2013-06-05).

Faker's actual **first Korean title** was the very next split:

- **Tournament:** HOT6iX Champions Summer 2013 (OGN Champions Summer 2013)
- **Team name at the time:** SK Telecom T1 K (the former SKT T1 2; sister team SKT T1 S = former SKT T1 1)
- **Dates:** group stage from early July 2013; playoffs August 2013; **Final 2013-08-31**
- **Format:** Round-of-12 group stage (two groups of six, each matchup Best-of-2 round robin;
  2-0 = 3 pts, 1-1 = 1 pt each), then single-elimination **Best-of-5** bracket
  (quarterfinals / semifinals / final; 5th game blind pick in that era).

The other candidate in the brief:

- **Tournament:** SBENU Champions Spring 2015 (2015 LCK Spring — first split after the
  2014 sister-team merge, commonly called "LCK Spring 2015")
- **Team:** unified SK Telecom T1
- **Dates:** regular season Jan–Apr 2015; playoffs mid-Apr–May 2015; **Final 2015-05-02**
- **Format:** 8-team single round robin regular season, then seeded single-elimination
  **Best-of-5** playoffs (Round 1: 4th vs 5th... in practice: CJ Entus 3-0 Jin Air in Round 1;
  SKT entered in Round 2 as 2nd seed; GE Tigers waited in the final as 1st seed).

## 2. Recommendation: which title to model

**RECOMMENDATION: model Champions Summer 2013 (Faker's true first title).**

Why:
1. It is factually Faker's first Korean championship; Spring 2013 was a 3rd-place finish,
   so a "first title" campaign set in Spring 2013 would be fiction.
2. Better campaign arc: 3 playoff series with escalating drama — 3-0 sweep, 3-1 revenge win
   over the team that eliminated them in Spring (MVP Ozone), then a 0-2 comeback reverse
   sweep 3-2 over KT Bullets in the final (includes the famous Faker–Ryu Zed mirror games).
3. Fixed 5-man roster (Impact / Bengi / Faker / Piglet / PoohManDu) — no mid-split subs,
   simpler to model than 2015's 10-man rotation (Easyhoon/Faker, Bengi/Tom swaps).
4. Alternative: SBENU Champions Spring 2015 is the valid fallback if the game specifically
   wants the "LCK"-branded era (single-league, no sister teams) — only 2 series to model,
   but one of them is a 3-0 sweep, so less gameplay.

## 3. Bracket path — Champions Summer 2013 (RECOMMENDED)

SKT K finished group stage and entered the bracket at the quarterfinal. All series Bo5.

| # | Round | Opponent | SeriesScore (SKT–OPP) | SKTGamesLost | Date |
|---|-------|----------|----------------------|--------------|------|
| 1 | Quarterfinal | Jin Air Green Wings Falcons | 3–0 | — (sweep) | 2013-08-14 |
| 2 | Semifinal | MVP Ozone | 3–1 | Game 1 | 2013-08-23 |
| 3 | Final | KT Rolster Bullets (KTB) | 3–2 | Games 1, 2 | 2013-08-31 |

Game-order evidence (rft.gg per-game winner icons + kill scores):
- SF vs MVP Ozone: G1 Ozone won (10–25 kills); G2 SKT (16–3); G3 SKT (14–6); G4 SKT (23–9).
- Final vs KT Bullets: G1 KTB (24–11); G2 KTB (26–10); G3 SKT (4–24); G4 SKT (9–20);
  G5 SKT (12–26). SKT won three straight after going down 0–2.

## 4. Bracket path — SBENU Champions Spring 2015 (ALTERNATE)

SKT finished 2nd in the regular season and entered in Round 2. All series Bo5.

| # | Round | Opponent | SeriesScore (SKT–OPP) | SKTGamesLost | Date |
|---|-------|----------|----------------------|--------------|------|
| 1 | Semifinal (Round 2) | CJ Entus | 3–2 | Games 1, 2 | 2015-04-24 |
| 2 | Final | GE Tigers | 3–0 | — (sweep) | 2015-05-02 |

Game-order evidence (rft.gg per-game winner icons + kill scores; corroborated by the
r/leagueoflegends post-series thread, Match 1 winner CJ):
- vs CJ Entus: G1 CJ (8–15); G2 CJ (1–16); G3 SKT (13–2); G4 SKT (20–19); G5 SKT (37–9).
  SKT reverse-swept from 0–2. Notable: Easyhoon started G1–G2 (Vladimir, Xerath),
  Faker played G3–G5 (Lulu, Lulu, LeBlanc); Tom jungled G1–G2, Bengi G3–G5.
- Final vs GE Tigers: 3–0 sweep (cross-verified via Leaguepedia playoffs table and T1's
  contemporary match report), so per-game loss order is moot.

## 5. Loss nodes (hard-coded losses the player cannot change)

### Summer 2013 campaign
- QF vs Jin Air Falcons: NONE (3–0 sweep — player must win all 3).
- SF vs MVP Ozone: **Game 1 = LOSS** (player must win Games 2, 3, 4).
- Final vs KT Bullets: **Games 1 and 2 = LOSSES** (player must win Games 3, 4, 5).

### Spring 2015 campaign (alternate)
- SF vs CJ Entus: **Games 1 and 2 = LOSSES** (player must win Games 3, 4, 5).
- Final vs GE Tigers: NONE (3–0 sweep — player must win all 3).

## 6. Rosters (flavor / labels)

### Summer 2013 — SK Telecom T1 K (verified via rft.gg scoreboards)
Impact (top), Bengi (jungle), Faker (mid), Piglet (ADC), PoohManDu (support).
- SF opponent MVP Ozone: Homme, DanDy, dade, imp, Mata.
- Final opponent KT Rolster Bullets: inSec, KaKAO, Ryu, Score, Mafa.
- QF opponent Jin Air Green Wings Falcons roster: [UNCERTAIN] — not verified; omit or
  look up on Leaguepedia before shipping flavor text.
- Notable flavor: Final G4/G5 featured the Faker (Zed/Ahri) vs Ryu (Gragas) mid matchup;
  Faker's Game 3 Zed play vs Ryu is one of the most famous moments in LoL history.

### Spring 2015 — SK Telecom T1 (verified via rft.gg scoreboard)
MaRin (top); Bengi / Tom (jungle rotation); Faker / Easyhoon (mid rotation);
Bang (ADC); Wolf (support).
- SF opponent CJ Entus: Shy, Ambition, CoCo, Space, MadLife.
- Final opponent GE Tigers: [UNCERTAIN] commonly listed as Ssumday, Lee, Kuro, PraY,
  GorillA — plausible but not re-verified for this doc; confirm on Leaguepedia before use.

## 7. Data confidence and ambiguity

- HIGH confidence: series scores, series dates, and tournament winners for both campaigns
  (Leaguepedia schedule-history tables + playoff brackets, cross-checked with rft.gg).
- HIGH confidence: per-game loss order in all four non-sweep series — derived from rft.gg
  per-game winner icons and kill scores, and corroborated for 2015 SF by the contemporary
  Reddit thread (Match 1 winner = CJ).
- MEDIUM confidence: 2013 group-stage detail is intentionally excluded (campaign starts at
  the bracket); group format described from the Leaguepedia Spring page pattern — Summer
  page format section was not fully re-verified, so treat "Bo2 groups + Bo5 bracket" as
  MEDIUM for Summer specifically. The bracket series data does not depend on it.
- All Bo5 claims for bracket rounds: HIGH (consistent across Leaguepedia, rft.gg "BO5"
  labels, and GosuGamers "Best of 5" labels).
- Anything marked [UNCERTAIN] above must be verified on Leaguepedia before being shown
  in-game as fact.
