/**
 * League area access: unlock state, map-square membership, teleport/walk/clue gates.
 */
import {
    LEAGUE_ALWAYS_ACCESSIBLE_AREA_IDS,
    LEAGUE_AREA_ID_TO_NAME,
    LEAGUE_UNLOCKABLE_AREA_IDS,
    isLeagueAlwaysAccessibleAreaId,
    isLeagueUnlockableAreaId,
    normalizeLeagueAreaId,
} from "../../../../src/shared/leagues/leagueAreas";
import {
    VARBIT_LEAGUE_AREA_SELECTION_0,
    VARBIT_LEAGUE_AREA_SELECTION_1,
    VARBIT_LEAGUE_AREA_SELECTION_2,
    VARBIT_LEAGUE_AREA_SELECTION_3,
    VARBIT_LEAGUE_AREA_SELECTION_4,
    VARBIT_LEAGUE_AREA_SELECTION_5,
} from "../../../../src/shared/vars";
import { LEAGUE_MAP_SQUARE_TO_AREA_ID } from "./leagueMapSquares.data";

export { normalizeLeagueAreaId };

const AREA_SELECTION_VARBITS = [
    VARBIT_LEAGUE_AREA_SELECTION_0,
    VARBIT_LEAGUE_AREA_SELECTION_1,
    VARBIT_LEAGUE_AREA_SELECTION_2,
    VARBIT_LEAGUE_AREA_SELECTION_3,
    VARBIT_LEAGUE_AREA_SELECTION_4,
    VARBIT_LEAGUE_AREA_SELECTION_5,
] as const;

export const LEAGUE_BARRIER_BLOCK_MESSAGE =
    "A magical barrier prevents you from moving any further.";

export const LEAGUE_TELEPORT_BLOCK_MESSAGE =
    "You can't teleport there as you haven't unlocked that area.";

export const LEAGUE_TRANSPORT_BLOCK_MESSAGE =
    "You can't travel there as you haven't unlocked that area.";

type VarbitPlayer = {
    getVarbitValue?: (id: number) => number;
};

export type TileLike = { x: number; y: number };

/** OSRS map-square id for a world tile. */
export function getMapSquareId(tileX: number, tileY: number): number {
    return ((tileX >> 6) << 8) | (tileY >> 6);
}

/**
 * League area for a world tile via map-square membership.
 * Returns null when the square is unmapped (treated as accessible / neutral).
 */
export function getLeagueAreaIdForTile(tileX: number, tileY: number): number | null {
    const squareId = getMapSquareId(tileX, tileY);
    const areaId = LEAGUE_MAP_SQUARE_TO_AREA_ID[squareId];
    if (areaId === undefined) return null;
    return normalizeLeagueAreaId(areaId);
}

export function getUnlockedLeagueAreaIds(player: VarbitPlayer): Set<number> {
    const unlocked = new Set<number>();
    for (const varbit of AREA_SELECTION_VARBITS) {
        const stored = normalizeLeagueAreaId(player.getVarbitValue?.(varbit) ?? 0);
        if (stored > 0 && LEAGUE_UNLOCKABLE_AREA_IDS.has(stored)) {
            unlocked.add(stored);
        }
    }
    return unlocked;
}

export function isLeagueAreaUnlocked(player: VarbitPlayer, regionId: number): boolean {
    const normalized = normalizeLeagueAreaId(regionId);
    if (!(normalized > 0)) return false;
    if (isLeagueAlwaysAccessibleAreaId(normalized)) return true;
    if (!isLeagueUnlockableAreaId(normalized)) {
        // Non-unlockable specials already handled; unknown ids are not unlocked.
        return false;
    }
    for (const varbit of AREA_SELECTION_VARBITS) {
        const stored = normalizeLeagueAreaId(player.getVarbitValue?.(varbit) ?? 0);
        if (stored === normalized) return true;
    }
    return false;
}

/**
 * Whether the player may be present at / travel to this tile.
 * Unmapped squares are allowed (neutral). Always-accessible specials allow.
 */
