import { Icon } from '../ui/index.js'

/** Achievement unlocks announced on the Hub (polite live region, auto-clears). */
export default function AchievementToasts({ toasts }) {
  return (
    <div className="hub-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="hub-toast">
          <Icon name="star" size={18} />
          <span>
            <b>Achievement unlocked</b> {t.name}
          </span>
        </div>
      ))}
    </div>
  )
}
