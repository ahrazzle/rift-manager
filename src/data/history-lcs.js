// Rift Manager — historical LCS datasets (NA LCS 2013-2020, LCS 2021-2025)
// Team names, player names and relative tiers are historically grounded;
// ratings are fictional (the game's builder derives them from tier).
// [UNCERTAIN] marks padded or unverified picks.
export const HISTORY_LCS = {
  // LTA North 2025 (no LCS in 2025 — Riot merged LCS/CBLOL/LLA into the LTA); Split 1 champion Team Liquid, Split 2 North champion FlyQuest, Split 3 North and season champion FlyQuest. 100 Thieves competed as a provisional guest team and exited after 2025; Disguised entered as a guest team. — champion: FlyQuest
  2025: [
    {
      id: "FLY",
      name: "FlyQuest",
      short: "FLY",
      color: "#16a34a",
      tier: 92,
      roster: {
        TOP: ["Bwipo", "Nyx"],
        JNG: ["Inspired", "Pax"],
        MID: ["Quad", "Quill"],
        BOT: ["Massu", "Rune"],
        SUP: ["Busio", "Talon"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "HLT",
      name: "100 Thieves",
      short: "100",
      color: "#c8102e",
      tier: 88,
      roster: {
        TOP: ["Sniper", "Umbra"],
        JNG: ["River", "Vale"],
        MID: ["Quid", "Xen"],
        BOT: ["FBI", "Yara"],
        SUP: ["Eyla", "Zeph"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "SR",
      name: "Shopify Rebellion",
      short: "SR",
      color: "#8b5cf6",
      tier: 86,
      roster: {
        TOP: ["Fudge", "Ash"],
        JNG: ["Contractz", "Bolt"],
        MID: ["Palafox", "Cinder"],
        BOT: ["Bvoy", "Pico"],
        SUP: ["Ceos", "Rhea"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "C9",
      name: "Cloud9",
      short: "C9",
      color: "#00b2e2",
      tier: 85,
      roster: {
        TOP: ["Thanatos", "Slate"],
        JNG: ["Blaber", "Tove"],
        MID: ["Loki", "Ulric"],
        BOT: ["Zven", "Veda"],
        SUP: ["Vulcan", "Wren"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "TL",
      name: "Team Liquid",
      short: "TL",
      color: "#0a2463",
      tier: 84,
      roster: {
        TOP: ["Impact", "Xilo"],
        JNG: ["UmTi", "Yuki"],
        MID: ["APA", "Zara"],
        BOT: ["Yeon", "Bram"],
        SUP: ["CoreJJ", "Cleo"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "DSG",
      name: "Disguised",
      short: "DSG",
      color: "#b45309",
      tier: 82,
      roster: {
        TOP: ["Castle", "Dain"],
        JNG: ["eXyu", "Elio"],
        MID: ["Abbedagge", "Fenn"],
        BOT: ["ScaryJerry", "Greta"],
        SUP: ["huhi", "Hollis"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Disguised brand color is a best-guess warm muted tone, not verified.
    {
      id: "DIG",
      name: "Dignitas",
      short: "DIG",
      color: "#ffd700",
      tier: 80,
      roster: {
        TOP: ["Srtty", "Juno"],
        JNG: ["Sheiden", "Kaya"],
        MID: ["Keine", "Lark"],
        BOT: ["Tomo", "Moss"],
        SUP: ["Isles", "Nix"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "LYN",
      name: "LYON",
      short: "LYN",
      color: "#f59e0b",
      tier: 79,
      roster: {
        TOP: ["Licorice", "Odo"],
        JNG: ["Oddie", "Plum"],
        MID: ["Saint", "Rill"],
        BOT: ["Hena", "Sova"],
        SUP: ["Lyonz", "Tarn"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] [UNCERTAIN] LYON brand color is a best-guess gold, not verified.
    {
      id: "MU",
      name: "Maryville University",
      short: "MU",
      color: "#0ea5e9",
      tier: 78,
      roster: {
        TOP: ["Grit", "Ulf"],
        JNG: ["Jolt", "Vesper"],
        MID: ["Koda", "Wynn"],
        BOT: ["Pixel", "Xan"],
        SUP: ["Wisp", "Zev"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] [UNCERTAIN] Padding team: plausible NACL/challenger org; entire roster is a placeholder.
    {
      id: "WU",
      name: "Winthrop University",
      short: "WU",
      color: "#7f1d1d",
      tier: 77,
      roster: {
        TOP: ["Ember", "Alder"],
        JNG: ["Flint", "Birch"],
        MID: ["Gale", "Clove"],
        BOT: ["Iris", "Dune"],
        SUP: ["Lumen", "Elm"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] [UNCERTAIN] Padding team: plausible NACL/challenger org; entire roster is a placeholder.
  ],
  // LCS 2024 — Spring champion Team Liquid, Summer champion FlyQuest — champion: FlyQuest
  2024: [
    {
      id: "FLY",
      name: "FlyQuest",
      short: "FLY",
      color: "#16a34a",
      tier: 91,
      roster: {
        TOP: ["Bwipo", "Nyx"],
        JNG: ["Inspired", "Pax"],
        MID: ["Quad", "Quill"],
        BOT: ["Massu", "Rune"],
        SUP: ["Busio", "Talon"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "TL",
      name: "Team Liquid",
      short: "TL",
      color: "#0a2463",
      tier: 89,
      roster: {
        TOP: ["Impact", "Umbra"],
        JNG: ["UmTi", "Vale"],
        MID: ["APA", "Xen"],
        BOT: ["Yeon", "Yara"],
        SUP: ["CoreJJ", "Zeph"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "HLT",
      name: "100 Thieves",
      short: "100",
      color: "#c8102e",
      tier: 86,
      roster: {
        TOP: ["Sniper", "Ash"],
        JNG: ["River", "Bolt"],
        MID: ["Quid", "Cinder"],
        BOT: ["Tomo", "Pico"],
        SUP: ["Eyla", "Rhea"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Tomo replaced Meech mid-split.
    {
      id: "C9",
      name: "Cloud9",
      short: "C9",
      color: "#00b2e2",
      tier: 85,
      roster: {
        TOP: ["Thanatos", "Slate"],
        JNG: ["Blaber", "Tove"],
        MID: ["Jojopyun", "Ulric"],
        BOT: ["Berserker", "Veda"],
        SUP: ["Vulcan", "Wren"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "DIG",
      name: "Dignitas",
      short: "DIG",
      color: "#ffd700",
      tier: 83,
      roster: {
        TOP: ["Licorice", "Xilo"],
        JNG: ["Spica", "Yuki"],
        MID: ["Jensen", "Zara"],
        BOT: ["Zven", "Bram"],
        SUP: ["Isles", "Cleo"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "NRG",
      name: "NRG",
      short: "NRG",
      color: "#e11d48",
      tier: 82,
      roster: {
        TOP: ["Dhokla", "Dain"],
        JNG: ["Contractz", "Elio"],
        MID: ["Palafox", "Fenn"],
        BOT: ["FBI", "Greta"],
        SUP: ["huhi", "Hollis"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "SR",
      name: "Shopify Rebellion",
      short: "SR",
      color: "#8b5cf6",
      tier: 79,
      roster: {
        TOP: ["FakeGod", "Juno"],
        JNG: ["Bugi", "Kaya"],
        MID: ["Insanity", "Lark"],
        BOT: ["Bvoy", "Moss"],
        SUP: ["Zeyzal", "Nix"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Bugi replaced Tomio mid-split.
    {
      id: "DSG",
      name: "Disguised",
      short: "DSG",
      color: "#b45309",
      tier: 78,
      roster: {
        TOP: ["Young", "Odo"],
        JNG: ["eXyu", "Plum"],
        MID: ["Abbedagge", "Rill"],
        BOT: ["ScaryJerry", "Sova"],
        SUP: ["Mash", "Tarn"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] [UNCERTAIN] Padding team: plausible NACL/challenger org; entire roster is a placeholder.
    {
      id: "IMT",
      name: "Immortals",
      short: "IMT",
      color: "#0b2b5b",
      tier: 77,
      roster: {
        TOP: ["Castle", "Ulf"],
        JNG: ["Armao", "Vesper"],
        MID: ["Mask", "Wynn"],
        BOT: ["Tactical", "Xan"],
        SUP: ["Olleh", "Zev"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "FEAR",
      name: "Cincinnati Fear",
      short: "FEAR",
      color: "#ef4444",
      tier: 76,
      roster: {
        TOP: ["Fable", "Alder"],
        JNG: ["Rogue", "Birch"],
        MID: ["Comet", "Clove"],
        BOT: ["Drift", "Dune"],
        SUP: ["Halo", "Elm"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] [UNCERTAIN] Padding team: plausible NACL/challenger org; entire roster is a placeholder.
  ],
  // LCS 2023 — champion: NRG
  2023: [
    {
      id: "NRG",
      name: "NRG",
      short: "NRG",
      color: "#e11d48",
      tier: 90,
      roster: {
        TOP: ["Dhokla", "Nyx"],
        JNG: ["Contractz", "Pax"],
        MID: ["Palafox", "Quill"],
        BOT: ["FBI", "Rune"],
        SUP: ["IgNar", "Talon"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Roster verified via 2023 summer off-season tracker; NRG acquired CLG's slot.
    {
      id: "C9",
      name: "Cloud9",
      short: "C9",
      color: "#00b2e2",
      tier: 88,
      roster: {
        TOP: ["Fudge", "Umbra"],
        JNG: ["Blaber", "Vale"],
        MID: ["EMENES", "Xen"],
        BOT: ["Berserker", "Yara"],
        SUP: ["Zven", "Zeph"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster; spring mid was Diplex.
    {
      id: "TL",
      name: "Team Liquid",
      short: "TL",
      color: "#0a2463",
      tier: 86,
      roster: {
        TOP: ["Summit", "Ash"],
        JNG: ["Pyosik", "Bolt"],
        MID: ["Haeri", "Cinder"],
        BOT: ["Yeon", "Pico"],
        SUP: ["CoreJJ", "Rhea"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "GG",
      name: "Golden Guardians",
      short: "GG",
      color: "#eab308",
      tier: 85,
      roster: {
        TOP: ["Licorice", "Slate"],
        JNG: ["River", "Tove"],
        MID: ["Gori", "Ulric"],
        BOT: ["Stixxay", "Veda"],
        SUP: ["huhi", "Wren"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "EG",
      name: "Evil Geniuses",
      short: "EG",
      color: "#0e4d8c",
      tier: 84,
      roster: {
        TOP: ["Revenge", "Xilo"],
        JNG: ["Armao", "Yuki"],
        MID: ["Jojopyun", "Zara"],
        BOT: ["Unforgiven", "Bram"],
        SUP: ["Eyla", "Cleo"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster; spring had Ssumday/Inspired/FBI/Vulcan.
    {
      id: "DIG",
      name: "Dignitas",
      short: "DIG",
      color: "#ffd700",
      tier: 83,
      roster: {
        TOP: ["Rich", "Dain"],
        JNG: ["Santorin", "Elio"],
        MID: ["Jensen", "Fenn"],
        BOT: ["Tomo", "Greta"],
        SUP: ["Diamond", "Hollis"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "TSM",
      name: "TSM",
      short: "TSM",
      color: "#1a1a1a",
      tier: 81,
      roster: {
        TOP: ["Hauntzer", "Juno"],
        JNG: ["Bugi", "Kaya"],
        MID: ["Ruby", "Lark"],
        BOT: ["WildTurtle", "Moss"],
        SUP: ["Chime", "Nix"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster verified; spring had Solo/Maple/Neo.
    {
      id: "HLT",
      name: "100 Thieves",
      short: "100",
      color: "#c8102e",
      tier: 80,
      roster: {
        TOP: ["Ssumday", "Odo"],
        JNG: ["Closer", "Plum"],
        MID: ["Quid", "Rill"],
        BOT: ["Doublelift", "Sova"],
        SUP: ["Busio", "Tarn"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster; spring had Tenacity top and Bjergsen mid.
    {
      id: "FLY",
      name: "FlyQuest",
      short: "FLY",
      color: "#16a34a",
      tier: 79,
      roster: {
        TOP: ["Impact", "Ulf"],
        JNG: ["Spica", "Vesper"],
        MID: ["VicLa", "Wynn"],
        BOT: ["Prince", "Xan"],
        SUP: ["Vulcan", "Zev"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster; spring support was Eyla.
    {
      id: "IMT",
      name: "Immortals",
      short: "IMT",
      color: "#0b2b5b",
      tier: 77,
      roster: {
        TOP: ["Solo", "Alder"],
        JNG: ["Kenvi", "Birch"],
        MID: ["Bolulu", "Clove"],
        BOT: ["Tactical", "Dune"],
        SUP: ["Treatz", "Elm"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster verified; spring had Revenge/Ablazeolive/Fleshy.
  ],
  // LCS 2022 — champion: Cloud9
  2022: [
    {
      id: "C9",
      name: "Cloud9",
      short: "C9",
      color: "#00b2e2",
      tier: 90,
      roster: {
        TOP: ["Fudge", "Nyx"],
        JNG: ["Blaber", "Pax"],
        MID: ["Jensen", "Quill"],
        BOT: ["Berserker", "Rune"],
        SUP: ["Zven", "Talon"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster; spring had Summit top and Winsome support.
    {
      id: "HLT",
      name: "100 Thieves",
      short: "100",
      color: "#c8102e",
      tier: 88,
      roster: {
        TOP: ["Ssumday", "Umbra"],
        JNG: ["Closer", "Vale"],
        MID: ["Abbedagge", "Xen"],
        BOT: ["FBI", "Yara"],
        SUP: ["huhi", "Zeph"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "EG",
      name: "Evil Geniuses",
      short: "EG",
      color: "#0e4d8c",
      tier: 86,
      roster: {
        TOP: ["Impact", "Ash"],
        JNG: ["Inspired", "Bolt"],
        MID: ["Jojopyun", "Cinder"],
        BOT: ["Danny", "Pico"],
        SUP: ["Vulcan", "Rhea"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "TL",
      name: "Team Liquid",
      short: "TL",
      color: "#0a2463",
      tier: 85,
      roster: {
        TOP: ["Bwipo", "Slate"],
        JNG: ["Santorin", "Tove"],
        MID: ["Bjergsen", "Ulric"],
        BOT: ["Tactical", "Veda"],
        SUP: ["CoreJJ", "Wren"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "CLG",
      name: "Counter Logic Gaming",
      short: "CLG",
      color: "#1d4ed8",
      tier: 84,
      roster: {
        TOP: ["Dhokla", "Xilo"],
        JNG: ["Contractz", "Yuki"],
        MID: ["Palafox", "Zara"],
        BOT: ["Luger", "Bram"],
        SUP: ["Poome", "Cleo"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "TSM",
      name: "TSM",
      short: "TSM",
      color: "#1a1a1a",
      tier: 83,
      roster: {
        TOP: ["Solo", "Dain"],
        JNG: ["Spica", "Elio"],
        MID: ["Maple", "Fenn"],
        BOT: ["Instinct", "Greta"],
        SUP: ["Chime", "Hollis"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster from memory; spring had Huni/Keaiduo/Tactical/Shenyi.
    {
      id: "FLY",
      name: "FlyQuest",
      short: "FLY",
      color: "#16a34a",
      tier: 82,
      roster: {
        TOP: ["Philip", "Juno"],
        JNG: ["Josedeodo", "Kaya"],
        MID: ["Toucouille", "Lark"],
        BOT: ["Johnsun", "Moss"],
        SUP: ["Aphromoo", "Nix"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer top Philip replaced Kumo; from memory.
    {
      id: "GG",
      name: "Golden Guardians",
      short: "GG",
      color: "#eab308",
      tier: 80,
      roster: {
        TOP: ["Licorice", "Odo"],
        JNG: ["Pridestalker", "Plum"],
        MID: ["Ablazeolive", "Rill"],
        BOT: ["Stixxay", "Sova"],
        SUP: ["Olleh", "Tarn"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] 2022 Golden Guardians roster from memory.
    {
      id: "IMT",
      name: "Immortals",
      short: "IMT",
      color: "#0b2b5b",
      tier: 78,
      roster: {
        TOP: ["Revenge", "Ulf"],
        JNG: ["Kenvi", "Vesper"],
        MID: ["PowerOfEvil", "Wynn"],
        BOT: ["Lost", "Xan"],
        SUP: ["IgNar", "Zev"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] 2022 Immortals summer roster from memory.
    {
      id: "DIG",
      name: "Dignitas",
      short: "DIG",
      color: "#ffd700",
      tier: 76,
      roster: {
        TOP: ["FakeGod", "Alder"],
        JNG: ["River", "Birch"],
        MID: ["Blue", "Clove"],
        BOT: ["Neo", "Dune"],
        SUP: ["Biofrost", "Elm"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] 2022 Dignitas roster from memory.
  ],
  // LCS 2021 — champion: 100 Thieves
  2021: [
    {
      id: "HLT",
      name: "100 Thieves",
      short: "100",
      color: "#c8102e",
      tier: 90,
      roster: {
        TOP: ["Ssumday", "Nyx"],
        JNG: ["Closer", "Pax"],
        MID: ["Abbedagge", "Quill"],
        BOT: ["FBI", "Rune"],
        SUP: ["huhi", "Talon"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "TL",
      name: "Team Liquid",
      short: "TL",
      color: "#0a2463",
      tier: 88,
      roster: {
        TOP: ["Alphari", "Umbra"],
        JNG: ["Santorin", "Vale"],
        MID: ["Jensen", "Xen"],
        BOT: ["Tactical", "Yara"],
        SUP: ["CoreJJ", "Zeph"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "C9",
      name: "Cloud9",
      short: "C9",
      color: "#00b2e2",
      tier: 87,
      roster: {
        TOP: ["Fudge", "Ash"],
        JNG: ["Blaber", "Bolt"],
        MID: ["Perkz", "Cinder"],
        BOT: ["Zven", "Pico"],
        SUP: ["Vulcan", "Rhea"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "TSM",
      name: "TSM",
      short: "TSM",
      color: "#1a1a1a",
      tier: 85,
      roster: {
        TOP: ["Huni", "Slate"],
        JNG: ["Spica", "Tove"],
        MID: ["PowerOfEvil", "Ulric"],
        BOT: ["Lost", "Veda"],
        SUP: ["SwordArt", "Wren"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "EG",
      name: "Evil Geniuses",
      short: "EG",
      color: "#0e4d8c",
      tier: 84,
      roster: {
        TOP: ["Impact", "Xilo"],
        JNG: ["Svenskeren", "Yuki"],
        MID: ["Jiizuke", "Zara"],
        BOT: ["Danny", "Bram"],
        SUP: ["IgNar", "Cleo"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster; spring ADC was Deftly.
    {
      id: "IMT",
      name: "Immortals",
      short: "IMT",
      color: "#0b2b5b",
      tier: 83,
      roster: {
        TOP: ["Revenge", "Dain"],
        JNG: ["Xerxe", "Elio"],
        MID: ["Insanity", "Fenn"],
        BOT: ["Raes", "Greta"],
        SUP: ["Destiny", "Hollis"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "DIG",
      name: "Dignitas",
      short: "DIG",
      color: "#ffd700",
      tier: 82,
      roster: {
        TOP: ["FakeGod", "Juno"],
        JNG: ["Dardoch", "Kaya"],
        MID: ["Soligo", "Lark"],
        BOT: ["Neo", "Moss"],
        SUP: ["Aphromoo", "Nix"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] 2021 Dignitas roster from memory.
    {
      id: "GG",
      name: "Golden Guardians",
      short: "GG",
      color: "#eab308",
      tier: 80,
      roster: {
        TOP: ["Niles", "Odo"],
        JNG: ["Iconic", "Plum"],
        MID: ["Ablazeolive", "Rill"],
        BOT: ["Stixxay", "Sova"],
        SUP: ["Newbie", "Tarn"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] 2021 Golden Guardians roster from memory.
    {
      id: "FLY",
      name: "FlyQuest",
      short: "FLY",
      color: "#16a34a",
      tier: 79,
      roster: {
        TOP: ["Licorice", "Ulf"],
        JNG: ["Josedeodo", "Vesper"],
        MID: ["Palafox", "Wynn"],
        BOT: ["Johnsun", "Xan"],
        SUP: ["Diamond", "Zev"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "CLG",
      name: "Counter Logic Gaming",
      short: "CLG",
      color: "#1d4ed8",
      tier: 77,
      roster: {
        TOP: ["Finn", "Alder"],
        JNG: ["Broxah", "Birch"],
        MID: ["Pobelter", "Clove"],
        BOT: ["WildTurtle", "Dune"],
        SUP: ["Smoothie", "Elm"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
  ],
  // LCS 2020 — champion: TSM
  2020: [
    {
      id: "TSM",
      name: "TSM",
      short: "TSM",
      color: "#1a1a1a",
      tier: 90,
      roster: {
        TOP: ["BrokenBlade", "Nyx"],
        JNG: ["Spica", "Pax"],
        MID: ["Bjergsen", "Quill"],
        BOT: ["Doublelift", "Rune"],
        SUP: ["Biofrost", "Talon"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "FLY",
      name: "FlyQuest",
      short: "FLY",
      color: "#16a34a",
      tier: 88,
      roster: {
        TOP: ["Solo", "Umbra"],
        JNG: ["Santorin", "Vale"],
        MID: ["PowerOfEvil", "Xen"],
        BOT: ["WildTurtle", "Yara"],
        SUP: ["IgNar", "Zeph"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "TL",
      name: "Team Liquid",
      short: "TL",
      color: "#0a2463",
      tier: 87,
      roster: {
        TOP: ["Impact", "Ash"],
        JNG: ["Broxah", "Bolt"],
        MID: ["Jensen", "Cinder"],
        BOT: ["Tactical", "Pico"],
        SUP: ["CoreJJ", "Rhea"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "C9",
      name: "Cloud9",
      short: "C9",
      color: "#00b2e2",
      tier: 86,
      roster: {
        TOP: ["Licorice", "Slate"],
        JNG: ["Blaber", "Tove"],
        MID: ["Nisqy", "Ulric"],
        BOT: ["Zven", "Veda"],
        SUP: ["Vulcan", "Wren"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "EG",
      name: "Evil Geniuses",
      short: "EG",
      color: "#0e4d8c",
      tier: 84,
      roster: {
        TOP: ["Huni", "Xilo"],
        JNG: ["Svenskeren", "Yuki"],
        MID: ["Jiizuke", "Zara"],
        BOT: ["Bang", "Bram"],
        SUP: ["Zeyzal", "Cleo"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "GG",
      name: "Golden Guardians",
      short: "GG",
      color: "#eab308",
      tier: 83,
      roster: {
        TOP: ["Hauntzer", "Dain"],
        JNG: ["Closer", "Elio"],
        MID: ["Damonte", "Fenn"],
        BOT: ["FBI", "Greta"],
        SUP: ["huhi", "Hollis"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster verified (Damonte promoted, huhi promoted from academy).
    {
      id: "DIG",
      name: "Dignitas",
      short: "DIG",
      color: "#ffd700",
      tier: 81,
      roster: {
        TOP: ["Lourlo", "Juno"],
        JNG: ["Dardoch", "Kaya"],
        MID: ["Froggen", "Lark"],
        BOT: ["Johnsun", "Moss"],
        SUP: ["Aphromoo", "Nix"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Dignitas 2020 summer roster from memory; spring had Grig jungle.
    {
      id: "HLT",
      name: "100 Thieves",
      short: "100",
      color: "#c8102e",
      tier: 80,
      roster: {
        TOP: ["Ssumday", "Odo"],
        JNG: ["Contractz", "Plum"],
        MID: ["Ry0ma", "Rill"],
        BOT: ["Cody Sun", "Sova"],
        SUP: ["Poome", "Tarn"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster; spring had Meteos jungle and Stunt support.
    {
      id: "CLG",
      name: "Counter Logic Gaming",
      short: "CLG",
      color: "#1d4ed8",
      tier: 78,
      roster: {
        TOP: ["Finn", "Ulf"],
        JNG: ["Wiggily", "Vesper"],
        MID: ["Pobelter", "Wynn"],
        BOT: ["Stixxay", "Xan"],
        SUP: ["Smoothie", "Zev"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster; spring had Ruin top and Crown mid.
    {
      id: "IMT",
      name: "Immortals",
      short: "IMT",
      color: "#0b2b5b",
      tier: 76,
      roster: {
        TOP: ["sOAZ", "Alder"],
        JNG: ["Xmithie", "Birch"],
        MID: ["Eika", "Clove"],
        BOT: ["Apollo", "Dune"],
        SUP: ["Hakuho", "Elm"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Spring ADC may have been Altec; Apollo joined later in the year.
  ],
  // NA LCS 2019 — champion: Team Liquid
  2019: [
    {
      id: "TL",
      name: "Team Liquid",
      short: "TL",
      color: "#0a2463",
      tier: 91,
      roster: {
        TOP: ["Impact", "Nyx"],
        JNG: ["Xmithie", "Pax"],
        MID: ["Jensen", "Quill"],
        BOT: ["Doublelift", "Rune"],
        SUP: ["CoreJJ", "Talon"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "C9",
      name: "Cloud9",
      short: "C9",
      color: "#00b2e2",
      tier: 89,
      roster: {
        TOP: ["Licorice", "Umbra"],
        JNG: ["Svenskeren", "Vale"],
        MID: ["Nisqy", "Xen"],
        BOT: ["Sneaky", "Yara"],
        SUP: ["Zeyzal", "Zeph"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "CLG",
      name: "Counter Logic Gaming",
      short: "CLG",
      color: "#1d4ed8",
      tier: 86,
      roster: {
        TOP: ["Ruin", "Ash"],
        JNG: ["Wiggily", "Bolt"],
        MID: ["Crown", "Cinder"],
        BOT: ["Stixxay", "Pico"],
        SUP: ["Biofrost", "Rhea"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "CLC",
      name: "Clutch Gaming",
      short: "CG",
      color: "#dc2645",
      tier: 85,
      roster: {
        TOP: ["Huni", "Slate"],
        JNG: ["LirA", "Tove"],
        MID: ["Febiven", "Ulric"],
        BOT: ["Cody Sun", "Veda"],
        SUP: ["Vulcan", "Wren"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Top lane verified as Huni for full 2019 (Solo stayed contracted as backup).
    {
      id: "TSM",
      name: "TSM",
      short: "TSM",
      color: "#1a1a1a",
      tier: 84,
      roster: {
        TOP: ["BrokenBlade", "Xilo"],
        JNG: ["Spica", "Yuki"],
        MID: ["Bjergsen", "Zara"],
        BOT: ["Zven", "Bram"],
        SUP: ["Smoothie", "Cleo"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "OPT",
      name: "OpTic Gaming",
      short: "OPT",
      color: "#84cc16",
      tier: 83,
      roster: {
        TOP: ["Dhokla", "Dain"],
        JNG: ["Meteos", "Elio"],
        MID: ["Froggen", "Fenn"],
        BOT: ["Arrow", "Greta"],
        SUP: ["Big", "Hollis"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster; spring mid was Crown.
    {
      id: "GG",
      name: "Golden Guardians",
      short: "GG",
      color: "#eab308",
      tier: 80,
      roster: {
        TOP: ["Hauntzer", "Juno"],
        JNG: ["Contractz", "Kaya"],
        MID: ["Damonte", "Lark"],
        BOT: ["Deftly", "Moss"],
        SUP: ["Olleh", "Nix"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster; Damonte joined mid-summer replacing Froggen.
    {
      id: "HLT",
      name: "100 Thieves",
      short: "100",
      color: "#c8102e",
      tier: 79,
      roster: {
        TOP: ["Ssumday", "Odo"],
        JNG: ["Amazing", "Plum"],
        MID: ["Ryu", "Rill"],
        BOT: ["Bang", "Sova"],
        SUP: ["Aphromoo", "Tarn"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] Summer roster; Ryu replaced Huhi mid-season.
    {
      id: "FLY",
      name: "FlyQuest",
      short: "FLY",
      color: "#16a34a",
      tier: 78,
      roster: {
        TOP: ["V1per", "Ulf"],
        JNG: ["Santorin", "Vesper"],
        MID: ["PowerOfEvil", "Wynn"],
        BOT: ["WildTurtle", "Xan"],
        SUP: ["IgNar", "Zev"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    {
      id: "FOX",
      name: "Echo Fox",
      short: "FOX",
      color: "#ea580c",
      tier: 77,
      roster: {
        TOP: ["Solo", "Alder"],
        JNG: ["Rush", "Birch"],
        MID: ["Fenix", "Clove"],
        BOT: ["Apollo", "Dune"],
        SUP: ["Hakuho", "Elm"],
      },
    },
    // [UNCERTAIN] Substitutes are era-plausible placeholders, not verified.
    // [UNCERTAIN] 2019 Echo Fox roster not directly verified; from memory.
  ],
  // NA LCS 2018 — champion: Team Liquid
  2018: [
    {
      id: "TL",
      name: "Team Liquid",
      short: "TL",
      color: "#0a2463",
      tier: 91,
      roster: {
        TOP: ["Impact", "Dyrus"],
        JNG: ["Xmithie", "Amazing"],
        MID: ["Pobelter", "Link"],
        BOT: ["Doublelift", "Chaox"],
        SUP: ["Olleh", "Lustboy"],
      },
    },
    // [UNCERTAIN] Back-to-back titles
    {
      id: "C9",
      name: "Cloud9",
      short: "C9",
      color: "#00b2e2",
      tier: 88,
      roster: {
        TOP: ["Licorice", "Ray"],
        JNG: ["Blaber", "Svenskeren"],
        MID: ["Jensen", "Goldenglue"],
        BOT: ["Sneaky", "Cop"],
        SUP: ["Zeyzal", "Bunny FuFuu"],
      },
    },
    // [UNCERTAIN] Blaber/Svenskeren shared jungle; subs real
    {
      id: "TSM",
      name: "Team SoloMid",
      short: "TSM",
      color: "#1a1a1a",
      tier: 87,
      roster: {
        TOP: ["Hauntzer", "Zig"],
        JNG: ["Grig", "MikeYeung"],
        MID: ["Bjergsen", "Nyjacky"],
        BOT: ["Zven", "Imaqtpie"],
        SUP: ["Mithy", "Xpecial"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "HLT",
      name: "100 Thieves",
      short: "100T",
      color: "#c8102e",
      tier: 86,
      roster: {
        TOP: ["Ssumday", "Seraph"],
        JNG: ["Meteos", "AnDa"],
        MID: ["Ryu", "Pirean"],
        BOT: ["Cody Sun", "Rikara"],
        SUP: ["aphromoo", "BloodWater"],
      },
    },
    // [UNCERTAIN] Subs AnDa/Rikara real; rest uncertain
    {
      id: "FOX",
      name: "Echo Fox",
      short: "FOX",
      color: "#ea580c",
      tier: 84,
      roster: {
        TOP: ["Huni", "Quas"],
        JNG: ["Dardoch", "Crumbzz"],
        MID: ["Damonte", "Fenix"],
        BOT: ["Lost", "Yellowpete"],
        SUP: ["Smoothie", "Krepo"],
      },
    },
    // [UNCERTAIN] Fenix benched spring; sub marked uncertain
    {
      id: "FLY",
      name: "FlyQuest",
      short: "FLY",
      color: "#16a34a",
      tier: 83,
      roster: {
        TOP: ["Flame", "Smittyj"],
        JNG: ["Santorin", "Kirei"],
        MID: ["Keane", "Shiphtur"],
        BOT: ["WildTurtle", "Mash"],
        SUP: ["JayJ", "Stunt"],
      },
    },
    // [UNCERTAIN] Stunt joined from Immortals; subs uncertain
    {
      id: "OPT",
      name: "OpTic Gaming",
      short: "OPT",
      color: "#84cc16",
      tier: 82,
      roster: {
        TOP: ["sOAZ", "Dhokla"],
        JNG: ["Akaadian", "Inori"],
        MID: ["PowerOfEvil", "Scarra"],
        BOT: ["Arrow", "Freeze"],
        SUP: ["Big", "LemonNation"],
      },
    },
    // [UNCERTAIN] sOAZ joined summer; Big replaced LemonNation; subs uncertain
    {
      id: "CLG",
      name: "Counter Logic Gaming",
      short: "CLG",
      color: "#1d4ed8",
      tier: 81,
      roster: {
        TOP: ["Darshan", "Flaresz"],
        JNG: ["Reignover", "Wiggily"],
        MID: ["Huhi", "Jintae"],
        BOT: ["Stixxay", "Ohq"],
        SUP: ["Biofrost", "Remilia"],
      },
    },
    // [UNCERTAIN] Reignover/Wiggily shared jungle; subs uncertain
    {
      id: "CLC",
      name: "Clutch Gaming",
      short: "CG",
      color: "#dc2645",
      tier: 80,
      roster: {
        TOP: ["Solo", "Brandini"],
        JNG: ["Lira", "Procxin"],
        MID: ["Febiven", "Alex Ich"],
        BOT: ["Apollo", "Emperor"],
        SUP: ["Hakuho", "Sheep"],
      },
    },
    // [UNCERTAIN] Debut season; subs uncertain
    {
      id: "GG",
      name: "Golden Guardians",
      short: "GG",
      color: "#eab308",
      tier: 77,
      roster: {
        TOP: ["Lourlo", "Rhux"],
        JNG: ["Contractz", "Shook"],
        MID: ["Mickey", "Hai"],
        BOT: ["Deftly", "Brunch"],
        SUP: ["Matt", "M eye A"],
      },
    },
    // [UNCERTAIN] Hai retired April 2018; Mickey started summer
  ],
  // NA LCS 2017 — champion: TSM
  2017: [
    {
      id: "TSM",
      name: "Team SoloMid",
      short: "TSM",
      color: "#1a1a1a",
      tier: 91,
      roster: {
        TOP: ["Hauntzer", "Dyrus"],
        JNG: ["Svenskeren", "Amazing"],
        MID: ["Bjergsen", "Link"],
        BOT: ["Doublelift", "Chaox"],
        SUP: ["Biofrost", "Lustboy"],
      },
    },
    {
      id: "IMT",
      name: "Immortals",
      short: "IMT",
      color: "#0b2b5b",
      tier: 88,
      roster: {
        TOP: ["Flame", "Quas"],
        JNG: ["Xmithie", "Crumbzz"],
        MID: ["Pobelter", "XiaoWeiXiao"],
        BOT: ["Cody Sun", "Imaqtpie"],
        SUP: ["Olleh", "Xpecial"],
      },
    },
    // [UNCERTAIN] Subs era-plausible veterans, marked uncertain
    {
      id: "CLG",
      name: "Counter Logic Gaming",
      short: "CLG",
      color: "#1d4ed8",
      tier: 86,
      roster: {
        TOP: ["Darshan", "Flaresz"],
        JNG: ["Dardoch", "OmarGod"],
        MID: ["Huhi", "Alex Ich"],
        BOT: ["Stixxay", "Mash"],
        SUP: ["aphromoo", "BloodWater"],
      },
    },
    // [UNCERTAIN] Dardoch/OmarGod shared jungle; subs uncertain
    {
      id: "DIG",
      name: "Dignitas",
      short: "DIG",
      color: "#ffd700",
      tier: 84,
      roster: {
        TOP: ["Ssumday", "Smittyj"],
        JNG: ["Chaser", "Kirei"],
        MID: ["Keane", "Shiphtur"],
        BOT: ["Altec", "LOD"],
        SUP: ["Adrian", "Big"],
      },
    },
    // [UNCERTAIN] Altec moved from FlyQuest; subs uncertain
    {
      id: "C9",
      name: "Cloud9",
      short: "C9",
      color: "#00b2e2",
      tier: 83,
      roster: {
        TOP: ["Impact", "Ray"],
        JNG: ["Contractz", "Rush"],
        MID: ["Jensen", "Nyjacky"],
        BOT: ["Sneaky", "Cop"],
        SUP: ["Smoothie", "Bunny FuFuu"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "NV",
      name: "Team EnVyUs",
      short: "NV",
      color: "#111827",
      tier: 82,
      roster: {
        TOP: ["Seraph", "Cris"],
        JNG: ["LirA", "Procxin"],
        MID: ["Nisqy", "Scarra"],
        BOT: ["Apollo", "Emperor"],
        SUP: ["Hakuho", "M eye A"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "FLY",
      name: "FlyQuest",
      short: "FLY",
      color: "#16a34a",
      tier: 81,
      roster: {
        TOP: ["Balls", "Westrice"],
        JNG: ["Moon", "Shook"],
        MID: ["Hai", "Jintae"],
        BOT: ["WildTurtle", "Yellowpete"],
        SUP: ["LemonNation", "Krepo"],
      },
    },
    // [UNCERTAIN] WildTurtle replaced Altec mid-year; subs uncertain
    {
      id: "FOX",
      name: "Echo Fox",
      short: "FOX",
      color: "#ea580c",
      tier: 80,
      roster: {
        TOP: ["Looper", "Brandini"],
        JNG: ["Akaadian", "Grig"],
        MID: ["Froggen", "Damonte"],
        BOT: ["Keith", "Brunch"],
        SUP: ["Gate", "Remilia"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "TL",
      name: "Team Liquid",
      short: "TL",
      color: "#0a2463",
      tier: 78,
      roster: {
        TOP: ["Lourlo", "Rhux"],
        JNG: ["Reignover", "Inori"],
        MID: ["Goldenglue", "Slooshi"],
        BOT: ["Piglet", "Freeze"],
        SUP: ["Matt", "konkwon"],
      },
    },
    // [UNCERTAIN] Rebuilt after back-to-back 9th places; subs uncertain
    {
      id: "P1",
      name: "Phoenix1",
      short: "P1",
      color: "#ea7c28",
      tier: 77,
      roster: {
        TOP: ["zig", "Allorim"],
        JNG: ["MikeYeung", "Meteos"],
        MID: ["Ryu", "Pirean"],
        BOT: ["Arrow", "Ohq"],
        SUP: ["Shady", "Sheep"],
      },
    },
    // [UNCERTAIN] MikeYeung rookie of split; subs uncertain
  ],
  // NA LCS 2016 — champion: TSM
  2016: [
    {
      id: "TSM",
      name: "Team SoloMid",
      short: "TSM",
      color: "#1a1a1a",
      tier: 91,
      roster: {
        TOP: ["Hauntzer", "Dyrus"],
        JNG: ["Svenskeren", "Amazing"],
        MID: ["Bjergsen", "Link"],
        BOT: ["Doublelift", "Chaox"],
        SUP: ["Biofrost", "Lustboy"],
      },
    },
    {
      id: "C9",
      name: "Cloud9",
      short: "C9",
      color: "#00b2e2",
      tier: 88,
      roster: {
        TOP: ["Impact", "Balls"],
        JNG: ["Meteos", "Hai"],
        MID: ["Jensen", "Bischu"],
        BOT: ["Sneaky", "Altec"],
        SUP: ["Smoothie", "Bunny FuFuu"],
      },
    },
    // [UNCERTAIN] Subs are actual C9 Challenger players of the era
    {
      id: "IMT",
      name: "Immortals",
      short: "IMT",
      color: "#0b2b5b",
      tier: 87,
      roster: {
        TOP: ["Huni", "Ssumday"],
        JNG: ["Reignover", "Crumbzz"],
        MID: ["Pobelter", "XiaoWeiXiao"],
        BOT: ["WildTurtle", "Imaqtpie"],
        SUP: ["Adrian", "LemonNation"],
      },
    },
    // [UNCERTAIN] Subs era-plausible veterans, marked uncertain
    {
      id: "CLG",
      name: "Counter Logic Gaming",
      short: "CLG",
      color: "#1d4ed8",
      tier: 85,
      roster: {
        TOP: ["Darshan", "Seraph"],
        JNG: ["Xmithie", "IWDominate"],
        MID: ["Huhi", "Nyjacky"],
        BOT: ["Stixxay", "Cop"],
        SUP: ["aphromoo", "BloodWater"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "TL",
      name: "Team Liquid",
      short: "TL",
      color: "#0a2463",
      tier: 82,
      roster: {
        TOP: ["Lourlo", "ZionSpartan"],
        JNG: ["Dardoch", "Moon"],
        MID: ["Fenix", "Goldenglue"],
        BOT: ["Fabbbyyy", "Piglet"],
        SUP: ["Matt", "Sheep"],
      },
    },
    // [UNCERTAIN] Piglet/Fabbbyyy shared ADC; subs uncertain
    {
      id: "APX",
      name: "Apex Gaming",
      short: "APX",
      color: "#9333ea",
      tier: 81,
      roster: {
        TOP: ["Ray", "Brandini"],
        JNG: ["Shrimp", "Hard"],
        MID: ["Keane", "Ninja"],
        BOT: ["Apollo", "LOD"],
        SUP: ["Xpecial", "Hakuho"],
      },
    },
    // [UNCERTAIN] Folded Sept 2016, merged into Dignitas; subs uncertain
    {
      id: "P1",
      name: "Phoenix1",
      short: "P1",
      color: "#ea7c28",
      tier: 80,
      roster: {
        TOP: ["zig", "Westrice"],
        JNG: ["Inori", "Procxin"],
        MID: ["Pirean", "Alex Ich"],
        BOT: ["Mash", "Freeze"],
        SUP: ["Gate", "Remilia"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "NRG",
      name: "NRG Esports",
      short: "NRG",
      color: "#e11d48",
      tier: 78,
      roster: {
        TOP: ["Quas", "RF Legendary"],
        JNG: ["Santorin", "CloudNguyen"],
        MID: ["GBM", "scarra"],
        BOT: ["ohq", "Yellowpete"],
        SUP: ["KiWiKiD", "Krepo"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "FOX",
      name: "Echo Fox",
      short: "FOX",
      color: "#ea580c",
      tier: 76,
      roster: {
        TOP: ["kfo", "Cris"],
        JNG: ["Kez", "Shook"],
        MID: ["Froggen", "Salce"],
        BOT: ["Keith", "Brunch"],
        SUP: ["Big", "M eye A"],
      },
    },
    // [UNCERTAIN] Worst record in LCS history (1-17); subs uncertain
    {
      id: "DIG",
      name: "Dignitas",
      short: "DIG",
      color: "#ffd700",
      tier: 77,
      roster: {
        TOP: ["Smittyj", "Rhux"],
        JNG: ["Kirei", "Brokenshard"],
        MID: ["Shiphtur", "Chuuper"],
        BOT: ["Emperor", "pr0lly"],
        SUP: ["KonKwon", "Bubbadub"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] spring-only roster; relegated to NACS for summer; EnVyUs (5th-6th summer) omitted per provided list
  ],
  // NA LCS 2015 — champion: CLG
  2015: [
    {
      id: "CLG",
      name: "Counter Logic Gaming",
      short: "CLG",
      color: "#1d4ed8",
      tier: 90,
      roster: {
        TOP: ["ZionSpartan", "MegaZero"],
        JNG: ["Xmithie", "Wiggily"],
        MID: ["Pobelter", "Slooshi"],
        BOT: ["Doublelift", "Stixxay"],
        SUP: ["aphromoo", "Joey"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "TSM",
      name: "Team SoloMid",
      short: "TSM",
      color: "#1a1a1a",
      tier: 88,
      roster: {
        TOP: ["Dyrus", "Grim Samurai"],
        JNG: ["Santorin", "Amazing"],
        MID: ["Bjergsen", "scarra"],
        BOT: ["WildTurtle", "Keith"],
        SUP: ["Lustboy", "Gleebglarbu"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "TL",
      name: "Team Liquid",
      short: "TL",
      color: "#0a2463",
      tier: 86,
      roster: {
        TOP: ["Quas", "Rhux"],
        JNG: ["IWDominate", "Moon"],
        MID: ["FeniX", "Goldenglue"],
        BOT: ["Piglet", "Fabbbyyy"],
        SUP: ["Xpecial", "Matt"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "GV",
      name: "Gravity Gaming",
      short: "GV",
      color: "#0284c7",
      tier: 84,
      roster: {
        TOP: ["Hauntzer", "Smittyj"],
        JNG: ["Move", "Chaser"],
        MID: ["Keane", "Ninja"],
        BOT: ["Altec", "Apollo"],
        SUP: ["Bunny FuFuu", "Hakuho"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "DIG",
      name: "Dignitas",
      short: "DIG",
      color: "#ffd700",
      tier: 83,
      roster: {
        TOP: ["Gamsu", "Ssumday"],
        JNG: ["Helios", "Kirei"],
        MID: ["Shiphtur", "Jintae"],
        BOT: ["CoreJJ", "Emperor"],
        SUP: ["KiWiKiD", "KonKwon"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "C9",
      name: "Cloud9",
      short: "C9",
      color: "#00b2e2",
      tier: 82,
      roster: {
        TOP: ["Balls", "Impact"],
        JNG: ["Rush", "Meteos"],
        MID: ["Incarnation", "Hai"],
        BOT: ["Sneaky", "Freeze"],
        SUP: ["LemonNation", "Daydreamin"],
      },
    },
    // [UNCERTAIN] Summer starters Rush/Incarnation; Hai/Meteos subs after role swaps
    {
      id: "NME",
      name: "Enemy eSports",
      short: "NME",
      color: "#67e8f4",
      tier: 79,
      roster: {
        TOP: ["Flaresz", "CaliTrlolz"],
        JNG: ["Innox", "PorpoisePops"],
        MID: ["cackgod", "Wolfe"],
        BOT: ["Otter", "Maplestreet"],
        SUP: ["Bodydrop", "Dodo"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] roster reconstructed from expansion-era names
    {
      id: "WFX",
      name: "Winterfox",
      short: "WFX",
      color: "#475569",
      tier: 78,
      roster: {
        TOP: ["Avalon", "Darshan"],
        JNG: ["Shook", "CloudNguyen"],
        MID: ["Link", "XiaoWeiXiao"],
        BOT: ["Brunch", "Imaqtpie"],
        SUP: ["Imagine", "BloodWater"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] spring-only team; roster era-plausible
    {
      id: "CST",
      name: "Team Coast",
      short: "CST",
      color: "#0891b2",
      tier: 77,
      roster: {
        TOP: ["Cris", "Westrice"],
        JNG: ["Impaler", "Brokenshard"],
        MID: ["Jesiz", "Chuuper"],
        BOT: ["Mash", "ROBERTxLEE"],
        SUP: ["Sheep", "Bubbadub"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] spring-only team; roster era-plausible
    {
      id: "TDK",
      name: "Team Dragon Knights",
      short: "TDK",
      color: "#f87171",
      tier: 76,
      roster: {
        TOP: ["Seraph", "RF Legendary"],
        JNG: ["Bischu", "Kez"],
        MID: ["Alex Ich", "Nyjacky"],
        BOT: ["WizFujiiN", "Nien"],
        SUP: ["Baby", "Remilia"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] roster reconstructed from era names
  ],
  // NA LCS 2014 — champion: TSM
  2014: [
    {
      id: "TSM",
      name: "Team SoloMid",
      short: "TSM",
      color: "#1a1a1a",
      tier: 90,
      roster: {
        TOP: ["Dyrus", "RichERich"],
        JNG: ["Amazing", "CloudNguyen"],
        MID: ["Bjergsen", "scarra"],
        BOT: ["WildTurtle", "Stixxay"],
        SUP: ["Lustboy", "Gleebglarbu"],
      },
    },
    // [UNCERTAIN] Summer starter Lustboy; Xpecial moved to Curse mid-season
    {
      id: "C9",
      name: "Cloud9",
      short: "C9",
      color: "#00b2e2",
      tier: 88,
      roster: {
        TOP: ["Balls", "Yazuki"],
        JNG: ["Meteos", "Kez"],
        MID: ["Hai", "Bischu"],
        BOT: ["Sneaky", "Altec"],
        SUP: ["LemonNation", "Bunny FuFuu"],
      },
    },
    // [UNCERTAIN] Subs are actual C9 Tempest/Challenger players
    {
      id: "LMQ",
      name: "LMQ",
      short: "LMQ",
      color: "#fde047",
      tier: 86,
      roster: {
        TOP: ["ackerman", "GoDlike"],
        JNG: ["NoName", "Tabe"],
        MID: ["XiaoWeiXiao", "Corn"],
        BOT: ["Vasilii", "Styz"],
        SUP: ["Mor", "DaDan"],
      },
    },
    // [UNCERTAIN] Subs era-plausible CN names, marked uncertain
    {
      id: "CRS",
      name: "Team Curse",
      short: "CRS",
      color: "#7c3aed",
      tier: 84,
      roster: {
        TOP: ["Quas", "Flaresz"],
        JNG: ["IWDominate", "Saintvicious"],
        MID: ["Voyboy", "Jintae"],
        BOT: ["Cop", "Apollo"],
        SUP: ["Xpecial", "BloodWater"],
      },
    },
    // [UNCERTAIN] Xpecial joined from TSM mid-season; subs uncertain
    {
      id: "DIG",
      name: "Dignitas",
      short: "DIG",
      color: "#ffd700",
      tier: 83,
      roster: {
        TOP: ["ZionSpartan", "Rhux"],
        JNG: ["Crumbzz", "Shook"],
        MID: ["Shiphtur", "Nyjacky"],
        BOT: ["Imaqtpie", "DontMashMe"],
        SUP: ["KiWiKiD", "Remilia"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "CLG",
      name: "Counter Logic Gaming",
      short: "CLG",
      color: "#1d4ed8",
      tier: 82,
      roster: {
        TOP: ["Seraph", "Nien"],
        JNG: ["dexter", "ClakeyD"],
        MID: ["Link", "bigfatlp"],
        BOT: ["Doublelift", "Fabbbyyy"],
        SUP: ["aphromoo", "Zaineking"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "EG",
      name: "Evil Geniuses",
      short: "EG",
      color: "#0e4d8c",
      tier: 80,
      roster: {
        TOP: ["InnoX", "Wickd"],
        JNG: ["Snoopeh", "Xmithie"],
        MID: ["Pobelter", "Alex Ich"],
        BOT: ["Yellowpete", "Freeze"],
        SUP: ["Krepo", "M eye A"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] roster reconstructed from EU-core era names
    {
      id: "COL",
      name: "compLexity Black",
      short: "coL",
      color: "#d97706",
      tier: 79,
      roster: {
        TOP: ["Westrice", "i KeNNy u"],
        JNG: ["Brokenshard", "TheOddOrange"],
        MID: ["pr0lly", "Goldenglue"],
        BOT: ["ROBERTxLEE", "Impactful"],
        SUP: ["Bubbadub", "Lohpally"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] padded in; actual summer 2014 participant; names from org timeline
    {
      id: "CST",
      name: "Team Coast",
      short: "CST",
      color: "#0891b2",
      tier: 78,
      roster: {
        TOP: ["Cris", "Darshan"],
        JNG: ["Daydreamin", "Impaler"],
        MID: ["Jesiz", "mancloud"],
        BOT: ["WizFujiiN", "Mash"],
        SUP: ["Sheep", "KonKwon"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] spring-only participant padded in; roster era-plausible
    {
      id: "T8",
      name: "Team 8",
      short: "T8",
      color: "#0d9488",
      tier: 76,
      roster: {
        TOP: ["CaliTrlolz", "RF Legendary"],
        JNG: ["PorpoisePops", "ShorterACE"],
        MID: ["Slooshi", "Gate"],
        BOT: ["Maplestreet", "Nientonsoh"],
        SUP: ["Dodo", "Baby"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] 2014 NACS challenger team padded in
  ],
  // NA LCS 2013 — champion: Cloud9
  2013: [
    {
      id: "C9",
      name: "Cloud9",
      short: "C9",
      color: "#00b2e2",
      tier: 91,
      roster: {
        TOP: ["Balls", "Westrice"],
        JNG: ["Meteos", "Xzevz"],
        MID: ["Hai", "cybolic"],
        BOT: ["Sneaky", "Heartbeat"],
        SUP: ["LemonNation", "AtomicN"],
      },
    },
    // [UNCERTAIN] Spring roster was Chaox/WildTurtle bot; Chaox benched mid-split
    {
      id: "TSM",
      name: "Team SoloMid",
      short: "TSM",
      color: "#1a1a1a",
      tier: 88,
      roster: {
        TOP: ["Dyrus", "MegaZero"],
        JNG: ["TheOddOne", "ClakeyD"],
        MID: ["Reginald", "Nientonsoh"],
        BOT: ["WildTurtle", "SneakyCaStRo"],
        SUP: ["Xpecial", "Ellie Bee"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "VUL",
      name: "Team Vulcun",
      short: "VUL",
      color: "#991b1b",
      tier: 87,
      roster: {
        TOP: ["Sycho Sid", "Cris"],
        JNG: ["Xmithie", "Niero"],
        MID: ["mancloud", "Raiynz"],
        BOT: ["Zuna", "Muffinqt"],
        SUP: ["BloodWater", "Cheezycookie"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "DIG",
      name: "Dignitas",
      short: "DIG",
      color: "#ffd700",
      tier: 85,
      roster: {
        TOP: ["Cruzerthebruzer", "DJ LAMBO"],
        JNG: ["Crumbzz", "Shook"],
        MID: ["scarra", "Arthelon"],
        BOT: ["Imaqtpie", "Lemongod"],
        SUP: ["Patoy", "SupportDaddy"],
      },
    },
    // [UNCERTAIN] Summer top Cruzer replaced KiWiKiD; subs uncertain
    {
      id: "CLG",
      name: "Counter Logic Gaming",
      short: "CLG",
      color: "#1d4ed8",
      tier: 84,
      roster: {
        TOP: ["Nien", "Grim Samurai"],
        JNG: ["Chauster", "Brokenshard"],
        MID: ["Link", "pr0lly"],
        BOT: ["Doublelift", "cat8"],
        SUP: ["aphromoo", "Pröphet"],
      },
    },
    // [UNCERTAIN] aphromoo joined May 2013; subs uncertain
    {
      id: "CRS",
      name: "Team Curse",
      short: "CRS",
      color: "#7c3aed",
      tier: 83,
      roster: {
        TOP: ["Voyboy", "Rhux"],
        JNG: ["Saintvicious", "IWDominate"],
        MID: ["Nyjacky", "Beastonsoh"],
        BOT: ["Cop", "Frostalicious"],
        SUP: ["Elementz", "Sheep"],
      },
    },
    // [UNCERTAIN] Subs era-plausible, marked uncertain
    {
      id: "CST",
      name: "Team Coast",
      short: "CST",
      color: "#0891b2",
      tier: 80,
      roster: {
        TOP: ["ZionSpartan", "Darshan"],
        JNG: ["NintendudeX", "Titours"],
        MID: ["Shiphtur", "LilKvn"],
        BOT: ["WizFujiiN", "xHazzard"],
        SUP: ["Daydreamin", "baottousai"],
      },
    },
    // [UNCERTAIN] Bought GGU spring roster core
    {
      id: "VEL",
      name: "Velocity eSports",
      short: "VEL",
      color: "#64748b",
      tier: 78,
      roster: {
        TOP: ["Vileroze", "Squid"],
        JNG: ["ecco", "jdwu"],
        MID: ["mapléstreet", "Ehomda"],
        BOT: ["Evaniskus", "Impactful"],
        SUP: ["Nk Inc", "NinjaSalad"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] full roster reconstructed from era names
    {
      id: "GGU",
      name: "Good Game University",
      short: "GGU",
      color: "#a855f7",
      tier: 77,
      roster: {
        TOP: ["Fat", "CuRtoKy"],
        JNG: ["Luthman", "Diamond"],
        MID: ["Jintae", "Pixel"],
        BOT: ["Mash", "DontMashMe"],
        SUP: ["I am Anjo", "Nysyli"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] spring 2013 participant padded in; roster from spring era names
    {
      id: "COL",
      name: "compLexity Gaming",
      short: "coL",
      color: "#d97706",
      tier: 76,
      roster: {
        TOP: ["Nickwu", "Shales"],
        JNG: ["Lautemortis", "Bischu"],
        MID: ["Chuuper", "Aniratak"],
        BOT: ["brunch Ü", "FitterHappier"],
        SUP: ["M eye A", "Gynsingg"],
      },
    },
    // [UNCERTAIN] [UNCERTAIN] spring 2013 participant padded in; org timeline names
  ],
};
