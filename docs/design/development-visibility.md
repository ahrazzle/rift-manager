# Development visibility: design and build brief

**Status:** APPROVED design (implement next). Spec only in the landing PR. No gameplay code in that PR.
**Owner seat:** grk-joi (gamedev). Implement: grk-smith. Proof: grk-proof.
**Canon base:** `main` @ `5f164f4` (audit). Engine already ships `developPlayer`. This work is **visibility only**.
**North star:** prepare → decide → watch → adjust. Show the player what already happened or will plausibly happen. Do not invent a second growth system.

Related: `docs/roadmap.md` (Player development Near), `src/data/development.js`, `ADVANCE_SEASON` in `src/game/useGameState.js` (~1135+), `docs/career-mode-design.md`.

---

## 0) Why this exists

Career already ages players and rolls annual OVR via `developPlayer` on `ADVANCE_SEASON`. The UI almost never shows age or potential. After Advance, the player lands on a fresh Hub with press, dilemma, and academy modals, and **no growth message**. Feedback asked for development. The gap is visibility and agency, not a missing engine.

---

## 1) Player loop (what changes for the coach)

| Beat | Before | After this feature |
| --- | --- | --- |
| Prep (Lineup / Squad / Market) | OVR and tags. Age only in academy modal. | Age where helpful. Exact potential on Squad, Market FA, and academy. Lineup shows a short growth **outlook** only. |
| Decide (sign, promote, start) | Guess who still has runway. | Exact Pot on deep cards. Outlook on Lineup so starter picks respect ceiling vs rising kids. |
| Watch (Advance Season) | Silent roster rewrite plus press. | Career-only dismissible **Offseason report** on Hub/Dashboard: ±OVR, ages, ceilings, reshuffles, releases, AI churn. |
| Adjust | Next season with no memory of the tick. | Dismiss or next Advance clears the report. Decisions use the new sheet. |

Season mode does **not** gain annual growth. Hide or label outlook so Season never implies yearly growth that never runs.

---

## 2) Locked product rules (do not invent)

### Cards: age and potential

| Surface | Age | Exact potential | Growth outlook hint |
| --- | --- | --- | --- |
| Lineup (`PlayerRow` / chips) | Show | **No** | Yes (Career only, or labeled so Season is honest) |
| Squad | Show | Show | Optional (same helper OK) |
| Market FA cards | Show | Show | Optional |
| Academy modal / detail | Already shows age | Show | Optional |

Outlook labels (derived only, no new RNG): examples are `rising`, `steady`, `declining`, `at ceiling`. Derive from the `growthByAge` band for current or next age plus `ovr` vs `potential`. Prefer a shared pure helper (for example `growthOutlook(player)`) next to `development.js`.

### Engine honesty (already true. UI must not contradict)

- **Potential never changes** (`developPlayer` keeps `potential`).
- **`ageCeiling(age, potential)` ignores age.** It is `Math.min(POTENTIAL_CEILING, potential)`. Do not claim age-based caps in copy or tooltips.
- Growth uses `Math.random` on the off-season path (not the seeded match path). Outcomes cannot be recomputed later without a captured report.

### Out of scope (explicit)

- New growth rules, tables, or trait behavior
- Chemistry meter or mentoring / playing-time OVR paths
- Season-mode annual growth
- Replacing press / dilemma / academy modals with the report

---

## 3) Offseason report (Career only)

### When

Capture inside `ADVANCE_SEASON` **before and after** each `developPlayer` call, and after contract releases, `defaultLineup`, and AI churn, so the report matches what the RNG actually did. Persist on state (suggested field: `state.offseasonReport`). Clear on dismiss action or on the next successful `ADVANCE_SEASON`. `load()` backfills a missing key to `null` for old saves.

### Where

Dismissible **Hub / Dashboard panel** (not a modal). It must not fight `press`, `pendingEvent` (dilemma), or `pendingPromotion` (academy). Those modals stay. The report sits on the desk underneath or beside readiness copy.

### Full board contents

