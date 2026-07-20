import { SkillId } from "../../../../src/rs/skill/skills";

/** Coins */
export const ITEM_COINS = 995;

/** Antique lamp — used as regional combat XP lamp (XP stored in player queue). */
export const ITEM_COMBAT_LAMP = 4447;

/** Letter (OSRS item 4204) — courier package for DELIVER_ITEM favours. */
export const ITEM_LETTER = 4204;

/** Common materials */
export const ITEM_LOGS = 1511;
export const ITEM_OAK_LOGS = 1521;
export const ITEM_COPPER_ORE = 436;
export const ITEM_TIN_ORE = 438;
export const ITEM_IRON_ORE = 440;
export const ITEM_COAL = 453;
export const ITEM_MITHRIL_ORE = 447;
export const ITEM_CLAY = 434;
export const ITEM_BRONZE_BAR = 2349;
export const ITEM_IRON_BAR = 2351;
export const ITEM_STEEL_BAR = 2353;
export const ITEM_BRONZE_DAGGER = 1205;
export const ITEM_BRONZE_SWORD = 1277;
export const ITEM_BRONZE_MED_HELM = 1139;
export const ITEM_IRON_DAGGER = 1203;
export const ITEM_BONES = 526;
export const ITEM_BIG_BONES = 532;
export const ITEM_POTATO = 1942;
export const ITEM_ONION = 1957;
export const ITEM_CABBAGE = 1965;
export const ITEM_EGG = 1944;
export const ITEM_BUCKET_MILK = 1927;
export const ITEM_POT_FLOUR = 1933;
export const ITEM_REDBERRIES = 1951;
export const ITEM_CADAVA_BERRIES = 753;
export const ITEM_GARLIC = 1550;
export const ITEM_WOOL = 1737;
export const ITEM_BALL_OF_WOOL = 1759;
export const ITEM_COWHIDE = 1739;
export const ITEM_LEATHER = 1741;
export const ITEM_LEATHER_GLOVES = 1059;
export const ITEM_LEATHER_BOOTS = 1061;
export const ITEM_RAW_SHRIMPS = 317;
export const ITEM_SHRIMPS = 315;
export const ITEM_RAW_ANCHOVIES = 321;
export const ITEM_ANCHOVIES = 319;
export const ITEM_RAW_TROUT = 335;
export const ITEM_TROUT = 333;
export const ITEM_RAW_SALMON = 331;
export const ITEM_SALMON = 329;
export const ITEM_BREAD = 2309;
export const ITEM_CAKE = 1891;
export const ITEM_BRONZE_ARROW = 882;
export const ITEM_IRON_ARROW = 884;
export const ITEM_ROPE = 954;
export const ITEM_BRONZE_NAILS = 4819;
export const ITEM_PLANK = 960;
export const ITEM_VIAL_WATER = 227;
export const ITEM_RED_DYE = 1763;
export const ITEM_YELLOW_DYE = 1765;
export const ITEM_AIR_RUNE = 556;
export const ITEM_MIND_RUNE = 558;
export const ITEM_WATER_RUNE = 555;
export const ITEM_EARTH_RUNE = 557;
export const ITEM_FIRE_RUNE = 554;
export const ITEM_BODY_RUNE = 559;
export const ITEM_RUNE_ESSENCE = 1436;
/** Pure essence (item 7936). */
export const ITEM_PURE_ESSENCE = 7936;
export const ITEM_EYE_OF_NEWT = 221;
export const ITEM_SWAMP_TAR = 1939;
export const ITEM_ASHES = 592;
export const ITEM_CHARCOAL = 973;
export const ITEM_ATTACK_POTION3 = 121;
/** Misthalin NPC type ids (from server/data/npc-spawns.json). */
export const NpcIds = {
    Hans: 3105,
    Cook: 4626,
    DukeHoracio: 815,
    FatherAereck: 2812,
    Bob: 10619,
    LumbridgeGuide: 306,
    Fred: 732,
    FatherUrhney: 923,
    Morgan: 3479,
    Ned: 4280,
    Aggie: 4284,
    WiseOldMan: 2109,
    Sedridor: 5034,
    Aubury: 2886,
    Romeo: 5037,
    Juliet: 6268,
    FatherLawrence: 5038,
    Apothecary: 5036,
    Thessalia: 534,
    GypsyAris: 5082,
    KingRoald: 5215,
    Reldo: 6203,
    CuratorHaigHalen: 5214,
    HistorianMinas: 1902,

    /** Asgarnia favour NPCs (from server/data/npc-spawns.json). */
    SirAmikVarze: 4771,
    SirTiffyCashien: 4687,
    SirVyvin: 4736,
    SirRenitee: 3100,
    Doric: 3893,
    WysonTheGardener: 5422,
    Hairdresser: 1305,
    Cassie: 3214,
    MakeoverMage: 1307,
    Sanfew: 5044,
    Kaqemeex: 5045,
    Jatix: 8532,
    LadyOfTheLake: 3530,
    Denulth: 4083,
    Tenzing: 4094,
    Dunstan: 4105,
    Gamfred: 2459,
    CaptainTobias: 3644,
    Veos: 1063, // Port Sarim pier
    RedbeardFrank: 3643,
    Betty: 5905, // Port Sarim magic shop
    Gerrant: 2891,
    BrianPortSarim: 2892,
    BrianRimmington: 8694,
    Wydin: 2890,
    Hetty: 4619,
    Phials: 1614,
    Oracle: 821,
    Achietties: 4923,

    /** Regional contacts (favour brokers) — ids from npc-spawns / OSRS wiki. */
    Squire: 4737, // Falador White Knights' Castle
    Drezel: 9804,
    DrezelUnderground: 9805,
    Hassan: 4285, // Chancellor Hassan, Al Kharid
    PirateJackieTheFruit: 5516, // Brimhaven (spawn dump)
    PirateJackieTheFruitDiary: 7650,
    PirateJackieTheFruitDiaryAlt: 7651,
    KingLathas: 8046,
    KingLathasAlt: 9005,
    KingLathasAlt2: 11022,
    Brundt: 3926, // Rellekka longhall
    BrundtAlt: 7318,
    BrundtAlt2: 9269,
    Arianwyn: 5292, // Lletya
    ArianwynAlt: 4536,
    ArianwynAlt2: 4537,
    ArianwynAlt3: 3432,
    ArianwynAlt4: 8866,
    CommanderFullore: 11117, // Kourend Castle
    CommanderFulloreAlt: 11118,
    CommanderFulloreAlt2: 11119,
    CommanderFulloreAlt3: 11120,
    CommanderFulloreAlt4: 11121,
    CommanderFulloreAlt5: 11122,
    PrinceItzlaArkan: 13784,
    PrinceItzlaArkanAlt: 13785,
    PrinceItzlaArkanAlt2: 12650,
    PrinceItzlaArkanAlt3: 12651,
    PrinceItzlaArkanAlt4: 14285,
    PrinceItzlaArkanAlt5: 14286,
    PrinceItzlaArkanAlt6: 14276,
    PrinceItzlaArkanAlt7: 13691,
    PrinceItzlaArkanAlt8: 13693,
    Krystilia: 7663, // Edgeville / Wilderness slayer master
} as const;

