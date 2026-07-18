import { ENUM_IDS } from "./custom/CustomContentTypes";
import { LEAGUE_TASKS } from "./leagueTasks.data";
import { LEAGUE_TASKS_USE_SNAPSHOT_ENUM } from "./leagueTasks.meta";

/** True when LEAGUE_TASKS replaces cache enum_5728 (tasks.csv snapshot import only). */
export function usesLeagueTaskListSnapshot(): boolean {
    return LEAGUE_TASKS_USE_SNAPSHOT_ENUM && LEAGUE_TASKS.length > 0;
}

/**
 * Replaces cache enum_5728 (L5 task list) with the LEAGUE_TASKS snapshot.
 * Disabled by default; cache enum + CustomLeagueRegistry prepends are used instead.
 */
export function getLeagueTasksEnumCountOverride(enumId: number): number | undefined {
    if ((enumId | 0) !== ENUM_IDS.L5_TASKS || !usesLeagueTaskListSnapshot()) return undefined;
    return LEAGUE_TASKS.length;
}

export function getLeagueTasksEnumValueOverride(enumId: number, key: number): number | undefined {
    if ((enumId | 0) !== ENUM_IDS.L5_TASKS || !usesLeagueTaskListSnapshot()) return undefined;
    if (LEAGUE_TASKS.length === 0) return undefined;
    const row = LEAGUE_TASKS[key | 0];
    if (!row || typeof row.structId !== "number") return -1;
    return row.structId | 0;
}
