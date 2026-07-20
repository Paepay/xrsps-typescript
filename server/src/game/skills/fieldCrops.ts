/**
 * Field / wild crop scenery that can be picked (onion, potato, cabbage, wheat,
 * wild berry bushes). Distinct from Farming allotment harvest — no XP;
 * plant transforms / despawns then respawns.
 *
 * Loc IDs and rates sourced from OSRS Wiki scenery pages.
 */

export const FIELD_CROP_PICK_ANIMATION_ID = 827;
export const FIELD_CROP_PICK_SOUND_ID = 2581;
export const FIELD_CROP_PICK_DELAY_TICKS = 3;

/** Members seed replacement chance: 3/103 (Drop Rate Project). */
export const FIELD_CROP_SEED_NUMERATOR = 3;
export const FIELD_CROP_SEED_DENOMINATOR = 103;

/** Wild berry bush berry→full respawn (wiki: 200 ticks / 2 minutes). */
export const WILD_BERRY_BUSH_RESPAWN_TICKS = 200;

export type FieldCropRespawn =
    | { kind: "fixed"; ticks: number }
    | { kind: "range"; minTicks: number; maxTicks: number };

export type FieldCropDefinition = {
    id: string;
    locIds: readonly number[];
    /** Inventory item; omitted for empty bushes that only show a message. */
    itemId?: number;
    /** Inventory-full message (OSRS/RS transcript parity). */
    inventoryFullMessage: string;
    /** Chat when receiving the crop item. */
    pickMessage: string;
    /** Optional members seed substitute. */
    seed?: {
        itemId: number;
        pickMessage: string;
    };
    respawn: FieldCropRespawn;
    /** Loc to show while depleted; 0 removes the plant (OSRS default). */
    depletedLocId?: number;
    /**
     * Loc restored when the respawn timer fires (defaults to the picked locId).
     * Used by multi-stage bushes that respawn to the full plant.
     */
    respawnLocId?: number;
    /** When false, transform only — do not schedule a respawn timer. Default true. */
    scheduleRespawn?: boolean;
    /** Loc actions to register. Default ["pick"]. */
    actions?: readonly string[];
    /**
     * Empty / depleted bush: show this message and yield nothing
     * (e.g. wild redberry/cadava with no berries left).
     */
    emptyMessage?: string;
};