/**
 * Alternate type ids → canonical `NpcIds` value.
 * Spawn dumps and live OSRS caches sometimes disagree; talk handlers register both.
 */
export const REGIONAL_NPC_ALIASES: Readonly<Record<number, number>> = {
    // Lumbridge Guide
    3393: 306,
    1179: 306,
    1181: 306,
    // Duke Horacio
    5327: 815,
    8051: 815,
    11024: 815,
    // Aubury
    11434: 2886,
    11435: 2886,
    // Thessalia — modern OSRS 10477/10478; this cache's Varrock spawn is 534
    10477: 534,
    10478: 534,
    // King Roald
    1399: 5215,
    8042: 5215,
    11019: 5215,
    12621: 5215,
    // Morgan
    16274: 3479,
    16275: 3479,
    // Reldo (wiki Normal / quest)
    4243: 6203,
    4242: 6203,
    // Wise Old Man (common Normal variants)
    2108: 2109,
    2112: 2109,
    2113: 2109,
    // Juliet (wiki)
    5035: 6268,
    // Aggie (wiki Talk-to / Dyes)
    120: 4284,
    121: 4284,
    // Archmage Sedridor (wiki)
    11432: 5034,
    11433: 5034,
    11450: 5034,
    // Aris / Gypsy Aris
    11868: 5082,
    11890: 5082,
    11891: 5082,
    // Sir Amik Varze (RFD / instance variants → Falador)
    3395: 4771,
    // Betty (Port Sarim + rare variants)
    3870: 5905,
};

