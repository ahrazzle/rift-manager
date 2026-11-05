# About / Community — locked copy

**Status:** Implement with the About/Community UI PR.  
**Owner seat:** grk-joi (design + this ship). Proof: grk-proof.  
**Surfaces:** In-app About / Community page (modal), linked from **footer + New Game only**. No main nav tab.  
**Canon base:** `docs/design/development-visibility.md` §9; Reddit contribute post; shipped `SiteFooter` + `siteLinks.js`.

Live play URL: https://www.rift.askaconsult.com/  
Public repo: https://github.com/ahrazzle/rift-manager  
No software license file yet — never say “open source.” Prefer “public repository” / “source on GitHub.”

---

## Footer pitch (short)

**Heading:** Help shape the game

**Body:** Free LoL esports management sim — prepare, decide, watch, adjust. Source is public on GitHub. Issues, discussions, and focused pull requests welcome.

**Links:** About / Community (in-app) · GitHub repository · Contributing guide

**Disclaimer (honest to main):** League of Legends names are Riot Games trademarks used as third-party references. Champion portraits, when shown in draft or map display, load from Riot’s Data Dragon CDN with initials or role-icon fallbacks. Club crests and many UI glyphs are original project art. Not affiliated with Riot. Original champion icons and crests are welcome.

---

## About / Community page beats

### What it is

Rift Manager is a free browser League of Legends esports management sim. You coach a club through the loop **prepare → decide → watch → adjust**. Play at https://www.rift.askaconsult.com/.

### Modes

- **Season** — one full split: weeks, playoffs, MSI, Worlds.
- **Career** — multi-season dynasty with aging, contracts, and board pressure.
- **Scenario** — short authored story campaigns.
- **Gauntlet** — escalating BO ladder; one loss ends the run.
- **Draft / IGL (add-ons)** — optional pick/ban and one macro call per game; Show simulation watches the map without changing the result.

### Public repo

Source lives at https://github.com/ahrazzle/rift-manager. The repository is public. Pull requests, issues, and discussions are welcome. Until a license file exists, do **not** call the project open source.

### Agent-friendly contribute

Point players and contributors at `CONTRIBUTING.md`. Prefer Discussions for open-ended ideas; issues for bugs and concrete work. Keep PRs focused. Add or update tests for behavior changes. Keep old saves loading.

### Feedback asks

Tell us what hurt, what sang, and what would keep you coaching: draft feel, player development visibility, transfers with real tradeoffs, morale and board consequences. Do **not** pitch a chemistry meter.

### Art / TOS

Third-party League names. Portraits and glyphs as actually shipped (Data Dragon portraits where used; original crests/glyphs elsewhere). Invite original champion icons and team crests. Do not claim Riot assets as original project art. Not affiliated with Riot Games.

### License line

No license file yet. Say public repo / source on GitHub only.

---

## New Game entry line

Keep the short public-source invite. Add an in-app **About / Community** control beside the existing GitHub / contributing links. Do not add a main nav tab.
