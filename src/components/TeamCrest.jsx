// Original club crests: one shield, a monogram, and (for non-LCK clubs) a small motif.
// Public API: <TeamCrest teamId name size className [short color label] />.
// Decorative by default (aria-hidden); pass `label` when the crest is the only identifier.
import { useId } from 'react'
import { crestSpec } from './teamCrestModel.js'

const SHIELD = 'M32 3l25 8v19c0 15-11 26-25 31C18 56 7 45 7 30V11z'
const MOTIF_SHAPES = {
  band: <rect x="0" y="11" width="64" height="8" />,
  stripes: <path d="M11 0h4.5v64H11zM48.5 0H53v64h-4.5z" />,
  chevron: <path d="M0 41l32 12 32-12v9L32 63 0 50z" />,
  tower: <path d="M20 38h6v4h3v-4h6v4h3v-4h6v26H20z" />,
  canton: <path d="M0 0h32v26L0 36z" />,
}
const MONO_SIZE = { 1: 30, 2: 26, 3: 20, 4: 15.5 }
const MONO_SIZE_SMALL = { 1: 38, 2: 33 } // <=28px: fewer, bigger, heavier letters

export default function TeamCrest({ teamId, name, size = 48, className = '', short, color, label }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const c = crestSpec(teamId, { name, short, color, size })
  const len = Math.min(4, c.monogram.length)
  const small = !(size > 28)
  const fs = small ? MONO_SIZE_SMALL[len] ?? 33 : MONO_SIZE[len]
  const mono = {
    x: 32,
    y: small ? 40 : len === 1 || len === 2 ? 36 : 35,
    textAnchor: 'middle',
    fontFamily: 'Barlow Condensed, Arial Narrow, sans-serif',
    fontWeight: 700,
    fontSize: fs,
    letterSpacing: small ? 0 : '.5',
  }
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      focusable="false"
      className={`team-crest ${className}`.trim()}
      data-crest={c.id}
      data-motif={c.motif ?? 'none'}
      {...a11y}
    >
      <defs>
        <clipPath id={`cc${uid}`}>
          <path d={SHIELD} />
        </clipPath>
      </defs>
      <path d={SHIELD} fill={c.fill} stroke={c.rim} strokeWidth="2" strokeLinejoin="round" />
      <g clipPath={`url(#cc${uid})`}>
        {c.motif && <g fill="#fff" opacity=".4">{MOTIF_SHAPES[c.motif]}</g>}
        <path d="M32 3h30v60H32z" fill="#000" opacity=".18" />
      </g>
      <path d="M32 7l21 6.8V30c0 12.6-9 22-21 26.6" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1.5" />
      <text {...mono} fill="#fff" stroke="#000" strokeOpacity=".28" strokeWidth="2.4" paintOrder="stroke" strokeLinejoin="round">
        {c.monogram}
      </text>
      {small && (
        <text {...mono} fill="#fff" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round">
          {c.monogram}
        </text>
      )}
    </svg>
  )
}
