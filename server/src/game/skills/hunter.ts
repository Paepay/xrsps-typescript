/**
 * Hunter catch definitions aligned with the Hunter skill guide.
 *
 * Catching gameplay is not fully implemented yet; this registry is the shared
 * identity layer for skill-guide location memory. Call
 * `notifyHunterCatchSuccess` from every successful catch path (box trap, net
 * trap, bird snare, deadfall, pitfall, tracking, butterflies, implings, etc.).
 */
export type HunterMethodId =
    | "tracking"
    | "birds"
    | "butterflies"
    | "implings"
    | "deadfall"
    | "box_trap"
    | "net_trap"
    | "pitfall"
    | "aerial"
    | "birdhouse"
    | "other";

export interface HunterCatchDefinition {
    id: string;
    name: string;
    level: number;
    method: HunterMethodId;
    /** Primary item icon shown in the Hunter skill guide for this catch. */
    guideItemId: number;
}

/**
 * Creatures / catch types from CS2 [proc,skill_guide_data_hunter].
 * Excludes equipment-only, clothing, and raids-bat list entries.
 */
const HUNTER_CATCH_DEFINITIONS: HunterCatchDefinition[] = [
    // Tracking
    { id: "polar_kebbit", name: "Polar kebbit", level: 1, method: "tracking", guideItemId: 9953 },
    { id: "common_kebbit", name: "Common kebbit", level: 3, method: "tracking", guideItemId: 9954 },
    {
        id: "feldip_weasel",
        name: "Feldip weasel",
        level: 7,
        method: "tracking",
        guideItemId: 9955,
    },
    { id: "desert_devil", name: "Desert devil", level: 13, method: "tracking", guideItemId: 9956 },
    {
        id: "razor_backed_kebbit",
        name: "Razor-backed kebbit",
        level: 49,
        method: "tracking",
        guideItemId: 9961,
    },
    { id: "herbiboar", name: "Herbiboar", level: 80, method: "tracking", guideItemId: 21511 },

    // Birds (bird snare)
    { id: "crimson_swift", name: "Crimson swift", level: 1, method: "birds", guideItemId: 9965 },
    {
        id: "golden_warbler",
        name: "Golden warbler",
        level: 5,
        method: "birds",
        guideItemId: 9968,
    },
    {
        id: "copper_longtail",
        name: "Copper longtail",
        level: 9,
        method: "birds",
        guideItemId: 9966,
    },
    {
        id: "cerulean_twitch",
        name: "Cerulean twitch",
        level: 11,
        method: "birds",
        guideItemId: 9967,
    },
    {
        id: "tropical_wagtail",
        name: "Tropical wagtail",
        level: 19,
        method: "birds",
        guideItemId: 9969,
    },

    // Butterflies
    {
        id: "ruby_harvest",
        name: "Ruby harvest",
        level: 15,
        method: "butterflies",
        guideItemId: 9970,
    },
    {
        id: "sapphire_glacialis",
        name: "Sapphire glacialis",
        level: 25,
        method: "butterflies",
        guideItemId: 9971,
    },
    {
        id: "snowy_knight",
        name: "Snowy knight",
        level: 35,
        method: "butterflies",
        guideItemId: 9972,
    },
    {
        id: "black_warlock",
        name: "Black warlock",
        level: 45,
        method: "butterflies",
        guideItemId: 9973,
    },

    // Implings
    { id: "baby_impling", name: "Baby impling", level: 17, method: "implings", guideItemId: 11238 },
    { id: "young_impling", name: "Young impling", level: 22, method: "implings", guideItemId: 11240 },
    {
        id: "gourmet_impling",
        name: "Gourmet impling",
        level: 28,
        method: "implings",
        guideItemId: 11242,
    },
    { id: "earth_impling", name: "Earth impling", level: 36, method: "implings", guideItemId: 11244 },
    {
        id: "essence_impling",
        name: "Essence impling",
        level: 42,
        method: "implings",
        guideItemId: 11246,
    },
    {
        id: "eclectic_impling",
        name: "Eclectic impling",
        level: 50,
        method: "implings",
        guideItemId: 11248,
    },
    {
        id: "nature_impling",
        name: "Nature impling",
        level: 58,
        method: "implings",
        guideItemId: 11250,
    },
    {
        id: "magpie_impling",
        name: "Magpie impling",
        level: 65,
        method: "implings",
        guideItemId: 11252,
    },
    { id: "ninja_impling", name: "Ninja impling", level: 74, method: "implings", guideItemId: 11254 },
    {
        id: "crystal_impling",
        name: "Crystal impling",
        level: 80,
        method: "implings",
        guideItemId: 23768,
    },
    {
        id: "dragon_impling",
        name: "Dragon impling",
        level: 83,
        method: "implings",
        guideItemId: 11256,
    },
    { id: "lucky_impling", name: "Lucky impling", level: 89, method: "implings", guideItemId: 19732 },

    // Deadfall
    { id: "wild_kebbit", name: "Wild kebbit", level: 23, method: "deadfall", guideItemId: 9962 },
    {
        id: "barb_tailed_kebbit",
        name: "Barb-tailed kebbit",
        level: 33,
        method: "deadfall",
        guideItemId: 9958,
    },
    {
        id: "prickly_kebbit",
        name: "Prickly kebbit",
        level: 37,
        method: "deadfall",
        guideItemId: 9957,
    },
    {
        id: "sabre_toothed_kebbit",
        name: "Sabre-toothed kebbit",
        level: 51,
        method: "deadfall",
        guideItemId: 9959,
    },
    {
        id: "maniacal_monkey",
        name: "Maniacal monkey",
        level: 60,
        method: "deadfall",
        guideItemId: 19556,
    },

    // Box trap
    { id: "ferret", name: "Ferret", level: 27, method: "box_trap", guideItemId: 10092 },
    { id: "chinchompa", name: "Chinchompa", level: 53, method: "box_trap", guideItemId: 9976 },
    {
        id: "red_chinchompa",
        name: "Red chinchompa",
        level: 63,
        method: "box_trap",
        guideItemId: 9977,
    },
    {
        id: "black_chinchompa",
        name: "Black chinchompa",
        level: 73,
        method: "box_trap",
        guideItemId: 11959,
    },

    // Net trap
    {
        id: "swamp_lizard",
        name: "Swamp lizard",
        level: 29,
        method: "net_trap",
        guideItemId: 10149,
    },
    {
        id: "orange_salamander",
        name: "Orange salamander",
        level: 47,
        method: "net_trap",
        guideItemId: 10146,
    },
    {
        id: "red_salamander",
        name: "Red salamander",
        level: 59,
        method: "net_trap",
        guideItemId: 10147,
    },
    {
        id: "black_salamander",
        name: "Black salamander",
        level: 67,
        method: "net_trap",
        guideItemId: 10148,
    },

    // Pitfall
    { id: "larupia", name: "Spined larupia", level: 31, method: "pitfall", guideItemId: 10045 },
    { id: "graahk", name: "Horned graahk", level: 41, method: "pitfall", guideItemId: 10051 },
    { id: "kyatt", name: "Sabre-toothed kyatt", level: 55, method: "pitfall", guideItemId: 10039 },

    // Aerial / falconry kebbits (+ aerial fishing dual-skill entries that appear here)
    { id: "spotted_kebbit", name: "Spotted kebbit", level: 43, method: "aerial", guideItemId: 9960 },
    { id: "dark_kebbit", name: "Dark kebbit", level: 57, method: "aerial", guideItemId: 9963 },
    {
        id: "dashing_kebbit",
        name: "Dashing kebbit",
        level: 69,
        method: "aerial",
        guideItemId: 9964,
    },

    // Birdhouses
    {
        id: "birdhouse_normal",
        name: "Normal birdhouse",
        level: 5,
        method: "birdhouse",
        guideItemId: 21512,
    },
    {
        id: "birdhouse_oak",
        name: "Oak birdhouse",
        level: 14,
        method: "birdhouse",
        guideItemId: 21515,
    },
    {
        id: "birdhouse_willow",
        name: "Willow birdhouse",
        level: 24,
        method: "birdhouse",
        guideItemId: 21518,
    },
    {
        id: "birdhouse_teak",
        name: "Teak birdhouse",
        level: 34,
        method: "birdhouse",
        guideItemId: 21521,
    },
    {
        id: "birdhouse_maple",
        name: "Maple birdhouse",
        level: 44,
        method: "birdhouse",
        guideItemId: 22192,
    },
    {
        id: "birdhouse_mahogany",
        name: "Mahogany birdhouse",
        level: 49,
        method: "birdhouse",
        guideItemId: 22195,
    },
    {
        id: "birdhouse_yew",
        name: "Yew birdhouse",
        level: 59,
        method: "birdhouse",
        guideItemId: 22198,
    },
    {
        id: "birdhouse_magic",
        name: "Magic birdhouse",
        level: 74,
        method: "birdhouse",
        guideItemId: 22201,
    },
    {
        id: "birdhouse_redwood",
        name: "Redwood birdhouse",
        level: 89,
        method: "birdhouse",
        guideItemId: 22204,
    },

    // Other catchables shown in the guide
    { id: "white_rabbit", name: "White rabbit", level: 27, method: "other", guideItemId: 9975 },
    { id: "imp", name: "Imp", level: 71, method: "other", guideItemId: 9952 },
];

