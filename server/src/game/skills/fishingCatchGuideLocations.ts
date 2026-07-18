/**
 * Fishing skill-guide catch location memory.
 *
 * When an eligible player catches a fish that appears in the Fishing skill
 * guide in a non-instanced area, their standing tile is stored per catch type.
 * Clicking that fish's icon in the skill guide teleports them back.
 *
 * Unlocked by the Animal Wrangler league relic (admins retain access for testing).
 */
import {
    LEAGUE_RELIC_STRUCT_IDS,
    isSkillGuideTeleportUnlocked,
    type SkillGuideUnlockServices,
} from "../leagues/leagueRelics";
import { isInLMS, isInRaid } from "../combat/MultiCombatZones";
import type { PlayerLocationSnapshot, PlayerState } from "../player";
import { getFishingSpotById } from "./fishing";

export type { SkillGuideUnlockServices };

/** Fishing skill-guide varbit value (interface 214 / varbit 4371). */
export const FISHING_SKILL_GUIDE_VARBIT_VALUE = 15;

/**
 * Catch method subsections in the Fishing skill guide (varbit 4372).
 * 0 Small Net … 6 Barbarian. Equipment/Other tabs are excluded.
 */
export const FISHING_SKILL_GUIDE_CATCH_SUBSECTIONS = new Set([0, 1, 2, 3, 4, 5, 6]);

/**
 * Interface 214 child that holds dynamically created skill-guide icons.
 * RuneLite InterfaceID.SkillGuide.ICONS = 0x00d6_0020.
 */
export const SKILL_GUIDE_ICONS_COMPONENT = 32;

/** Standard spell teleport timings/visuals (same as Varrock teleport cast). */
export const FISHING_CATCH_TELEPORT_DELAY_TICKS = 3;
export const FISHING_CATCH_TELEPORT_ANIM_ID = 714;
export const FISHING_CATCH_TELEPORT_CAST_GFX = 111;
export const FISHING_CATCH_TELEPORT_CAST_GFX_HEIGHT = 92;
export const FISHING_CATCH_TELEPORT_CAST_SOUND = 200;
export const FISHING_CATCH_TELEPORT_ARRIVE_SOUND = 201;

/**
 * Fish item IDs shown in the Fishing skill guide catch subsections that map to
 * catchable definitions in this server.
 * Source: CS2 [proc,skill_guide_data] case 15 / subsections 0-6.
 * Keys are catch ids from fishing.ts.
 */
const GUIDE_FISH_ITEM_TO_CATCH_ID: ReadonlyMap<number, string> = new Map([
    [317, "shrimp"],
    [3150, "karambwanji"],
    [321, "anchovy"],
    [7944, "monkfish"],
    // Guide historically referenced 10572; live catch uses 21356.
    [10572, "minnow"],
    [21356, "minnow"],
    [353, "mackerel"],
    [341, "cod"],
    [363, "bass"],
    [327, "sardine"],
    [345, "herring"],
    [335, "trout"],
    [349, "pike"],
    [331, "salmon"],
    [359, "tuna"],
    [371, "swordfish"],
    [383, "shark"],
    [377, "lobster"],
    [11328, "leaping_trout"],
    [11330, "leaping_salmon"],
    [11332, "leaping_sturgeon"],
    [3142, "raw_karambwan"],
]);

const KNOWN_CATCH_IDS = (() => {
    const ids = new Set<string>();
    for (const spot of [
        "sea_small_net",
        "river_lure_bait",
        "sea_cage_harpoon",
        "sea_big_net",
        "karambwan",
        "karambwanji",
        "monkfish",
        "barbarian_heavy_rod",
        "minnow",
    ]) {
        const def = getFishingSpotById(spot);
        if (!def) continue;
        for (const method of def.methods) {
            for (const catchDef of method.catches) {
                ids.add(catchDef.id);
            }
        }
    }
    return ids;
})();

const GUIDE_CATCH_IDS = new Set(
    [...GUIDE_FISH_ITEM_TO_CATCH_ID.values()].filter((id) => KNOWN_CATCH_IDS.has(id)),
);

/**
 * Animal Wrangler relic unlocks fishing skill-guide teleports.
 * Admins retain access for testing.
 */
export function isFishingCatchGuideUnlocked(
    player: PlayerState,
    services?: SkillGuideUnlockServices,
): boolean {
    return isSkillGuideTeleportUnlocked(
        player,
        LEAGUE_RELIC_STRUCT_IDS.ANIMAL_WRANGLER,
        services,
    );
}

/**
 * Areas where catch locations must not be saved (raid/LMS instances today).
 * Extend when a general instance manager exists.
 */
export function isInstancedFishingArea(x: number, y: number, level: number): boolean {
    return isInRaid(x, y, level) || isInLMS(x, y, level);
}

export function isFishingGuideCatchId(catchId: string): boolean {
    return GUIDE_CATCH_IDS.has(catchId);
}

export function resolveFishingGuideCatchIdByFishItem(itemId: number): string | undefined {
    if (!(itemId > 0)) return undefined;
    const catchId = GUIDE_FISH_ITEM_TO_CATCH_ID.get(itemId | 0);
    if (!catchId || !GUIDE_CATCH_IDS.has(catchId)) return undefined;
    return catchId;
}

/**
 * On successful catch: remember the player's standing tile for this fish type.
 */
export function tryRememberFishingCatchGuideLocation(
    player: PlayerState,
    catchId: string,
    services?: SkillGuideUnlockServices,
): boolean {
    if (!isFishingCatchGuideUnlocked(player, services)) return false;
    if (!isFishingGuideCatchId(catchId)) return false;
    if (isInstancedFishingArea(player.tileX, player.tileY, player.level)) return false;

    player.rememberFishingCatchLocation(catchId, {
        x: player.tileX,
        y: player.tileY,
        level: player.level,
    });
    return true;
}

export function getSavedFishingCatchGuideLocation(
    player: PlayerState,
    catchId: string,
): PlayerLocationSnapshot | undefined {
    return player.getFishingCatchLocation(catchId);
}
