/**
 * Mining skill-guide ore location memory.
 *
 * When an eligible player mines a rock that appears in the Mining skill guide
 * (Rocks subsection) in a non-instanced area, their standing tile is stored per
 * ore type. Clicking that ore's icon in the skill guide teleports them back.
 *
 * Unlocked by the Power Miner league relic (admins retain access for testing).
 */
import {
    LEAGUE_RELIC_STRUCT_IDS,
    isSkillGuideTeleportUnlocked,
    type SkillGuideUnlockServices,
} from "../leagues/leagueRelics";
import { isInLMS, isInRaid } from "../combat/MultiCombatZones";
import type { PlayerLocationSnapshot, PlayerState } from "../player";
import { getMiningRockById } from "./mining";

export type { SkillGuideUnlockServices };

/** Mining skill-guide varbit value (interface 214 / varbit 4371). */
export const MINING_SKILL_GUIDE_VARBIT_VALUE = 13;

/** Rocks subsection within the Mining skill guide (varbit 4372). */
export const MINING_SKILL_GUIDE_ROCKS_SUBSECTION = 0;

/**
 * Interface 214 child that holds dynamically created ore icons.
 * RuneLite InterfaceID.SkillGuide.ICONS = 0x00d6_0020.
 */
export const SKILL_GUIDE_ICONS_COMPONENT = 32;

/** Standard spell teleport timings/visuals (same as Varrock teleport cast). */
export const MINING_ORE_TELEPORT_DELAY_TICKS = 3;
export const MINING_ORE_TELEPORT_ANIM_ID = 714;
export const MINING_ORE_TELEPORT_CAST_GFX = 111;
export const MINING_ORE_TELEPORT_CAST_GFX_HEIGHT = 92;
export const MINING_ORE_TELEPORT_CAST_SOUND = 200;
export const MINING_ORE_TELEPORT_ARRIVE_SOUND = 201;

/**
 * Ore item IDs shown in the Mining skill guide Rocks subsection that map to
 * mineable rock definitions in this server.
 * Source: CS2 [proc,skill_guide_data] case 13 / subsection 0.
 */
const GUIDE_ORE_ITEM_TO_ROCK_ID: ReadonlyMap<number, string> = new Map([
    [434, "clay"],
    [436, "copper"],
    [438, "tin"],
    [440, "iron"],
    [442, "silver"],
    [453, "coal"],
    [444, "gold"],
    [447, "mithril"],
    [449, "adamantite"],
    [451, "runite"],
    [21347, "amethyst"],
]);

const GUIDE_ROCK_IDS = new Set(GUIDE_ORE_ITEM_TO_ROCK_ID.values());

/**
 * Power Miner relic unlocks mining skill-guide teleports.
 * Admins retain access for testing.
 */
export function isMiningOreGuideUnlocked(
    player: PlayerState,
    services?: SkillGuideUnlockServices,
): boolean {
    return isSkillGuideTeleportUnlocked(
        player,
        LEAGUE_RELIC_STRUCT_IDS.POWER_MINER,
        services,
    );
}

/**
 * Areas where ore locations must not be saved (raid/LMS instances today).
 * Extend when a general instance manager exists.
 */
export function isInstancedMiningArea(x: number, y: number, level: number): boolean {
    return isInRaid(x, y, level) || isInLMS(x, y, level);
}

export function isMiningGuideRockId(rockId: string): boolean {
    return GUIDE_ROCK_IDS.has(rockId) && !!getMiningRockById(rockId);
}

export function resolveMiningGuideRockIdByOreItem(itemId: number): string | undefined {
    if (!(itemId > 0)) return undefined;
    const rockId = GUIDE_ORE_ITEM_TO_ROCK_ID.get(itemId | 0);
    if (!rockId || !getMiningRockById(rockId)) return undefined;
    return rockId;
}

/**
 * On successful mine: remember the player's standing tile for this ore type.
 */
export function tryRememberMiningOreGuideLocation(
    player: PlayerState,
    rockId: string,
    services?: SkillGuideUnlockServices,
): boolean {
    if (!isMiningOreGuideUnlocked(player, services)) return false;
    if (!isMiningGuideRockId(rockId)) return false;
    if (isInstancedMiningArea(player.tileX, player.tileY, player.level)) return false;

    player.rememberMiningOreLocation(rockId, {
        x: player.tileX,
        y: player.tileY,
        level: player.level,
    });
    return true;
}

export function getSavedMiningOreGuideLocation(
    player: PlayerState,
    rockId: string,
): PlayerLocationSnapshot | undefined {
    return player.getMiningOreLocation(rockId);
}
