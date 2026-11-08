import { useId } from 'react'

/**
 * The series-win laurel crest (docs/design/broadcast-night/assets/trophy.svg),
 * inlined so it inherits the gold tokens. Decorative: the heading says who won.
 * The wrapper carries the one rim sweep (result.css, `.reward-sweep`).
 */
export function TrophyMark({ className = '' }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const fill = `url(#${id})`
  return (
    <div className={className} aria-hidden="true">
      <svg viewBox="0 0 160 160" width="100%" height="100%" focusable="false">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--gold-2)' }} />
            <stop offset=".55" style={{ stopColor: 'var(--gold)' }} />
            <stop offset="1" style={{ stopColor: 'color-mix(in srgb, var(--gold) 70%, var(--bg))' }} />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r="70" fill="none" stroke={fill} strokeWidth="3" opacity=".55" />
        <g fill={fill}>
          <path d="M52 44h56v18c0 17-12 30-28 30S52 79 52 62z" />
          <path d="M44 48h10v8H50c0 8 4 13 9 15l-3 6c-8-3-12-11-12-21zM116 48h-10v8h4c0 8-4 13-9 15l3 6c8-3 12-11 12-21z" />
          <rect x="74" y="92" width="12" height="16" rx="2" />
          <rect x="60" y="108" width="40" height="10" rx="3" />
        </g>
        <g fill="none" stroke={fill} strokeWidth="4" strokeLinecap="round">
          <path d="M30 96c6 18 20 30 38 34" />
          <path d="M130 96c-6 18-20 30-38 34" />
        </g>
        <g fill={fill}>
          <ellipse cx="34" cy="104" rx="5" ry="2.6" transform="rotate(-50 34 104)" />
          <ellipse cx="42" cy="116" rx="5" ry="2.6" transform="rotate(-35 42 116)" />
          <ellipse cx="54" cy="125" rx="5" ry="2.6" transform="rotate(-20 54 125)" />
          <ellipse cx="126" cy="104" rx="5" ry="2.6" transform="rotate(50 126 104)" />
          <ellipse cx="118" cy="116" rx="5" ry="2.6" transform="rotate(35 118 116)" />
          <ellipse cx="106" cy="125" rx="5" ry="2.6" transform="rotate(20 106 125)" />
        </g>
      </svg>
    </div>
  )
}
