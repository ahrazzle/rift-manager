import TeamCrest from '../TeamCrest.jsx'

/** Crest + name on one line. The crest is decorative; the name is the text. */
export default function TeamLine({ teamId, name, size = 24, className = '', children }) {
  return (
    <span className={`cmp-team ${className}`.trim()}>
      <TeamCrest teamId={teamId} name={name} size={size} />
      <span className="cmp-team-name">{name}</span>
      {children}
    </span>
  )
}