/** Resolve a spoken/spawned type id to the id used in task definitions. */
export function resolveRegionalNpcId(npcId: number): number {
    return REGIONAL_NPC_ALIASES[npcId] ?? npcId;
}

export const NPC_DISPLAY_NAMES: Readonly<Record<number, string>> = {
    [NpcIds.Hans]: "Hans",
    [NpcIds.Cook]: "Cook",
    [NpcIds.DukeHoracio]: "Duke Horacio",
    [NpcIds.FatherAereck]: "Father Aereck",
    [NpcIds.Bob]: "Bob",
    [NpcIds.LumbridgeGuide]: "Lumbridge Guide",
    [NpcIds.Fred]: "Fred the Farmer",
    [NpcIds.FatherUrhney]: "Father Urhney",
    [NpcIds.Morgan]: "Morgan",
    [NpcIds.Ned]: "Ned",
    [NpcIds.Aggie]: "Aggie",
    [NpcIds.WiseOldMan]: "Wise Old Man",
    [NpcIds.Sedridor]: "Sedridor",
    [NpcIds.Aubury]: "Aubury",
    [NpcIds.Romeo]: "Romeo",
    [NpcIds.Juliet]: "Juliet",
    [NpcIds.FatherLawrence]: "Father Lawrence",
    [NpcIds.Apothecary]: "Apothecary",
    [NpcIds.Thessalia]: "Thessalia",
    [NpcIds.GypsyAris]: "Gypsy Aris",
    [NpcIds.KingRoald]: "King Roald",
    [NpcIds.Reldo]: "Reldo",
    [NpcIds.CuratorHaigHalen]: "Curator Haig Halen",
    [NpcIds.HistorianMinas]: "Historian Minas",
    [NpcIds.Squire]: "Squire",
    [NpcIds.SirAmikVarze]: "Sir Amik Varze",
    [NpcIds.SirTiffyCashien]: "Sir Tiffy Cashien",
    [NpcIds.SirVyvin]: "Sir Vyvin",
    [NpcIds.SirRenitee]: "Sir Renitee",
    [NpcIds.Doric]: "Doric",
    [NpcIds.WysonTheGardener]: "Wyson the Gardener",
    [NpcIds.Hairdresser]: "the Hairdresser",
    [NpcIds.Cassie]: "Cassie",
    [NpcIds.MakeoverMage]: "the Make-over Mage",
    [NpcIds.Sanfew]: "Sanfew",
    [NpcIds.Kaqemeex]: "Kaqemeex",
    [NpcIds.Jatix]: "Jatix",
    [NpcIds.LadyOfTheLake]: "the Lady of the Lake",
    [NpcIds.Denulth]: "Commander Denulth",
    [NpcIds.Tenzing]: "Tenzing",
    [NpcIds.Dunstan]: "Dunstan",
    [NpcIds.Gamfred]: "Gamfred",
    [NpcIds.CaptainTobias]: "Captain Tobias",
    [NpcIds.Veos]: "Veos",
    [NpcIds.RedbeardFrank]: "Redbeard Frank",
    [NpcIds.Betty]: "Betty",
    [NpcIds.Gerrant]: "Gerrant",
    [NpcIds.BrianPortSarim]: "Brian",
    [NpcIds.BrianRimmington]: "Brian",
    [NpcIds.Wydin]: "Wydin",
    [NpcIds.Hetty]: "Hetty",
    [NpcIds.Phials]: "Phials",
    [NpcIds.Oracle]: "the Oracle",
    [NpcIds.Achietties]: "Achietties",
    [NpcIds.Drezel]: "Drezel",
    [NpcIds.DrezelUnderground]: "Drezel",
    [NpcIds.Hassan]: "Hassan",
    [NpcIds.PirateJackieTheFruit]: "Pirate Jackie the Fruit",
    [NpcIds.PirateJackieTheFruitDiary]: "Pirate Jackie the Fruit",
    [NpcIds.PirateJackieTheFruitDiaryAlt]: "Pirate Jackie the Fruit",
    [NpcIds.KingLathas]: "King Lathas",
    [NpcIds.KingLathasAlt]: "King Lathas",
    [NpcIds.KingLathasAlt2]: "King Lathas",
    [NpcIds.Brundt]: "Brundt the Chieftain",
    [NpcIds.BrundtAlt]: "Brundt the Chieftain",
    [NpcIds.BrundtAlt2]: "Brundt the Chieftain",
    [NpcIds.Arianwyn]: "Arianwyn",
    [NpcIds.ArianwynAlt]: "Arianwyn",
    [NpcIds.ArianwynAlt2]: "Arianwyn",
    [NpcIds.ArianwynAlt3]: "Arianwyn",
    [NpcIds.ArianwynAlt4]: "Arianwyn",
    [NpcIds.CommanderFullore]: "Commander Fullore",
    [NpcIds.CommanderFulloreAlt]: "Commander Fullore",
    [NpcIds.CommanderFulloreAlt2]: "Commander Fullore",
    [NpcIds.CommanderFulloreAlt3]: "Commander Fullore",
    [NpcIds.CommanderFulloreAlt4]: "Commander Fullore",
    [NpcIds.CommanderFulloreAlt5]: "Commander Fullore",
    [NpcIds.PrinceItzlaArkan]: "Prince Itzla Arkan",
    [NpcIds.PrinceItzlaArkanAlt]: "Prince Itzla Arkan",
    [NpcIds.PrinceItzlaArkanAlt2]: "Prince Itzla Arkan",
    [NpcIds.PrinceItzlaArkanAlt3]: "Prince Itzla Arkan",
    [NpcIds.PrinceItzlaArkanAlt4]: "Prince Itzla Arkan",
    [NpcIds.PrinceItzlaArkanAlt5]: "Prince Itzla Arkan",
    [NpcIds.PrinceItzlaArkanAlt6]: "Prince Itzla Arkan",
    [NpcIds.PrinceItzlaArkanAlt7]: "Prince Itzla Arkan",
    [NpcIds.PrinceItzlaArkanAlt8]: "Prince Itzla Arkan",
    [NpcIds.Krystilia]: "Krystilia",
};

