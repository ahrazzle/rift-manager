import { clockLabel } from './matchModel.js'

/**
 * Play-by-play. Newest first, side colour bar plus the side in text for
 * screen readers, actor in bold. Polite live region so new plays are read
 * without interrupting.
 * items: [{ key, t, side: 'blue'|'red'|'neutral', actor, detail?, text, pin? }]
 */
export default function EventFeed({ items, empty = 'Teams leave base. Lanes are forming.', sideNames = {} }) {
  return (
    // Scrollable, so it takes focus for keyboard scrolling.
    <div className="event-feed" tabIndex={0} role="region" aria-label="Play-by-play log">
      {items.length === 0 && <p className="feed-empty">{empty}</p>}
      <ol className="feed-list" aria-live="polite" aria-relevant="additions" aria-label="Play-by-play, newest first">
        {items.map((item) => (
          <li key={item.key} className={`feed-item feed-${item.side}${item.pin ? ' feed-pin' : ''}`}>
            <span className="feed-time num">{clockLabel(item.t)}</span>
            <i className="feed-bar" aria-hidden="true" />
            <span className="feed-text">
              {sideNames[item.side] && <span className="sr-only">{sideNames[item.side]}: </span>}
              <b>{item.actor}</b>
              {item.detail ? ` ${item.detail}` : ''} {item.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
