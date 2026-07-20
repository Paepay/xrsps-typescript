import { SkillId } from "../../../../src/rs/skill/skills";
import type { RegionalDifficulty, RegionalFavourRegion } from "./types";

/** Chance to roll a bonus item on favour turn-in (after coins/XP). ~1 in 3 tasks. */
export const BONUS_LOOT_CHANCE: Record<RegionalDifficulty, number> = {
    very_easy: 1 / 3,
    easy: 1 / 3,
    medium: 1 / 3,
    hard: 1 / 3,
};

export type QuantityBand = { min: number; max: number };

export const MATERIAL_QTY: Record<RegionalDifficulty, QuantityBand> = {
    very_easy: { min: 5, max: 15 },
    easy: { min: 10, max: 25 },
    medium: { min: 15, max: 40 },
    hard: { min: 25, max: 60 },
};

export const ESSENCE_QTY: Record<RegionalDifficulty, QuantityBand> = {
    very_easy: { min: 15, max: 35 },
    easy: { min: 25, max: 50 },
    medium: { min: 40, max: 80 },
    hard: { min: 60, max: 120 },
};

/** Smithable melee armour pieces (bronze → rune). */
export const MELEE_ARMOUR_BY_TIER: Readonly<
    Record<string, readonly number[]>
> = {
    bronze: [
        1155, // Bronze full helm
        1117, // Bronze platebody
        1075, // Bronze platelegs
        1139, // Bronze med helm
    ],
    iron: [
        1153, // Iron full helm
        1115, // Iron platebody
        1067, // Iron platelegs
        1137, // Iron med helm
    ],
    steel: [
        1157, // Steel full helm
        1119, // Steel platebody
        1069, // Steel platelegs
        1141, // Steel med helm
    ],
    mithril: [
        1159, // Mithril full helm
        1121, // Mithril platebody
        1071, // Mithril platelegs
    ],
    adamant: [
        1161, // Adamant full helm
        1123, // Adamant platebody
        1073, // Adamant platelegs
    ],
    rune: [
        1163, // Rune full helm
        1127, // Rune platebody
        1079, // Rune platelegs
    ],
};

/** Defence level thresholds for melee armour tiers (weighted pick among eligible). */
export const MELEE_TIER_UNLOCK: ReadonlyArray<{
    tier: keyof typeof MELEE_ARMOUR_BY_TIER;
    minDefence: number;
    weight: number;
}> = [
    { tier: "bronze", minDefence: 1, weight: 40 },
    { tier: "iron", minDefence: 1, weight: 35 },
    { tier: "steel", minDefence: 5, weight: 30 },
    { tier: "mithril", minDefence: 20, weight: 22 },
    { tier: "adamant", minDefence: 30, weight: 14 },
    { tier: "rune", minDefence: 40, weight: 8 },
];

export const MAGIC_ARMOUR_WIZARD: readonly number[] = [
    579, // Blue wizard hat
    577, // Blue wizard robe
    1011, // Blue skirt
    581, // Black robe
];

export const MAGIC_ARMOUR_MYSTIC: readonly number[] = [
    4089, // Mystic hat
    4091, // Mystic robe top
    4093, // Mystic robe bottom
    4095, // Mystic gloves
    4097, // Mystic boots
];

/** Craftable leather / dragonhide ranged armour. */
export const RANGED_ARMOUR_BY_TIER: Readonly<
    Record<string, readonly number[]>
> = {
    leather: [
        1167, // Leather cowl
        1129, // Leather body
        1095, // Leather chaps
        1063, // Leather vambraces
        1131, // Hardleather body
    ],
    studded: [
        1169, // Coif
        1133, // Studded body
        1097, // Studded chaps
    ],
    green: [
        1135, // Green d'hide body
        1099, // Green d'hide chaps
        1065, // Green d'hide vamb
    ],
    blue: [
        2499, // Blue d'hide body
        2493, // Blue d'hide chaps
        2487, // Blue d'hide vamb
    ],
    red: [
        2501, // Red d'hide body
        2495, // Red d'hide chaps
        2489, // Red d'hide vamb
    ],
    black: [
        2503, // Black d'hide body
        2497, // Black d'hide chaps
        2491, // Black d'hide vamb
    ],
};

