import TeamCrest from '../TeamCrest.jsx'
import { Button, Card, Pips } from '../ui/index.js'
import { teamName } from '../../game/hype.js'
import { tableRows } from './hubData.js'
import { PLAYOFF_SPOTS } from '../../game/seriesSnapshot.js'

function Row({ state, r }) {
  return (
    <tr className={r.you ? 'you' : ''} aria-current={r.you ? 'true' : undefined}>
      <td className="num">{r.pos}</td>
      <td>
        <span className="hub-teamcell">
          <TeamCrest teamId={r.teamId} name={teamName(state, r.teamId)} size={20} />
          <span>{teamName(state, r.teamId)}</span>
          {r.you && <span className="sr-only"> (you)</span>}
        </span>
      </td>
      <td className="num">{r.record}</td>
      <td>
        {r.form.length ? <Pips results={r.form} label={`${teamName(state, r.teamId)} last series`} /> : <span className="faint">–</span>}
      </td>
    </tr>
  )
}

/** Top four of the regional table with the playoff line, plus your row if below it. */
export default function TableMini({ state, setTab }) {
  const { rows, extra, total } = tableRows(state)
  if (!rows.length) return null
  return (
    <Card
      title={`${state.league ?? 'League'} table`}
      className="hub-table-card"
      action={
        <Button variant="quiet" onClick={() => setTab('standings')}>
          Full table
        </Button>
      }
    >
      <table className="primitive-table hub-table">
        <caption className="sr-only">{`Top ${PLAYOFF_SPOTS} of ${total} in the ${state.league ?? 'league'} table${extra ? ', plus your position' : ''}`}</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Team</th>
            <th scope="col">W–L</th>
            <th scope="col">Form</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Row key={r.teamId} state={state} r={r} />
          ))}
          {extra && (
            <>
              <tr className="hub-table-gap" aria-hidden="true">
                <td colSpan={4}>···</td>
              </tr>
              <Row state={state} r={extra} />
            </>
          )}
        </tbody>
      </table>
      <p className="hub-table-note">Top 2 reach MSI and Worlds. The line after 4th is the playoff cut.</p>
    </Card>
  )
}
