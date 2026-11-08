import { ROLE_LABEL } from '../../data/lck.js'
import { Chip, RoleIcon, cx } from '../ui/index.js'
import PlayerActions from './PlayerActions.jsx'
import { useNarrow } from './useNarrow.js'
import { fmtMoneyExact, playerWage, signingFee } from '../../game/economy.js'

const potOf = (p) => p.potential ?? Math.min(99, p.ovr + 5)

function Name({ p, starter }) {
  return (
    <span className="pl-id">
      <RoleIcon role={p.role} size={20} />
      <span className="pl-id-text">
        <strong>{p.name}</strong>
        <span className="pl-role">{ROLE_LABEL[p.role]}</span>
      </span>
      {starter && <Chip>Starter</Chip>}
    </span>
  )
}

/**
 * Players as a desktop table (sticky name column) or, under 760px, a card
 * grid. Both carry an actions area built from `getActions(p)` / `getNote(p)` /
 * `showMorale` (see PlayerActions).
 *
 * Props: players, label (accessible name), starterIds (Set), money (adds
 * signing fee + annual wage), getActions, getNote, showMorale, selectedId.
 */
export default function PlayerList({
  players,
  label,
  starterIds,
  money = false,
  getActions,
  getNote,
  showMorale = false,
  selectedId,
  actionsHeader = 'Actions',
}) {
  const narrow = useNarrow()
  const hasActions = Boolean(getActions) || showMorale
  const actionsFor = (p) =>
    hasActions ? (
      <PlayerActions player={p} showMorale={showMorale} actions={getActions?.(p) ?? []} note={getNote?.(p)} />
    ) : null

  if (narrow) {
    return (
      <ul className="pl-cards" aria-label={label}>
        {players.map((p) => (
          <li key={p.id} className={cx('pl-card', selectedId === p.id && 'is-selected', starterIds?.has(p.id) && 'is-starter')}>
            <div className="pl-card-top">
              <Name p={p} starter={starterIds?.has(p.id)} />
              <span className="pl-ovr-lg num" title="Overall">
                <span className="sr-only">OVR </span>
                {p.ovr}
              </span>
            </div>
            <div className="pl-chips">
              <Chip title="Age">Age {p.age ?? 21}</Chip>
              <Chip title="Fixed rating cap (unchanged each off-season)">Pot {potOf(p)}</Chip>
              <Chip title="Mechanics">MEC {p.mech}</Chip>
              <Chip title="Macro">MAC {p.macro}</Chip>
              <Chip title="Consistency">CON {p.consist}</Chip>
            </div>
            {money && (
              <p className="pl-money">
                <span>Signing fee: {fmtMoneyExact(signingFee(p))}</span>
                <span>Annual wage: {fmtMoneyExact(playerWage(p))}</span>
              </p>
            )}
            {actionsFor(p)}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="pl-scroll" tabIndex={0} role="region" aria-label={`${label} table`}>
      <table className="pl-table">
        <thead>
          <tr>
            <th scope="col" className="pl-sticky">Player</th>
            <th scope="col" className="num">OVR</th>
            <th scope="col" className="num">Age</th>
            <th scope="col" className="num" title="Fixed rating cap">Pot</th>
            <th scope="col" className="num" title="Mechanics">MEC</th>
            <th scope="col" className="num" title="Macro">MAC</th>
            <th scope="col" className="num" title="Consistency">CON</th>
            {money && <th scope="col" className="num">Signing fee</th>}
            {money && <th scope="col" className="num">Annual wage</th>}
            {hasActions && <th scope="col">{actionsHeader}</th>}
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id} className={cx(selectedId === p.id && 'is-selected', starterIds?.has(p.id) && 'is-starter')}>
              <th scope="row" className="pl-sticky">
                <Name p={p} starter={starterIds?.has(p.id)} />
              </th>
              <td className="num pl-ovr">
                <span className="sr-only">OVR </span>
                {p.ovr}
              </td>
              <td className="num">
                <span className="sr-only">Age </span>
                {p.age ?? 21}
              </td>
              <td className="num">
                <span className="sr-only">Pot </span>
                {potOf(p)}
              </td>
              <td className="num">
                <span className="sr-only">MEC </span>
                {p.mech}
              </td>
              <td className="num">
                <span className="sr-only">MAC </span>
                {p.macro}
              </td>
              <td className="num">
                <span className="sr-only">CON </span>
                {p.consist}
              </td>
              {money && (
                <td className="num">
                  <span className="sr-only">Signing fee: </span>
                  {fmtMoneyExact(signingFee(p))}
                </td>
              )}
              {money && (
                <td className="num">
                  <span className="sr-only">Annual wage: </span>
                  {fmtMoneyExact(playerWage(p))}
                </td>
              )}
              {hasActions && <td className="pl-actions">{actionsFor(p)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
