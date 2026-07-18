/**
 * Thieving skill-guide activity definitions.
 *
 * Source: CS2 [proc,skill_guide_data_thieving] (RuneStar dump).
 * Subsections: 0 Pickpocket, 1 Stalls, 2 Chests, 3 Other (Other excluded from teleports).
 */
export type ThievingMethodId = "pickpocket" | "stall" | "chest";

export interface ThievingGuideActivity {
    id: string;
    name: string;
    level: number;
    method: ThievingMethodId;
    /** Skill-guide icon item id (namedobj from CS2). */
    guideItemId: number;
    /** Entry index within the skill-guide subsection (for ambiguous icons). */
    guideSlot: number;
}

/**
 * Pickpocket / stall / chest entries that support skill-guide teleports.
 * Excludes "Other" minigame/misc rows.
 */
const THIEVING_GUIDE_ACTIVITIES: ThievingGuideActivity[] = [
    // Pickpocket (subsection 0)
    { id: "man", name: "Citizen", level: 1, method: "pickpocket", guideItemId: 3241, guideSlot: 0 },
    { id: "farmer", name: "Farmer", level: 10, method: "pickpocket", guideItemId: 3243, guideSlot: 1 },
    {
        id: "female_ham",
        name: "Female H.A.M. follower",
        level: 15,
        method: "pickpocket",
        guideItemId: 4295,
        guideSlot: 2,
    },
    {
        id: "male_ham",
        name: "Male H.A.M. follower",
        level: 20,
        method: "pickpocket",
        guideItemId: 4297,
        guideSlot: 3,
    },
    {
        id: "warrior",
        name: "Warrior",
        level: 25,
        method: "pickpocket",
        guideItemId: 3245,
        guideSlot: 4,
    },
    { id: "rogue", name: "Rogue", level: 32, method: "pickpocket", guideItemId: 3247, guideSlot: 5 },
    {
        id: "cave_goblin",
        name: "Cave goblin",
        level: 36,
        method: "pickpocket",
        guideItemId: 10998,
        guideSlot: 6,
    },
    {
        id: "master_farmer",
        name: "Master farmer",
        level: 38,
        method: "pickpocket",
        guideItemId: 5068,
        guideSlot: 7,
    },
    { id: "guard", name: "Guard", level: 40, method: "pickpocket", guideItemId: 3249, guideSlot: 8 },
    {
        id: "fremennik",
        name: "Fremennik",
        level: 45,
        method: "pickpocket",
        guideItemId: 3686,
        guideSlot: 9,
    },
    {
        id: "bearded_bandit",
        name: "Bearded Pollnivnian bandit",
        level: 45,
        method: "pickpocket",
        guideItemId: 6782,
        guideSlot: 10,
    },
    {
        id: "desert_bandit",
        name: "Desert bandit",
        level: 53,
        method: "pickpocket",
        guideItemId: 4625,
        guideSlot: 11,
    },
    {
        id: "knight",
        name: "Knight",
        level: 55,
        method: "pickpocket",
        guideItemId: 3251,
        guideSlot: 12,
    },
    {
        id: "pollnivnian_bandit",
        name: "Pollnivnian bandit",
        level: 55,
        method: "pickpocket",
        guideItemId: 6781,
        guideSlot: 13,
    },
    {
        id: "watchman",
        name: "Watchman",
        level: 65,
        method: "pickpocket",
        guideItemId: 3253,
        guideSlot: 14,
    },
    {
        id: "menaphite_thug",
        name: "Menaphite thug",
        level: 65,
        method: "pickpocket",
        guideItemId: 6780,
        guideSlot: 15,
    },
    {
        id: "paladin",
        name: "Paladin",
        level: 70,
        method: "pickpocket",
        guideItemId: 3255,
        guideSlot: 16,
    },
    { id: "gnome", name: "Gnome", level: 75, method: "pickpocket", guideItemId: 3257, guideSlot: 17 },
    { id: "hero", name: "Hero", level: 80, method: "pickpocket", guideItemId: 3259, guideSlot: 18 },
    { id: "vyre", name: "Vyre", level: 82, method: "pickpocket", guideItemId: 24702, guideSlot: 19 },
    { id: "elf", name: "Elf", level: 85, method: "pickpocket", guideItemId: 6105, guideSlot: 20 },
    {
        id: "tzhaar_hur",
        name: "TzHaar",
        level: 90,
        method: "pickpocket",
        guideItemId: 21278,
        guideSlot: 21,
    },

    // Stalls (subsection 1)
    {
        id: "vegetable_stall",
        name: "Vegetable stall",
        level: 2,
        method: "stall",
        guideItemId: 1965,
        guideSlot: 0,
    },
    {
        id: "cake_stall",
        name: "Cake stall",
        level: 5,
        method: "stall",
        guideItemId: 1891,
        guideSlot: 1,
    },
    {
        id: "tea_stall",
        name: "Tea stall",
        level: 5,
        method: "stall",
        guideItemId: 1978,
        guideSlot: 2,
    },
    {
        id: "crafting_stall",
        name: "Crafting stall",
        level: 5,
        method: "stall",
        guideItemId: 1755,
        guideSlot: 3,
    },
    {
        id: "monkey_food_stall",
        name: "Monkey food stall",
        level: 5,
        method: "stall",
        guideItemId: 1963,
        guideSlot: 4,
    },
    {
        id: "silk_stall",
        name: "Silk stall",
        level: 20,
        method: "stall",
        guideItemId: 950,
        guideSlot: 5,
    },
    {
        id: "wine_stall",
        name: "Wine stall",
        level: 22,
        method: "stall",
        guideItemId: 7919,
        guideSlot: 6,
    },
    {
        id: "fruit_stall",
        name: "Fruit stall",
        level: 25,
        method: "stall",
        guideItemId: 19653,
        guideSlot: 7,
    },
    {
        id: "seed_stall",
        name: "Seed stall",
        level: 27,
        method: "stall",
        guideItemId: 5171,
        guideSlot: 8,
    },
    {
        id: "fur_stall",
        name: "Fur stall",
        level: 35,
        method: "stall",
        guideItemId: 948,
        guideSlot: 9,
    },
    {
        id: "fish_stall",
        name: "Fish stall",
        level: 42,
        method: "stall",
        guideItemId: 331,
        guideSlot: 10,
    },
    {
        id: "crossbow_stall",
        name: "Crossbow stall",
        level: 49,
        method: "stall",
        guideItemId: 9174,
        guideSlot: 11,
    },
    {
        id: "silver_stall",
        name: "Silver stall",
        level: 50,
        method: "stall",
        guideItemId: 442,
        guideSlot: 12,
    },
    {
        id: "magic_stall",
        name: "Magic stall",
        level: 65,
        method: "stall",
        guideItemId: 556,
        guideSlot: 13,
    },
    {
        id: "scimitar_stall",
        name: "Scimitar stall",
        level: 65,
        method: "stall",
        guideItemId: 1323,
        guideSlot: 14,
    },
    {
        id: "spice_stall",
        name: "Spices stall",
        level: 65,
        method: "stall",
        guideItemId: 2007,
        guideSlot: 15,
    },
    {
        id: "gem_stall",
        name: "Gems stall",
        level: 75,
        method: "stall",
        guideItemId: 1607,
        guideSlot: 16,
    },
    {
        id: "ore_stall",
        name: "Ore stall",
        level: 82,
        method: "stall",
        guideItemId: 451,
        guideSlot: 17,
    },

    // Chests (subsection 2)
    {
        id: "chest_10_coins",
        name: "10 coin chest",
        level: 13,
        method: "chest",
        guideItemId: 995,
        guideSlot: 0,
    },
    {
        id: "chest_nature_runes",
        name: "Nature rune chest",
        level: 28,
        method: "chest",
        guideItemId: 561,
        guideSlot: 1,
    },
    {
        id: "chest_dark_key",
        name: "Isle of Souls chest",
        level: 28,
        method: "chest",
        guideItemId: 25244,
        guideSlot: 2,
    },
    {
        id: "chest_50_coins",
        name: "50 coin chest",
        level: 43,
        method: "chest",
        guideItemId: 995,
        guideSlot: 3,
    },
    {
        id: "chest_steel_arrowtips",
        name: "Steel arrowtips chest",
        level: 47,
        method: "chest",
        guideItemId: 41,
        guideSlot: 4,
    },
    {
        id: "chest_dorgesh_kaan_average",
        name: "Dorgesh-Kaan average chest",
        level: 52,
        method: "chest",
        guideItemId: 4522,
        guideSlot: 5,
    },
    {
        id: "chest_blood_rune",
        name: "Blood rune chest",
        level: 59,
        method: "chest",
        guideItemId: 565,
        guideSlot: 6,
    },
    {
        id: "chest_stone",
        name: "Stone chest",
        level: 64,
        method: "chest",
        guideItemId: 13383,
        guideSlot: 7,
    },
    {
        id: "chest_ardougne_castle",
        name: "Ardougne Castle chest",
        level: 72,
        method: "chest",
        guideItemId: 383,
        guideSlot: 8,
    },
    {
        id: "chest_dorgesh_kaan_rich",
        name: "Dorgesh-Kaan rich chest",
        level: 78,
        method: "chest",
        guideItemId: 1623,
        guideSlot: 9,
    },
    {
        id: "chest_rogues_castle",
        name: "Rogues' Castle chest",
        level: 84,
        method: "chest",
        guideItemId: 1615,
        guideSlot: 10,
    },
];