export const RANGED_TIER_UNLOCK: ReadonlyArray<{
    tier: keyof typeof RANGED_ARMOUR_BY_TIER;
    minRanged: number;
    weight: number;
}> = [
    { tier: "leather", minRanged: 1, weight: 40 },
    { tier: "studded", minRanged: 20, weight: 30 },
    { tier: "green", minRanged: 40, weight: 24 },
    { tier: "blue", minRanged: 50, weight: 18 },
    { tier: "red", minRanged: 60, weight: 12 },
    { tier: "black", minRanged: 70, weight: 8 },
];

export type MaterialEntry = {
    itemId: number;
    /** Prefer noted form when granting. */
    noted: boolean;
    weight: number;
    minLevel?: number;
};

/** Skilling material pools keyed by SkillId. */
export const SKILLING_MATERIAL_POOLS: Partial<Record<SkillId, readonly MaterialEntry[]>> = {
    [SkillId.Mining]: [
        { itemId: 436, noted: true, weight: 30, minLevel: 1 }, // Copper ore
        { itemId: 438, noted: true, weight: 30, minLevel: 1 }, // Tin ore
        { itemId: 440, noted: true, weight: 28, minLevel: 15 }, // Iron ore
        { itemId: 453, noted: true, weight: 24, minLevel: 30 }, // Coal
        { itemId: 442, noted: true, weight: 16, minLevel: 20 }, // Silver ore
        { itemId: 444, noted: true, weight: 14, minLevel: 40 }, // Gold ore
        { itemId: 447, noted: true, weight: 12, minLevel: 55 }, // Mithril ore
        { itemId: 449, noted: true, weight: 8, minLevel: 70 }, // Adamantite ore
        { itemId: 451, noted: true, weight: 4, minLevel: 85 }, // Runite ore
    ],
    [SkillId.Woodcutting]: [
        { itemId: 1511, noted: true, weight: 35, minLevel: 1 }, // Logs
        { itemId: 1521, noted: true, weight: 30, minLevel: 15 }, // Oak logs
        { itemId: 1519, noted: true, weight: 24, minLevel: 30 }, // Willow logs
        { itemId: 1517, noted: true, weight: 18, minLevel: 45 }, // Maple logs
        { itemId: 1515, noted: true, weight: 12, minLevel: 60 }, // Yew logs
        { itemId: 1513, noted: true, weight: 6, minLevel: 75 }, // Magic logs
    ],
    [SkillId.Fishing]: [
        { itemId: 317, noted: true, weight: 30, minLevel: 1 }, // Raw shrimps
        { itemId: 327, noted: true, weight: 28, minLevel: 5 }, // Raw sardine
        { itemId: 345, noted: true, weight: 24, minLevel: 10 }, // Raw herring
        { itemId: 335, noted: true, weight: 22, minLevel: 20 }, // Raw trout
        { itemId: 331, noted: true, weight: 18, minLevel: 30 }, // Raw salmon
        { itemId: 377, noted: true, weight: 14, minLevel: 40 }, // Raw lobster
        { itemId: 371, noted: true, weight: 10, minLevel: 50 }, // Raw swordfish
        { itemId: 383, noted: true, weight: 5, minLevel: 76 }, // Raw shark
    ],
    [SkillId.Cooking]: [
        { itemId: 315, noted: true, weight: 28, minLevel: 1 }, // Shrimps
        { itemId: 333, noted: true, weight: 24, minLevel: 15 }, // Trout
        { itemId: 329, noted: true, weight: 20, minLevel: 25 }, // Salmon
        { itemId: 361, noted: true, weight: 18, minLevel: 30 }, // Tuna
        { itemId: 379, noted: true, weight: 14, minLevel: 40 }, // Lobster
        { itemId: 373, noted: true, weight: 10, minLevel: 45 }, // Swordfish
        { itemId: 2309, noted: true, weight: 18, minLevel: 1 }, // Bread
    ],
    [SkillId.Smithing]: [
        { itemId: 2349, noted: true, weight: 30, minLevel: 1 }, // Bronze bar
        { itemId: 2351, noted: true, weight: 26, minLevel: 15 }, // Iron bar
        { itemId: 2353, noted: true, weight: 22, minLevel: 30 }, // Steel bar
        { itemId: 2359, noted: true, weight: 14, minLevel: 50 }, // Mithril bar
        { itemId: 2361, noted: true, weight: 10, minLevel: 70 }, // Adamantite bar
        { itemId: 2363, noted: true, weight: 5, minLevel: 85 }, // Runite bar
    ],
    [SkillId.Crafting]: [
        { itemId: 1741, noted: true, weight: 28, minLevel: 1 }, // Leather
        { itemId: 1743, noted: true, weight: 20, minLevel: 28 }, // Hard leather
        { itemId: 1745, noted: true, weight: 16, minLevel: 57 }, // Green dragon leather
        { itemId: 2505, noted: true, weight: 12, minLevel: 66 }, // Blue dragon leather
        { itemId: 2507, noted: true, weight: 8, minLevel: 77 }, // Red dragon leather
        { itemId: 2509, noted: true, weight: 5, minLevel: 87 }, // Black dragon leather
        { itemId: 1759, noted: true, weight: 22, minLevel: 1 }, // Ball of wool
    ],
    [SkillId.Fletching]: [
        { itemId: 52, noted: true, weight: 30, minLevel: 1 }, // Arrow shaft
        { itemId: 53, noted: true, weight: 22, minLevel: 1 }, // Headless arrow
        { itemId: 39, noted: true, weight: 20, minLevel: 1 }, // Bronze arrowtips
        { itemId: 40, noted: true, weight: 16, minLevel: 15 }, // Iron arrowtips
        { itemId: 41, noted: true, weight: 12, minLevel: 30 }, // Steel arrowtips
        { itemId: 1777, noted: true, weight: 18, minLevel: 10 }, // Bow string
    ],
    [SkillId.Firemaking]: [
        { itemId: 1511, noted: true, weight: 35, minLevel: 1 },
        { itemId: 1521, noted: true, weight: 28, minLevel: 15 },
        { itemId: 1519, noted: true, weight: 22, minLevel: 30 },
        { itemId: 1517, noted: true, weight: 16, minLevel: 45 },
        { itemId: 1515, noted: true, weight: 10, minLevel: 60 },
    ],
    [SkillId.Herblore]: [
        { itemId: 249, noted: true, weight: 28, minLevel: 1 }, // Guam leaf
        { itemId: 251, noted: true, weight: 24, minLevel: 5 }, // Marrentill
        { itemId: 253, noted: true, weight: 20, minLevel: 11 }, // Tarromin
        { itemId: 255, noted: true, weight: 16, minLevel: 20 }, // Harralander
        { itemId: 257, noted: true, weight: 12, minLevel: 25 }, // Ranarr weed
        { itemId: 221, noted: true, weight: 30, minLevel: 1 }, // Eye of newt
        { itemId: 227, noted: true, weight: 26, minLevel: 1 }, // Vial of water
    ],
    [SkillId.Farming]: [
        { itemId: 5318, noted: true, weight: 28, minLevel: 1 }, // Potato seed
        { itemId: 5319, noted: true, weight: 24, minLevel: 5 }, // Onion seed
        { itemId: 5324, noted: true, weight: 20, minLevel: 7 }, // Cabbage seed
        { itemId: 5320, noted: true, weight: 16, minLevel: 12 }, // Sweetcorn seed
        { itemId: 5291, noted: true, weight: 18, minLevel: 9 }, // Guam seed
    ],
    [SkillId.Thieving]: [
        { itemId: 1623, noted: true, weight: 28, minLevel: 1 }, // Uncut sapphire
        { itemId: 1621, noted: true, weight: 18, minLevel: 1 }, // Uncut emerald
        { itemId: 1619, noted: true, weight: 10, minLevel: 1 }, // Uncut ruby
        { itemId: 1617, noted: true, weight: 5, minLevel: 1 }, // Uncut diamond
    ],
    [SkillId.Agility]: [
        { itemId: 2309, noted: true, weight: 30, minLevel: 1 }, // Bread
        { itemId: 1891, noted: true, weight: 24, minLevel: 1 }, // Cake
        { itemId: 329, noted: true, weight: 20, minLevel: 1 }, // Salmon
        { itemId: 361, noted: true, weight: 16, minLevel: 1 }, // Tuna
    ],
    [SkillId.Hunter]: [
        { itemId: 10006, noted: true, weight: 30, minLevel: 1 }, // Bird snare
        { itemId: 10008, noted: true, weight: 24, minLevel: 27 }, // Box trap
        { itemId: 10010, noted: true, weight: 20, minLevel: 15 }, // Butterfly net
        { itemId: 10012, noted: true, weight: 18, minLevel: 15 }, // Butterfly jar
    ],
    [SkillId.Construction]: [
        { itemId: 960, noted: true, weight: 35, minLevel: 1 }, // Plank
        { itemId: 8778, noted: true, weight: 28, minLevel: 15 }, // Oak plank
        { itemId: 8780, noted: true, weight: 18, minLevel: 35 }, // Teak plank
        { itemId: 8782, noted: true, weight: 10, minLevel: 50 }, // Mahogany plank
        { itemId: 4819, noted: true, weight: 22, minLevel: 1 }, // Bronze nails
    ],
    [SkillId.Prayer]: [
        { itemId: 526, noted: true, weight: 35, minLevel: 1 }, // Bones
        { itemId: 532, noted: true, weight: 25, minLevel: 1 }, // Big bones
        { itemId: 536, noted: true, weight: 12, minLevel: 1 }, // Dragon bones
    ],
    [SkillId.Slayer]: [
        { itemId: 4155, noted: false, weight: 10, minLevel: 1 }, // Enchanted gem
        { itemId: 526, noted: true, weight: 30, minLevel: 1 },
        { itemId: 532, noted: true, weight: 20, minLevel: 1 },
    ],
};

