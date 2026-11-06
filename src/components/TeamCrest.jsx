// Original club crests: one shield, a monogram, and (for non-LCK clubs) a small motif.
// Public API: <TeamCrest teamId name size className [short color label] />.
// Decorative by default (aria-hidden); pass `label` when the crest is the only identifier.
import { useId } from 'react'
import { crestSpec } from './teamCrestModel.js'

const SHIELD = 'M32 3l25 8v19c0 15-11 26-25 31C18 56 7 45 7 30V11z'
const MOTIF_SHAPES = {
  band: <rect x="0" y="12" width="64" height="6" />,
  stripes: <path d="M12 0h3v64h-3zM49 0h3v64h-3z" />,
  chevron: <path d="M0 43l32 11 32-11v7L32 61 0 50z" />,
  tower: <path d="M24 40h4v3h2v-3h4v3h2v-3h4v21H24z" />,
  canton: <path d="M0 0h32v22L0 30z" />,
}
const MONO_SIZE = { 1: 30, 2: 26, 3: 20, 4: 15.5 }

export default function TeamCrest({ teamId, name, size = 48, className = '', short, color, label }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const c = crestSpec(teamId, { name, short, color })
  const len = Math.min(4, c.monogram.length)
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
        {c.motif && <g fill="#fff" opacity=".24">{MOTIF_SHAPES[c.motif]}</g>}
        <path d="M32 3h30v60H32z" fill="#000" opacity=".18" />
      </g>
      <path d="M32 7l21 6.8V30c0 12.6-9 22-21 26.6" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1.5" />
      <text
        x="32"
        y={len === 1 || len === 2 ? 36 : 35}
        textAnchor="middle"
        fontFamily="Barlow Condensed, Arial Narrow, sans-serif"
        fontWeight="700"
        fontSize={MONO_SIZE[len]}
        letterSpacing=".5"
        fill="#fff"
        stroke="#000"
        strokeOpacity=".28"
        strokeWidth="2.4"
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        {c.monogram}
      </text>
    </svg>
  )
}