/** Combat targets inside Misthalin. */
export const MistCombat = {
    Goblins: [3030, 3031, 3029, 3032, 3033, 3034, 3051, 3036],
    GiantRats: [2856, 2859, 2860, 2861, 2862, 2863, 2864],
    Rats: [2854, 2855],
    Skeletons: [3565],
    Ghosts: [473, 474, 505, 506, 507],
    DarkWizards: [512, 5086, 5087, 5088, 5089],
    Highwaymen: [518, 519],
    Cows: [2790, 2791, 2793],
    Chickens: [1173, 1174, 2831],
    Frogs: [8702],
    GiantFrogs: [8700],
    Spiders: [3019],
    GiantSpiders: [3017],
    Imps: [5007],
    Muggers: [513],
    /** Lumbridge / sheep farm rams. */
    Rams: [1262, 1263, 1264],
    /** Wizards' Tower top floor lesser demon (league overlap). */
    LesserDemonTower: [2005],
    /** Varrock sewers. */
    Zombies: [39, 41, 55, 56, 57, 58],
    /** Varrock / Edgeville guards (~CB 19–21). */
    Guards: [1147, 2316, 2317, 3254, 6708, 6709, 11916, 11917],
    /** Edgeville dungeon / Varrock sewers hill giants (~CB 28). */
    HillGiants: [2098, 2099, 2100, 2101, 2102, 2103],
    /** Varrock sewers moss giants (~CB 42). */
    MossGiants: [2090, 2091, 2092, 2093],
} as const;

/**
 * Typical OSRS combat levels for favour tiering (player CB should sit near these).
 * Used as documentation + recommended band anchors — ids live in MistCombat / AsgCombat.
 */
export const CombatMonsterCb = {
    Duck: 1,
    Rat: 1,
    Chicken: 1,
    Spider: 1,
    Goblin: 5,
    Cow: 2,
    GiantRat: 6,
    Imp: 7,
    Frog: 5,
    GiantFrog: 13,
    Icefiend: 13,
    Scorpion: 14,
    Skeleton: 22,
    Ghost: 19,
    Zombie: 24,
    Guard: 21,
    Highwayman: 22,
    Mugger: 6,
    Pirate: 26,
    DarkWizard: 20,
    GiantSpider: 27,
    HillGiant: 28,
    Hobgoblin: 28,
    BlackKnight: 33,
    MonkOfZamorak: 30,
    MossGiant: 42,
    IceGiant: 53,
    IceWarrior: 57,
    MountainTroll: 69,
    LesserDemon: 82,
    Dwarf: 10,
} as const;

