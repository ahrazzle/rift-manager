import TeamCrest from '../TeamCrest.jsx'
import { Card } from '../ui/index.js'
import { teamName } from '../../game/hype.js'

/** This week's fixtures, the user's first. Crest + club id, never a bare name. */
export default function Fixtures({ state, matches, week }) {
  if (!matches?.length) return null
  const me = state.teamId
  const sorted = [...matches].sort((a, b) => Number(b.includes(me)) - Number(a.includes(me)))
  return (
    <Card
      title={`Week ${week} fixtures`}
      className="hub-fixtures-card"
      action={<span className="muted hub-count">{matches.length} series</span>}
    >
      <ul className="hub-fixtures">
        {sorted.map(([h, a]) => {
          const you = h === me || a === me
          return (
            <li key={`${h}-${a}`} className={you ? 'is-you' : ''}>
              <span className="hub-fx-team">
                <TeamCrest teamId={h} name={teamName(state, h)} size={24} />
                <span>{h}</span>
                <span className="sr-only">{` ${teamName(state, h)}`}</span>
              </span>
              <span className="hub-fx-at" aria-hidden="true">vs</span>
              <span className="sr-only"> versus </span>
              <span className="hub-fx-team is-right">
                <span>{a}</span>
                <span className="sr-only">{` ${teamName(state, a)}`}</span>
                <TeamCrest teamId={a} name={teamName(state, a)} size={24} />
              </span>
              {you && <span className="sr-only"> (your series)</span>}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
