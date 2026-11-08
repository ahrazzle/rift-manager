import { useState } from 'react'
import { Card } from '../ui/index.js'
import { SimSpeedSelect } from './AppShell.jsx'
import { readMapDisplay, writeMapDisplay } from '../../game/mapDisplay.js'

/**
 * Guide › Settings. Sim speed is part of the save; motion and map display are
 * browser preferences. Match options (Draft, IGL, Show simulation) stay on the
 * match setup screen, where they are chosen per series.
 */
export default function SettingsPanel({ state, dispatch, uiPrefs, onUiPrefsChange }) {
  const [display, setDisplay] = useState(readMapDisplay)
  const changeDisplay = (key, value) => {
    const next = { ...display, [key]: value }
    setDisplay(next)
    writeMapDisplay(next)
  }
  const systemReduces =
    typeof globalThis.matchMedia === 'function' && !!globalThis.matchMedia('(prefers-reduced-motion: reduce)')?.matches

  return (
    <div className="shell-settings">
      <Card title="Simulation">
        <div className="shell-field">
          <label htmlFor="settings-sim-speed">Sim speed</label>
          <p className="shell-field-hint" id="settings-sim-speed-hint">
            How fast results, walkouts and the AI draft reveal. Saved with your game.
          </p>
          <SimSpeedSelect
            id="settings-sim-speed"
            value={state.simSpeed}
            aria-describedby="settings-sim-speed-hint"
            onChange={(speed) => dispatch({ type: 'SET_SIM_SPEED', speed })}
          />
        </div>
      </Card>

      <Card title="Motion">
        <label className="shell-switch">
          <span>
            <strong>Reduce motion</strong>
            <span className="shell-field-hint">
              {systemReduces
                ? 'Your device already asks for reduced motion, so animation is minimal everywhere.'
                : 'Swaps slides and pops for simple fades across the interface in this browser. Map playback follows your device setting.'}
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={systemReduces || uiPrefs.motion === 'reduce'}
            disabled={systemReduces}
            onChange={(e) => onUiPrefsChange({ ...uiPrefs, motion: e.target.checked ? 'reduce' : 'system' })}
          />
        </label>
      </Card>

      <Card title="Map display">
        <p className="shell-field-hint shell-card-lede">What the animated Rift shows on each player dot. Applies from the next game you watch.</p>
        <div className="shell-field-row">
          <div className="shell-field">
            <label htmlFor="settings-map-names">Names</label>
            <select
              id="settings-map-names"
              className="ui-select"
              value={display.names}
              onChange={(e) => changeDisplay('names', e.target.value)}
            >
              <option value="players">Players</option>
              <option value="champions">Champions</option>
              <option value="both">Players + champions</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          <div className="shell-field">
            <label htmlFor="settings-map-portraits">Portraits</label>
            <select
              id="settings-map-portraits"
              className="ui-select"
              value={display.portraits}
              onChange={(e) => changeDisplay('portraits', e.target.value)}
            >
              <option value="roles">Role icons</option>
              <option value="players">Player initials</option>
              <option value="champions">Champions</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  )
}
