// Rift Manager — historical LEC datasets (EU LCS 2013-2018, LEC 2019-2025)
// Team names, player names and relative tiers are historically grounded;
// ratings are fictional (the game's builder derives them from tier).
// [UNCERTAIN] marks padded or unverified picks.
export const HISTORY_LEC = {
  // LEC 2025. Ordered by Summer split final standings (G2 beat Movistar KOI 3-0 in the final). CORRECTION vs brief: verified Spring 2025 champion is Movistar KOI (3-1 vs G2), not Karmine Corp (Winter champ). Los Ratones are not an LEC team and are excluded. Rosters are Summer 2025 lineups except Rogue (see team note). — champion: G2 Esports
  2025: [
    {
      id: "G2",
      name: "G2 Esports",
      short: "G2",
      color: "#e01f26",
      tier: 90,
      roster: {
        TOP: ["BrokenBlade", "Odoamne"],
        JNG: ["SkewMond", "Memento"],
        MID: ["Caps", "Dajor"],
        BOT: ["Hans Sama", "Bvoy"],
        SUP: ["Labrov", "Rhuckz"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "KOI",
      name: "Movistar KOI",
      short: "KOI",
      color: "#5b2ee5",
      tier: 88,
      roster: {
        TOP: ["Myrwn", "Szygenda"],
        JNG: ["Elyoya", "Kirei"],
        MID: ["Jojopyun", "Ruby"],
        BOT: ["Supa", "Comp"],
        SUP: ["Alvaro", "Trymbi"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "FNC",
      name: "Fnatic",
      short: "FNC",
      color: "#f7941d",
      tier: 87,
      roster: {
        TOP: ["Oscarinin", "Wunder"],
        JNG: ["Razork", "Shad0w"],
        MID: ["Poby", "Humanoid"],
        BOT: ["Upset", "xMatty"],
        SUP: ["Mikyx", "Advienne"],
      },
    },
    // [UNCERTAIN] Poby replaced Humanoid at mid for Summer.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "KC",
      name: "Karmine Corp",
      short: "KC",
      color: "#0a90ff",
      tier: 87,
      roster: {
        TOP: ["Canna", "Cabochard"],
        JNG: ["Yike", "Closer"],
        MID: ["Vladi", "Saken"],
        BOT: ["Caliste", "Steeelback"],
        SUP: ["Targamas", "Vander"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "GX",
      name: "GIANTX",
      short: "GX",
      color: "#14b8a6",
      tier: 84,
      roster: {
        TOP: ["Lot", "Th3Antonio"],
        JNG: ["ISMA", "Juhan"],
        MID: ["Jackies", "Abbedagge"],
        BOT: ["Noah", "Hjarnan"],
        SUP: ["Jun", "IgNar"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "VIT",
      name: "Team Vitality",
      short: "VIT",
      color: "#fee101",
      tier: 84,
      roster: {
        TOP: ["Naak Nako", "Photon"],
        JNG: ["Lyncas", "Daglas"],
        MID: ["Czajek", "Vetheo"],
        BOT: ["Carzzy", "Neon"],
        SUP: ["Fleshy", "Nisqy"],
      },
    },
    // [UNCERTAIN] Fleshy replaced Nisqy at support for Summer (Nisqy joined KC as substitute).
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "BDS",
      name: "Team BDS",
      short: "BDS",
      color: "#b83280",
      tier: 83,
      roster: {
        TOP: ["Rooster", "Irrelevant"],
        JNG: ["Boukada", "113"],
        MID: ["nuc", "Reeker"],
        BOT: ["Ice", "Crownie"],
        SUP: ["Parus", "Erdote"],
      },
    },
    // [UNCERTAIN] Rooster and Boukada joined for Summer (Irrelevant/113 in Spring).
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "TH",
      name: "Team Heretics",
      short: "TH",
      color: "#bfa05a",
      tier: 83,
      roster: {
        TOP: ["Carlsen", "Evi"],
        JNG: ["Sheo", "Jankos"],
        MID: ["Kamiloo", "Zwyroo"],
        BOT: ["Flakked", "Jackspektra"],
        SUP: ["Stend", "Mersa"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "SK",
      name: "SK Gaming",
      short: "SK",
      color: "#232a35",
      tier: 79,
      roster: {
        TOP: ["JNX", "Jenax"],
        JNG: ["Lurox", "Markoon"],
        MID: ["RKR", "Sertuss"],
        BOT: ["Keduii", "Exakick"],
        SUP: ["Loopy", "Doss"],
      },
    },
    // [UNCERTAIN] Summer jungler uncertain: Boukada moved to BDS for Summer; Lurox is a stand-in.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "RGE",
      name: "Rogue",
      short: "RGE",
      color: "#002856",
      tier: 77,
      roster: {
        TOP: ["Adam", "Finn"],
        JNG: ["Malrang", "Inspired"],
        MID: ["Larssen", "Sencux"],
        BOT: ["Patrik", "Woolite"],
        SUP: ["Execute", "Wadid"],
      },
    },
    // [UNCERTAIN] Rogue's LEC slot was acquired by Natus Vincere for Summer 2025; roster shown is Rogue's final LEC roster (Spring 2025).
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
  ],
  // LEC 2024. Ordered by Season Finals 2024 (G2 beat Fnatic 3-1 in the final; G2 won Winter, Spring and Summer). Rosters are Summer 2024 lineups. — champion: G2 Esports
  2024: [
    {
      id: "G2",
      name: "G2 Esports",
      short: "G2",
      color: "#e01f26",
      tier: 91,
      roster: {
        TOP: ["BrokenBlade", "Send0o"],
        JNG: ["Yike", "Memento"],
        MID: ["Caps", "P1noy"],
        BOT: ["Hans Sama", "Deadly"],
        SUP: ["Mikyx", "Rhuckz"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "FNC",
      name: "Fnatic",
      short: "FNC",
      color: "#f7941d",
      tier: 88,
      roster: {
        TOP: ["Oscarinin", "Sacre"],
        JNG: ["Razork", "Shad0w"],
        MID: ["Humanoid", "Poby"],
        BOT: ["Noah", "Rekkles"],
        SUP: ["Jun", "Advienne"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "KOI",
      name: "MAD Lions KOI",
      short: "KOI",
      color: "#5b2ee5",
      tier: 87,
      roster: {
        TOP: ["Myrwn", "Szygenda"],
        JNG: ["Elyoya", "Malrang"],
        MID: ["Fresskowy", "Sencux"],
        BOT: ["Supa", "Woolite"],
        SUP: ["Alvaro", "Execute"],
      },
    },
    // [UNCERTAIN] MAD Lions merged with KOI for 2024; listed under the KOI slot.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "BDS",
      name: "Team BDS",
      short: "BDS",
      color: "#b83280",
      tier: 86,
      roster: {
        TOP: ["Adam", "Agresivoo"],
        JNG: ["Sheo", "Cinkrof"],
        MID: ["nuc", "Reeker"],
        BOT: ["Ice", "Crownie"],
        SUP: ["Labrov", "Erdote"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "SK",
      name: "SK Gaming",
      short: "SK",
      color: "#232a35",
      tier: 85,
      roster: {
        TOP: ["Irrelevant", "Jenax"],
        JNG: ["ISMA", "Lurox"],
        MID: ["Nisqy", "Sertuss"],
        BOT: ["Rahel", "Exakick"],
        SUP: ["Luon", "Lilipp"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "GX",
      name: "GIANTX",
      short: "GX",
      color: "#14b8a6",
      tier: 84,
      roster: {
        TOP: ["Th3Antonio", "Odoamne"],
        JNG: ["Juhan", "Peach"],
        MID: ["Jackies", "Abbedagge"],
        BOT: ["Patrik", "Hjarnan"],
        SUP: ["IgNar", "Mystiques"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "KC",
      name: "Karmine Corp",
      short: "KC",
      color: "#0a90ff",
      tier: 83,
      roster: {
        TOP: ["Canna", "Cabochard"],
        JNG: ["Closer", "Kirei"],
        MID: ["Vladi", "Saken"],
        BOT: ["Upset", "Steeelback"],
        SUP: ["Targamas", "Vander"],
      },
    },
    // [UNCERTAIN] Debut LEC season.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "TH",
      name: "Team Heretics",
      short: "TH",
      color: "#bfa05a",
      tier: 82,
      roster: {
        TOP: ["Wunder", "Evi"],
        JNG: ["Jankos", "Shlatan"],
        MID: ["Zwyroo", "Ruby"],
        BOT: ["Flakked", "Jackspektra"],
        SUP: ["Trymbi", "Stend"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "VIT",
      name: "Team Vitality",
      short: "VIT",
      color: "#fee101",
      tier: 80,
      roster: {
        TOP: ["Photon", "Naak Nako"],
        JNG: ["Lyncas", "Daglas"],
        MID: ["Vetheo", "Milica"],
        BOT: ["Carzzy", "Neon"],
        SUP: ["Hylissang", "Jactroll"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "RGE",
      name: "Rogue",
      short: "RGE",
      color: "#002856",
      tier: 78,
      roster: {
        TOP: ["Finn", "Kryze"],
        JNG: ["Markoon", "Kikis"],
        MID: ["Larssen", "Dajor"],
        BOT: ["Comp", "Jeskla"],
        SUP: ["Zoelys", "Norskeren"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
  ],
  // LEC 2023. Ordered by Season Finals 2023 (G2 beat Fnatic 3-1 in the final; Winter champ G2, Spring champ MAD, Summer champ G2). Rosters are Summer 2023 lineups. — champion: G2 Esports
  2023: [
    {
      id: "G2",
      name: "G2 Esports",
      short: "G2",
      color: "#e01f26",
      tier: 91,
      roster: {
        TOP: ["BrokenBlade", "Send0o"],
        JNG: ["Yike", "Memento"],
        MID: ["Caps", "P1noy"],
        BOT: ["Hans Sama", "Deadly"],
        SUP: ["Mikyx", "Rhuckz"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "FNC",
      name: "Fnatic",
      short: "FNC",
      color: "#f7941d",
      tier: 88,
      roster: {
        TOP: ["Oscarinin", "Wunder"],
        JNG: ["Razork", "Shad0w"],
        MID: ["Humanoid", "MagiFelix"],
        BOT: ["Noah", "Rekkles"],
        SUP: ["Trymbi", "Execute"],
      },
    },
    // [UNCERTAIN] Summer bot lane was Noah/Trymbi (Rekkles/Advienne played Spring); Wunder subbed top during Season Finals.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "MAD",
      name: "MAD Lions",
      short: "MAD",
      color: "#e8b10e",
      tier: 87,
      roster: {
        TOP: ["Chasy", "Armut"],
        JNG: ["Elyoya", "Zanzarah"],
        MID: ["Nisqy", "Dajor"],
        BOT: ["Carzzy", "Bvoy"],
        SUP: ["Hylissang", "Targamas"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "BDS",
      name: "Team BDS",
      short: "BDS",
      color: "#b83280",
      tier: 86,
      roster: {
        TOP: ["Adam", "Agresivoo"],
        JNG: ["Sheo", "Cinkrof"],
        MID: ["nuc", "Reeker"],
        BOT: ["Crownie", "xMatty"],
        SUP: ["Labrov", "Erdote"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "XL",
      name: "Excel Esports",
      short: "XL",
      color: "#2dd4a7",
      tier: 85,
      roster: {
        TOP: ["Odoamne", "Expect"],
        JNG: ["Peach", "Xerxe"],
        MID: ["Abbedagge", "Nukeduck"],
        BOT: ["Patrik", "Hjarnan"],
        SUP: ["LIMIT", "Mystiques"],
      },
    },
    // [UNCERTAIN] Summer lineup: Peach jungle, Abbedagge mid (Xerxe/Vetheo in Spring). Finished 2nd in Summer split.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "SK",
      name: "SK Gaming",
      short: "SK",
      color: "#232a35",
      tier: 84,
      roster: {
        TOP: ["Irrelevant", "Jenax"],
        JNG: ["Markoon", "Lurox"],
        MID: ["Sertuss", "Blue"],
        BOT: ["Exakick", "Keduii"],
        SUP: ["Doss", "Lilipp"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "TH",
      name: "Team Heretics",
      short: "TH",
      color: "#bfa05a",
      tier: 83,
      roster: {
        TOP: ["Evi", "WhiteKnight"],
        JNG: ["Jankos", "Kirei"],
        MID: ["Vetheo", "Ruby"],
        BOT: ["Flakked", "Jackspektra"],
        SUP: ["Mersa", "Vander"],
      },
    },
    // [UNCERTAIN] Summer lineup: Vetheo mid, Flakked ADC (Ruby/Jackspektra in Spring). Finished 4th in Summer split.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "KOI",
      name: "KOI",
      short: "KOI",
      color: "#5b2ee5",
      tier: 83,
      roster: {
        TOP: ["Szygenda", "Kryze"],
        JNG: ["Malrang", "Kikis"],
        MID: ["Larssen", "Sencux"],
        BOT: ["Comp", "Woolite"],
        SUP: ["Advienne", "Norskeren"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "AST",
      name: "Astralis",
      short: "AST",
      color: "#d22630",
      tier: 80,
      roster: {
        TOP: ["Finn", "Vizicsacsi"],
        JNG: ["113", "Shlatan"],
        MID: ["LIDER", "Czekolad"],
        BOT: ["Kobbe", "Jeskla"],
        SUP: ["JeongHoon", "H1IVA"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "VIT",
      name: "Team Vitality",
      short: "VIT",
      color: "#fee101",
      tier: 78,
      roster: {
        TOP: ["Photon", "Alphari"],
        JNG: ["Bo", "Daglas"],
        MID: ["Perkz", "Milica"],
        BOT: ["Upset", "Steeelback"],
        SUP: ["Kaiser", "Jactroll"],
      },
    },
    // [UNCERTAIN] Bo was benched during Summer; Daglas promoted from academy.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
  ],
  // LEC 2022. Ordered by Summer split final standings. CORRECTION vs brief: verified Summer 2022 champion is Rogue (3-0 vs G2); Spring 2022 champion was G2. Rosters are Summer 2022 lineups. — champion: Rogue
  2022: [
    {
      id: "RGE",
      name: "Rogue",
      short: "RGE",
      color: "#002856",
      tier: 91,
      roster: {
        TOP: ["Odoamne", "Ruvel"],
        JNG: ["Malrang", "Kikis"],
        MID: ["Larssen", "Sencux"],
        BOT: ["Comp", "Woolite"],
        SUP: ["Trymbi", "Vander"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "G2",
      name: "G2 Esports",
      short: "G2",
      color: "#e01f26",
      tier: 89,
      roster: {
        TOP: ["BrokenBlade", "Send0o"],
        JNG: ["Jankos", "Memento"],
        MID: ["Caps", "P1noy"],
        BOT: ["Flakked", "Deadly"],
        SUP: ["Targamas", "Rhuckz"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "FNC",
      name: "Fnatic",
      short: "FNC",
      color: "#f7941d",
      tier: 87,
      roster: {
        TOP: ["Wunder", "Adam"],
        JNG: ["Razork", "Shad0w"],
        MID: ["Humanoid", "MagiFelix"],
        BOT: ["Upset", "Bvoy"],
        SUP: ["Hylissang", "Execute"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "MAD",
      name: "MAD Lions",
      short: "MAD",
      color: "#e8b10e",
      tier: 86,
      roster: {
        TOP: ["Armut", "Chasy"],
        JNG: ["Elyoya", "Taxer"],
        MID: ["Nisqy", "Reeker"],
        BOT: ["UNF0RGIVEN", "Cody"],
        SUP: ["Kaiser", "Gadget"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "MSF",
      name: "Misfits Gaming",
      short: "MSF",
      color: "#a6192e",
      tier: 85,
      roster: {
        TOP: ["Irrelevant", "HiRit"],
        JNG: ["Zanzarah", "Shlatan"],
        MID: ["Vetheo", "LIDER"],
        BOT: ["Neon", "Hans Sama"],
        SUP: ["Mersa", "H1IVA"],
      },
    },
    // [UNCERTAIN] Irrelevant and Zanzarah joined as starters for Summer.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "XL",
      name: "Excel Esports",
      short: "XL",
      color: "#2dd4a7",
      tier: 84,
      roster: {
        TOP: ["Finn", "Kryze"],
        JNG: ["Markoon", "Dan"],
        MID: ["Nukeduck", "Abbedagge"],
        BOT: ["Patrik", "Hjarnan"],
        SUP: ["Mikyx", "Advienne"],
      },
    },
    // [UNCERTAIN] Mikyx joined as starting support for Summer.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "VIT",
      name: "Team Vitality",
      short: "VIT",
      color: "#fee101",
      tier: 82,
      roster: {
        TOP: ["Alphari", "Szygenda"],
        JNG: ["Selfmade", "Haru"],
        MID: ["Perkz", "Milica"],
        BOT: ["Carzzy", "Steeelback"],
        SUP: ["Labrov", "Jactroll"],
      },
    },
    // [UNCERTAIN] Missed playoffs after a tiebreaker loss to Excel.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "SK",
      name: "SK Gaming",
      short: "SK",
      color: "#232a35",
      tier: 81,
      roster: {
        TOP: ["JNX", "Jenax"],
        JNG: ["Gilius", "Lurox"],
        MID: ["Sertuss", "Blue"],
        BOT: ["Jezu", "Keduii"],
        SUP: ["Treatz", "Lilipp"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "AST",
      name: "Astralis",
      short: "AST",
      color: "#d22630",
      tier: 79,
      roster: {
        TOP: ["Vizicsacsi", "WhiteKnight"],
        JNG: ["Xerxe", "Kirei"],
        MID: ["Dajor", "Czekolad"],
        BOT: ["Kobbe", "Jeskla"],
        SUP: ["JeongHoon", "Mystiques"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "BDS",
      name: "Team BDS",
      short: "BDS",
      color: "#b83280",
      tier: 77,
      roster: {
        TOP: ["Agresivoo", "Sacre"],
        JNG: ["Cinkrof", "Erdote"],
        MID: ["NUCLEARINT", "Serin"],
        BOT: ["xMatty", "Crownie"],
        SUP: ["LIMIT", "Norskeren"],
      },
    },
    // [UNCERTAIN] Debut LEC season after acquiring Schalke 04's slot.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
  ],
  // LEC 2021. Ordered by Summer split final standings (MAD beat Fnatic 3-1 in the final). Rosters are Summer 2021 lineups. — champion: MAD Lions
  2021: [
    {
      id: "MAD",
      name: "MAD Lions",
      short: "MAD",
      color: "#e8b10e",
      tier: 91,
      roster: {
        TOP: ["Armut", "Orome"],
        JNG: ["Elyoya", "Maxlore"],
        MID: ["Humanoid", "Reeker"],
        BOT: ["Carzzy", "Deadly"],
        SUP: ["Kaiser", "Gadget"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "FNC",
      name: "Fnatic",
      short: "FNC",
      color: "#f7941d",
      tier: 88,
      roster: {
        TOP: ["Adam", "sOAZ"],
        JNG: ["Bwipo", "Shad0w"],
        MID: ["Nisqy", "Abbedagge"],
        BOT: ["Upset", "xMatty"],
        SUP: ["Hylissang", "Rhuckz"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "RGE",
      name: "Rogue",
      short: "RGE",
      color: "#002856",
      tier: 87,
      roster: {
        TOP: ["Odoamne", "Finn"],
        JNG: ["Inspired", "Kikis"],
        MID: ["Larssen", "Sencux"],
        BOT: ["Hans Sama", "Comp"],
        SUP: ["Trymbi", "Norskeren"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "G2",
      name: "G2 Esports",
      short: "G2",
      color: "#e01f26",
      tier: 86,
      roster: {
        TOP: ["Wunder", "Send0o"],
        JNG: ["Jankos", "Lamabear"],
        MID: ["Caps", "Ronaldooo"],
        BOT: ["Rekkles", "P1noy"],
        SUP: ["Mikyx", "Doss"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "MSF",
      name: "Misfits Gaming",
      short: "MSF",
      color: "#a6192e",
      tier: 85,
      roster: {
        TOP: ["HiRit", "Agresivoo"],
        JNG: ["Razork", "Shlatan"],
        MID: ["Vetheo", "Febiven"],
        BOT: ["Kobbe", "Bvoy"],
        SUP: ["Vander", "Mersa"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "VIT",
      name: "Team Vitality",
      short: "VIT",
      color: "#fee101",
      tier: 84,
      roster: {
        TOP: ["Szygenda", "SLT"],
        JNG: ["Selfmade", "Skeanz"],
        MID: ["LIDER", "Milica"],
        BOT: ["Crownshot", "Steeelback"],
        SUP: ["Labrov", "Jactroll"],
      },
    },
    // [UNCERTAIN] Summer top/mid rotated between Szygenda/SLT and LIDER/Milica.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "AST",
      name: "Astralis",
      short: "AST",
      color: "#d22630",
      tier: 82,
      roster: {
        TOP: ["WhiteKnight", "Sacre"],
        JNG: ["Zanzarah", "Memento"],
        MID: ["MagiFelix", "Serin"],
        BOT: ["Jeskla", "Cody"],
        SUP: ["promisq", "Mystiques"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "XL",
      name: "Excel Esports",
      short: "XL",
      color: "#2dd4a7",
      tier: 82,
      roster: {
        TOP: ["Kryze", "Expect"],
        JNG: ["Dan", "Markoon"],
        MID: ["Nukeduck", "Czekolad"],
        BOT: ["Patrik", "Hjarnan"],
        SUP: ["Advienne", "denyk"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "SK",
      name: "SK Gaming",
      short: "SK",
      color: "#232a35",
      tier: 79,
      roster: {
        TOP: ["Jenax", "Aki"],
        JNG: ["Treatz", "TynX"],
        MID: ["Blue", "twohoyrz"],
        BOT: ["Jezu", "Keduii"],
        SUP: ["Jesiz", "Lilipp"],
      },
    },
    // [UNCERTAIN] Treatz role-swapped from support to jungle for Summer; head coach Jesiz filled in at support.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "S04",
      name: "FC Schalke 04",
      short: "S04",
      color: "#0047ab",
      tier: 77,
      roster: {
        TOP: ["BrokenBlade", "Ruvel"],
        JNG: ["Kirei", "Gilius"],
        MID: ["NUCLEARINT", "Dajor"],
        BOT: ["Neon", "Innaxe"],
        SUP: ["LIMIT", "Dreams"],
      },
    },
    // [UNCERTAIN] Schalke's final LEC split; slot sold to Team BDS after the season.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
  ],
  // LEC 2020. Ordered by Summer split final standings (G2 beat Fnatic 3-0 in the final). Rosters are Summer 2020 lineups. — champion: G2 Esports
  2020: [
    {
      id: "G2",
      name: "G2 Esports",
      short: "G2",
      color: "#e01f26",
      tier: 90,
      roster: {
        TOP: ["Wunder", "Send0o"],
        JNG: ["Jankos", "Lamabear"],
        MID: ["Caps", "MagiFelix"],
        BOT: ["Perkz", "P1noy"],
        SUP: ["Mikyx", "promisq"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "FNC",
      name: "Fnatic",
      short: "FNC",
      color: "#f7941d",
      tier: 88,
      roster: {
        TOP: ["Bwipo", "Shikari"],
        JNG: ["Selfmade", "Dan"],
        MID: ["Nemesis", "Ronaldooo"],
        BOT: ["Rekkles", "xMatty"],
        SUP: ["Hylissang", "Prosfair"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "RGE",
      name: "Rogue",
      short: "RGE",
      color: "#002856",
      tier: 87,
      roster: {
        TOP: ["Finn", "Profit"],
        JNG: ["Inspired", "Kikis"],
        MID: ["Larssen", "Sencux"],
        BOT: ["Hans Sama", "Woolite"],
        SUP: ["Vander", "Wadid"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "MAD",
      name: "MAD Lions",
      short: "MAD",
      color: "#e8b10e",
      tier: 86,
      roster: {
        TOP: ["Orome", "Acidy"],
        JNG: ["Shad0w", "Zanzarah"],
        MID: ["Humanoid", "Dajor"],
        BOT: ["Carzzy", "Deadly"],
        SUP: ["Kaiser", "Gadget"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "S04",
      name: "FC Schalke 04",
      short: "S04",
      color: "#0047ab",
      tier: 85,
      roster: {
        TOP: ["Odoamne", "Sacre"],
        JNG: ["Gilius", "Lurox"],
        MID: ["Abbedagge", "Sertuss"],
        BOT: ["Neon", "Innaxe"],
        SUP: ["Dreams", "Nukes"],
      },
    },
    // [UNCERTAIN] Summer starters: Gilius and Neon replaced Trick and Forg1ven from Spring.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "SK",
      name: "SK Gaming",
      short: "SK",
      color: "#232a35",
      tier: 84,
      roster: {
        TOP: ["Jenax", "Aki"],
        JNG: ["Trick", "Kirei"],
        MID: ["ZaZee", "Czekolad"],
        BOT: ["Crownshot", "Cody"],
        SUP: ["LIMIT", "Lilipp"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "XL",
      name: "Excel Esports",
      short: "XL",
      color: "#2dd4a7",
      tier: 83,
      roster: {
        TOP: ["Kryze", "Expect"],
        JNG: ["Caedrel", "Memento"],
        MID: ["Special", "Mickey"],
        BOT: ["Patrik", "Jeskla"],
        SUP: ["Tore", "Mystiques"],
      },
    },
    // [UNCERTAIN] Kryze replaced Expect at top for Summer.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "MSF",
      name: "Misfits Gaming",
      short: "MSF",
      color: "#a6192e",
      tier: 82,
      roster: {
        TOP: ["Dan Dan", "Agresivoo"],
        JNG: ["Razork", "Maxlore"],
        MID: ["Febiven", "LIDER"],
        BOT: ["Kobbe", "Bvoy"],
        SUP: ["Doss", "H1IVA"],
      },
    },
    // [UNCERTAIN] Kobbe replaced Bvoy at ADC for Summer.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "VIT",
      name: "Team Vitality",
      short: "VIT",
      color: "#fee101",
      tier: 80,
      roster: {
        TOP: ["Cabochard", "Nji"],
        JNG: ["Skeanz", "Mowgli"],
        MID: ["Milica", "Saken"],
        BOT: ["Comp", "Steeelback"],
        SUP: ["Labrov", "Norskeren"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "OG",
      name: "Origen",
      short: "OG",
      color: "#009e96",
      tier: 78,
      roster: {
        TOP: ["Alphari", "Destiny"],
        JNG: ["Xerxe", "Kold"],
        MID: ["Nukeduck", "Roison"],
        BOT: ["Upset", "HeaQ"],
        SUP: ["Jactroll", "Mithy"],
      },
    },
    // [UNCERTAIN] Alphari returned to top for Summer; Jactroll started at support with Destiny as backup.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
  ],
  // LEC 2019. Ordered by Summer split final standings (G2 beat Fnatic 3-1 in the final). Rosters are Summer 2019 lineups. — champion: G2 Esports
  2019: [
    {
      id: "G2",
      name: "G2 Esports",
      short: "G2",
      color: "#e01f26",
      tier: 91,
      roster: {
        TOP: ["Wunder", "Thebaus"],
        JNG: ["Jankos", "Lamabear"],
        MID: ["Caps", "XICOO"],
        BOT: ["Perkz", "Nixerino"],
        SUP: ["Mikyx", "promisq"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "FNC",
      name: "Fnatic",
      short: "FNC",
      color: "#f7941d",
      tier: 88,
      roster: {
        TOP: ["Bwipo", "Shikari"],
        JNG: ["Broxah", "Dan"],
        MID: ["Nemesis", "MagiFelix"],
        BOT: ["Rekkles", "xMatty"],
        SUP: ["Hylissang", "Prosfair"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "S04",
      name: "FC Schalke 04",
      short: "S04",
      color: "#0047ab",
      tier: 87,
      roster: {
        TOP: ["Odoamne", "Orome"],
        JNG: ["Trick", "Memento"],
        MID: ["Abbedagge", "Sertuss"],
        BOT: ["Upset", "Innaxe"],
        SUP: ["IgNar", "Nukes"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "RGE",
      name: "Rogue",
      short: "RGE",
      color: "#002856",
      tier: 86,
      roster: {
        TOP: ["Finn", "Profit"],
        JNG: ["Inspired", "Kikis"],
        MID: ["Larssen", "Sencux"],
        BOT: ["Woolite", "HeaQ"],
        SUP: ["Vander", "Wadid"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "SPY",
      name: "Splyce",
      short: "SPY",
      color: "#1e90d6",
      tier: 85,
      roster: {
        TOP: ["Vizicsacsi", "Send0o"],
        JNG: ["Xerxe", "Shlatan"],
        MID: ["Humanoid", "Czekolad"],
        BOT: ["Kobbe", "Deadly"],
        SUP: ["Norskeren", "Tore"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "VIT",
      name: "Team Vitality",
      short: "VIT",
      color: "#fee101",
      tier: 84,
      roster: {
        TOP: ["Cabochard", "Szygenda"],
        JNG: ["Mowgli", "Karimkt"],
        MID: ["Jiizuke", "Saken"],
        BOT: ["Attila", "Tabzz"],
        SUP: ["Jactroll", "Veignorem"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "SK",
      name: "SK Gaming",
      short: "SK",
      color: "#232a35",
      tier: 82,
      roster: {
        TOP: ["Sacre", "Jenax"],
        JNG: ["Selfmade", "Lurox"],
        MID: ["Pirean", "ZaZee"],
        BOT: ["Crownshot", "Cody"],
        SUP: ["Dreams", "Lilipp"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "OG",
      name: "Origen",
      short: "OG",
      color: "#009e96",
      tier: 82,
      roster: {
        TOP: ["Alphari", "Ruvel"],
        JNG: ["Kold", "Zanzarah"],
        MID: ["Nukeduck", "Roison"],
        BOT: ["Patrik", "Bvoy"],
        SUP: ["Mithy", "H1IVA"],
      },
    },
    // [UNCERTAIN] Summer support was Mithy; Zanzarah subbed jungle late in the split.
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "MSF",
      name: "Misfits Gaming",
      short: "MSF",
      color: "#a6192e",
      tier: 79,
      roster: {
        TOP: ["sOAZ", "Dan Dan"],
        JNG: ["Maxlore", "Kirei"],
        MID: ["Febiven", "LIDER"],
        BOT: ["Hans Sama", "Neon"],
        SUP: ["GorillA", "Doss"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
    {
      id: "XL",
      name: "Excel Esports",
      short: "XL",
      color: "#2dd4a7",
      tier: 77,
      roster: {
        TOP: ["Expect", "Agresivoo"],
        JNG: ["Caedrel", "Taxer"],
        MID: ["Special", "Mickey"],
        BOT: ["Hjarnan", "Jeskla"],
        SUP: ["kaSing", "Mystiques"],
      },
    },
    // [UNCERTAIN] Subs are era-plausible stand-ins, not verified.
  ],
  // EU LCS 2018 — champion: Fnatic
  2018: [
    {
      id: "FNC",
      name: "Fnatic",
      short: "FNC",
      color: "#f7941d",
      tier: 91,
      roster: {
        TOP: ["Bwipo", "Dylan Falco"],
        JNG: ["Broxah", "Boris"],
        MID: ["Caps", "H1iva"],
        BOT: ["Rekkles", "Obsess"],
        SUP: ["Hylissang", "Special"],
      },
    },
    // [UNCERTAIN] Bwipo took the starting top spot mid-split; sOAZ moved to substitute.
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "S04",
      name: "FC Schalke 04",
      short: "S04",
      color: "#0047ab",
      tier: 88,
      roster: {
        TOP: ["Vizicsacsi", "Shemek"],
        JNG: ["Amazing", "Pride"],
        MID: ["Nukeduck", "AudreyLaSapa"],
        BOT: ["Upset", "Lurox"],
        SUP: ["Vander", "Caedrel"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "VIT",
      name: "Team Vitality",
      short: "VIT",
      color: "#fee101",
      tier: 87,
      roster: {
        TOP: ["Cabochard", "Dreams"],
        JNG: ["Kikis", "Nji"],
        MID: ["Jiizuke", "Unlimited"],
        BOT: ["Attila", "Woolite"],
        SUP: ["Jactroll", "Satorius"],
      },
    },
    // [UNCERTAIN] Kikis replaced Gilius at jungle mid-split.
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "MSF",
      name: "Misfits Gaming",
      short: "MSF",
      color: "#a6192e",
      tier: 86,
      roster: {
        TOP: ["Alphari", "Cinkrof"],
        JNG: ["Maxlore", "Treatz"],
        MID: ["Sencux", "Jesiz"],
        BOT: ["Hans Sama", "Doss"],
        SUP: ["Mikyx", "Kirei"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "SPY",
      name: "Splyce",
      short: "SPY",
      color: "#1e90d6",
      tier: 84,
      roster: {
        TOP: ["Odoamne", "Ruvelius"],
        JNG: ["Xerxe", "Kronos"],
        MID: ["Nisqy", "Cody"],
        BOT: ["Kobbe", "Innox"],
        SUP: ["kaSing", "Zanzarah"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "G2",
      name: "G2 Esports",
      short: "G2",
      color: "#e01f26",
      tier: 84,
      roster: {
        TOP: ["Wunder", "Sacre"],
        JNG: ["Jankos", "Tynx"],
        MID: ["Perkz", "Dan Dan"],
        BOT: ["Hjarnan", "Rhuckz"],
        SUP: ["Wadid", "Denyk"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "ROC",
      name: "Team ROCCAT",
      short: "ROC",
      color: "#0090c8",
      tier: 81,
      roster: {
        TOP: ["Profit", "Seaz"],
        JNG: ["Memento", "Erdote"],
        MID: ["Blanc", "Xico"],
        BOT: ["HeaQ", "EdinPriqtel"],
        SUP: ["Norskeren", "Shlatan"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "UOL",
      name: "Unicorns of Love",
      short: "UOL",
      color: "#ff2e88",
      tier: 81,
      roster: {
        TOP: ["WhiteKnight", "Yoppa"],
        JNG: ["Kold", "Rayito"],
        MID: ["Exileh", "Hatrixx"],
        BOT: ["Samux", "Neon"],
        SUP: ["Totoro", "Ilyx"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "GIA",
      name: "Giants Gaming",
      short: "GIA",
      color: "#e8590c",
      tier: 79,
      roster: {
        TOP: ["Ruin", "Th3Antonio"],
        JNG: ["Djoko", "Kubuko"],
        MID: ["Betsy", "Efias"],
        BOT: ["Steeelback", "Chapapi"],
        SUP: ["SirNukesAlot", "Bruness"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "H2K",
      name: "H2k-Gaming",
      short: "H2K",
      color: "#6a1b9a",
      tier: 76,
      roster: {
        TOP: ["SmittyJ", "Kackos"],
        JNG: ["Shook", "Only"],
        MID: ["Selfie", "WidowMaker"],
        BOT: ["Sheriff", "ItGox"],
        SUP: ["Promisq", "Candyfloss"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
  ],
  // EU LCS 2017 (spring-season basis; summer split replaced Giants/Origen with Mysterious Monkeys/Ninjas in Pyjamas) — champion: G2 Esports
  2017: [
    {
      id: "G2",
      name: "G2 Esports",
      short: "G2",
      color: "#e01f26",
      tier: 91,
      roster: {
        TOP: ["Expect", "NicoThePico"],
        JNG: ["Trick", "Quaye"],
        MID: ["Perkz", "YoungBuck"],
        BOT: ["Zven", "Special"],
        SUP: ["mithy", "H1iva"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "UOL",
      name: "Unicorns of Love",
      short: "UOL",
      color: "#ff2e88",
      tier: 88,
      roster: {
        TOP: ["Vizicsacsi", "Obsess"],
        JNG: ["Xerxe", "pr0lly"],
        MID: ["Exileh", "YamatoCannon"],
        BOT: ["Samux", "Gevous"],
        SUP: ["Hylissang", "Uby"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "FNC",
      name: "Fnatic",
      short: "FNC",
      color: "#f7941d",
      tier: 87,
      roster: {
        TOP: ["sOAZ", "GrabbZ"],
        JNG: ["Broxah", "Treatz"],
        MID: ["Caps", "Amazingx"],
        BOT: ["Rekkles", "Alderiate"],
        SUP: ["Jesiz", "Irean"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "MSF",
      name: "Misfits Gaming",
      short: "MSF",
      color: "#a6192e",
      tier: 86,
      roster: {
        TOP: ["Alphari", "Shaunz"],
        JNG: ["KaKAO", "Daku"],
        MID: ["PowerOfEvil", "AudreyLaSapa"],
        BOT: ["Hans Sama", "Nukeduck"],
        SUP: ["IgNar", "Vander"],
      },
    },
    // [UNCERTAIN] Spring jungler was KaKAO (Maxlore arrived in summer).
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "H2K",
      name: "H2k-Gaming",
      short: "H2K",
      color: "#6a1b9a",
      tier: 84,
      roster: {
        TOP: ["Odoamne", "Selfie"],
        JNG: ["Jankos", "Upset"],
        MID: ["Febiven", "loulex"],
        BOT: ["Nuclear", "SmittyJ"],
        SUP: ["Chei", "Caedrel"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "SPY",
      name: "Splyce",
      short: "SPY",
      color: "#1e90d6",
      tier: 84,
      roster: {
        TOP: ["Wunder", "Norskeren"],
        JNG: ["Trashy", "Kikis"],
        MID: ["Sencux", "Nisqy"],
        BOT: ["Kobbe", "Klaj"],
        SUP: ["Mikyx", "Liq"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "ROC",
      name: "Team ROCCAT",
      short: "ROC",
      color: "#0090c8",
      tier: 82,
      roster: {
        TOP: ["Phaxi", "MrRalleZ"],
        JNG: ["Maxlore", "Werlyb"],
        MID: ["Betsy", "Gamsu"],
        BOT: ["Hjarnan", "Spirit"],
        SUP: ["Wadid", "Freeze"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "VIT",
      name: "Team Vitality",
      short: "VIT",
      color: "#fee101",
      tier: 81,
      roster: {
        TOP: ["Cabochard", "Ryu"],
        JNG: ["Djoko", "Police"],
        MID: ["GBM", "Mightybear"],
        BOT: ["Steeelback", "kaSing"],
        SUP: ["Hachani", "AoD"],
      },
    },
    // [UNCERTAIN] Spring lineup; summer replaced GBM/Hachani with Nukeduck/Vander.
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "GIA",
      name: "Giants Gaming",
      short: "GIA",
      color: "#e8590c",
      tier: 78,
      roster: {
        TOP: ["Flaxxish", "Fox"],
        JNG: ["Memento", "Steve"],
        MID: ["NighT", "Lozark"],
        BOT: ["HeaQ", "sprattel"],
        SUP: ["Hustlin", "Profit"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "OG",
      name: "Origen",
      short: "OG",
      color: "#009e96",
      tier: 76,
      roster: {
        TOP: ["Satorius", "Nagne"],
        JNG: ["Cinkrof", "Wisdom"],
        MID: ["Naehyun", "Blanc"],
        BOT: ["Tabzz", "Raise"],
        SUP: ["Hiiva", "LeDuck"],
      },
    },
    // [UNCERTAIN] Origen (not Schalke 04) held the 10th spring 2017 slot; S04 were in the Challenger Series that split. Jungle split between Cinkrof/Wisdom uncertain.
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
  ],
  // EU LCS 2016 — champion: G2 Esports
  2016: [
    {
      id: "G2",
      name: "G2 Esports",
      short: "G2",
      color: "#e01f26",
      tier: 91,
      roster: {
        TOP: ["Expect", "Solaaaa"],
        JNG: ["Trick", "NicoThePico"],
        MID: ["Perkz", "Araneae"],
        BOT: ["Zven", "RelinQuished"],
        SUP: ["mithy", "YamatoCannon"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "SPY",
      name: "Splyce",
      short: "SPY",
      color: "#1e90d6",
      tier: 88,
      roster: {
        TOP: ["Wunder", "Lozark"],
        JNG: ["Trashy", "Gripex"],
        MID: ["Sencux", "pr0lly"],
        BOT: ["Kobbe", "AudreyLaSapa"],
        SUP: ["Mikyx", "Vizility"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "H2K",
      name: "H2k-Gaming",
      short: "H2K",
      color: "#6a1b9a",
      tier: 87,
      roster: {
        TOP: ["Odoamne", "Reje"],
        JNG: ["Jankos", "Hulberto"],
        MID: ["Ryu", "Shaunz"],
        BOT: ["Freeze", "Knugen"],
        SUP: ["Vander", "YoungBuck"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "UOL",
      name: "Unicorns of Love",
      short: "UOL",
      color: "#ff2e88",
      tier: 86,
      roster: {
        TOP: ["Vizicsacsi", "Quaye"],
        JNG: ["Move", "Daku"],
        MID: ["Exileh", "Liq"],
        BOT: ["Veritas", "Gevous"],
        SUP: ["Hylissang", "Uby"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "GIA",
      name: "Giants Gaming",
      short: "GIA",
      color: "#e8590c",
      tier: 84,
      roster: {
        TOP: ["SmittyJ", "Dreams"],
        JNG: ["Maxlore", "Unlimited"],
        MID: ["NighT", "Special"],
        BOT: ["S0NSTAR", "Samux"],
        SUP: ["Hustlin", "Memento"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "FNC",
      name: "Fnatic",
      short: "FNC",
      color: "#f7941d",
      tier: 84,
      roster: {
        TOP: ["Kikis", "Werlyb"],
        JNG: ["Spirit", "Norskeren"],
        MID: ["Febiven", "Caedrel"],
        BOT: ["Rekkles", "Nagne"],
        SUP: ["YellOwStaR", "Klaj"],
      },
    },
    // [UNCERTAIN] Kikis started top in playoffs; Gamsu started most of the regular season.
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "VIT",
      name: "Team Vitality",
      short: "VIT",
      color: "#fee101",
      tier: 82,
      roster: {
        TOP: ["Cabochard", "Profit"],
        JNG: ["Mightybear", "Shook"],
        MID: ["Nukeduck", "HeaQ"],
        BOT: ["Police", "Hjarnan"],
        SUP: ["kaSing", "Nisqy"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "S04",
      name: "FC Schalke 04",
      short: "S04",
      color: "#0047ab",
      tier: 81,
      roster: {
        TOP: ["Steve", "Broxah"],
        JNG: ["Gilius", "Dexter"],
        MID: ["Fox", "Eika"],
        BOT: ["MrRalleZ", "Caps"],
        SUP: ["sprattel", "Jiizuke"],
      },
    },
    // [UNCERTAIN] Acquired the Elements roster/spot in May 2016.
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "OG",
      name: "Origen",
      short: "OG",
      color: "#009e96",
      tier: 79,
      roster: {
        TOP: ["sOAZ", "Jactroll"],
        JNG: ["Amazing", "Toaster"],
        MID: ["PowerOfEvil", "Attila"],
        BOT: ["FORG1VEN", "Alphari"],
        SUP: ["Hybrid", "Hans Sama"],
      },
    },
    // [UNCERTAIN] Bot-lane arrangement partially uncertain (xPeke also listed).
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "ROC",
      name: "Team ROCCAT",
      short: "ROC",
      color: "#0090c8",
      tier: 78,
      roster: {
        TOP: ["Parang", "fredy122"],
        JNG: ["Airwaks", "IgNar"],
        MID: ["Betsy", "Deilor"],
        BOT: ["Steeelback", "Satorius"],
        SUP: ["Raise", "extinkt"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
  ],
  // EU LCS 2015 — champion: Fnatic
  2015: [
    {
      id: "FNC",
      name: "Fnatic",
      short: "FNC",
      color: "#f7941d",
      tier: 92,
      roster: {
        TOP: ["Huni", "Kikis"],
        JNG: ["Reignover", "Spirit"],
        MID: ["Febiven", "Gamsu"],
        BOT: ["Rekkles", "Nyph"],
        SUP: ["YellOwStaR", "Puszu"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "OG",
      name: "Origen",
      short: "OG",
      color: "#009e96",
      tier: 88,
      roster: {
        TOP: ["Soaz", "Satorius"],
        JNG: ["Amazing", "Wisdom"],
        MID: ["xPeke", "Selfie"],
        BOT: ["Niels", "Airwaks"],
        SUP: ["Mithy", "Unlimited"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "H2K",
      name: "H2k-Gaming",
      short: "H2K",
      color: "#6a1b9a",
      tier: 87,
      roster: {
        TOP: ["Odoamne", "Woolite"],
        JNG: ["loulex", "YoungBuck"],
        MID: ["Ryu", "SorenXD"],
        BOT: ["Hjarnan", "Impaler"],
        SUP: ["kaSing", "KottenX"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "UOL",
      name: "Unicorns of Love",
      short: "UOL",
      color: "#ff2e88",
      tier: 86,
      roster: {
        TOP: ["Vizicsacsi", "Kerp"],
        JNG: ["Gilius", "Creaton"],
        MID: ["PowerOfEvil", "Jree"],
        BOT: ["Vardags", "kev1n"],
        SUP: ["Hylissang", "Araneae"],
      },
    },
    // [UNCERTAIN] Jungle slot shared by Kikis/Gilius/H0R0 across the year; Gilius listed.
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "ROC",
      name: "Team ROCCAT",
      short: "ROC",
      color: "#0090c8",
      tier: 84,
      roster: {
        TOP: ["Steve", "Leviathan"],
        JNG: ["Jankos", "Mokatte"],
        MID: ["Nukeduck", "Snoopeh"],
        BOT: ["MrRalleZ", "Alex Ich"],
        SUP: ["Vander", "Darien"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "GIA",
      name: "Giants Gaming",
      short: "GIA",
      color: "#e8590c",
      tier: 84,
      roster: {
        TOP: ["Werlyb", "ShLaYa"],
        JNG: ["Fr3deric", "ViRtU4l"],
        MID: ["PePiiNeRO", "Karalius"],
        BOT: ["Adryh", "Kubon"],
        SUP: ["G0DFRED", "Malunoo"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "EL",
      name: "Elements",
      short: "EL",
      color: "#7c3aed",
      tier: 82,
      roster: {
        TOP: ["Jwaow", "NiQ"],
        JNG: ["Dexter", "Celaver"],
        MID: ["Froggen", "LeDuck"],
        BOT: ["Tabzz", "Extinkt"],
        SUP: ["PromisQ", "Jimbz"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "GMB",
      name: "Gambit Gaming",
      short: "GMB",
      color: "#f5a623",
      tier: 81,
      roster: {
        TOP: ["Cabochard", "Nono"],
        JNG: ["Diamondprox", "Warhunter"],
        MID: ["Betsy", "Sleper"],
        BOT: ["FORG1VEN", "kujaa"],
        SUP: ["Edward", "Samux"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "SK",
      name: "SK Gaming",
      short: "SK",
      color: "#232a35",
      tier: 79,
      roster: {
        TOP: ["fredy122", "Naruterador"],
        JNG: ["Svenskeren", "Citizen"],
        MID: ["Fox", "Lyumi"],
        BOT: ["CandyPanda", "eRot1c"],
        SUP: ["nRated", "Moopz"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "CW",
      name: "Copenhagen Wolves",
      short: "CW",
      color: "#6aa84f",
      tier: 77,
      roster: {
        TOP: ["Lenny", "Mitch"],
        JNG: ["Shook", "Danny"],
        MID: ["Soren", "Pachol"],
        BOT: ["Freeze", "Arteemo"],
        SUP: ["je suis kaas", "Puki"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
  ],
  // EU LCS 2014 — champion: Alliance
  2014: [
    {
      id: "ALL",
      name: "Alliance",
      short: "ALL",
      color: "#4a5568",
      tier: 90,
      roster: {
        TOP: ["Wickd", "Mokatte"],
        JNG: ["Shook", "Leviathan"],
        MID: ["Froggen", "Shushei"],
        BOT: ["Tabzz", "Krepo"],
        SUP: ["Nyph", "Werlyb"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "FNC",
      name: "Fnatic",
      short: "FNC",
      color: "#f7941d",
      tier: 88,
      roster: {
        TOP: ["sOAZ", "ViRtU4l"],
        JNG: ["Cyanide", "Araneae"],
        MID: ["xPeke", "ShLaYa"],
        BOT: ["Rekkles", "Karalius"],
        SUP: ["YellOwStaR", "Kubon"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "SK",
      name: "SK Gaming",
      short: "SK",
      color: "#232a35",
      tier: 86,
      roster: {
        TOP: ["fredy122", "Malunoo"],
        JNG: ["Svenskeren", "Extinkt"],
        MID: ["Jesiz", "Jimbz"],
        BOT: ["CandyPanda", "Nono"],
        SUP: ["nRated", "Warhunter"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "ROC",
      name: "Team ROCCAT",
      short: "ROC",
      color: "#0090c8",
      tier: 85,
      roster: {
        TOP: ["Xaxus", "Sleper"],
        JNG: ["Jankos", "kujaa"],
        MID: ["Overpow", "Samux"],
        BOT: ["Celaver", "Naruterador"],
        SUP: ["VandeR", "Citizen"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "SHC",
      name: "SUPA HOT CREW",
      short: "SHC",
      color: "#f97316",
      tier: 84,
      roster: {
        TOP: ["Mimer", "Lyumi"],
        JNG: ["Impaler", "eRot1c"],
        MID: ["SELFIE", "Moopz"],
        BOT: ["MrRalleZ", "Mitch"],
        SUP: ["kaSing", "Danny"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "MIL",
      name: "Millenium",
      short: "MIL",
      color: "#2563eb",
      tier: 83,
      roster: {
        TOP: ["kev1n", "Pachol"],
        JNG: ["Kottenx", "Arteemo"],
        MID: ["Kerp", "Puki"],
        BOT: ["Creaton", "Grøm"],
        SUP: ["Jree", "Eika"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "GMB",
      name: "Gambit Gaming",
      short: "GMB",
      color: "#f5a623",
      tier: 81,
      roster: {
        TOP: ["Darien", "Cabochard"],
        JNG: ["Diamondprox", "loulex"],
        MID: ["Alex Ich", "Shaunz"],
        BOT: ["Genja", "Fury"],
        SUP: ["EDward", "Hiiva"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "CW",
      name: "Copenhagen Wolves",
      short: "CW",
      color: "#6aa84f",
      tier: 80,
      roster: {
        TOP: ["YoungBuck", "Hachani"],
        JNG: ["Airwaks", "Brokenshard"],
        MID: ["SorenXD", "Soren"],
        BOT: ["Woolite", "Toaster"],
        SUP: ["Unlimited", "Odoamne"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "H2K",
      name: "H2k-Gaming",
      short: "H2K",
      color: "#6a1b9a",
      tier: 78,
      roster: {
        TOP: ["SmittyJ", "Gilius"],
        JNG: ["Memento", "Betsy"],
        MID: ["Ryu", "Febiven"],
        BOT: ["Hjarnan", "CowTard"],
        SUP: ["sprattel", "NeeGodbro"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] Challenger-era filler team; roster era-plausible.
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "UOL",
      name: "Unicorns of Love",
      short: "UOL",
      color: "#ff2e88",
      tier: 78,
      roster: {
        TOP: ["Vizicsacsi", "Steve"],
        JNG: ["Kikis", "PromisQ"],
        MID: ["PowerOfEvil", "Dexter"],
        BOT: ["Vardags", "Nukeduck"],
        SUP: ["Hylissang", "mithy"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] Challenger-era filler team; roster era-plausible.
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
  ],
  // EU LCS 2013 — champion: Fnatic
  2013: [
    {
      id: "FNC",
      name: "Fnatic",
      short: "FNC",
      color: "#f7941d",
      tier: 91,
      roster: {
        TOP: ["sOAZ", "Werlyb"],
        JNG: ["Cyanide", "ViRtU4l"],
        MID: ["xPeke", "ShLaYa"],
        BOT: ["Rekkles", "Puszu"],
        SUP: ["YellOwStaR", "Karalius"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "LD",
      name: "Lemondogs",
      short: "LD",
      color: "#ffd23f",
      tier: 88,
      roster: {
        TOP: ["Zorozero", "Kubon"],
        JNG: ["dexter", "Malunoo"],
        MID: ["nukeduck", "NiQ"],
        BOT: ["Tabzz", "Freeze"],
        SUP: ["mithy", "KottenX"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "GMB",
      name: "Gambit Gaming",
      short: "GMB",
      color: "#f5a623",
      tier: 86,
      roster: {
        TOP: ["Darien", "Celaver"],
        JNG: ["Diamondprox", "LeDuck"],
        MID: ["Alex Ich", "fredy122"],
        BOT: ["Genja", "Extinkt"],
        SUP: ["Voidle", "Jimbz"],
      },
    },
    // [UNCERTAIN] Summer support was Voidle; Edward departed mid-2013.
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "EG",
      name: "Evil Geniuses",
      short: "EG",
      color: "#0e4d8c",
      tier: 85,
      roster: {
        TOP: ["Wickd", "Nono"],
        JNG: ["Snoopeh", "YoungBuck"],
        MID: ["Froggen", "Warhunter"],
        BOT: ["Yellowpete", "Sleper"],
        SUP: ["Krepo", "kujaa"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "ALT",
      name: "Team ALTERNATE",
      short: "ALT",
      color: "#9aa0a6",
      tier: 83,
      roster: {
        TOP: ["Kerp", "Samux"],
        JNG: ["Araneae", "Naruterador"],
        MID: ["ForellenLord", "Citizen"],
        BOT: ["Creaton", "Lyumi"],
        SUP: ["Jree", "eRot1c"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "SK",
      name: "SK Gaming",
      short: "SK",
      color: "#232a35",
      tier: 82,
      roster: {
        TOP: ["kev1n", "wewillfailer"],
        JNG: ["Svenskeren", "Kikis"],
        MID: ["ocelote", "Moopz"],
        BOT: ["CandyPanda", "Mitch"],
        SUP: ["nRated", "Danny"],
      },
    },
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "DB",
      name: "DragonBorns",
      short: "DB",
      color: "#7f1d1d",
      tier: 79,
      roster: {
        TOP: ["Spontexx", "Pachol"],
        JNG: ["Brokenshard", "Arteemo"],
        MID: ["Shushei", "Puki"],
        BOT: ["HosaN", "Grøm"],
        SUP: ["Muvert", "Steve"],
      },
    },
    // [UNCERTAIN] Summer roster partially uncertain.
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "CW",
      name: "Copenhagen Wolves",
      short: "CW",
      color: "#6aa84f",
      tier: 78,
      roster: {
        TOP: ["NeeGodbro", "Gilius"],
        JNG: ["Mokatte", "Eika"],
        MID: ["cowTard", "MrRalleZ"],
        BOT: ["TheTess", "sprattel"],
        SUP: ["Deficio", "Odoamne"],
      },
    },
    // [UNCERTAIN] Copenhagen Wolves played only the 2013 spring split; included per brief. (Ninjas in Pyjamas, the actual summer #6, omitted per brief.)
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "H2K",
      name: "H2k-Gaming",
      short: "H2K",
      color: "#6a1b9a",
      tier: 76,
      roster: {
        TOP: ["SmittyJ", "Xaxus"],
        JNG: ["loulex", "Overpow"],
        MID: ["Ryu", "VandeR"],
        BOT: ["Hjarnan", "Jankos"],
        SUP: ["kaSing", "Shaunz"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] Challenger-era filler team; roster era-plausible.
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
    {
      id: "MIL",
      name: "Millenium",
      short: "MIL",
      color: "#2563eb",
      tier: 76,
      roster: {
        TOP: ["Angüsh", "Hachani"],
        JNG: ["ImSoFresh", "Unlimited"],
        MID: ["Czaru", "Jesiz"],
        BOT: ["Makler", "Soren"],
        SUP: ["Haydal", "Woolite"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] Challenger-era filler team; roster era-plausible.
    // [UNCERTAIN] Substitute names are era-plausible and unverified.
  ],
};
