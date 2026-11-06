// Broadcast Night Phase 3: Hub data + Result-stage snapshot (pure), and render
// tests for HubHero, the Hub inbox press item, and ResultStage (win / loss).
// Run: node test/hub-result.test.mjs
import { mkdtemp, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import React from 'react'
import { create, act } from 'react-test-renderer'
import { reducer, mulberry32, orderStandings } from '../src/game/useGameState.js'
import {
  revertStandings, positionOf, playoffGap, seriesOutcome, seriesChanges, seriesMvp,
  gameRows, upNext, findSeriesResult, mvpLine, lookAtNote, formChange, ordinal,
} from '../src/game/seriesSnapshot.js'
import { fanMood } from '../src/game/hype.js'
import { readiness, inboxItems, oddsWord, tableRows, pressAnswers, nextMatch } from '../src/components/hub/hubData.js'
import { takeNewAchievements, resetHubMemory, setPrepIntent, takePrepIntent } from '../src/components/hub/hubMemory.js'

let failures = 0
const check = (c, m) => { if (!c) { console.error('FAIL:', m); failures++ } else console.log('ok  :', m) }
const textOf = (node) => typeof node === 'string' ? node : (node?.children || []).map(textOf).join('')

function season(seed, rounds, mode = 'season') {
  Math.random = mulberry32(seed)
  let s = mode === 'career'
    ? reducer(undefined, { type: 'START_CAREER', teamId: 'T1', managerName: 'Test' })
    : reducer(undefined, { type: 'NEW_GAME', teamId: 'T1', managerName: 'Test' })
  for (let i = 0; i < rounds; i++) s = reducer(s, { type: 'PLAY_ROUND' })
  return { ...s, press: { pending: false } }
}
function played(base, wantWin) {
  for (let seed = 1; seed < 300; seed++) {
    Math.random = mulberry32(seed * 31)
    let s = reducer(base, { type: 'PREVIEW_MATCH', action: { type: 'PLAY_ROUND' } })
    s = reducer(s, { type: 'MATCH_START' })
    const m = s.matchSession
    const won = m.context.userSide === 'away' ? m.bWins > m.aWins : m.aWins > m.bWins
    if (m.stage === 'result' && won === wantWin) return { pre: base, post: s }
  }
  throw new Error('no outcome')
}

// ---------- seriesSnapshot: pure ----------
const base = season(7, 2)
const { pre, post } = played(base, true)
const session = post.matchSession
const res = findSeriesResult(post, session.context)
check(res && res.round === pre.round, 'findSeriesResult finds the week just played')
const reverted = revertStandings(post.standings, post.results.filter((r) => r.round === res.round))
check(JSON.stringify(reverted) === JSON.stringify(pre.standings), 'revertStandings restores the pre-series table exactly')
check(positionOf(pre.standings, 'T1') === orderStandings(pre.standings).findIndex((r) => r.teamId === 'T1') + 1, 'positionOf matches orderStandings')
check(typeof playoffGap(post.standings, 'T1') === 'number', 'playoffGap is a number in a 10-team league')
check(playoffGap({ a: { teamId: 'a', points: 1, gameWins: 0, gameLosses: 0 } }, 'a') === null, 'playoffGap is null without a line')
check(ordinal(1) === '1st' && ordinal(2) === '2nd' && ordinal(11) === '11th' && ordinal(23) === '23rd', 'ordinal')

const out = seriesOutcome(post, session)
check(out.won === true && out.userId === 'T1' && out.score[0] === 2, 'seriesOutcome: user win, user score first')
check(out.stageLabel === `Week ${pre.round}`, 'seriesOutcome labels the played week, not the next one')
const mvp = seriesMvp(session.games, out.userSide)
check(mvp && mvp.played === session.games.length && mvp.killShare >= 0 && mvp.killShare <= 100, 'seriesMvp aggregates across games')
check(/kills/.test(mvpLine(mvp, session.games, out.userSide)), 'mvpLine is a factual sentence')
const tiles = seriesChanges(post, session, mvp)
const ids = tiles.map((t) => t.id)
check(['standings', 'hype', 'form', 'playoffs'].every((id) => ids.includes(id)), 'regional strip: standings, hype, form, playoff line')
check(!ids.includes('board') && !tiles.some((t) => /board/i.test(t.label)), 'no board tile (a series never moves board confidence)')
const hype = tiles.find((t) => t.id === 'hype')
check(Number(hype.value) === fanMood(post).pct && hype.delta === fanMood(post).pct - fanMood(pre).pct, 'hype delta equals fanMood after minus before')
const st = tiles.find((t) => t.id === 'standings')
check(st.value === ordinal(positionOf(post.standings, 'T1')), 'standings tile shows the post-series position')
const formT = tiles.find((t) => t.id === 'form')
check(Number(formT.value) === post.form[mvp.id] && /kickoff/.test(formT.note), 'form tile: now vs kickoff form for the MVP')
check(formChange(post, { context: { ...session.context, homeLineup: null, awayLineup: null } }, mvp) === null, 'form tile drops out when the session has no lineups (old save)')
check(seriesChanges(post, { ...session, context: { ...session.context, userSide: null } }).length === 0, 'spectator: no strip')
check(seriesChanges(post, { ...session, context: { ...session.context, kind: 'campaign' } }).length === 0, 'campaign: strip degrades to nothing')
const rows = gameRows(session.games, out.userSide)
check(rows.length === session.games.length && rows.every((r) => r.kills.length === 2), 'gameRows: one row per game with kills')
const nxt = upNext(post, session)
check(nxt && nxt.when === `Week ${post.round}`, 'upNext: the next regional week')
const loss = played(base, false)
const lossOut = seriesOutcome(loss.post, loss.post.matchSession)
check(lossOut.won === false && lossOut.score[0] < lossOut.score[1], 'seriesOutcome: loss from the user side')
check(lookAtNote(loss.post.matchSession.games, lossOut.userSide)?.title, 'lookAtNote gives a review note after a loss')
// Tournament tile from a bracket.
{
  let s = season(5, 9)
  let guard = 0
  while (s.phase === 'playoffs' && s.tournament?.status === 'active' && guard++ < 5) {
    const t = s.tournament
    const ri = t.rounds.findIndex((r) => r.matches.some((m) => !m.winner))
    const mine = t.rounds[ri].matches.find((m) => !m.winner && m.isUser)
    if (!mine) { s = reducer(s, { type: 'PLAY_TOURNAMENT_ROUND' }); continue }
    let p = reducer(s, { type: 'PREVIEW_MATCH', action: { type: 'PLAY_TOURNAMENT_ROUND' } })
    p = reducer(p, { type: 'MATCH_START' })
    if (p.matchSession?.stage === 'result') {
      const tt = seriesChanges(p, p.matchSession, null)
      check(tt.length === 1 && tt[0].id === 'bracket', `tournament strip shows the bracket outcome (${tt[0]?.value})`)
      break
    }
    s = reducer(p, { type: 'MATCH_CLOSE' })
  }
}

// ---------- hubData ----------
check(oddsWord(54) === 'Close match' && oddsWord(70) === 'Favoured' && oddsWord(30) === 'Underdog', 'oddsWord')
const r0 = readiness(base, { factors: [{ label: 'Tactics & gameplan', contribution: -1.5 }] })
check(r0.length === 3 && r0.find((r) => r.id === 'plan').tone === 'todo', 'readiness flags a costly game plan')
check(r0.find((r) => r.id === 'prep').href === '#weekly-preparation', 'readiness links Coach’s office to its anchor')
const later = season(9, 6)
const tr = tableRows(later)
check(tr.rows.length === 4 && (tr.extra == null || tr.extra.pos > 4), 'tableRows: top four plus your row only when below the line')
check(nextMatch(base)?.week === base.round, 'nextMatch is this week')
const pressState = { ...base, press: { pending: true } }
check(inboxItems(pressState).some((i) => i.kind === 'press'), 'press is an inbox item when pending')
check(!inboxItems(base).some((i) => i.kind === 'press'), 'no press item when not pending')
for (const a of pressAnswers(pressState)) {
  const after = reducer(pressState, { type: 'PRESS_ANSWER', answerId: a.id })
  check(after.board.confidence - pressState.board.confidence === a.board, `press "${a.label}" shows its real board effect (${a.board})`)
}
check(!pressAnswers(pressState).some((a) => 'hype' in a), 'press shows no hype effect (the reducer has none)')

// ---------- hubMemory ----------
resetHubMemory()
const fresh = season(3, 0)
check(takeNewAchievements(fresh).length === 0, 'first look records the baseline, no toasts')
const one = season(3, 1)
check(takeNewAchievements(one).some((a) => a.id === 'debut'), 'a new unlock is reported once')
check(takeNewAchievements(one).length === 0, '…and not again')
setPrepIntent('vision')
check(takePrepIntent() === 'vision' && takePrepIntent() === null, 'prep intent is taken once')

// ---------- render: HubHero, Hub press item, ResultStage ----------
const temp = await mkdtemp(new URL('./.hub-result-', import.meta.url).pathname)
try {
  const bundle = async (entry) => {
    const outfile = `${temp}/${entry.replaceAll('/', '-')}.js`
    await build({ entryPoints: [`src/components/${entry}`], outfile, bundle: true, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic', loader: { '.webp': 'file' } })
    return import(outfile)
  }
  const { default: HubHero } = await bundle('hub/HubHero.jsx')
  const { default: Dashboard } = await bundle('Dashboard.jsx')
  const { default: ResultStage } = await bundle('result/ResultStage.jsx')
  let tree
  const render = async (el) => act(async () => { tree ? tree.update(el) : (tree = create(el)) })
  const buttons = () => tree.root.findAllByType('button')
  const byText = (re) => buttons().find((b) => re.test(textOf(b)))

  const tabs = []
  await render(React.createElement(HubHero, {
    state: base, match: nextMatch(base), pct: 54, why: { prob: 0.54, preparation: 0, factors: [{ label: 'Rating edge', contribution: 3.2 }] },
    totalRounds: 9, onPlay: () => tabs.push('play'), setTab: (t) => tabs.push(t), dispatch: () => {},
  }))
  const play = byText(new RegExp(`^Play week ${base.round}$`))
  check(play && play.props['data-tour'] === 'tour-play-week' && !play.props.disabled, 'HubHero: one Play week N button carrying the tour anchor')
  check(tree.root.findAll((n) => n.props?.className?.includes?.('btn-primary')).filter((n) => n.type === 'button').length === 1, 'HubHero: exactly one primary')
  const heroText = textOf(tree.root)
  check(heroText.includes('Close match') && heroText.includes('Why 54%?'), 'HubHero: odds word and Why disclosure')
  check(tree.root.findAll((n) => n.props?.['data-tour'] === 'tour-matchup').length > 0, 'HubHero: tour-matchup anchor')
  check(tree.root.findAllByProps({ role: 'switch' }).length === 1, 'HubHero: Show simulation switch kept')
  await act(async () => byText(/^Review strategy$/).props.onClick())
  await act(async () => play.props.onClick())
  check(tabs.includes('strategy') && tabs.includes('play'), 'HubHero: Review strategy and Play wired')
  await act(async () => tree.unmount()); tree = null

  let hubState = pressState
  const hubDispatch = (a) => { hubState = reducer(hubState, a) }
  const renderHub = () => render(React.createElement(Dashboard, { state: hubState, dispatch: hubDispatch, setTab: () => {}, totalRounds: 9 }))
  await renderHub()
  check(tree.root.findAllByProps({ role: 'dialog' }).length === 0, 'Hub: press never opens a dialog')
  check(tree.root.findAll((n) => n.props?.id === 'weekly-preparation' && n.props?.['data-tour'] === 'tour-prep').length === 1, 'Hub: Coach’s office keeps #weekly-preparation + tour-prep')
  await act(async () => byText(/^Answer$/).props.onClick())
  await act(async () => byText(/^Measured/).props.onClick())
  check(hubState.press.pending === false && hubState.board.confidence === pressState.board.confidence + 1, 'Hub: answering in the inbox dispatches PRESS_ANSWER')
  await renderHub()
  check(!textOf(tree.root).includes('Press request'), 'Hub: answered press leaves the inbox')
  await act(async () => tree.unmount()); tree = null

  let closed = 0
  await render(React.createElement(ResultStage, { state: post, session, onContinue: () => closed++ }))
  const winText = textOf(tree.root)
  check(winText.includes('Series won') && winText.includes('beat'), 'ResultStage win: eyebrow + "X beat Y"')
  check(winText.includes('What changed') && !/Board trust/.test(winText), 'ResultStage win: changed strip, no board tile')
  check(winText.includes('Series MVP'), 'ResultStage win: MVP card')
  check(tree.root.findAll((n) => n.type === 'div' && n.props?.className?.includes?.('reward-sweep')).length === 1, 'ResultStage win: one trophy sweep')
  check(winText.includes('Up next'), 'ResultStage win: Up next line')
  await act(async () => byText(/^Continue$/).props.onClick())
  check(closed === 1, 'ResultStage: Continue calls onContinue')
  await act(async () => byText(/^Review the series$/).props.onClick())
  check(tree.root.findAll((n) => n.props?.['data-tour'] === 'tour-review').length === 1, 'ResultStage: Review the series opens the review room')
  await act(async () => tree.unmount()); tree = null

  await render(React.createElement(ResultStage, { state: loss.post, session: loss.post.matchSession, onContinue: () => {} }))
  const lossText = textOf(tree.root)
  check(lossText.includes('Series lost') && lossText.includes('took it'), 'ResultStage loss: calm headline')
  check(!lossText.includes('Series MVP') && lossText.includes('What to look at'), 'ResultStage loss: "What to look at" instead of MVP')
  check(tree.root.findAll((n) => n.props?.className?.includes?.('reward-sweep')).length === 0, 'ResultStage loss: no trophy, no gold sweep')
  await act(async () => tree.unmount()); tree = null
} finally {
  await rm(temp, { recursive: true, force: true })
}

if (failures) { console.error(`${failures} FAILURE(S)`); process.exit(1) }
console.log('hub-result: all passed')
