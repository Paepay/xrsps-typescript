/**
 * Hunter skill-guide catch location memory.
 *
 * When an eligible player successfully catches a Hunter creature that appears
 * in the skill guide (in a non-instanced area), their standing tile is stored
 * per catch type. Clicking that creature's icon in the skill guide teleports
 * them back.
 *
 * Call `notifyHunterCatchSuccess` from every successful catch path
 * (box trap, net trap, bird snare, deadfall, pitfall, tracking, etc.).
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
import {
    getHunterCatchById,
    isHunterGuideCatchId,
    resolveHunterCatchIdByGuideItem,
} from "./hunter";

export type { SkillGuideUnlockServices };

/** Hunter skill-guide varbit value (interface 214 / varbit 4371). */
export const HUNTER_SKILL_GUIDE_VARBIT_VALUE = 23;

/**
 * Interface 214 child that holds dynamically created skill-guide icons.
 * RuneLite InterfaceID.SkillGuide.ICONS = 0x00d6_0020.
 */
export const SKILL_GUIDE_ICONS_COMPONENT = 32;

/** Standard spell teleport timings/visuals (same as Varrock teleport cast). */
export const HUNTER_CATCH_TELEPORT_DELAY_TICKS = 3;
export const HUNTER_CATCH_TELEPORT_ANIM_ID = 714;
export const HUNTER_CATCH_TELEPORT_CAST_GFX = 111;
export const HUNTER_CATCH_TELEPORT_CAST_GFX_HEIGHT = 92;
export const HUNTER_CATCH_TELEPORT_CAST_SOUND = 200;
export const HUNTER_CATCH_TELEPORT_ARRIVE_SOUND = 201;

/**
 * Animal Wrangler relic unlocks hunter skill-guide teleports.
 * Admins retain access for testing.
 */
export function isHunterCatchGuideUnlocked(
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
export function isInstancedHunterArea(x: number, y: number, level: number): boolean {
    return isInRaid(x, y, level) || isInLMS(x, y, level);
}

export function resolveHunterGuideCatchIdByItem(itemId: number): string | undefined {
    return resolveHunterCatchIdByGuideItem(itemId);
}

/**
 * On successful catch: remember the player's standing tile for this hunter type.
 */
export function tryRememberHunterCatchGuideLocation(
    player: PlayerState,
    catchId: string,
    services?: SkillGuideUnlockServices,
): boolean {
    if (!isHunterCatchGuideUnlocked(player, services)) return false;
    if (!isHunterGuideCatchId(catchId) || !getHunterCatchById(catchId)) return false;
    if (isInstancedHunterArea(player.tileX, player.tileY, player.level)) return false;

    player.rememberHunterCatchLocation(catchId, {
        x: player.tileX,
        y: player.tileY,
        level: player.level,
    });
    return true;
}

/**
 * Canonical success hook for all Hunter catch methods.
 * Wire box traps, net traps, bird snares, deadfalls, pitfalls, tracking,
 * butterflies, implings, birdhouses, etc. through this after XP/loot is awarded.
 */
export function notifyHunterCatchSuccess(
    player: PlayerState,
    catchId: string,
    services?: SkillGuideUnlockServices,
): boolean {
    return tryRememberHunterCatchGuideLocation(player, catchId, services);
}

export function getSavedHunterCatchGuideLocation(
    player: PlayerState,
    catchId: string,
): PlayerLocationSnapshot | undefined {
    return player.getHunterCatchLocation(catchId);
}
