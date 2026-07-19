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
export const ITEM_PURE_ESSENCE = 7936;
export const ITEM_EYE_OF_NEWT = 221;
export const ITEM_SWAMP_TAR = 1939;
export const ITEM_ASHES = 592;
export const ITEM_CHARCOAL = 973;
export const ITEM_ATTACK_POTION3 = 121;
export const ITEM_FLOWERS = 2460;

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
    Skeletons: [3565],
    Ghosts: [473, 474, 505, 506, 507],
    DarkWizards: [512, 5086, 5087, 5088, 5089],
    Highwaymen: [518, 519],
} as const;

export const MistAreas = {
    LumbridgeCastle: { minX: 3205, maxX: 3225, minY: 3210, maxY: 3230 },
    LumbridgeGraveyard: { minX: 3240, maxX: 3255, minY: 3190, maxY: 3205 },
    LumbridgeSwamp: { minX: 3160, maxX: 3230, minY: 3140, maxY: 3195 },
    FredFarm: { minX: 3184, maxX: 3198, minY: 3270, maxY: 3285 },
    WizardsTower: { minX: 3102, maxX: 3118, minY: 3150, maxY: 3170 },
    DraynorVillage: { minX: 3075, maxX: 3105, minY: 3240, maxY: 3270 },
    DraynorManor: { minX: 3090, maxX: 3125, minY: 3325, maxY: 3365 },
    VarrockSquare: { minX: 3205, maxX: 3228, minY: 3420, maxY: 3445 },
    VarrockPalace: { minX: 3200, maxX: 3228, minY: 3455, maxY: 3500 },
    VarrockMuseum: { minX: 3250, maxX: 3270, minY: 3440, maxY: 3460 },
    VarrockChapel: { minX: 3250, maxX: 3260, minY: 3480, maxY: 3490 },
    VarrockSewersEntrance: { minX: 3230, maxX: 3245, minY: 3460, maxY: 3475 },
    AirAltar: { minX: 2840, maxX: 2855, minY: 4825, maxY: 4840 }, // excluded — not Misthalin overworld
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
