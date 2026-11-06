// Strategy — pre-match gameplan panel (item 4; season + career, NOT campaign).
// Four controls (comp / roam / swap / wincon) dispatching SET_STRATEGY plus a
// live estimateSeriesWinProb readout against the upcoming week's opponent that
// passes the current strategy as { aStrat } so the edge moves with choices.
import { useMemo } from 'react'
import { buildLCKSchedule } from '../engine/season.js'
import { bestLineup, userLineup, estimateSeriesWinProb, explainWinProb, matchupSeed, matchupOppTactic, seededRng } from '../game/logic.js'
import { managedCoachBonus } from '../game/useGameState.js'
import { TRAIT_BY_ID } from '../data/traits.js'
import { preparationBonus } from '../game/preparation.js'
import { Card, Chip, Delta, Meter, OddsWhy } from './ui/index.js'
import OptionGroup from './team/OptionGroup.jsx'

const FALLBACK_SCHEDULE = buildLCKSchedule()

const COMP_OPTS = [
  { v: null, label: 'Balanced', blurb: 'No draft bias' },
  { v: 'AGGR', label: 'Aggressive', blurb: '+1.0 str · bloodier, shorter games' },
  { v: 'SCALE', label: 'Scaling', blurb: '+1.0 str · longer, comeback-shaped' },
]
const ROAM_OPTS = [
  { v: null, label: 'Default', blurb: 'Support plays standard' },
  { v: 'ROAM', label: 'Roam', blurb: 'JNG/MID up, BOT down (≈+0.75)' },
  { v: 'STAY', label: 'Stay', blurb: 'BOT/SUP up, map down (≈+1.0)' },
]
const WINCON_OPTS = [
  { v: null, label: 'None', blurb: 'No priority' },
  { v: 'DRAGONS', label: 'Dragons', blurb: '+1.25 · objective-heavy' },
  { v: 'SPLIT', label: 'Splitpush', blurb: '+1.25 · tower-led' },
  { v: 'SCALE', label: 'Scale', blurb: '+1.0 (EARLY phase: +0.25)' },
  { v: 'EARLY', label: 'Early', blurb: '+1.0 (LATE phase: +0.25)' },
]


const SWAP_OPTS = [
  { v: false, label: 'No swap', blurb: 'Play standard lanes' },
  { v: true, label: 'Swap', blurb: 'MID/LATE phase +1.0 · EARLY phase −1.0' },
]
const FEARLESS_OPTS = [
  { v: true, label: 'Fearless ON', blurb: 'Champions locked in during earlier games of a series cannot be picked again. Bans reset each game.' },
  { v: false, label: 'Fearless OFF', blurb: 'Standard draft every game — the full pool comes back.' },
]

