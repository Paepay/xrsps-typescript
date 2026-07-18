/**
 * Thieving skill-guide location memory.
 *
 * When an eligible player successfully pickpockets / steals from a stall or
 * chest that appears in the Thieving skill guide (in a non-instanced area),
 * their standing tile is stored per activity. Clicking that icon in the skill
 * guide teleports them back.
 *
 * Unlocked by the Dodgy Deals league relic (admins retain access for testing).
 *
 * Call `notifyThievingStallSuccess` / `notifyThievingChestSuccess` from stall
 * and chest success paths (wired via SkillActionHandler).
 */
import {
    LEAGUE_RELIC_STRUCT_IDS,
    isSkillGuideTeleportUnlocked,
    type SkillGuideUnlockServices,
} from "../leagues/leagueRelics";
import { isInLMS, isInRaid } from "../combat/MultiCombatZones";
import type { PlayerLocationSnapshot, PlayerState } from "../player";
import {
    getThievingGuideActivityById,
    isThievingGuideActivityId,
    resolveThievingGuideActivityId,
} from "./thieving";

export type { SkillGuideUnlockServices };

/** Thieving skill-guide varbit value (interface 214 / varbit 4371). */
export const THIEVING_SKILL_GUIDE_VARBIT_VALUE = 10;

/**
 * Interface 214 child that holds dynamically created skill-guide icons.
 * RuneLite InterfaceID.SkillGuide.ICONS = 0x00d6_0020.
 */
export const SKILL_GUIDE_ICONS_COMPONENT = 32;

/** Standard spell teleport timings/visuals (same as Varrock teleport cast). */
export const THIEVING_TELEPORT_DELAY_TICKS = 3;
export const THIEVING_TELEPORT_ANIM_ID = 714;
export const THIEVING_TELEPORT_CAST_GFX = 111;
export const THIEVING_TELEPORT_CAST_GFX_HEIGHT = 92;
export const THIEVING_TELEPORT_CAST_SOUND = 200;
export const THIEVING_TELEPORT_ARRIVE_SOUND = 201;

/**
 * Dodgy Deals relic unlocks thieving skill-guide teleports.
 * Admins retain access for testing.
 */
export function isThievingGuideUnlocked(
    player: PlayerState,
    services?: SkillGuideUnlockServices,
): boolean {
    return isSkillGuideTeleportUnlocked(
        player,
        LEAGUE_RELIC_STRUCT_IDS.DODGY_DEALS,
        services,
    );
}

export function isInstancedThievingArea(x: number, y: number, level: number): boolean {
    return isInRaid(x, y, level) || isInLMS(x, y, level);
}

export function resolveThievingGuideActivityIdByIcon(
    itemId: number,
    subsection: number,
    slot?: number,
): string | undefined {
    return resolveThievingGuideActivityId(itemId, subsection, slot);
}

function tryRememberThievingGuideLocation(
    player: PlayerState,
    activityId: string,
    services?: SkillGuideUnlockServices,
): boolean {
    if (!isThievingGuideUnlocked(player, services)) return false;
    if (!isThievingGuideActivityId(activityId) || !getThievingGuideActivityById(activityId)) {
        return false;
    }
    if (isInstancedThievingArea(player.tileX, player.tileY, player.level)) return false;

    player.rememberThievingLocation(activityId, {
        x: player.tileX,
        y: player.tileY,
        level: player.level,
    });
    return true;
}

/** On successful pickpocket. */
export function tryRememberThievingPickpocketGuideLocation(
    player: PlayerState,
    activityId: string,
    services?: SkillGuideUnlockServices,
): boolean {
    const activity = getThievingGuideActivityById(activityId);
    if (!activity || activity.method !== "pickpocket") return false;
    return tryRememberThievingGuideLocation(player, activityId, services);
}

/** Wire from stall steal success paths. */
export function notifyThievingStallSuccess(
    player: PlayerState,
    activityId: string,
    services?: SkillGuideUnlockServices,
): boolean {
    const activity = getThievingGuideActivityById(activityId);
    if (!activity || activity.method !== "stall") return false;
    return tryRememberThievingGuideLocation(player, activityId, services);
}

/** Wire from chest steal success paths. */
export function notifyThievingChestSuccess(
    player: PlayerState,
    activityId: string,
    services?: SkillGuideUnlockServices,
): boolean {
    const activity = getThievingGuideActivityById(activityId);
    if (!activity || activity.method !== "chest") return false;
    return tryRememberThievingGuideLocation(player, activityId, services);
}

export function getSavedThievingGuideLocation(
    player: PlayerState,
    activityId: string,
): PlayerLocationSnapshot | undefined {
    return player.getThievingLocation(activityId);
}
