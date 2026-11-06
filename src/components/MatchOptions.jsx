import { useId } from 'react'
import MatchIcon from './MatchIcon.jsx'

export default function MatchOptions({
  options, onChange, spectator = false,
  seriesFearless, onSeriesFearlessChange, draftEnabled,
}) {
  const id = useId()
  const rows = [
    ['draft', 'Draft', 'Pick and ban against the opposing coach before every game.'],
    ['igl', 'IGL', 'Lead from the animated map. Pause at a key moment and make the macro call.'],
    ['showSimulation', 'Show simulation', 'Watch players rotate, fight and take objectives on the map.'],
  ]
  return <fieldset className="match-options" data-tour="tour-match-options">
    <legend>Match options</legend>
    <p className="hint">Combine these with any story mode. Change them again before each match.</p>
    <div className="match-option-grid">{rows.map(([key, label, description]) => {
      const forced = key === 'showSimulation' && options.igl
      const disabled = forced || (spectator && key !== 'showSimulation')
      return <label key={key} className={`match-option ${options[key] || forced ? 'enabled' : ''}`}>
        <span className="option-top"><MatchIcon name={key === 'draft' ? 'draft' : key === 'igl' ? 'flag' : 'eye'} size={22} /><strong>{label}</strong><input type="checkbox" role="switch" checked={!!options[key] || !!forced} disabled={disabled}
          aria-describedby={`${id}-${key}`} onChange={(e) => onChange(key, e.target.checked)} /><span className="switch-track" aria-hidden="true" /></span>
        <span id={`${id}-${key}`} className="hint">{forced ? 'Included while IGL is on — your calls happen on the map.' : spectator && key !== 'showSimulation' ? 'Available when you manage one of these teams.' : description}</span>
      </label>
    })}
      {onSeriesFearlessChange != null && (
        <label className={`match-option ${draftEnabled && seriesFearless ? 'enabled' : ''}`}>
          <span className="option-top">
            <MatchIcon name="eye" size={22} />
            <strong>Fearless draft</strong>
            <input
              type="checkbox"
              role="switch"
              checked={!!seriesFearless}
              disabled={!draftEnabled || spectator}
              aria-describedby={`${id}-fearless`}
              onChange={(e) => onSeriesFearlessChange(e.target.checked)}
            />
            <span className="switch-track" aria-hidden="true" />
          </span>
          <span id={`${id}-fearless`} className="hint">
            {!draftEnabled
              ? 'Turn on Draft to use Fearless.'
              : spectator
                ? 'Available when you manage one of these teams.'
                : 'In a series, champions locked in during earlier games cannot be picked again. Bans reset each game.'}
          </span>
        </label>
      )}
    </div>
  </fieldset>
}