const ACTIVITY_BY_ID = new Map<string, ThievingGuideActivity>(
    THIEVING_GUIDE_ACTIVITIES.map((entry) => [entry.id, entry]),
);

const METHOD_SUBSECTION: Record<ThievingMethodId, number> = {
    pickpocket: 0,
    stall: 1,
    chest: 2,
};

export function getThievingGuideActivityById(id: string): ThievingGuideActivity | undefined {
    return ACTIVITY_BY_ID.get(id);
}

export function getAllThievingGuideActivities(): readonly ThievingGuideActivity[] {
    return THIEVING_GUIDE_ACTIVITIES;
}

export function isThievingGuideActivityId(id: string): boolean {
    return ACTIVITY_BY_ID.has(id);
}

/**
 * Resolve skill-guide icon click → activity id.
 *
 * Subsection is preferred when known, but the Stalls/Chests tabs are CS2-only on
 * the client and often leave varbit 4372 stale on the server (same class of issue
 * as Fishing catch-method tabs). Fall back to itemId (+ slot) across all methods.
 */
export function resolveThievingGuideActivityId(
    itemId: number,
    subsection: number,
    slot?: number,
): string | undefined {
    if (!(itemId > 0)) return undefined;

    const pickFrom = (candidates: ThievingGuideActivity[]): string | undefined => {
        if (candidates.length === 0) return undefined;
        if (candidates.length === 1) return candidates[0].id;
        if (typeof slot === "number" && slot >= 0) {
            const bySlot = candidates.find((entry) => entry.guideSlot === (slot | 0));
            if (bySlot) return bySlot.id;
        }
        return undefined;
    };

    const method = (Object.entries(METHOD_SUBSECTION).find(
        ([, sub]) => sub === (subsection | 0),
    )?.[0] ?? undefined) as ThievingMethodId | undefined;

    if (method) {
        const scoped = pickFrom(
            THIEVING_GUIDE_ACTIVITIES.filter(
                (entry) => entry.method === method && entry.guideItemId === (itemId | 0),
            ),
        );
        if (scoped) return scoped;
    }

    // Stale/unknown subsection: match icon across pickpocket / stall / chest.
    return pickFrom(
        THIEVING_GUIDE_ACTIVITIES.filter((entry) => entry.guideItemId === (itemId | 0)),
    );
}