export default function Strategy({ state, dispatch }) {
  const strat = state.strategy ?? { comp: null, roam: null, swap: false, wincon: null }

  const preview = useMemo(() => {
    const schedule = state.schedule ?? FALLBACK_SCHEDULE
    const matches = state.finished ? [] : schedule[state.round - 1] || []
    const myMatch = matches.find(([h, a]) => h === state.teamId || a === state.teamId)
    if (!myMatch) return null
    const oppId = myMatch[0] === state.teamId ? myMatch[1] : myMatch[0]
    const myObj = userLineup(state.teams[state.teamId], state.lineup, state.form).lineup
    const oppObj = bestLineup(state.teams[oppId], state.form).lineup
    // Deterministic seeds: withStrat and the Why-panel share one draw, so the
    // Strategy tab agrees exactly with the Dashboard hero. Base is a separate
    // draw by design (it measures the no-gameplan number).
    const seed = matchupSeed(state, oppId)
    const oppTactic = matchupOppTactic(state, oppId)
    const bonus = managedCoachBonus(state) + preparationBonus(state, oppId)
    const base = estimateSeriesWinProb(myObj, state.tactic, oppObj, oppTactic, 300, seededRng(seed + '|base'), bonus)
    const withStrat = estimateSeriesWinProb(myObj, state.tactic, oppObj, oppTactic, 300, seededRng(seed), bonus, { aStrat: strat })
    const why = explainWinProb(state, oppId, { n: 300, rng: seededRng(seed), oppTactic })
    return { oppId, base, withStrat, why }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.teamId, state.round, state.finished, state.schedule, state.teams, state.lineup, state.form, state.tactic, state.strategy, state.seriesOptions, state.results, state.career, state.preparation])

  const set = (patch) => dispatch({ type: 'SET_STRATEGY', ...patch })
  const baseP = preview ? Math.round(preview.base * 100) : 0
  const withP = preview ? Math.round(preview.withStrat * 100) : 0
  const traitChips = (state.teams[state.teamId] || [])
    .filter((p) => Array.isArray(p.traits) && p.traits.some((t) => t.revealed))
    .flatMap((p) => p.traits.filter((t) => t.revealed).map((t) => ({ p, t })))

  return (
    <div className="team-stack strat">
      <Card
        className="strat-main"
        title={`Strategy: Week ${state.round} gameplan`}
        action={
          <Chip>
            {strat.comp ?? 'Balanced'} · {strat.roam ?? 'Default'} · {strat.swap ? 'Swap' : 'No swap'} · {strat.wincon ?? 'No wincon'}
          </Chip>
        }
      >
        <p className="opt-lede">
          Set before you play the week. Applies to your side only, every week until you change it.
          Stacked choices clamp at +2.5 strength.
        </p>
        <OptionGroup name="strat-comp" label="Draft bias" options={COMP_OPTS} value={strat.comp} onPick={(v) => set({ comp: v })} />
        <OptionGroup name="strat-roam" label="Support roam vs stay" options={ROAM_OPTS} value={strat.roam} onPick={(v) => set({ roam: v })} />
        <OptionGroup name="strat-swap" label="Lane swap" options={SWAP_OPTS} value={!!strat.swap} onPick={(v) => set({ swap: v })} />
        <OptionGroup name="strat-wincon" label="Win condition" options={WINCON_OPTS} value={strat.wincon} onPick={(v) => set({ wincon: v })} />
        <OptionGroup
          name="strat-fearless"
          label="Fearless draft"
          options={FEARLESS_OPTS}
          value={!!state.seriesOptions?.fearless}
          onPick={(v) => dispatch({ type: 'SET_SERIES_OPTION', key: 'fearless', value: v })}
          hint="Applies to every series in this save. Active Coach draft must be on, or it has no effect."
        />
        <p className="opt-current">
          Gameplan: <strong>{strat.comp ?? 'Balanced'}</strong> · <strong>{strat.roam ?? 'Default'}</strong> ·{' '}
          <strong>{strat.swap ? 'Swap' : 'No swap'}</strong> · <strong>{strat.wincon ?? 'No wincon'}</strong>
        </p>
      </Card>

      <div className="strat-side">
        <Card title="Live win estimate">
          {preview ? (
            <>
              <p className="strat-vs">
                vs <strong>{preview.oppId}</strong>: base <strong>{baseP}%</strong> → with gameplan <strong>{withP}%</strong>{' '}
                <Delta value={withP - baseP} unit="points" suffix=" pts" />
              </p>
              <Meter label="Base" value={baseP} valueText={`${baseP}%`} />
              <Meter label="With gameplan" value={withP} valueText={`${withP}%`} />
            </>
          ) : (
            <p className="opt-hint">No upcoming match (season finished).</p>
          )}
          {preview?.why && <OddsWhy why={preview.why} />}
        </Card>

        <Card title="Your lineup traits">
          {!traitChips.length ? (
            <p className="opt-hint">No traits revealed yet. Some players may carry hidden traits that surface when they fire.</p>
          ) : (
            <ul className="trait-list">
              {traitChips.map(({ p, t }, i) => (
                <li key={i}>
                  <Chip icon="star">{TRAIT_BY_ID[t.id]?.name ?? t.id}</Chip>
                  <span>
                    <strong>{p.name}</strong> — {TRAIT_BY_ID[t.id]?.desc ?? ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
