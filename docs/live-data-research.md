# LIVE-DATA RESEARCH — realism calibration for the match engine

**Status: STABLE** (research only — no `src/` code touched)
**Date:** 2026-10-04 · **Author role:** Hazen (research) · **League studied:** LCK 2026

> How to read this doc: sections marked **[MEASURED]** come from real API
> responses fetched for this report (sample sizes stated). Sections marked
> **[FALLBACK — LOW confidence]** are widely-known public aggregate ranges
> (Oracle's Elixir-style LCK norms), NOT freshly fetched — used only where the
> live feed was unavailable. Do not mix the two when weighting calibration.

---

## 1. What was fetched (all real, via `x-api-key` on the persisted GW API)

| Step | Endpoint | Result |
|---|---|---|
| Leagues | `GET /getLeagues?hl=en-US` | OK. LCK league id `98767991310872058` |
| Tournaments | `GET /getTournamentsForLeague?leagueId=<lck>` | OK. Used `lck_split_1_2026` (2026-01-13→03-01), `lck_split_2_2026` (2026-03-31→06-14), `lck_split_3_2026` (2026-07-28→09-13) |
| Completed events | `GET /getCompletedEvents?tournamentId=<each>` | OK. **188 series, 503 games** total across the three splits |
| Event details | `GET /getEventDetails?id=<matchId>` × 52 (split 3) | OK. Per-game sides (blue/red), per-game VOD `startMillis`/`endMillis` |
| Live check | `GET /getLive` | OK. Only `show` events live (EMEA Masters, LCS) — no live matches to sample |
| Highlander (old) API | `api.lolesports.com/api/v1/leagues?slug=lck` | Empty — decommissioned, unusable |

### 1.1 Feed failure (exact behavior, no data faked)

`GET https://feed.lolesports.com/livestats/v1/{window,details}/{gameId}?startingTime=<RFC3339>`
returned **`HTTP 204 No Content` (0 bytes) for every completed game tested**:

- LCK split-3 games (Jul 2026, e.g. `115548147900684662`), LCK finals games (Sep 13 2026, e.g. `117030752644841646`), EMEA Masters games played **2 days prior** (Oct 2 2026, e.g. `117171782819993548`) — all 204, on both `/window` and `/details`.
- `startingTime` values tried: event start, hours before game start, 1 min before estimated game start — all 204. (One 400 observed only when `startingTime` was not divisible by 10 s: `"startingTime must be evenly divisible by 10 seconds"` — confirming game IDs are valid and only frame *content* is withheld.)
- Requests with no key and with a wrong key also return 204, so entitlement cannot be distinguished from retention — **completed-game frames are simply not served** (live-games-only feed and/or very short retention).

**Consequence:** no per-frame gold curves, no per-player KDA/CS/damage from the feed.
Gold-curve, objective-timing, and per-role numbers below are FALLBACK estimates.
Series scores, durations, and team strength spread are MEASURED.

---

## 2. MEASURED — series score distribution (n = 188 series, 503 games, LCK splits 1–3 2026)

| Series score (team A – team B, order as listed) | Count | Share |
|---|---|---|
| 2–0 | 98 (49 + 49) | **52.1 %** |
| 2–1 | 56 (29 + 27) | **29.8 %** |
| 3–0 | 9 (2 + 7) | 4.8 % |
| 3–1 | 13 (6 + 7) | 6.9 % |
| 3–2 | 12 (7 + 5) | 6.4 % |

- **Mean games per series: 2.68.** BO3s go to 3 games ~36 % of the time (56/154); BO5s go 4–5 games ~74 % of the time (25/34 — playoffs, closer field).
- Calibration use: when simming a BO3, P(sweep) ≈ 0.52, P(decider) ≈ 0.36 after game 1… simpler: per-game favorite win prob `p` with `p ≈ 0.62` reproduces ~2.68 games/series for mixed BO3/BO5 slates. For single BO3 sims use **2.63 avg games** (405 games / 154 BO3 series).

## 3. MEASURED — game duration (n = 150 games, LCK split 3 2026)

Source: broadcast VOD segment length (`endMillis − startMillis` of the `en-US`
YouTube VOD, fallback any provider VOD; segments span draft → just after nexus).

| Stat | VOD segment (min) | Est. in-game (segment − 9) |
|---|---|---|
| min | 27.5 | ~19 |
| p10 | 34.0 | ~25 |
| **median** | **44.9** | **~36** |
| mean | 47.4 | ~38 |
| p90 | 64.3 | ~55 |
| max | 110.0 (tech-pause outlier) | — |

- The −9 min offset (draft ≈ 7 min + post-nexus ≈ 2 min) is an **estimate**, but the resulting median ≈ 36 min / mean ≈ 38 min matches publicly known LCK 2025–26 norms (~33–37 min), so it is consistent.
- Shape: right-skewed (mean > median). Recommend sim duration = **median 33–36 min, σ ≈ 8 min, hard floor 20, long-tail cap ~65** (exclude pause outliers).

## 4. MEASURED — team strength spread (game win rate, LCK 2026 full year, 503 games)

| Team | Game W–L | Game WR% |
|---|---|---|
| GEN | 75–26 | **74 %** |
| T1 / HLE | 65–44 / 59–40 | 60 % |
| DK | 66–55 | 55 % |
| KT | 50–52 | 49 % |
| BFX | 52–59 | 47 % |
| NS / BRO | 34–52 / 37–56 | ~40 % |
| KRX | 37–59 | 39 % |
| DNS | 28–60 | **32 %** |

- Calibration use: elite-vs-bottom game win prob ≈ 0.70–0.75; mid-vs-mid ≈ 0.50–0.55. Per-game underdog (by 10 pp WR gap) win prob ≈ 0.40 — i.e. **BO series do not strongly protect favorites**: a 60 % per-game favorite still loses a BO3 ~32 % of the time (matches the 29.8 % decider + upset rate above).

## 5. FALLBACK (LOW confidence) — gold-difference curve

Not measurable (feed 204). Values below are LCK-norm public aggregates (Oracle's
Elixir-style ranges): average gold difference (winner − loser perspective; for
`goldTimeline` use sign = eventual winner):

| Minute | Median diff (winner−loser) | 25th / 75th pct | Notes |
|---|---|---|---|
| 5 | ~+400 | −300 / +1 000 | Lane matchups only; ~40 % of games the *loser* leads here |
| 10 | ~+900 | −600 / +2 200 | First dragons + grubs; jungle gap opens |
| 15 | ~+1 800 | −1 000 / +3 800 | Plates fall (14:00); biggest swing window |
| 20 | ~+3 000 | −1 500 / +6 000 | Baron live → siege or throw |
| 25 | ~+4 500 | −2 000 / +9 000 | Third/fourth dragon decisions |
| 30 | ~+6 500 | −2 500 / +11 000 | Elder/double-baron closeouts |
| Final | ~+10 000–14 000 | — | Nexus push inflates last-minute gold |

- **Shape:** near-zero until ~8 min, roughly linear growth of the lead from 10→25 min (~+250–350 gold/min for the eventual winner), then step jumps at Baron/dragon fights. ~1 in 4 games features a **lead swap after 15:00** (comeback); blowouts (diff > 8k at 20 min, ~15 % of games) end by ~28 min, close games (diff < 3k at 25 min, ~35 %) reach 35+ min.
- Calibration use: `goldTimeline` should be a noisy random walk with drift ≈ +300/min toward the winner, σ ≈ ±1 200 per 5-min step, plus discrete ±1 500–2 500 objective-fight jumps.

## 6. FALLBACK (LOW confidence) — objective / event timing (LCK norms)

| Event | Typical minute range | Notes for sim |
|---|---|---|
| First blood | 3–7 (median ~5) | Lane 2v2 / invade |
| Voidgrubs | 6:00 spawn; taken 6–9 | First neutral objective window |
| First dragon | 6–8 | ~70 % taken by 8:00 |
| First tower | 11–15 (plates end 14:00) | Swap/plate-cash timing |
| Herald | 14:00 spawn; fight 14–17 | Mid-tower breaker |
| Major 5v5 (2nd–3rd drake) | 16–22 | Biggest kill clustering |
| Baron | 20:00 spawn; first dance 20–23, ~60 % taken by 24:00 | First Baron ≈ +2 500 gold swing |
| Dragon soul | 23–28 | Soul-point fights decide ~1/3 of games |
| Elder / game end | 28–38 | Close games only |

## 7. FALLBACK (LOW confidence) — per-role performance (per game, LCK norms)

| Role | K (med) | D (med) | A (med) | CS/min | Dmg share | Kill particip. | Archetype |
|---|---|---|---|---|---|---|---|
| TOP | 2 | 3 | 4 | 8.4 | **22 %** | 55 % | Island carry / tank split |
| JNG | 2 | 3 | 7 | 6.8 (incl. camps) | **17 %** | **72 %** | Facilitator, highest KP |
| MID | 3 | 2 | 5 | 8.8 | **25 %** | 65 % | Primary carry |
| BOT (ADC) | 3 | 2 | 5 | 9.2 | **27 %** | 68 % | Primary carry, top CS/min |
| SUP | 1 | 3 | 9 | 1.4 | **9 %** | **70 %** | Utility, top assists |

- Checks: dmg shares sum to 100 %; team kills/game ≈ 15–17 (LCK avg); KP denominator = team kills.
- Carries (MID/BOT): high kills + dmg share ~25–27 %. Utility (SUP): assists ≈ kills × 8–9, dmg < 10 %. JNG: KP leader despite lowest CS/min meaningfully comparable (jungle camps).
- Per-game stat generation: kills ~ Poisson(λ = role median), deaths ~ Poisson + 0.5, assists ~ Normal(role med, σ 2.5); CS = cs/min × duration × Normal(1, 0.06).

---

## 8. RECOMMENDED CALIBRATION TABLE (engine constants)

| Constant | Unit | Recommended value | Basis |
|---|---|---|---|
| `SERIES_BO3_DECIDER_RATE` | prob. | **0.36** | MEASURED §2 (56/154) |
| `SERIES_BO3_SWEEP_RATE` | prob. | **0.52** | MEASURED §2 (98/188; BO3-only 98/154 ≈ 0.64 — use 0.64 for BO3 sims) |
| `GAMES_PER_BO3` | games | **2.63** | MEASURED §2 |
| `GAME_DURATION_MEDIAN` | min | **35** | MEASURED §3 (≈36 est.) rounded to public norm |
| `GAME_DURATION_SD` | min | **8** | MEASURED §3 spread |
| `GAME_DURATION_MIN` / `MAX` | min | **20 / 65** | MEASURED §3 (pause outliers excluded) |
| `FAVORITE_GAME_WINP` (10 pp WR gap) | prob. | **0.60** | MEASURED §4 |
| `ELITE_VS_BOTTOM_GAME_WINP` | prob. | **0.72** | MEASURED §4 (GEN 74 % vs DNS 32 %) |
| `GOLD_DRIFT_PER_MIN` | gold/min to winner | **+300** | FALLBACK §5 |
| `GOLD_STEP_SD_PER_5MIN` | gold | **1 200** | FALLBACK §5 |
| `OBJECTIVE_FIGHT_SWING` | gold | **1 500–2 500** | FALLBACK §5–6 |
| `COMEBACK_RATE_POST15` | prob. | **0.25** | FALLBACK §5 |
| `BLOWOUT_RATE` (8k+ lead @20) | prob. | **0.15** | FALLBACK §5 |
| `FIRST_BLOOD_MIN` | min | **5 (range 3–7)** | FALLBACK §6 |
| `FIRST_DRAGON_MIN` | min | **7** | FALLBACK §6 |
| `FIRST_BARON_FIGHT_MIN` | min | **21** | FALLBACK §6 |
| Role `KDA_LAMBDA`, `CS_PER_MIN`, `DMG_SHARE`, `KP` | per §7 | **table §7** | FALLBACK §7 |
| `TEAM_KILLS_PER_GAME` | kills | **16** | FALLBACK §7 (sums must reconcile: Σ role K ≈ team kills; Σ dmgShare = 1.0 per side) |

### Mapping to sim shapes
- `goldTimeline: [{t, diff}]` — build with drift + noise + objective jumps (§5); force final sign = winner; close games stay within ±3k through 25:00 (~35 % of sims), blowouts break 8k by 20:00 (~15 %).
- `PlayerPerf {role, kills, deaths, assists, cs, dmgShare, kp, rating 0–10, mvp}` — sample from §7; `rating` ≈ 5 + (KDA share + dmg share + KP z-score), clamp 0–10; `mvp` = highest rating on winning side (usually MID/BOT, sometimes JNG/SUP by KP).

---

## 9. Gaps & estimates (explicit)

1. **No live frames at all** — gold curve, objective timestamps, KDA/CS/damage-share are fallback estimates (LOW confidence), not LCK-2026 measurements. Re-run the feed chain during a live match (LCK returns Jan 2027, or any live `type: match` event) to replace §5–§7 with measured numbers.
2. **Durations include draft** — the −9 min draft/post offset is an estimate; shape (median/p10/p90) is measured, absolute in-game minutes are ±3 min uncertain.
3. **No per-game winner in persisted payloads** — blue-side win rate and winner-gold-sign dynamics could not be derived; assumed 50/50 side balance pending live data.
4. **Series outcomes derived from `gameWins`** (no draws in LoL — safe) since `outcome` is absent on completed-event payloads.
5. Standings endpoint returns bracket matches, not W/L tables — team strength uses aggregated `gameWins` (§4) instead.
