// ============================================================================
// Rift Manager — Champion pool for Active Coach (draft) mode.
// ----------------------------------------------------------------------------
// 60 champions, 12 per role. Each has a power-spike phase and style tags used
// by the draft comp scorer (see src/game/draft.js): teams that draft toward a
// coherent identity (engage, poke, pick, teamfight, split, protect) get a
// small comp bonus; incoherent drafts get nothing. Tags are game-flavored,
// not official stats.
// ============================================================================

export const ROLES_DRAFT = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']

// phase: when the champion spikes. styles: comp identity tags.
export const CHAMPIONS = [
  // ---- TOP ----
  { id: 'aatrox', name: 'Aatrox', ddragon: 'Aatrox.png', roles: ['TOP'], phase: 'mid', styles: ['teamfight', 'engage'] },
  { id: 'camille', name: 'Camille', ddragon: 'Camille.png', roles: ['TOP'], phase: 'late', styles: ['split', 'pick'] },
  { id: 'darius', name: 'Darius', ddragon: 'Darius.png', roles: ['TOP'], phase: 'early', styles: ['engage', 'teamfight'] },
  { id: 'fiora', name: 'Fiora', ddragon: 'Fiora.png', roles: ['TOP'], phase: 'late', styles: ['split'] },
  { id: 'gnar', name: 'Gnar', ddragon: 'Gnar.png', roles: ['TOP'], phase: 'mid', styles: ['teamfight', 'engage', 'poke'] },
  { id: 'gragas', name: 'Gragas', ddragon: 'Gragas.png', roles: ['TOP', 'JNG'], phase: 'mid', styles: ['engage', 'pick'] },
  { id: 'jax', name: 'Jax', ddragon: 'Jax.png', roles: ['TOP'], phase: 'late', styles: ['split', 'teamfight'] },
  { id: 'jayce', name: 'Jayce', ddragon: 'Jayce.png', roles: ['TOP', 'MID'], phase: 'early', styles: ['poke'] },
  { id: 'ksante', name: "K'Sante", ddragon: 'KSante.png', roles: ['TOP'], phase: 'mid', styles: ['engage', 'teamfight'] },
  { id: 'ornn', name: 'Ornn', ddragon: 'Ornn.png', roles: ['TOP'], phase: 'mid', styles: ['engage', 'teamfight'] },
  { id: 'renekton', name: 'Renekton', ddragon: 'Renekton.png', roles: ['TOP'], phase: 'early', styles: ['engage', 'split'] },
  { id: 'rumble', name: 'Rumble', ddragon: 'Rumble.png', roles: ['TOP', 'MID'], phase: 'mid', styles: ['teamfight', 'poke'] },
  // ---- JUNGLE ----
  { id: 'elise', name: 'Elise', ddragon: 'Elise.png', roles: ['JNG'], phase: 'early', styles: ['pick', 'engage'] },
  { id: 'graves', name: 'Graves', ddragon: 'Graves.png', roles: ['JNG'], phase: 'mid', styles: ['poke', 'teamfight'] },
  { id: 'jarvan', name: 'Jarvan IV', ddragon: 'JarvanIV.png', roles: ['JNG'], phase: 'early', styles: ['engage', 'teamfight'] },
  { id: 'kindred', name: 'Kindred', ddragon: 'Kindred.png', roles: ['JNG'], phase: 'late', styles: ['teamfight', 'protect'] },
  { id: 'leesin', name: 'Lee Sin', ddragon: 'LeeSin.png', roles: ['JNG'], phase: 'early', styles: ['pick', 'engage'] },
  { id: 'lillia', name: 'Lillia', ddragon: 'Lillia.png', roles: ['JNG'], phase: 'mid', styles: ['teamfight', 'poke'] },
  { id: 'maokai', name: 'Maokai', ddragon: 'Maokai.png', roles: ['JNG', 'SUP'], phase: 'mid', styles: ['engage', 'teamfight'] },
  { id: 'nocturne', name: 'Nocturne', ddragon: 'Nocturne.png', roles: ['JNG'], phase: 'mid', styles: ['pick', 'engage'] },
  { id: 'sejuani', name: 'Sejuani', ddragon: 'Sejuani.png', roles: ['JNG'], phase: 'mid', styles: ['engage', 'teamfight'] },
  { id: 'viego', name: 'Viego', ddragon: 'Viego.png', roles: ['JNG'], phase: 'mid', styles: ['pick', 'teamfight'] },
  { id: 'vi', name: 'Vi', ddragon: 'Vi.png', roles: ['JNG'], phase: 'mid', styles: ['engage', 'pick'] },
  { id: 'wukong', name: 'Wukong', ddragon: 'MonkeyKing.png', roles: ['JNG', 'TOP'], phase: 'mid', styles: ['engage', 'teamfight'] },
  // ---- MID ----
  { id: 'ahri', name: 'Ahri', ddragon: 'Ahri.png', roles: ['MID'], phase: 'mid', styles: ['pick', 'poke'] },
  { id: 'akali', name: 'Akali', ddragon: 'Akali.png', roles: ['MID', 'TOP'], phase: 'mid', styles: ['pick', 'split'] },
  { id: 'azir', name: 'Azir', ddragon: 'Azir.png', roles: ['MID'], phase: 'late', styles: ['teamfight', 'poke'] },
  { id: 'corki', name: 'Corki', ddragon: 'Corki.png', roles: ['MID', 'BOT'], phase: 'mid', styles: ['poke', 'teamfight'] },
  { id: 'hwei', name: 'Hwei', ddragon: 'Hwei.png', roles: ['MID'], phase: 'mid', styles: ['poke', 'teamfight'] },
  { id: 'leblanc', name: 'LeBlanc', ddragon: 'LeBlanc.png', roles: ['MID'], phase: 'early', styles: ['pick', 'poke'] },
  { id: 'neeko', name: 'Neeko', ddragon: 'Neeko.png', roles: ['MID', 'SUP'], phase: 'mid', styles: ['engage', 'teamfight'] },
  { id: 'orianna', name: 'Orianna', ddragon: 'Orianna.png', roles: ['MID'], phase: 'mid', styles: ['teamfight', 'poke'] },
  { id: 'sylas', name: 'Sylas', ddragon: 'Sylas.png', roles: ['MID'], phase: 'mid', styles: ['teamfight', 'pick'] },
  { id: 'taliyah', name: 'Taliyah', ddragon: 'Taliyah.png', roles: ['MID', 'JNG'], phase: 'mid', styles: ['poke', 'pick'] },
  { id: 'tristana', name: 'Tristana', ddragon: 'Tristana.png', roles: ['MID', 'BOT'], phase: 'mid', styles: ['poke', 'teamfight'] },
  { id: 'zed', name: 'Zed', ddragon: 'Zed.png', roles: ['MID'], phase: 'mid', styles: ['pick', 'split'] },
  // ---- BOT ----
  { id: 'aphelios', name: 'Aphelios', ddragon: 'Aphelios.png', roles: ['BOT'], phase: 'late', styles: ['teamfight'] },
  { id: 'ashe', name: 'Ashe', ddragon: 'Ashe.png', roles: ['BOT', 'SUP'], phase: 'mid', styles: ['poke', 'engage'] },
  { id: 'caitlyn', name: 'Caitlyn', ddragon: 'Caitlyn.png', roles: ['BOT'], phase: 'early', styles: ['poke'] },
  { id: 'draven', name: 'Draven', ddragon: 'Draven.png', roles: ['BOT'], phase: 'early', styles: ['teamfight'] },
  { id: 'ezreal', name: 'Ezreal', ddragon: 'Ezreal.png', roles: ['BOT'], phase: 'mid', styles: ['poke'] },
  { id: 'jhin', name: 'Jhin', ddragon: 'Jhin.png', roles: ['BOT'], phase: 'mid', styles: ['poke', 'pick'] },
  { id: 'kaisa', name: "Kai'Sa", ddragon: 'KaiSa.png', roles: ['BOT'], phase: 'mid', styles: ['teamfight', 'pick'] },
  { id: 'kalista', name: 'Kalista', ddragon: 'Kalista.png', roles: ['BOT'], phase: 'early', styles: ['teamfight'] },
  { id: 'lucian', name: 'Lucian', ddragon: 'Lucian.png', roles: ['BOT', 'MID'], phase: 'early', styles: ['teamfight', 'poke'] },
  { id: 'senna', name: 'Senna', ddragon: 'Senna.png', roles: ['BOT', 'SUP'], phase: 'late', styles: ['poke', 'protect'] },
  { id: 'varus', name: 'Varus', ddragon: 'Varus.png', roles: ['BOT'], phase: 'mid', styles: ['poke', 'teamfight'] },
  { id: 'zeri', name: 'Zeri', ddragon: 'Zeri.png', roles: ['BOT'], phase: 'late', styles: ['teamfight'] },
  // ---- SUPPORT ----
  { id: 'alistar', name: 'Alistar', ddragon: 'Alistar.png', roles: ['SUP'], phase: 'mid', styles: ['engage', 'teamfight'] },
  { id: 'bard', name: 'Bard', ddragon: 'Bard.png', roles: ['SUP'], phase: 'mid', styles: ['pick', 'poke'] },
  { id: 'blitzcrank', name: 'Blitzcrank', ddragon: 'Blitzcrank.png', roles: ['SUP'], phase: 'early', styles: ['pick'] },
  { id: 'braum', name: 'Braum', ddragon: 'Braum.png', roles: ['SUP'], phase: 'mid', styles: ['protect', 'teamfight'] },
  { id: 'karma', name: 'Karma', ddragon: 'Karma.png', roles: ['SUP'], phase: 'early', styles: ['poke', 'protect'] },
  { id: 'leona', name: 'Leona', ddragon: 'Leona.png', roles: ['SUP'], phase: 'early', styles: ['engage', 'teamfight'] },
  { id: 'lulu', name: 'Lulu', ddragon: 'Lulu.png', roles: ['SUP'], phase: 'mid', styles: ['protect', 'poke'] },
  { id: 'milio', name: 'Milio', ddragon: 'Milio.png', roles: ['SUP'], phase: 'mid', styles: ['protect', 'teamfight'] },
  { id: 'nautilus', name: 'Nautilus', ddragon: 'Nautilus.png', roles: ['SUP'], phase: 'early', styles: ['engage', 'pick'] },
  { id: 'rakan', name: 'Rakan', ddragon: 'Rakan.png', roles: ['SUP'], phase: 'mid', styles: ['engage', 'teamfight'] },
  { id: 'renata', name: 'Renata Glasc', ddragon: 'Renata.png', roles: ['SUP'], phase: 'mid', styles: ['teamfight', 'protect'] },
  { id: 'thresh', name: 'Thresh', ddragon: 'Thresh.png', roles: ['SUP'], phase: 'mid', styles: ['pick', 'engage', 'protect'] },
]

export const CHAMP_BY_ID = Object.fromEntries(CHAMPIONS.map((c) => [c.id, c]))

export function champsForRole(role) {
  return CHAMPIONS.filter((c) => c.roles.includes(role))
}