1. **Roster deltas.** Managed team: each player ±OVR with new age. Call out **at ceiling** when `ovr >= potential` (or equal after clamp).
2. **One-season-wonder spikes.** Only if the trait is `revealed`. Do not spoil hidden OSW.
3. **Starter / bench reshuffles.** Compare pre-advance lineup ids to post-`defaultLineup` starters. Name who lost or gained a start.
4. **Releases.** Managed players dropped to FA on expired contracts.
5. **AI churn notes.** Brief lines for which AI teams cut or signed (already computed in the reducer loop). One or two lines, not a novel.

No report in Season, Campaign, or Gauntlet. Guard: only set when `mode === 'career'` and advance succeeds. On sacked early-return, prefer omit (sacked UI already owns that beat).

### Suggested state shape (implementer may rename fields. Keep semantics.)

```
offseasonReport: null | {
  seasonIndexCompleted: number,   // season that just ended
  roster: Array<{
    id, name, role,
    ageBefore, ageAfter,
    ovrBefore, ovrAfter,
    potential,                // unchanged; shown for at-ceiling
    atCeiling: boolean,
    oswSpike: null | number,  // only if revealed this tick or visible
  }>,
  lineupChanges: Array<{ role, outId, outName, inId, inName }>,
  released: Array<{ id, name, role, ovr }>,
  aiChurn: Array<{ teamId, cutName, signedName, role }>,  // may be empty
}
```

UI action: `{ type: 'DISMISS_OFFSEASON_REPORT' }` sets `offseasonReport: null`. No-op if already null.

---

## 4) Data and UI surfaces to touch (implementation map)

| Area | Likely files | Change |
| --- | --- | --- |
| Outlook helper | `src/data/development.js` (or tiny sibling) | Pure `growthOutlook`. Unit tests. |
| Capture report | `src/game/useGameState.js` `ADVANCE_SEASON` | Snapshot before develop. Assemble after churn and lineup. `load()` backfill. Dismiss action. |
| Lineup | `src/components/Lineup.jsx`, maybe `PlayerTags.jsx` | Age and outlook. **No** exact Pot. Career-aware labeling. |
| Squad | `src/components/Squad.jsx` | Age and exact Pot. |
| Market | `src/components/Market.jsx` | Age and exact Pot on FA cards. |
| Academy | `src/components/CareerModals.jsx` | Exact Pot beside existing age line. |
| Hub panel | `src/components/Dashboard.jsx` and styles | Dismissible offseason panel. Career only. |
| Copy / guide | `docs/GUIDE.md` (short) | What age, Pot, and outlook mean. Career-only growth. |

Do not change `developPlayer` math unless a bug blocks capture. Prefer reading existing fields.

---

## 5) Acceptance checks

1. **Career Lineup:** each row shows age and an outlook chip or text. Exact potential is absent.
2. **Season Lineup:** no false yearly-growth promise (hidden outlook, or explicit "Season mode: no annual growth").
3. **Squad, Market FA, and academy detail:** age and exact potential visible. Potential matches state (unchanged across Advance).
4. **Advance Season (Career):** after a successful advance, Hub shows the offseason panel with ±OVR, ages, at-ceiling callouts, lineup reshuffles when they occur, releases when they occur, and brief AI churn when churn ran.
5. **OSW:** spike line appears only when `revealed`. Hidden OSW never named as a spike.
6. **Dismiss:** dismiss clears panel. Next Advance replaces or clears per spec (no stacked stale reports).
7. **Old saves:** load without `offseasonReport` yields `null`. No throw. Season and Campaign unchanged.
8. **Modals:** press, dilemma, and academy still open as today. Report is not a fourth modal.
9. **Copy:** tooltips never say age caps potential. Never call the feature a chemistry or mentoring system.
10. **Tests:** reducer captures report under injected or math path as needed. UI tests for visibility rules. Existing `p0-engine` developPlayer and ADVANCE_SEASON assertions stay green.

---

## 6) Failure modes

