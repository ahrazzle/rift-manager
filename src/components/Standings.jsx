import { useRef, useState } from 'react'
import { exportPng } from '../utils/exportPng.js'
import { Button, Card, Chip, Delta, EmptyState, Icon, Pips } from './ui/index.js'
import TeamCrest from './TeamCrest.jsx'
import MatchBox from './compete/MatchBox.jsx'
import { ordinal, playoffPicture, signed, standingRows, stakes } from './compete/model.js'

const CUT_AFTER = 4

function caption(state, regional) {
  return regional
    ? 'Playoff line after 4th place: the top 4 enter the playoffs (1st plays 4th, 2nd plays 3rd). The top 2 also qualify for MSI and Worlds.'
    : 'Final regular-season table. The top 4 entered the playoffs, split by the line after 4th place.'
}

function PlayoffPicture({ pic }) {
  const heading = pic.mode === 'live' ? 'If it ended today' : pic.mode === 'locked' ? 'Seeds locked' : 'Final seeds'
  const semiRows = (pair) => pair.map((s) => ({ teamId: s.teamId, name: s.name, seed: s.seed, you: s.isYou }))
  return (
    <Card title="Playoff picture" action={<Chip>{heading}</Chip>} className="cmp-picture">
      <div className="cmp-picture-grid">
        <div className="cmp-picture-col">
          <p className="label">Semifinals · BO3</p>
          {pic.semis.map((pair, i) => (
            <MatchBox key={i} rows={semiRows(pair)} label={`Semifinal ${i + 1}: seed ${pair[0].seed} plays seed ${pair[1].seed}`} />
          ))}
        </div>
        <div className="cmp-picture-col cmp-picture-final">
          <p className="label">Final · BO3</p>
          <MatchBox rows={[{}, {}]} tbdLabels={['Winner SF1', 'Winner SF2']} dim label="Final: to be decided" />
        </div>
      </div>
      <p className="cmp-note">
        1 plays 4, 2 plays 3.
        {pic.weeksLeft > 0 && ` ${pic.weeksLeft} ${pic.weeksLeft === 1 ? 'week' : 'weeks'} left, so this can still change.`}
      </p>
    </Card>
  )
}

function Stakes({ info }) {
  const items = []
  if (info.cut) items.push(['compete', info.cut])
  if (info.goal) {
    items.push(['star', (
      <>
        <b>Board goal:</b> {info.goal.text.charAt(0).toLowerCase() + info.goal.text.slice(1)}.
        {info.goal.trust != null && <> Trust {info.goal.trust}.</>}
      </>
    )])
  }
  if (info.opponent) {
    const o = info.opponent
    items.push(['play', (
      <>
        <b>This week:</b> {o.name}
        {o.record && o.rank ? ` (${o.record}), ${ordinal(o.rank)} in the table.` : '.'}
      </>
    )])
  }
  if (!items.length) return null
  return (
    <Card title="What’s at stake" className="cmp-stakes">
      <ul className="cmp-stake-list">
        {items.map(([icon, body], i) => (
          <li key={i}>
            <Icon name={icon} size={18} />
            <span>{body}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function Standings({ state }) {
  const shotRef = useRef(null)
  const [shotErr, setShotErr] = useState(null)
  const rows = standingRows(state)
  const regional = state.phase === 'regional' && !state.finished
  const hasMove = rows.some((r) => r.move != null)
  const cols = 4 + (hasMove ? 1 : 0) + 1

  if (!rows.length) return <EmptyState>No league table yet. Start a season to see the standings.</EmptyState>

  const pic = playoffPicture(state, rows)
  const info = stakes(state, rows)

  return (
    <div className="cmp-split">
      <div className="cmp-main">
        <Card className="cmp-table-card">
          <div ref={shotRef} className="cmp-shot">
            <div className="cmp-table-wrap">
              <table className="cmp-table">
                <caption className="cmp-caption">
                  {caption(state, regional)}
                  {hasMove && ' Movement is since last week.'}
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="c-pos"><abbr title="Position">#</abbr></th>
                    <th scope="col" className="c-team">Team</th>
                    <th scope="col" className="c-wl"><abbr title="Series won–lost">W–L</abbr></th>
                    <th scope="col" className="c-gd"><abbr title="Game difference">GD</abbr></th>
                    <th scope="col" className="c-form hide-m">Form</th>
                    {hasMove && <th scope="col" className="c-move"><span aria-hidden="true">{'±'}</span><span className="sr-only">Movement since last week</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <TableRow key={r.teamId} r={r} hasMove={hasMove} cut={r.rank === CUT_AFTER && rows.length > CUT_AFTER} cols={cols} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="cmp-table-foot">
            <Button variant="quiet" onClick={async () => {
              setShotErr(null)
              try { await exportPng(shotRef, 'lck-standings.png') }
              catch { setShotErr('Export failed. Try again.') }
            }}>Download PNG</Button>
            {shotErr && <span className="cmp-note" role="status">{shotErr}</span>}
          </div>
        </Card>
      </div>
      <div className="cmp-side">
        <PlayoffPicture pic={pic} />
        <Stakes info={info} />
      </div>
    </div>
  )
}

function TableRow({ r, hasMove, cut, cols }) {
  return (
    <>
      <tr className={['cmp-row', r.isYou ? 'you' : '', cut ? 'cut' : ''].filter(Boolean).join(' ')} {...(r.isYou ? { 'aria-current': 'true' } : {})}>
        <td className="c-pos">{r.rank}</td>
        <th scope="row" className="c-team">
          <span className="cmp-team">
            <TeamCrest teamId={r.teamId} name={r.name} size={28} />
            <span className="cmp-team-name">{r.name}</span>
            {r.isYou && <span className="cmp-you-tag">You</span>}
          </span>
        </th>
        <td className="c-wl">{r.W}–{r.L}</td>
        <td className={`c-gd ${r.gd > 0 ? 'is-pos' : r.gd < 0 ? 'is-neg' : ''}`}>{signed(r.gd)}</td>
        <td className="c-form hide-m">{r.form.length ? <Pips results={r.form} label={`${r.name} form`} /> : <span className="cmp-dash">{'–'}</span>}</td>
        {hasMove && <td className="c-move"><Delta value={r.move ?? 0} unit="places" /></td>}
      </tr>
      {cut && (
        <tr className="cmp-cutrow">
          <td colSpan={cols}><span>Playoff line</span></td>
        </tr>
      )}
    </>
  )
}
