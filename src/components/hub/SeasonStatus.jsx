import { useId } from 'react'
import TeamCrest from '../TeamCrest.jsx'
import { Button, Chip } from '../ui/index.js'
import { orderStandings } from '../../game/useGameState.js'
import { teamName } from '../../game/hype.js'

/**
 * After the regular season: what just finished and the next step (MSI,
 * Worlds, Advance Season, Retire or a new season). The decisions are the same
 * as the old Dashboard's season-complete branches, one primary per view.
 * Returns { card, bracket } so the Hub can place an active bracket below.
 */
export function seasonStatusModel(state) {
  const t = state.tournament
  const me = state.teamId
  const myRow = state.standings?.[me] ?? { W: 0, L: 0, points: 0 }
  const rows = orderStandings(state.standings ?? {})
  const qualified = rows.slice(0, 2).some((r) => r.teamId === me)
  const isCareer = state.mode === 'career' && !!state.career
  const idx = state.career?.seasonIndex ?? 1
  const max = state.career?.maxSeasons ?? 1
  const atEnd = isCareer && idx >= max
  const record = `${myRow.W}–${myRow.L}`
  const advance = isCareer && !atEnd
    ? { id: 'advance', label: `Advance to Season ${idx + 1}`, action: { type: 'ADVANCE_SEASON' }, tour: 'tour-advance-season' }
    : null
  const fresh = !isCareer ? { id: 'new', label: 'Start a new season', action: { type: 'RESET' } } : null
  const retire = atEnd ? { id: 'retire', label: 'Retire', action: { type: 'RETIRE' } } : null
  const champ = (id) => (id === me ? 'You won it.' : `${teamName(state, id)} won it.`)

  if (t && t.status === 'active') return { bracket: true, card: null }

  if (t && t.kind === 'msi' && t.status === 'done') {
    return {
      bracket: true,
      card: {
        eyebrow: 'MSI complete',
        title: t.championId === me ? 'MSI champions' : 'MSI is over',
        trophy: t.championId === me,
        text: `${champ(t.championId)} ${qualified ? 'The World Championship bracket is ready.' : 'You did not qualify. Sim Worlds as a spectator or move on.'}`,
        primary: { id: 'worlds', label: 'Start Worlds', action: { type: 'BUILD_TOURNAMENT', kind: 'worlds' } },
        secondary: [advance ?? fresh, retire].filter(Boolean),
      },
    }
  }

  if (t && t.kind === 'worlds' && t.status === 'done') {
    const won = t.championId === me
    if (atEnd) {
      return {
        bracket: false,
        card: {
          eyebrow: `Season ${idx} complete`,
          title: 'End of the road',
          trophy: won,
          text: `Regional ${record}${won ? ' and world champions' : ''}. Time to hang up the clipboard?`,
          primary: retire,
          secondary: [],
        },
      }
    }
    return {
      bracket: false,
      card: {
        eyebrow: isCareer ? `Season ${idx} complete` : 'Season complete',
        title: won ? 'World champions' : 'Season complete',
        trophy: won,
        text: `Regional ${record} (${myRow.points} pts). ${champ(t.championId)}`,
        primary: advance ?? fresh,
        secondary: [],
        links: true,
      },
    }
  }

  // Regional done, playoffs live: the bracket is the screen.
  if (state.phase === 'playoffs' && t && t.status === 'active') return { bracket: true, card: null }

  if (atEnd) {
    const titles = (state.career?.history ?? []).filter((h) => h.championId === me).length
    return {
      bracket: !!t,
      card: {
        eyebrow: `Season ${idx} complete`,
        title: 'End of the road',
        trophy: false,
        text: `You finished ${record} (${myRow.points} pts) in season ${idx} of ${max}. Career: ${state.career.history.length} past season${state.career.history.length === 1 ? '' : 's'}, ${titles} title${titles === 1 ? '' : 's'}.`,
        primary: retire,
        secondary: [],
      },
    }
  }

  return {
    bracket: !!t,
    card: {
      eyebrow: 'Regional split complete',
      title: qualified ? 'Qualified for MSI' : 'Regional split complete',
      trophy: !!state.playoffChampionId && state.playoffChampionId === me,
      text: `You finished ${record} (${myRow.points} pts). ${qualified ? 'Top two in your league: MSI is next.' : 'You missed the top two, so MSI sims without you.'}`,
      primary: { id: 'msi', label: 'Start MSI', action: { type: 'BUILD_TOURNAMENT', kind: 'msi' } },
      secondary: [advance ?? fresh].filter(Boolean),
      links: true,
    },
  }
}

export default function SeasonStatus({ state, dispatch, setTab, card }) {
  const titleId = useId()
  if (!card) return null
  return (
    <section className={`ui-card hub-season ${card.trophy ? 'is-gold' : ''}`} aria-labelledby={titleId}>
      <div className="hub-season-head">
        <TeamCrest teamId={state.teamId} name={teamName(state, state.teamId)} size={56} />
        <div>
          <p className="label">{card.eyebrow}</p>
          <h2 id={titleId} className="hub-season-title display">
            {card.title}
          </h2>
        </div>
        {card.trophy && (
          <Chip tone="gold" icon="star" className="hub-season-chip">
            Title won
          </Chip>
        )}
      </div>
      <p className="hub-season-text">{card.text}</p>
      <div className="hub-cta">
        {card.primary && (
          <Button variant="primary" size="lg" data-tour={card.primary.tour} onClick={() => dispatch(card.primary.action)}>
            {card.primary.label}
          </Button>
        )}
        {card.secondary.map((b) => (
          <Button key={b.id} size="lg" data-tour={b.tour} onClick={() => dispatch(b.action)}>
            {b.label}
          </Button>
        ))}
        {card.links && (
          <>
            <Button variant="quiet" onClick={() => setTab('standings')}>
              Standings
            </Button>
            <Button variant="quiet" onClick={() => setTab('results')}>
              Results
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