| Risk | Mitigation |
| --- | --- |
| Recomputing deltas later from state alone | Capture in reducer. RNG is gone. |
| Report fights modals | Panel on Hub, not modal. |
| Season players think kids grow next year | Career-only outlook or honest label. |
| Tooltip claims age ceiling | Align copy with `ageCeiling` = potential clamp only. |
| Spoiling OSW | Gate on `revealed`. |
| CHANGELOG / roadmap merge conflicts | Append-only CHANGELOG. Small Near roadmap tweak. |
| Silent empty panel when nothing moved | Still show ages, ±0, and "no AI churn" rather than a blank card. |
| Sacked advance early-return | Do not leave a half-built report on sacked state. |

---

## 7) Honesty pass

- Growth is **Career and Advance Season** only. Say so in Guide and outlook labeling.
- Potential is a fixed rating cap in data, not a promise the club unlocks.
- No fake chemistry, cohesion meter, or mentoring tree in this slice.
- Ratings remain fictional and game-balanced (existing project rule).
- Do not claim the game is "open source" in any related site copy until a license exists (see Follow-up).

---

## 8) Hand-off for grk-smith (implement)

**Proof before merge:** grk-proof runs suites and a Career Advance playthrough checklist (§5).

**Files to touch (expected):**

- `src/data/development.js` (plus tests): outlook helper only unless capture helpers fit here
- `src/game/useGameState.js`: capture, dismiss, `load()` backfill
- `src/components/Lineup.jsx`, `PlayerTags.jsx` (if chips live there)
- `src/components/Squad.jsx`, `Market.jsx`, `CareerModals.jsx`
- `src/components/Dashboard.jsx` plus CSS
- `docs/GUIDE.md` (short honest blurb)
- `CHANGELOG.md` append on the **implementation** PR (this design PR already logs the spec)

**Test suites to keep green and extend:**

- `test/p0-engine.test.mjs`: developPlayer, ADVANCE_SEASON age and potential invariants
- `test/p1.test.mjs`: career, academy, and OSW interactions as applicable
- `test/p0-ux.test.mjs`: modal and hub UX. Add dismiss and panel presence cases.
- Targeted new tests for outlook purity and report shape. Today Advance uses `Math.random`. Prefer capturing observable before and after in the reducer test harness the way p0-engine already advances. Inject rng later only if needed.

**Out of branch:** site About/Community copy (Follow-up below). Footer contribute invite already ships. Do not expand site marketing in the gameplay PR.

---

## 9) Follow-up (separate PR: copy outline only)

**Do not implement in the development-visibility gameplay PR** unless a one-line link is already trivial and reviewed alone.

User direction: live site should carry contribution framing drawn from the Reddit post. Ship **both** a short footer pitch and a fuller About / Community page.

### Already shipped (do not regress)

- Footer and New Game contribute invite (`SiteFooter.jsx`, `siteLinks.js`): public GitHub repo and CONTRIBUTING link. Riot Data Dragon disclaimer. **No** "open source" licensing claim.

### Later PR: About / Community page (outline)

1. **What it is.** Browser LoL esports management sim. Prepare → decide → watch → adjust. Play free at the live URL.
2. **Modes.** Season, Career, Scenario, Gauntlet. Optional Draft / IGL / show-sim (plain words, one sentence each).
3. **Free and public repo.** Link `https://github.com/ahrazzle/rift-manager`. Say the source is public and that PRs, issues, and discussions are welcome.
4. **Agent-friendly contribute.** Point at `CONTRIBUTING.md`, Discussions vs issues, small focused PRs, tests for behavior, and old saves that must load.
5. **Feedback asks.** What hurt, what sang, what you want next (development visibility, transfers depth, morale consequences). Do not pitch a chemistry meter.
6. **Art / TOS.** Riot portraits and names are third-party. Want original icons and crests when possible. Do not claim Riot assets as original project art.
7. **License line.** Until a license file exists: **never** say "open source." Prefer "public repository" or "source on GitHub."

### Later PR: footer pitch refresh (outline)

Keep the existing "Help shape the game" block. Optional short add: one sentence that an About/Community page exists (internal route or docs page), still without an OSS claim. Prefer linking CONTRIBUTING and Discussions over a manifesto in the footer.

### Sibling note

If the About page needs a longer draft, land `docs/design/about-community-copy.md` in that second PR (or as a sibling docs note linked from the PR body). This file only locks the outline so marketing work does not block smith's visibility build.
