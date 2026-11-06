import { OBJECTIVE_ROWS, objectiveCounts } from './matchModel.js'

/** Objectives so far, blue column then red column (side also in the header text). */
export default function ObjectivesTable({ events, blue, red }) {
  const b = objectiveCounts(events, blue.engineSide)
  const r = objectiveCounts(events, red.engineSide)
  return (
    <table className="objectives-table">
      <caption className="sr-only">
        Objectives taken by {blue.name} (blue side) and {red.name} (red side)
      </caption>
      <thead>
        <tr>
          <th scope="col">Objective</th>
          <th scope="col" className="ot-blue">
            {blue.short}
            <span className="sr-only"> (blue)</span>
          </th>
          <th scope="col" className="ot-red">
            {red.short}
            <span className="sr-only"> (red)</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {OBJECTIVE_ROWS.map(([type, label]) => (
          <tr key={type}>
            <th scope="row">{label}</th>
            <td className="ot-blue num">{b[type]}</td>
            <td className="ot-red num">{r[type]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
