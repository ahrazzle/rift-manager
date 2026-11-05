// Match symbols share a 24-unit grid, so a role reads the same in the draft and on the map.
const symbols = {
  TOP: (
    <>
      <path d="M4 20V4h16l-3.5 4H8v9z" fill="currentColor" stroke="none" />
      <path d="M12 12h7v7h-7z" opacity=".7" />
    </>
  ),
  JNG: (
    <>
      <path d="m4 4 6 5 2 7 2-8 6-5-3 11-5 7-5-7z" fill="currentColor" stroke="none" />
      <path d="m5 12 4 4m7 0 3-5" />
    </>
  ),
  MID: (
    <>
      <path d="M4 20v-4L16 4h4v4L8 20z" fill="currentColor" stroke="none" />
      <path d="M4 9V4h5m6 16h5v-5" />
    </>
  ),
  BOT: (
    <>
      <path d="M20 4v16H4l3.5-4H16V7z" fill="currentColor" stroke="none" />
      <path d="M5 5h7v7H5z" opacity=".7" />
    </>
  ),
  SUP: (
    <>
      <path d="m3 5 6 3 3-3 3 3 6-3-3 8-4 1-2 6-2-6-4-1z" />
      <path d="m9 10 3 3 3-3" />
    </>
  ),
  kill: (
    <>
      <path d="m4 4 4 1 11 13-2 2L5 8zM4 17l2 3m-2-1 5-5m6-5 4-5 1 1-4 6m-2 5 5-3" />
    </>
  ),
  dragon: (
    <>
      <path d="m3 14 3-7 5 2 6-6-1 6 5 2-3 2 1 3-5-1-4 5-5-2 4-1 1-4-4-2z" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="10.8" r=".9" fill="#101722" stroke="none" />
    </>
  ),
  baron: (
    <>
      <path d="m2 5 5 4 1-5 4 4 4-4 1 5 5-4-3 10-7 6-7-6z" />
      <path d="m7 12 3 2m7-2-3 2m-4 3 2 1 2-1" />
    </>
  ),
  tower: (
    <>
      <path d="M5 3h3v3h3V3h2v3h3V3h3v6l-3 3 1 6 2 2H5l2-2 1-6-3-3z" />
      <path d="M11 20v-5h2v5M8 10h8" />
    </>
  ),
  gold: (
    <>
      <ellipse cx="10" cy="7.5" rx="6.5" ry="3.3" />
      <path d="M3.5 8v4c0 2 3.4 3.5 6.5 3.5M3.5 12v3c0 2 3.4 3.5 6.5 3.5" />
      <circle cx="16.5" cy="15.5" r="4.5" />
    </>
  ),
  play: <path d="M7 4.5 20 12 7 19.5z" fill="currentColor" stroke="none" />,
  pause: <path d="M6 4.5h4.5v15H6zm7.5 0H18v15h-4.5z" fill="currentColor" stroke="none" />,
  skip: (
    <>
      <path d="m4 5 12 7-12 7z" fill="currentColor" stroke="none" />
      <path d="M19 5v14" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l4 2" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H3v2a4 4 0 0 0 5 4m9-6h4v2a4 4 0 0 1-5 4m-4 2v4m-5 2h10" />
    </>
  ),
  nexus: (
    <>
      <path d="m12 2 6 9-6 9-6-9z" fill="currentColor" stroke="none" />
      <path d="m4 15 2 4 6 3 6-3 2-4" />
    </>
  ),
  settings: (
    <>
      <path d="M3 7h7m5 0h6M3 17h3m5 0h10" />
      <circle cx="12.5" cy="7" r="2.5" />
      <circle cx="8.5" cy="17" r="2.5" />
    </>
  ),
  draft: (
    <>
      <path d="m4 7 2-3 6 1M9 7l10 1-1 13-10-1z" />
      <path d="m14 11 2 3-2 3-2-3z" fill="currentColor" stroke="none" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4m0 1c5-4 9 3 15-1l-2 5 2 4c-6 4-10-3-15 1" />
    </>
  ),
  shield: (
    <>
      <path d="m12 2 8 3v6c0 4-3 8-8 11-5-3-8-7-8-11V5z" />
      <path d="m8.5 11.5 2.5 2.5 4.5-5" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  team: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-2a6 6 0 0 1 12 0v2m.5-14a3 3 0 0 1 0 6m2 2a4 4 0 0 1 3.5 4v2" />
    </>
  ),
  hub: (
    <>
      <path d="M4 4h7v7H4zm11 0h5v4h-5zM4 15h7v5H4zm11-3h5v8h-5z" />
    </>
  ),
  bracket: (
    <>
      <path d="M3 4h5v5H3zm0 11h5v5H3zm5-9h4v11H8m4-5h8" />
      <circle cx="20" cy="12" r="1.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h17M6 16v-4m6 4V7m6 9V3" />
    </>
  ),
  book: (
    <>
      <path d="M12 6C9 4 6 4 3 5v13c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1zM12 6v13" />
    </>
  ),
  flame: <path d="M12 2c2 6-3 7 1 11 1-3 4-4 4-7 7 8 2 15-5 15-5 0-9-5-6-10 0 3 2 4 3 4-3-6 3-7 3-13z" />,
  snow: (
    <>
      <path d="M12 2v20M3.4 7l17.2 10M3.4 17 20.6 7m-12-3 3.4 3 3.4-3m-7 16 3.6-3 3.4 3" />
    </>
  ),
  target: (
    <>
      <circle cx="11" cy="13" r="8" />
      <circle cx="11" cy="13" r="3.5" />
      <path d="m11 13 8-8m-1-3 .5 3.5L22 6" />
    </>
  ),
  ace: <path d="m12 2 3 6.5 7 1-5 5 1 7-6-3.5-6 3.5 1-7-5-5 7-1z" />,
}
const aliases = {
  JGL: 'JNG',
  teamfight: 'kill',
  dashboard: 'hub',
  lineup: 'team',
  tactics: 'target',
  strategy: 'draft',
  standings: 'chart',
  results: 'flag',
  market: 'gold',
  squad: 'team',
  tournament: 'bracket',
  campaign: 'book',
}

export default function MatchIcon({ name, size = 18, className = '', ...props }) {
  const paths = symbols[aliases[name] || name]
  if (!paths) return null
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`match-icon ${className}`}
      {...props}
    >
      {paths}
    </svg>
  )
}
