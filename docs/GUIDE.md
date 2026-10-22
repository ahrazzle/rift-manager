# How to Play LCK Manager

LCK Manager is a team-management sim for League of Legends esports. You coach one of the 10 LCK teams through a season. You pick the lineup, set tactics, train players, and sign free agents. The matches simulate themselves. You win by making better roster and tactic calls than the AI coaches.

Player ratings are fictional values tuned for the sim, not real player stats.

## Start a season

1. Enter your coach name.
2. Pick one of the 10 LCK teams. Stronger teams have higher tier ratings. T1 and Gen.G start near the top. BRION and Fox start near the bottom.
3. Press Start Season.

The season is a single round-robin: 9 weeks, one series per week. You face each of the other 9 teams once. Every series is a best-of-3. A series win gives your team 1 point in the standings.

## Your week, step by step

Each week follows the same loop:

1. Open the Dashboard. It shows your next opponent and your estimated win chance.
2. Check the Lineup tab. Confirm your 5 starters.
3. Check the Tactics tab. Pick a style and a phase.
4. Optional: press Train Starters. This gives your 5 starters +4 form once per week.
5. Press Play Week. All 5 series of the week simulate at once, including yours.

Form changes after every week. Starters on the winning side gain form. Starters on the losing side lose form.

## The screens

**Dashboard.** Season progress, your next matchup with an estimated win chance, this week's fixtures, and the Play Week button. When the season ends it shows your final record.

**Lineup.** One starter per role: Top, Jungle, Mid, Bot, Support. Each role has a starter and a sub. Click a player to start them. Each player shows OVR (overall), MEC (mechanics), MAC (macro), and CON (consistency), plus current form. Mid and Bot carry slightly more weight in the sim. Support carries slightly less.

**Tactics.** Two choices that apply to every game of your next series.

Style:

- Aggressive: a small strength bonus, but results swing more. More kills and fights, more upsets both ways.
- Balanced: a tiny bonus, average swing. The safe default.
- Defensive: no bonus, but results are steadier. Fewer blowouts.

Phase (game timing):

- Early Game: built to snowball lanes.
- Mid Game: built to fight around objectives. Neutral against everything.
- Late Game: built to scale to carries.

Early beats Late and Late beats Early, so phase is a guessing game against the enemy coach. Mirror picks cancel out.

**Standings.** The full table: series wins and losses, points, and individual game record. 1 point per series win.

**Results.** Every played series, newest first, with the score and a short match log. Your games carry a WIN or LOSS tag.

**Market.** A pool of 12 free agents across all roles. Signing one adds them to your roster and starts them at once. The pool only shrinks, so sign early if a role needs help.

## How a match simulates

Each game starts from team strength: your five starters' ratings, weighted by role, plus macro, form, and your style bonus, plus the phase edge. The sim turns the strength gap into a win chance and draws the winner game by game, first to 2. Stronger teams win more often. They never win always. An Aggressive underdog can still take a series.

Your Dashboard preview runs this sim 500 times and shows the result as a percent. Treat it as a forecast, not a promise.

AI opponents field their best lineup. Strong teams lean Aggressive or Balanced. Weak teams lean Defensive or Balanced.

## Read the Match detail

Open any result and expand Match detail. Each game of the series shows a gold graph, per-player grades, an event timeline, and a coach read.

Each game of the series gets its own card, most recent game first:

- **Gold graph.** Your gold lead or deficit across game time. Above zero means you are ahead. Markers flag kills, towers, dragons, teamfights, barons, and aces.
- **Player performance.** All 10 players, matched by role so Top faces Top. Each line shows KDA, CS, damage share, kill participation, and a 0-10 rating. A star marks the MVP, always on the winning side.
- **Events.** The game as a timeline: what happened, when, and to whom.
- **Coach read.** One or two lines on what went wrong or right, with a tactic suggestion for the next game.

## Strategy tips

- **Train every week.** It is free form for your starters. There is no reason to skip it.
- **Rotate after losses.** Losing drops starter form. If a starter's form tanks, give the sub a week.
- **Counter the phase.** Late is common, which makes Early a good default. If Early keeps failing, switch it up.
- **Underdogs go Aggressive. Favorites stay Balanced.** Variance helps the weaker side and hurts the stronger one.
- **Fix your worst role first.** Check the Market for an upgrade at that role before patching anything else.
- **Read the graph, not the score.** A 1-2 loss where you led early is a timing problem, so change phase. A 0-2 where you never led is a strength problem, so change players.

## Coming next

Two bigger modes are on the way: historical-year seasons with past rosters, and short campaign challenges built around storylines. For now, one season at a time. Win the LCK.
