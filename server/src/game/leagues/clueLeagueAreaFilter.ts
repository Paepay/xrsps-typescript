/**
 * Clue-step league region filtering.
 *
 * Cache treasure-trail DB rows expose league area id lists (e.g. cryptic table 11 col 5).
 * Use these helpers when generating / rolling clue steps so locked regions are excluded.
 */
import {
    filterClueStepsByUnlockedAreas,
    getUnlockedLeagueAreaIds,
    isClueStepAccessibleInUnlockedAreas,
} from "./LeagueAreaAccess";

export {
    filterClueStepsByUnlockedAreas,
    getUnlockedLeagueAreaIds,
    isClueStepAccessibleInUnlockedAreas,
};

/**
 * Typical cache column holding league area id(s) on clue step rows.
 * Verified against cryptic clues (table 11): multi-area arrays like [3,8].
 */
export const CLUE_STEP_LEAGUE_AREA_COLUMN = 5;

type VarbitPlayer = {
    getVarbitValue?: (id: number) => number;
};

/**
 * Filter a clue step pool to steps the player can access with current unlocks.
 */
export function filterClueStepPoolForPlayer<T>(
    player: VarbitPlayer,
    steps: ReadonlyArray<T>,
    getStepAreaIds: (step: T) => ReadonlyArray<number>,
): T[] {
    return filterClueStepsByUnlockedAreas(steps, getStepAreaIds, getUnlockedLeagueAreaIds(player));
}

/**
 * Read league area ids from a cache DB row column (default col 5).
 */
export function readClueStepAreaIdsFromDbRow(
    row: { getColumn?: (columnId: number) => { values?: unknown[] } | undefined },
    columnId: number = CLUE_STEP_LEAGUE_AREA_COLUMN,
): number[] {
    const col = row.getColumn?.(columnId);
    const values = col?.values;
    if (!Array.isArray(values)) return [];
    const out: number[] = [];
    for (const v of values) {
        if (typeof v === "number" && Number.isFinite(v)) out.push(v | 0);
    }
    return out;
}

export function canPlayerAccessClueStepAreas(
    player: VarbitPlayer,
    stepAreaIds: ReadonlyArray<number>,
): boolean {
    return isClueStepAccessibleInUnlockedAreas(stepAreaIds, getUnlockedLeagueAreaIds(player));
}
