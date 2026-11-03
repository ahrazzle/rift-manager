# MOBA Trainer (mobatrainer.com) — Recon for Rift Manager

Date: 2026-10-10. Method: text fetch + search (no live browser available to this agent;
interactive app pages are JS-rendered and could not be inspected mechanically).

## 1. What it is

MOBA Trainer is a League of Legends training platform built around **puzzles authored by
7 Challenger players/coaches**: 51 macro patterns, 360+ champion drills, plus a data
section (per-role tier lists and champion build pages refreshed every patch from merged
u.gg + op.gg Emerald+ ranked data). The loop is: pick your role, solve decision puzzles,
get graded against the modeled win rate and the Challenger-authored answer. Rating 4.8
(1024 ratings); community via YouTube endorsements.

## 2. Tools / features found

- **Draft puzzles** (`/draft-puzzles`, JS app — mechanics not directly observable): "Win the
  game in champion select. Read both teams and lock the pick the data agrees with."
  Per the homepage, every solve shows a **modeled win rate** for your pick and **what a
  Challenger would have picked**. This is the closest analog to our active-coach draft mode.
- **Macro pattern map**: 51 patterns plotted on a visual map of Summoner's Rift, ranked
  Iron → Challenger. Opening a node shows a video/text breakdown, then a "Practice" button
  drills it. (Structure observed from homepage copy; node contents not fetchable as text.)
- **Champion drills (360+)**: per-champion 1v1 matchup guides from one-tricks, structured
  as ability-level rules, e.g. vs Darius as Volibear: dodge E with ult on prediction,
  stand ground when W-marked + Ghost, sidestep Q edge with Q, never stand still vs stacked
  passive. Format = matchup → 3–5 concrete if/then rules.
- **Per-role tier lists** (`/lol/tier-list/{top,jungle,mid,adc,support}`, updated per patch):
  S+ → D buckets, each row = rank, champion, tier, win rate, pick rate, ban rate, tier
  movement vs last patch. Includes "most ban-worthy" callouts per role.
- **Champion build pages** (`/lol/champions/{name}/{role}`): highest-win-rate runes, summoners,
  skill order, item build (starter/core/boots/situational with pick rates), plus a
  **matchup section**: hardest matchups with your win rate in each (e.g. "Kayn 51.5%"),
  easiest matchups, and blind-pick advice ("S+ tier: can blind in most drafts" vs
  "B tier: works best as counter/comfort pick").
- **ARAM / Arena tier lists**: same data engine applied to alt modes.

## 3. Scoring / evaluation logic (as observed)

- **Tier scoring**: composite formula over **win rate + pick rate + ban rate within a role**,
  bucketed S+ → D. Cross-validates u.gg against op.gg ("100% multi-source coverage").
- **Draft puzzle grading**: your pick is scored by a **modeled win rate** (data-driven, not
  vibes) and compared to the Challenger-authored pick. Two feedback channels: quantitative
  (win-rate delta) + expert (what the pro would have done).
- **Matchup scoring**: pairwise win rates per role matchup, used to label picks as
  blind-pickable (S+), counter-pick-only (B), or ban-worthy (high ban rate + high WR).
- **Macro patterns**: ranked by skill tier (Iron → Challenger), i.e. difficulty/impact
  laddering rather than a single score.
- Could not verify: whether draft puzzles use the official pro pick/ban order, how many
  champions are in the draft pool, how the "AI"/opponent side drafts, or whether any tool
  sits behind login/paywall (all data pages are public; the app pages are JS-only).

## 4. Stealable design ideas

### (a) Interactive pick/ban draft vs AI coach

1. **Live draft score from three signals** (mirrors their modeled-win-rate feedback):
   after every pick show `draftScore = patchTier(champ) + synergy(my comp) − counterRisk(enemy picks)`.
   Patch tier comes from a per-patch S+→D table; synergy is role-comp archetype matching
   (engage/poke/split); counterRisk uses a small matchup matrix (hardest-matchup win rates).
   The player sees the number move in real time — same dopamine as their solve screen.
2. **Post-draft debrief: "what the challenger would have picked."** At each of your pick
   turns, record the data-optimal pick; after the draft, show your pick vs optimal with the
   win-rate delta. Cheap to implement (argmax over the same scoring function), high
   coaching-game feel.
3. **Data-driven AI bans.** Their tier lists publish "most ban-worthy" per role by ban rate.
   AI coach ban heuristic: ban 1–2 of the player's highest-tier comfort picks + fill with
   S+ meta picks. Feels intelligent, needs only the tier table.
4. **Official order + role lock.** Run the real pro sequence (6 bans, 1-2-2-2-2-1 picks) with
   roles pre-assigned per team; the AI's pick logic = argmax(draftScore) with a small
   randomness term scaled by coach rating (better AI coaches draft closer to optimal).

### (b) IGL decision mode (macro calls)

1. **Decision cards from a pattern library** (their 51-pattern map, restructured): each
   IGL call is a card — e.g. "Trade drake for Herald", "Force Baron at 22:00 when ahead",
   "1-3-1 split vs 5v5 group", "Support roams mid vs stays bot". Each card lists its
   **trigger conditions** (gold diff band, objective timers, numbers advantage). Present
   2–3 legal cards per decision point based on live game state.
2. **Grade against the state-optimal call** (their puzzle grading, adapted): every decision
   point has a correct answer derived from game state (ahead + Baron up → Baron; behind +
   Drake soul point → contest or trade). Score the player, then reveal a one-line
   Challenger-style rationale. This is the whole mode: state → choice → grade → explain.
3. **Immediate gold-swing feedback.** Their puzzles show modeled win rate per solve; ours
   shows the gold/objective swing your call produced vs the optimal call's swing, then
   folds it into the existing gold timeline. Ties IGL mode directly into the match engine
   we already have (goldTimeline diffs).

## 5. Data-source notes

- **Tier lists** (`/lol/tier-list/{role}`): per-patch win/pick/ban rates, Emerald+, u.gg +
  op.gg merged. Usable as a champion-strength table per patch. Caveat: solo-queue data,
  not pro — directional for a pro-draft sim, not gospel.
- **Build pages** (`/lol/champions/{name}/{role}`): pairwise matchup win rates
  ("hardest/easiest matchups") — the raw material for a counter-pick matrix.
- **Champion images**: hotlinked from `ddragon.leagueoflegends.com` (Riot's official free
  data CDN) — we can use the same CDN for champion portraits rather than scraping them.
- **Patch cadence**: pages re-merge data every patch (~Oct 9, 2026 → Patch 26.20 at time
  of check), so the data is fresh enough to key our champion-strength table off "current
  patch" if we ever want live-ish values. (Scraping ToS not reviewed — treat as reference,
  not a pipeline, until checked.)
- **Not available**: pro pick/ban order details, the draft puzzle's internal AI logic, and
  macro-pattern node contents — all behind the JS app; would need a live-browser pass.
