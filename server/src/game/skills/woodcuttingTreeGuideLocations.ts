/**
 * Woodcutting skill-guide tree location memory.
 *
 * When an eligible player chops a tree that appears in the Woodcutting skill
 * guide (Trees subsection) in a non-instanced area, their standing tile is
 * stored per tree type. Clicking that tree's icon in the skill guide teleports
 * them back.
 *
 * Unlocked by the Lumberjack league relic (admins retain access for testing).
 */
import {
    LEAGUE_RELIC_STRUCT_IDS,
    isSkillGuideTeleportUnlocked,
    type SkillGuideUnlockServices,
} from "../leagues/leagueRelics";
import { isInLMS, isInRaid } from "../combat/MultiCombatZones";
import type { PlayerLocationSnapshot, PlayerState } from "../player";
import { getWoodcuttingTreeById } from "./woodcutting";

export type { SkillGuideUnlockServices };

/** Woodcutting skill-guide varbit value (interface 214 / varbit 4371). */
export const WOODCUTTING_SKILL_GUIDE_VARBIT_VALUE = 18;

/** Trees subsection within the Woodcutting skill guide (varbit 4372). */
export const WOODCUTTING_SKILL_GUIDE_TREES_SUBSECTION = 0;

/**
 * Interface 214 child that holds dynamically created skill-guide icons.
 * RuneLite InterfaceID.SkillGuide.ICONS = 0x00d6_0020.
 */
export const SKILL_GUIDE_ICONS_COMPONENT = 32;

/** Standard spell teleport timings/visuals (same as Varrock teleport cast). */
export const WOODCUTTING_TREE_TELEPORT_DELAY_TICKS = 3;
export const WOODCUTTING_TREE_TELEPORT_ANIM_ID = 714;
export const WOODCUTTING_TREE_TELEPORT_CAST_GFX = 111;
export const WOODCUTTING_TREE_TELEPORT_CAST_GFX_HEIGHT = 92;
export const WOODCUTTING_TREE_TELEPORT_CAST_SOUND = 200;
export const WOODCUTTING_TREE_TELEPORT_ARRIVE_SOUND = 201;

/**
 * Log item IDs shown in the Woodcutting skill guide Trees subsection that map
 * to choppable tree definitions in this server.
 * Source: CS2 [proc,skill_guide_data] case 18 / subsection 0.
 */
const GUIDE_LOG_ITEM_TO_TREE_ID: ReadonlyMap<number, string> = new Map([
    [1511, "normal"],
    [2862, "achey"],
    [1521, "oak"],
    [1519, "willow"],
    [6333, "teak"],
    [1517, "maple"],
    [3239, "hollow"],
    [6332, "mahogany"],
    [1515, "yew"],
    [1513, "magic"],
    [19669, "redwood"],
]);

const GUIDE_TREE_IDS = new Set(GUIDE_LOG_ITEM_TO_TREE_ID.values());

/**
 * Lumberjack relic unlocks woodcutting skill-guide teleports.
 * Admins retain access for testing.
 */
export function isWoodcuttingTreeGuideUnlocked(
    player: PlayerState,
    services?: SkillGuideUnlockServices,
): boolean {
    return isSkillGuideTeleportUnlocked(
        player,
        LEAGUE_RELIC_STRUCT_IDS.LUMBERJACK,
        services,
    );
}

/**
 * Areas where tree locations must not be saved (raid/LMS instances today).
 * Extend when a general instance manager exists.
 */
export function isInstancedWoodcuttingArea(x: number, y: number, level: number): boolean {
    return isInRaid(x, y, level) || isInLMS(x, y, level);
}

export function isWoodcuttingGuideTreeId(treeId: string): boolean {
    return GUIDE_TREE_IDS.has(treeId) && !!getWoodcuttingTreeById(treeId);
}

export function resolveWoodcuttingGuideTreeIdByLogItem(itemId: number): string | undefined {
    if (!(itemId > 0)) return undefined;
    const treeId = GUIDE_LOG_ITEM_TO_TREE_ID.get(itemId | 0);
    if (!treeId || !getWoodcuttingTreeById(treeId)) return undefined;
    return treeId;
}

/**
 * On successful chop: remember the player's standing tile for this tree type.
 */
export function tryRememberWoodcuttingTreeGuideLocation(
    player: PlayerState,
    treeId: string,
    services?: SkillGuideUnlockServices,
): boolean {
    if (!isWoodcuttingTreeGuideUnlocked(player, services)) return false;
    if (!isWoodcuttingGuideTreeId(treeId)) return false;
    if (isInstancedWoodcuttingArea(player.tileX, player.tileY, player.level)) return false;

    player.rememberWoodcuttingTreeLocation(treeId, {
        x: player.tileX,
        y: player.tileY,
        level: player.level,
    });
    return true;
}

export function getSavedWoodcuttingTreeGuideLocation(
    player: PlayerState,
    treeId: string,
): PlayerLocationSnapshot | undefined {
    return player.getWoodcuttingTreeLocation(treeId);
}
