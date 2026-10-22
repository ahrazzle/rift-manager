# LCK Manager (lolsim) — Collaboration Changelog

Append-only per the project-files SOP. One line per change:
`<UTC timestamp> | <seat> | <file> | <what changed + notes for other agents>`

---

2026-10-05T00:00:00Z | proteus | HANDOFF.md | created project overview + continuing-guide for other ASKA agents; points to docs/ for design history and docs/DEPLOY-AND-CONTINUE.md for ops
2026-10-05T00:00:00Z | proteus | docs/DEPLOY-AND-CONTINUE.md | created ops runbook: live vs staging deploy, .vercel/project.json stickiness pitfall, P1→live promotion, verification
2026-10-05T00:00:00Z | proteus | CHANGELOG.md | initialized vault handoff log
2026-10-05T00:00:00Z | proteus | (whole tree) | copied live-ready repo (branch staging @ f8632ef = full P1; main @ 52a2e0e = P0/live) into vault; excluded .git, node_modules, dist, .vercel, .env* (secrets stay out of vault). Repo has NO GitHub remote — local + Vercel is source of truth.
2026-10-05T00:00:00Z | proteus | HANDOFF.md | uploaded full tree directly to online Drive via API (bypassing local sync); then added "Why this exists — owner's intent & vision" section capturing Ahraz's goals from this session's prompts/directives

2026-10-10T07:54:53Z | chief | (overhaul) | full broadcast-visual + engagement overhaul, shipped to staging: new styles.css (LCK red/gold arena theme, cards/buttons/tables/forms, mobile + reduced-motion), src/game/hype.js (NEW: derived streaks/fan mood/rivalry/standings-context/headlines/coach notes/15 achievements/MVP — zero state changes), src/components/Matchday.jsx (NEW: walkout→game-by-game→verdict reveal w/ confetti + skip), Dashboard.jsx (rewritten: matchup hero, win% + Why-panel, hype meter, headlines, trophy cabinet, toasts, result view), App.jsx (season progress rail, streak pill, global career modals, season-replay reachable), Tournament.jsx (resolver picker UI + matchday reveal), Standings.jsx (MSI/Worlds qualification colors), NewGame.jsx (hero polish), Results.jsx (lazy recompute perf), ai.js (tier override for non-LCK leagues), useGameState.js (bigMatch arms SF/F only — was always-true; PLAYOFFS uses tournament reducer path), MatchDetail.jsx (recomputeGames passes simMode/forcedWinner). All 11 node suites green; base './' kept. Deployed to lck-manager-staging, live at /staging/.

2026-10-10T08:02:21Z | chief | (playtest fixes) | fixed 3 bugs from staging playtest: (1) MatchDetail CoachRead leaked debug text "(simulated)" — rewritten as natural tactic suggestion; (2) standings GW/GL misattributed on away wins (aWins/bWins are home/away-relative, were credited to winner/loser rows unmapped — e.g. 3x 2-0 showed GW4 GL2); (3) win-% disagreed across Dashboard hero / Strategy tab (5 separate MC draws) — now single deterministic seeded estimate (matchupSeed+matchupOppTactic+seededRng in logic.js) so all panels agree exactly. Data: fixed duplicate names (T1 JNG sub Gumayusi->Yohan, GEN MID sub Peyz->Grizzly, GEN BOT sub Ruler->Kuma; Ruler now FA-only). UI: Fearless Draft is now an ON/OFF option row; MatchDetail back-button shares a row with the series header. All 11 suites green; redeployed to staging.
