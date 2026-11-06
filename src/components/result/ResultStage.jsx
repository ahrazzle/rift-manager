// ============================================================================
// ResultStage: the reward moment after a series (SPEC §3.6).
//
// Mount point (MatchExperience.jsx, stage `result`, owned by the match lane):
//
//   {stage === 'result' && (
//     <ResultStage
//       state={state}                         // full game state (post-series)
//       session={session}                     // state.matchSession, stage 'result'
//       onContinue={send('MATCH_CLOSE')}      // Continue: close the series
//       tutorial={tutorial}                   // walkthrough prefs (optional)
//       persistTutorial={persistTutorial}     // (optional)
//       skipTutorial={skipTutorial}           // (optional)
//     />
//   )}
//
// Everything else is derived here: the outcome, the "What changed" strip
// (game/seriesSnapshot.js, no stored snapshot), the MVP or "What to look at",
// the games list, Up next, fresh achievements, and the review room
// (MatchReview + MatchDetail) behind "Review the series". It reads nothing
// from Hub-local state, so a reload on the result screen renders the same.
//
// Variants: win (gold radial, trophy with one rim sweep then a static ring),
// loss (no gold, calm copy, "What to look at"), spectator (neutral, no strip).
// ============================================================================
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import TeamCrest from '../TeamCrest.jsx'
import MatchDetail from '../MatchDetail.jsx'
import MatchReview from '../MatchReview.jsx'
import { TutorialReviewTip } from '../TutorialHost.jsx'
import { Button, Card, Chip, Delta, Icon, TrophyMark } from '../ui/index.js'
import { teamName } from '../../game/hype.js'
import { PREPARATION_FOCI } from '../../game/preparation.js'
import { gameRows, lookAtNote, mvpLine, seriesChanges, seriesMvp, seriesOutcome, upNext } from '../../game/seriesSnapshot.js'
import { setPrepIntent, takeNewAchievements } from '../hub/hubMemory.js'

