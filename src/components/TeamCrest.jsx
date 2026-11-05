// Original club emblems. Historical and international clubs use their own initials.
const clubs = {
  T1: ['#ff6578', 'M9 16h29l-6 5H19l2 3h8l-5 5-7-3 4 7-6-4z'],
  GEN: ['#f8cb6c', 'm24 9 12 7-3 4-9-5-7 4v9l7 5 5-3v-4h-6v-5h12v12l-11 7-13-9V17z'],
  HLE: ['#ff9864', 'm24 8 3 10 5-7-1 11 6-2-4 12-9 7-9-7-4-12 7 3-1-11 6 7z'],
  DK: ['#6ce6cf', 'm11 14 12 4v7l-5-3v8l-7-5zm26 0v11l-7 5v-8l-5 3v-7zm-13 14 8 4-8 7-8-7z'],
  KT: ['#ff7f73', 'm10 15 16 1-5 6h12l-17 15 5-11H10l5-6zm19-2 10 1-9 7h-7z'],
  DRX: ['#7cacff', 'm9 29 9-18 1 8 10-7 10 4-12 3 6 3-10 3-5 9-8 3 6-9z'],
  KDF: ['#72d9ff', 'M8 19l10 2 6-10 6 10 10-2-11 9-5 10-5-10z'],
  FOX: ['#ff9f52', 'm9 10 13 8h5l12-8-4 17-11 10-11-10zm5 11 6 6 1-4zm20 0-7 2 1 4z'],
  BRO: ['#81d6ac', 'm24 10 9 4v5l-7-2v5l8-2-2 8-8 9-8-9-2-8 8 2v-5l-7 2v-5z'],
  NS: ['#ff6774', 'm24 9 7 6-3 8 8-3-3 10-9 8-9-8-3-10 8 3-3-8z'],
}
const fallbackColors = ['#97bdff', '#6acdbc', '#c8a1f5', '#feb487', '#a9d77c', '#ec93aa']

export default function TeamCrest({ teamId, name, size = 48, className = '' }) {
  const key = String(teamId || name || '').toUpperCase()
  const club = clubs[key]
  const color =
    club?.[0] ?? fallbackColors[Array.from(key).reduce((n, c) => n + c.charCodeAt(0), 0) % fallbackColors.length]
  const initials = (teamId || name || '•').toString().slice(0, 3).toUpperCase()
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={`team-crest ${className}`}
      style={{ color }}
    >
      <path
        d="m24 2 19 6v15c0 9-10 18-19 23C15 41 5 32 5 23V8z"
        fill="#101a26"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="m24 5 16 5v13c0 6-7 14-16 20C15 37 8 29 8 23V10z" fill="currentColor" opacity=".15" />
      {club ? (
        <path d={club[1]} fill="currentColor" fillRule="evenodd" />
      ) : (
        <text
          x="24"
          y="29"
          textAnchor="middle"
          fontFamily="Barlow Condensed, sans-serif"
          fontWeight="700"
          fontSize="15"
          fill="currentColor"
        >
          {initials}
        </text>
      )}
    </svg>
  )
}