export function canAccessLeagueTile(player: VarbitPlayer, tileX: number, tileY: number): boolean {
    const areaId = getLeagueAreaIdForTile(tileX, tileY);
    if (areaId === null) return true;
    if (LEAGUE_ALWAYS_ACCESSIBLE_AREA_IDS.has(areaId)) return true;
    return isLeagueAreaUnlocked(player, areaId);
}

export function canAccessLeagueArea(player: VarbitPlayer, regionId: number): boolean {
    const normalized = normalizeLeagueAreaId(regionId);
    if (LEAGUE_ALWAYS_ACCESSIBLE_AREA_IDS.has(normalized)) return true;
    if (!isLeagueUnlockableAreaId(normalized)) return true;
    return isLeagueAreaUnlocked(player, normalized);
}

export function getLeagueAreaName(regionId: number): string {
    const normalized = normalizeLeagueAreaId(regionId);
    return LEAGUE_AREA_ID_TO_NAME[normalized] ?? `Area ${normalized}`;
}

/**
 * Truncate a walk path so it never enters a locked league area.
 * Returns the kept prefix and whether a barrier blocked further movement.
 */
export function truncatePathAtLeagueBarrier(
    player: VarbitPlayer,
    steps: TileLike[],
    fromTileX: number,
    fromTileY: number,
): { steps: TileLike[]; blocked: boolean; blockedAreaId: number | null } {
    if (!Array.isArray(steps) || steps.length === 0) {
        return { steps: [], blocked: false, blockedAreaId: null };
    }

    const kept: TileLike[] = [];
    let prevX = fromTileX;
    let prevY = fromTileY;

    for (const step of steps) {
        const x = step.x | 0;
        const y = step.y | 0;
        if (!canAccessLeagueTile(player, x, y)) {
            const blockedAreaId = getLeagueAreaIdForTile(x, y);
            // Crossing from unlocked into locked: stop before the locked tile.
            // If somehow already standing in locked (edge case), refuse movement.
            return {
                steps: kept,
                blocked: true,
                blockedAreaId,
            };
        }
        // Also block if this step leaves an unlocked area into null that's fine;
        // only care about locked unlockable areas (handled above).
        void prevX;
        void prevY;
        kept.push({ x, y });
        prevX = x;
        prevY = y;
    }

    return { steps: kept, blocked: false, blockedAreaId: null };
}

/**
 * Clue steps list one or more league area ids (cache DB column).
 * A step is eligible when every listed unlockable area is unlocked, or when
 * the step lists no unlockable areas (global / special).
 *
 * Multi-area steps (e.g. [3,8]) require all listed unlockable areas — matching
 * "accessible within unlocked regions" for steps that span borders.
 * Single-area steps require that one area.
 */
export function isClueStepAccessibleInUnlockedAreas(
    stepAreaIds: ReadonlyArray<number>,
    unlockedAreaIds: ReadonlySet<number>,
): boolean {
    if (!stepAreaIds || stepAreaIds.length === 0) return true;

    const unlockableRequired = new Set<number>();
    for (const raw of stepAreaIds) {
        const id = normalizeLeagueAreaId(raw);
        if (LEAGUE_ALWAYS_ACCESSIBLE_AREA_IDS.has(id)) continue;
        if (!isLeagueUnlockableAreaId(id)) continue;
        unlockableRequired.add(id);
    }

    if (unlockableRequired.size === 0) return true;

    // OSRS: only receive steps accessible in unlocked regions.
    // For multi-region cryptic lists, any single unlocked match is enough
    // (player can complete the step in an unlocked listed region).
    for (const id of unlockableRequired) {
        if (unlockedAreaIds.has(id)) return true;
    }
    return false;
}

export function filterClueStepsByUnlockedAreas<T>(
    steps: ReadonlyArray<T>,
    getStepAreaIds: (step: T) => ReadonlyArray<number>,
    unlockedAreaIds: ReadonlySet<number>,
): T[] {
    return steps.filter((step) =>
        isClueStepAccessibleInUnlockedAreas(getStepAreaIds(step), unlockedAreaIds),
    );
}
