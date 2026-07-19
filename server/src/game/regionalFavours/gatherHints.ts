import {
    ITEM_CLAY,
    ITEM_COAL,
    ITEM_COPPER_ORE,
    ITEM_IRON_ORE,
    ITEM_MITHRIL_ORE,
    ITEM_TIN_ORE,
} from "./constants";
import type { TileBounds } from "./types";

/**
 * Default gather destinations for Misthalin ore favours.
 * Areas point the world/minimap marker; objectNames / rockId drive local rock arrows.
 */
export type GatherHintSpec = {
    area: TileBounds;
    /** LocType.name values to match in the loaded scene (case-insensitive). */
    objectNames: readonly string[];
    /** Mining rock id from server/src/game/skills/mining.ts (preferred match key). */
    rockId?: string;
};

/**
 * East Lumbridge Swamp mine — beginner copper/tin (SE shore by fishing spot).
 * ~3229, 3147
 */
const EAST_LUMBRIDGE_SWAMP_MINE: TileBounds = {
    minX: 3225,
    maxX: 3235,
    minY: 3142,
    maxY: 3152,
};

/**
 * West Lumbridge Swamp mine — coal / mithril / adamant (SW swamp, south of Urhney).
 * ~3149, 3147 — must NOT use the east mine coords (those are copper/tin only).
 */
const WEST_LUMBRIDGE_SWAMP_MINE: TileBounds = {
    minX: 3144,
    maxX: 3156,
    minY: 3142,
    maxY: 3154,
};

/** South-west Varrock / Barbarian Village mine for iron. */
const BARBARIAN_VILLAGE_MINE: TileBounds = {
    minX: 3078,
    maxX: 3086,
    minY: 3418,
    maxY: 3426,
};

const DRAYNOR_CLAY: TileBounds = {
    minX: 3084,
    maxX: 3092,
    minY: 3300,
    maxY: 3310,
};

/** Item id → default gather hint (overridable per favour via targetArea / targetObjectNames). */
export const GATHER_HINTS_BY_ITEM: ReadonlyMap<number, GatherHintSpec> = new Map([
    [
        ITEM_MITHRIL_ORE,
        {
            area: WEST_LUMBRIDGE_SWAMP_MINE,
            objectNames: ["Mithril rocks"],
            rockId: "mithril",
        },
    ],
    [
        ITEM_COPPER_ORE,
        {
            area: EAST_LUMBRIDGE_SWAMP_MINE,
            objectNames: ["Copper rocks"],
            rockId: "copper",
        },
    ],
    [
        ITEM_TIN_ORE,
        {
            area: EAST_LUMBRIDGE_SWAMP_MINE,
            objectNames: ["Tin rocks"],
            rockId: "tin",
        },
    ],
    [
        ITEM_IRON_ORE,
        {
            area: BARBARIAN_VILLAGE_MINE,
            objectNames: ["Iron rocks"],
            rockId: "iron",
        },
    ],
    [
        ITEM_COAL,
        {
            area: WEST_LUMBRIDGE_SWAMP_MINE,
            objectNames: ["Coal rocks"],
            rockId: "coal",
        },
    ],
    [
        ITEM_CLAY,
        {
            area: DRAYNOR_CLAY,
            objectNames: ["Clay rocks"],
            rockId: "clay",
        },
    ],
]);

export function getGatherHintForItem(itemId: number | undefined): GatherHintSpec | undefined {
    if (!(itemId && itemId > 0)) return undefined;
    return GATHER_HINTS_BY_ITEM.get(itemId | 0);
}