/**
 * Runecraft rewards: noted pure essence, plus a region-local talisman when available.
 * Talisman weight is applied separately in the roller.
 */
export const ITEM_PURE_ESSENCE = 7936;

/** Runecraft level required to craft runes with each talisman (altar use level). */
export const TALISMAN_RUNECRAFT_LEVEL: Readonly<Record<number, number>> = {
    1438: 1, // Air
    1448: 2, // Mind
    1444: 5, // Water
    1440: 9, // Earth
    1442: 14, // Fire
    1446: 20, // Body
    1454: 27, // Cosmic
    1452: 35, // Chaos
    1462: 44, // Nature
    1458: 54, // Law
    1456: 65, // Death
    22118: 95, // Wrath
};

/** Talismans whose altar sits in the favour region (OSRS overworld / dungeon placement). */
export const REGION_TALISMANS: Partial<
    Record<RegionalFavourRegion, readonly number[]>
> = {
    misthalin: [
        1444, // Water (Lumbridge Swamp)
        1440, // Earth (NE Varrock)
        1454, // Cosmic (Zanaris via Lumbridge)
    ],
    asgarnia: [
        1438, // Air
        1448, // Mind
        1446, // Body
        1458, // Law (Entrana)
    ],
    desert: [
        1442, // Fire (Al Kharid)
    ],
    karamja: [
        1462, // Nature
    ],
    wilderness: [
        1452, // Chaos
    ],
    tirannwn: [
        1456, // Death
    ],
    kandarin: [
        22118, // Wrath (Myths' Guild)
    ],
    // Blood / Soul talismans are absent from this cache build.
};

/** Categories that never roll bonus loot (courier / seek style). */
export const BONUS_LOOT_SKIP_CATEGORIES = new Set([
    "SPEAK_TO_NPC",
    "VISIT_LOCATION",
    "DELIVER_ITEM",
] as const);