const CATCH_BY_ID = new Map<string, HunterCatchDefinition>(
    HUNTER_CATCH_DEFINITIONS.map((entry) => [entry.id, entry]),
);

/**
 * Guide icon item → catch id. Includes aliases where the guide uses a dummy /
 * clothing product icon instead of the live catch item.
 */
const GUIDE_ITEM_TO_CATCH_ID = new Map<number, string>([
    ...HUNTER_CATCH_DEFINITIONS.map((entry) => [entry.guideItemId, entry.id] as const),
    // Guide uses dummy_chinchompa_5091 for black chinchompas
    [5091, "black_chinchompa"],
]);

export function getHunterCatchById(id: string): HunterCatchDefinition | undefined {
    return CATCH_BY_ID.get(id);
}

export function getAllHunterCatches(): readonly HunterCatchDefinition[] {
    return HUNTER_CATCH_DEFINITIONS;
}

export function resolveHunterCatchIdByGuideItem(itemId: number): string | undefined {
    if (!(itemId > 0)) return undefined;
    const catchId = GUIDE_ITEM_TO_CATCH_ID.get(itemId | 0);
    if (!catchId || !CATCH_BY_ID.has(catchId)) return undefined;
    return catchId;
}

export function isHunterGuideCatchId(catchId: string): boolean {
    return CATCH_BY_ID.has(catchId);
}