export function ChangedStrip({ tiles }) {
  if (!tiles?.length) return null
  return (
    <Card title="What changed" className="result-changed-card">
      <ul className="result-changed">
        {tiles.map((t) => (
          <li key={t.id} className="result-chg">
            <span className="label">{t.label}</span>
            <b className="num">{t.value}</b>
            <span className="result-chg-note">
              {t.delta ? <Delta value={t.delta} unit={t.unit} /> : null}
              <span>{t.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function MvpCard({ mvp, line }) {
  const id = useId()
  return (
    <section className="ui-card result-mvp" aria-labelledby={id}>
      <span className="result-mvp-mark" aria-hidden="true">
        <Icon name="star" size={28} />
      </span>
      <div className="result-mvp-body">
        <Chip tone="gold" icon="star">
          Series MVP
        </Chip>
        <h2 id={id}>
          {mvp.name}
          <span className="result-mvp-sub">
            {' '}
            · {mvp.champs.length ? mvp.champs.join(', ') : mvp.role}
          </span>
        </h2>
        <p>{line}</p>
      </div>
      <dl className="result-mvp-stats">
        <div>
          <dt>KDA</dt>
          <dd className="num">{mvp.kda}</dd>
        </div>
        <div>
          <dt>Kill share</dt>
          <dd className="num">{mvp.killShare}%</dd>
        </div>
      </dl>
    </section>
  )
}

function LookAtCard({ note, onOpenReview }) {
  const id = useId()
  const focus = PREPARATION_FOCI.find((f) => f.id === note.focus)
  return (
    <section className="ui-card result-lookat" aria-labelledby={id}>
      <span className="result-lookat-mark" aria-hidden="true">
        <Icon name="search" size={24} />
      </span>
      <div>
        <p className="label">What to look at</p>
        <h2 id={id}>{note.title}</h2>
        <p>{note.text}</p>
        {focus && <p className="faint">Suggested session: {focus.label}.</p>}
      </div>
      <Button onClick={onOpenReview}>Open the review room</Button>
    </section>
  )
}

function GamesList({ state, rows, next, spectator }) {
  if (!rows.length) return null
  return (
    <Card title="Games" className="result-games-card">
      <ol className="result-games">
        {rows.map((g) => (
          <li key={g.n} className="result-game">
            {spectator ? (
              <Chip>{`G${g.n}`}</Chip>
            ) : (
              <Chip tone={g.won ? 'win' : 'loss'}>
                {g.won ? 'W' : 'L'}
                <span className="sr-only">{g.won ? ' won' : ' lost'}</span>
              </Chip>
            )}
            <span className="result-game-what">
              Game {g.n}
              {g.blue != null && !spectator ? ` · ${g.blue ? 'Blue' : 'Red'} side` : ''}
              {g.champs.length ? ` · ${g.champs.join(', ')}` : ''}
              {g.call ? ` · Your call: ${g.call}` : ''}
            </span>
            {g.duration && <span className="result-game-dur num">{g.duration}</span>}
            <span className="result-game-k num">
              {g.kills[0]}–{g.kills[1]}
              <span className="sr-only"> kills</span>
            </span>
          </li>
        ))}
      </ol>
      {next && (
        <p className="result-next">
          Up next:{' '}
          {next.oppId ? (
            <>
              <TeamCrest teamId={next.oppId} name={next.name} size={28} />
              <span>
                <b>{next.name}</b>
                {next.record ? ` (${next.record})` : ''} · {next.when}
              </span>
            </>
          ) : (
            <span>{next.text}</span>
          )}
        </p>
      )}
      {!next && state.mode === 'campaign' && <p className="result-next">Back to the scenario to see what this slot means.</p>}
    </Card>
  )
}

export default function ResultStage({ state, session, onContinue, tutorial, persistTutorial, skipTutorial }) {
  const c = session.context
  const games = session.games ?? []
  const out = useMemo(() => seriesOutcome(state, session), [state, session])
  const mvp = useMemo(() => (out.spectator ? null : seriesMvp(games, out.userSide)), [games, out])
  const tiles = useMemo(() => seriesChanges(state, session, mvp), [state, session, mvp])
  const rows = useMemo(() => gameRows(games, out.userSide), [games, out.userSide])
  const next = useMemo(() => upNext(state, session), [state, session])
  const lookAt = useMemo(() => (out.won === false ? lookAtNote(games, out.userSide) : null), [games, out])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [unlocked, setUnlocked] = useState([])
  const headRef = useRef(null)
  const reviewRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    headRef.current?.focus?.({ preventScroll: true })
    const round = out.week ?? c.label
    setUnlocked(out.spectator ? [] : takeNewAchievements(state, { [round]: games }))
    // Once per mounted result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!reviewOpen) return
    const el = reviewRef.current
    const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    el?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    el?.focus?.({ preventScroll: true })
  }, [reviewOpen])

  const variant = out.spectator ? 'neutral' : out.won ? 'win' : 'loss'
  const [a, b] = out.score
  const leftId = out.spectator ? out.winnerId : out.userId
  const rightId = out.spectator ? out.loserId : out.oppId
  const name = (id) => teamName(state, id)
  const eyebrow = out.spectator
    ? `Final · ${out.stageLabel}`
    : `${out.won ? 'Series won' : 'Series lost'} · ${out.stageLabel}`
  const title = out.spectator || out.won ? `${name(out.winnerId)} beat ${name(out.loserId)}` : `${name(out.oppId)} took it ${b}–${a}`
  const scoreText = `${a} – ${b}`

  const openReview = () => setReviewOpen(true)
  const planNext = (focus) => {
    setPrepIntent(focus)
    onContinue?.()
  }

  return (
    <div className={`result-stage is-${variant}`}>
      <section className="result-hero" aria-labelledby={titleId}>
        {variant === 'win' && <TrophyMark className="result-trophy reward-sweep" />}
        <p className="result-eyebrow result-rise">{eyebrow}</p>
        <h2 id={titleId} className="result-title display result-rise" ref={headRef} tabIndex={-1}>
          {title}
        </h2>
        <div className="result-score result-rise">
          <TeamCrest teamId={leftId} name={name(leftId)} size={32} />
          <b className="num" aria-hidden="true">
            {scoreText}
          </b>
          <span className="sr-only">{`${name(leftId)} ${a}, ${name(rightId)} ${b}`}</span>
          <TeamCrest teamId={rightId} name={name(rightId)} size={32} />
        </div>
        {variant === 'loss' && <p className="result-calm">One series. The table is long, and the review shows where it turned.</p>}
        {unlocked.length > 0 && (
          <ul className="result-achs" aria-label="Achievements unlocked">
            {unlocked.map((u) => (
              <li key={u.id}>
                <Chip tone="gold" icon="star">
                  {u.name}
                </Chip>
                <span className="sr-only">{`: ${u.desc}`}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="result-acts">
          <Button variant="primary" size="lg" onClick={onContinue}>
            Continue
          </Button>
          <Button size="lg" aria-expanded={reviewOpen} onClick={() => (reviewOpen ? reviewRef.current?.focus?.() : openReview())}>
            Review the series
          </Button>
        </div>
      </section>

      <ChangedStrip tiles={tiles} />

      {variant === 'win' && mvp && <MvpCard mvp={mvp} line={mvpLine(mvp, games, out.userSide)} />}
      {variant === 'loss' && lookAt && <LookAtCard note={lookAt} onOpenReview={openReview} />}

      <GamesList state={state} rows={rows} next={next} spectator={out.spectator} />

      {reviewOpen && (
        <section className="result-review" ref={reviewRef} tabIndex={-1} aria-label="Series review">
          {!out.spectator && (
            <MatchReview games={games} userSide={out.userSide} onPrepare={c.kind === 'regional' && !state.finished ? planNext : null} />
          )}
          <MatchDetail
            state={state}
            homeId={c.homeId}
            awayId={c.awayId}
            userSide={c.userSide}
            round={c.label}
            aWins={session.aWins}
            bWins={session.bWins}
            games={games}
            showReview={false}
            onBack={() => {
              setReviewOpen(false)
              headRef.current?.focus?.({ preventScroll: false })
            }}
          />
          {tutorial && persistTutorial && !out.spectator && (
            <TutorialReviewTip show tutorial={tutorial} persistTutorial={persistTutorial} onSkipAll={skipTutorial} />
          )}
        </section>
      )}
    </div>
  )
}