export const FIELD_CROP_DEFINITIONS: readonly FieldCropDefinition[] = [
    {
        id: "onion",
        locIds: [3366, 51837, 51838],
        itemId: 1957,
        inventoryFullMessage: "You don't have room for this onion.",
        pickMessage: "You pick an onion.",
        seed: {
            itemId: 5319,
            pickMessage: "You pick an onion seed.",
        },
        respawn: { kind: "fixed", ticks: 50 },
    },
    {
        id: "potato",
        locIds: [312],
        itemId: 1942,
        inventoryFullMessage: "You don't have room for this potato.",
        pickMessage: "You pick a potato.",
        seed: {
            itemId: 5318,
            pickMessage: "You pick a potato seed.",
        },
        respawn: { kind: "fixed", ticks: 50 },
    },
    {
        id: "cabbage",
        locIds: [1161, 22301, 51835, 51836],
        itemId: 1965,
        inventoryFullMessage: "You don't have room for this cabbage.",
        pickMessage: "You pick a cabbage.",
        seed: {
            itemId: 5324,
            pickMessage: "You pick a cabbage seed.",
        },
        // Wiki: 40–80 ticks depending on world population.
        respawn: { kind: "range", minTicks: 40, maxTicks: 80 },
    },
    {
        id: "wheat",
        locIds: [313, 15506, 15507, 15508, 22300, 22475, 22476, 22473],
        itemId: 1947,
        inventoryFullMessage: "You can't carry any more grain.",
        pickMessage: "You pick some grain.",
        respawn: { kind: "fixed", ticks: 20 },
    },
    // ——— Wild redberry bush (SE Varrock): 2 berries → 1 → empty → full ———
    {
        id: "redberry_full",
        locIds: [23628],
        itemId: 1951,
        inventoryFullMessage: "You don't have room for these berries.",
        pickMessage: "You pick some redberries.",
        depletedLocId: 23629,
        scheduleRespawn: false,
        actions: ["pick-from"],
        respawn: { kind: "fixed", ticks: WILD_BERRY_BUSH_RESPAWN_TICKS },
    },
    {
        id: "redberry_one",
        locIds: [23629],
        itemId: 1951,
        inventoryFullMessage: "You don't have room for these berries.",
        pickMessage: "You pick some redberries.",
        depletedLocId: 23630,
        respawnLocId: 23628,
        actions: ["pick-from"],
        respawn: { kind: "fixed", ticks: WILD_BERRY_BUSH_RESPAWN_TICKS },
    },
    {
        id: "redberry_empty",
        locIds: [23630],
        inventoryFullMessage: "",
        pickMessage: "",
        emptyMessage: "There are no berries on this bush at the moment.",
        actions: ["pick-from"],
        scheduleRespawn: false,
        respawn: { kind: "fixed", ticks: WILD_BERRY_BUSH_RESPAWN_TICKS },
    },
    // ——— Wild cadava bush (SE Varrock) ———
    {
        id: "cadava_full",
        locIds: [23625],
        itemId: 753,
        inventoryFullMessage: "You don't have room for these berries.",
        pickMessage: "You pick some cadava berries.",
        depletedLocId: 23626,
        scheduleRespawn: false,
        actions: ["pick-from"],
        respawn: { kind: "fixed", ticks: WILD_BERRY_BUSH_RESPAWN_TICKS },
    },
    {
        id: "cadava_one",
        locIds: [23626],
        itemId: 753,
        inventoryFullMessage: "You don't have room for these berries.",
        pickMessage: "You pick some cadava berries.",
        depletedLocId: 23627,
        respawnLocId: 23625,
        actions: ["pick-from"],
        respawn: { kind: "fixed", ticks: WILD_BERRY_BUSH_RESPAWN_TICKS },
    },
    {
        id: "cadava_empty",
        locIds: [23627],
        inventoryFullMessage: "",
        pickMessage: "",
        emptyMessage: "There are no berries on this bush at the moment.",
        actions: ["pick-from"],
        scheduleRespawn: false,
        respawn: { kind: "fixed", ticks: WILD_BERRY_BUSH_RESPAWN_TICKS },
    },
] as const;

const FIELD_CROP_BY_LOC = new Map<number, FieldCropDefinition>();
const FIELD_CROP_LOC_IDS: number[] = [];
const FIELD_CROP_ACTIONS_BY_LOC = new Map<number, readonly string[]>();

for (const def of FIELD_CROP_DEFINITIONS) {
    const actions = def.actions ?? ["pick"];
    for (const locId of def.locIds) {
        FIELD_CROP_BY_LOC.set(locId, def);
        FIELD_CROP_LOC_IDS.push(locId);
        FIELD_CROP_ACTIONS_BY_LOC.set(locId, actions);
    }
}

export const ALL_FIELD_CROP_LOC_IDS: readonly number[] = FIELD_CROP_LOC_IDS;

export const getFieldCropDefinition = (locId: number): FieldCropDefinition | undefined =>
    FIELD_CROP_BY_LOC.get(locId);

export const getFieldCropActions = (locId: number): readonly string[] =>
    FIELD_CROP_ACTIONS_BY_LOC.get(locId) ?? ["pick"];

export const isFieldCropLocId = (locId: number): boolean => FIELD_CROP_BY_LOC.has(locId);

export const resolveFieldCropRespawnTicks = (respawn: FieldCropRespawn): number => {
    if (respawn.kind === "fixed") {
        return respawn.ticks;
    }
    const span = respawn.maxTicks - respawn.minTicks;
    return respawn.minTicks + Math.floor(Math.random() * (span + 1));
};

export type FieldCropLoot = {
    itemId: number;
    message: string;
};

/** Roll crop vs seed (3/103). Seeds only when the definition provides one. */
export const rollFieldCropLoot = (def: FieldCropDefinition): FieldCropLoot | undefined => {
    if (def.itemId === undefined) return undefined;
    if (
        def.seed &&
        Math.floor(Math.random() * FIELD_CROP_SEED_DENOMINATOR) < FIELD_CROP_SEED_NUMERATOR
    ) {
        return { itemId: def.seed.itemId, message: def.seed.pickMessage };
    }
    return { itemId: def.itemId, message: def.pickMessage };
};
