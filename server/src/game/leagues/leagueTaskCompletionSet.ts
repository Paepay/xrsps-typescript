import {
    buildLeagueTaskCompletionVarpsFromCompletedIds,
    getLeagueTaskBitfield,
    isLeagueTaskBitSetInVarp,
    LEAGUE_TASK_COMPLETION_VARPS,
} from "../../../../src/shared/leagues/leagueTaskVarps";
import { LEAGUE_TASKS } from "../../../../src/shared/leagues/leagueTasks.data";
import { VARP_LEAGUE_POINTS_COMPLETED } from "../../../../src/shared/vars";

export type LeagueTaskCompletionSetPlayer = {
    getVarpValue: (id: number) => number;
    setVarpValue: (id: number, value: number) => void;
    hasLeagueTaskCompleted: (taskId: number) => boolean;
    setLeagueTasksCompleted: (taskIds: readonly number[]) => void;
    getLeagueTasksCompletedIds: () => readonly number[];
};

function sumTaskPoints(taskIds: readonly number[]): number {
    let total = 0;
    for (const taskId of taskIds) {
        const row = LEAGUE_TASKS.find((entry) => entry.taskId === (taskId | 0));
        if (row) {
            total += row.points;
        }
    }
    return total;
}

/** Prefer lower task ids when multiple subsets match (tutorial tasks 189/190 before 191). */
function findTaskIdsForExactPoints(
    candidates: ReadonlyArray<{ taskId: number; points: number }>,
    targetPoints: number,
): number[] | null {
    if (targetPoints <= 0) {
        return [];
    }
    const sorted = [...candidates].sort((a, b) => a.taskId - b.taskId);
    const reachable = new Map<number, number[]>();
    reachable.set(0, []);
    for (const { taskId, points } of sorted) {
        if (points <= 0) {
            continue;
        }
        for (const [sum, ids] of [...reachable.entries()].sort((a, b) => a[0] - b[0])) {
            const next = sum + points;
            if (next > targetPoints || reachable.has(next)) {
                continue;
            }
            reachable.set(next, [...ids, taskId]);
        }
    }
    return reachable.get(targetPoints) ?? null;
}

export function syncLeagueTaskCompletionVarpsFromSet(
    player: LeagueTaskCompletionSetPlayer,
): Array<{ id: number; value: number }> {
    const built = buildLeagueTaskCompletionVarpsFromCompletedIds(player.getLeagueTasksCompletedIds());
    const updates: Array<{ id: number; value: number }> = [];
    for (const varpId of LEAGUE_TASK_COMPLETION_VARPS) {
        const value = (built[varpId] ?? 0) | 0;
        const prev = player.getVarpValue(varpId) | 0;
        if (prev !== value) {
            player.setVarpValue(varpId, value);
            updates.push({ id: varpId, value });
        }
    }
    return updates;
}

/**
 * One-time migration for saves that only have polluted completion varps.
 * Rebuilds the authoritative completed-task set from varp bits, then repairs
 * against %league_points_completed when totals disagree.
 */
export function migrateLeagueTasksCompletedFromLegacy(player: LeagueTaskCompletionSetPlayer): void {
    const candidates: Array<{ taskId: number; points: number }> = [];
    for (const row of LEAGUE_TASKS) {
        const { varpId } = getLeagueTaskBitfield(row.taskId);
        if (varpId < 0) {
            continue;
        }
        if (isLeagueTaskBitSetInVarp(player.getVarpValue(varpId), row.taskId)) {
            candidates.push({ taskId: row.taskId, points: row.points });
        }
    }

    const targetPoints = player.getVarpValue(VARP_LEAGUE_POINTS_COMPLETED) | 0;
    const candidateIds = candidates.map((entry) => entry.taskId);
    const candidatePoints = sumTaskPoints(candidateIds);

    if (candidatePoints === targetPoints) {
        player.setLeagueTasksCompleted(candidateIds);
        return;
    }

    const matched = findTaskIdsForExactPoints(candidates, targetPoints);
    if (matched) {
        player.setLeagueTasksCompleted(matched);
        return;
    }

    // Best-effort fallback: keep lowest task ids that fit within the points budget.
    const sorted = [...candidates].sort((a, b) => a.taskId - b.taskId);
    const used: number[] = [];
    let sum = 0;
    for (const { taskId, points } of sorted) {
        if (points <= 0 || sum + points > targetPoints) {
            continue;
        }
        used.push(taskId);
        sum += points;
    }
    player.setLeagueTasksCompleted(used);
}