export const MistAreas = {
    LumbridgeCastle: { minX: 3205, maxX: 3225, minY: 3210, maxY: 3230 },
    /** Castle kitchen / range for cook favours. */
    LumbridgeKitchen: { minX: 3206, maxX: 3212, minY: 3212, maxY: 3218 },
    LumbridgeGraveyard: { minX: 3240, maxX: 3255, minY: 3190, maxY: 3205 },
    LumbridgeSwamp: { minX: 3160, maxX: 3230, minY: 3140, maxY: 3195 },
    /** Includes the onion patch south of Fred's house (~3188–3191, 3266–3268). */
    FredFarm: { minX: 3184, maxX: 3198, minY: 3264, maxY: 3285 },
    WizardsTower: { minX: 3102, maxX: 3118, minY: 3150, maxY: 3170 },
    DraynorVillage: { minX: 3075, maxX: 3105, minY: 3240, maxY: 3270 },
    DraynorManor: { minX: 3090, maxX: 3125, minY: 3325, maxY: 3365 },
    /** Draynor rooftop agility course start / rooftops. */
    DraynorAgility: { minX: 3080, maxX: 3115, minY: 3245, maxY: 3285 },
    VarrockSquare: { minX: 3205, maxX: 3228, minY: 3420, maxY: 3445 },
    /** Aubury's Rune Shop — SE Varrock, south of the eastern bank (~3253, 3402). */
    AuburyRuneShop: { minX: 3251, maxX: 3255, minY: 3399, maxY: 3404 },
    /** Broad Varrock surface for guard pickpocket league overlap. */
    Varrock: { minX: 3185, maxX: 3290, minY: 3375, maxY: 3515 },
    VarrockPalace: { minX: 3200, maxX: 3228, minY: 3455, maxY: 3500 },
    VarrockMuseum: { minX: 3250, maxX: 3270, minY: 3440, maxY: 3460 },
    VarrockChapel: { minX: 3250, maxX: 3260, minY: 3480, maxY: 3490 },
    VarrockSewersEntrance: { minX: 3230, maxX: 3245, minY: 3460, maxY: 3475 },
    /** East Varrock tea stall (league: Steal From the Varrock Tea Stall). */
    VarrockTeaStall: { minX: 3267, maxX: 3274, minY: 3408, maxY: 3415 },
    /** Cabbage patch south of Varrock (league: Pick a Cabbage in Varrock). */
    VarrockCabbage: { minX: 3225, maxX: 3235, minY: 3295, maxY: 3305 },
    /** Cooks' Guild west of Varrock. */
    CooksGuild: { minX: 3138, maxX: 3148, minY: 3440, maxY: 3455 },
    /** H.A.M. hideout (Misthalin underground). */
    HamHideout: { minX: 3138, maxX: 3185, minY: 9608, maxY: 9660 },
    /** Varrock rooftop agility course. */
    VarrockAgility: { minX: 3215, maxX: 3245, minY: 3408, maxY: 3425 },
    AirAltar: { minX: 2840, maxX: 2855, minY: 4825, maxY: 4840 }, // excluded — not Misthalin overworld
} as const;

/** Combat targets inside Asgarnia (ids filtered to Asgarnia league tiles). */
export const AsgCombat = {
    Goblins: [655, 656, 657, 658, 659, 660, 3029, 3030, 3031, 3032, 3033, 3034, 3051],
    GiantRats: [2859, 2860],
    Rats: [2854, 2855],
    Chickens: [1173, 1174, 2804, 2805, 2806],
    Cows: [2790, 2791, 2793],
    Imps: [5007],
    /** Falador / Burthorpe / Port Sarim (~CB 19–21). */
    Guards: [1546, 1547, 1548, 1549, 1550, 1551, 1552, 3254, 3269, 3270, 3271, 3272, 3273, 3274],
    /** Black Knights' Fortress / Taverley dungeon (~CB 33). */
    BlackKnights: [516, 517, 4331],
    Skeletons: [70, 71, 72, 73, 77, 78, 79, 80, 81],
    Ghosts: [473, 474, 505, 506, 507],
    Spiders: [3019],
    /** Asgarnian Ice Dungeon (~CB 57). */
    IceWarriors: [2841, 2842],
    /** Asgarnian Ice Dungeon (~CB 53). */
    IceGiants: [2088, 2089],
    /** Taverley Dungeon (~CB 28). */
    HillGiants: [2098, 2099, 2100, 2101, 2103],
    MountainTrolls: [936, 937, 938, 939, 940, 941, 942, 4143],
    /** South of Falador (~CB 7–23). */
    DarkWizards: [2056, 2057, 2058, 2059],
    Pirates: [523, 1447],
    Ducks: [1838, 1839, 2003],
    /** Asgarnian Ice Dungeon / Hobgoblin Peninsula (~CB 28–42). */
    Hobgoblins: [3049, 3050, 3286, 3287, 3288, 3289],
    Scorpions: [3024],
    Dwarves: [290, 294, 295, 296, 1401, 1402, 1403, 1404],
    Muggers: [513, 1461],
    Highwaymen: [518, 519],
    /** Ice Mountain (~CB 13). */
    Icefiends: [4813],
    /** Chaos Temple / Heroes' Guild (~CB 17–45). */
    MonksOfZamorak: [529, 8400, 8401],
} as const;

export const AsgAreas = {
    FaladorCastle: { minX: 2955, maxX: 3025, minY: 3325, maxY: 3375 },
    FaladorSquare: { minX: 2940, maxX: 2970, minY: 3370, maxY: 3400 },
    FaladorPark: { minX: 2985, maxX: 3025, minY: 3365, maxY: 3395 },
    FaladorAgility: { minX: 3025, maxX: 3050, minY: 3335, maxY: 3365 },
    WhiteKnightsCourtyard: { minX: 2968, maxX: 2990, minY: 3335, maxY: 3355 },
    PortSarim: { minX: 3010, maxX: 3055, minY: 3200, maxY: 3255 },
    PortSarimDocks: { minX: 3020, maxX: 3050, minY: 3205, maxY: 3225 },
    Rimmington: { minX: 2945, maxX: 2975, minY: 3200, maxY: 3230 },
    Taverley: { minX: 2880, maxX: 2935, minY: 3405, maxY: 3490 },
    DruidCircle: { minX: 2915, maxX: 2935, minY: 3475, maxY: 3495 },
    Burthorpe: { minX: 2885, maxX: 2935, minY: 3530, maxY: 3580 },
    WarriorsGuild: { minX: 2835, maxX: 2870, minY: 3535, maxY: 3560 },
    CraftingGuild: { minX: 2925, maxX: 2945, minY: 3280, maxY: 3300 },
    TaverleyDungeonEntrance: { minX: 2880, maxX: 2895, minY: 3395, maxY: 3410 },
    HeroesGuild: { minX: 2895, maxX: 2915, minY: 3505, maxY: 3515 },
    IceMountain: { minX: 2990, maxX: 3035, minY: 3470, maxY: 3520 },
    BlackKnightsFortress: { minX: 3005, maxX: 3035, minY: 3500, maxY: 3535 },
    DoricHut: { minX: 2945, maxX: 2960, minY: 3445, maxY: 3460 },
    MiningGuildEntrance: { minX: 3015, maxX: 3045, minY: 3330, maxY: 3350 },
    BettyShop: { minX: 3010, maxX: 3016, minY: 3256, maxY: 3262 },
    GerrantShop: { minX: 3011, maxX: 3017, minY: 3222, maxY: 3228 },
    /** Air altar ruins (multi) — Asgarnia league RC. */
    AirAltarRuins: { minX: 2980, maxX: 2995, minY: 3285, maxY: 3300 },
    /** Body altar ruins west of Ice Mountain. */
    BodyAltarRuins: { minX: 3050, maxX: 3065, minY: 3440, maxY: 3455 },
    /** Mind altar ruins on Ice Mountain. */
    MindAltarRuins: { minX: 2975, maxX: 2990, minY: 3510, maxY: 3525 },
} as const;

/** Combat skills selectable on regional combat lamps. */
export const COMBAT_LAMP_SKILLS: readonly SkillId[] = [
    SkillId.Attack,
    SkillId.Strength,
    SkillId.Defence,
    SkillId.Ranged,
    SkillId.Magic,
    SkillId.Hitpoints,
];
