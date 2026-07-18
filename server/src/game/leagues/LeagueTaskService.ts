import {
    clearLeagueTaskCompletionVarpBit,
    getLeagueTaskBitfield,
    mergeLeagueTaskCompletionVarp,
} from "../../../../src/shared/leagues/leagueTaskVarps";
import { getLeagueTaskByTaskId } from "../../../../src/shared/leagues/leagueTasks";
import { LEAGUE_TASKS } from "../../../../src/shared/leagues/leagueTasks.data";
import {
    leagueTaskMatchesRegion,
    type LeagueTaskRegion,
} from "../../../../src/shared/leagues/leagueTaskRegion";
import { VARBIT_MASTERY_POINT_UNLOCK_BASE } from "../../../../src/shared/leagues/leagueTypes";
import {
    migrateLeagueTasksCompletedFromLegacy,
    syncLeagueTaskCompletionVarpsFromSet,
    type LeagueTaskCompletionSetPlayer,
} from "./leagueTaskCompletionSet";
import { syncLeaguePackedVarps } from "./leaguePackedVarps";
import {
    VARBIT_LEAGUE_AREA_LAST_VIEWED,
    VARBIT_LEAGUE_AREA_SELECTION_0,
    VARBIT_LEAGUE_AREA_SELECTION_1,
    VARBIT_LEAGUE_AREA_SELECTION_2,
    VARBIT_LEAGUE_AREA_SELECTION_3,
    VARBIT_LEAGUE_AREA_SELECTION_4,
    VARBIT_LEAGUE_AREA_SELECTION_5,
    VARBIT_LEAGUE_MAGIC_MASTERY,
    VARBIT_LEAGUE_MASTERY_POINTS_EARNED,
    VARBIT_LEAGUE_MASTERY_POINTS_TO_SPEND,
    VARBIT_LEAGUE_MELEE_MASTERY,
    VARBIT_LEAGUE_RANGED_MASTERY,
    VARBIT_LEAGUE_RELIC_1,
    VARBIT_LEAGUE_RELIC_2,
    VARBIT_LEAGUE_RELIC_3,
    VARBIT_LEAGUE_RELIC_4,
    VARBIT_LEAGUE_RELIC_5,
    VARBIT_LEAGUE_RELIC_6,
    VARBIT_LEAGUE_RELIC_7,
    VARBIT_LEAGUE_RELIC_8,
    VARBIT_LEAGUE_TOTAL_TASKS_COMPLETED,
    VARP_LEAGUE_5_POINTS,
    VARP_LEAGUE_GENERAL_TASKS_4,
    VARP_LEAGUE_GENERAL_TASKS_4_COUNT_MASK,
    VARP_LEAGUE_POINTS_CLAIMED,
    VARP_LEAGUE_POINTS_COMPLETED,
    VARP_LEAGUE_POINTS_CURRENCY,
    VARP_LEAGUE_TRAILBLAZER_POINTS,
    VARP_LEAGUE_TRAILBLAZER_RELOADED_POINTS,
    VARP_LEAGUE_TWISTED_POINTS,
} from "../../../../src/shared/vars";
import { EquipmentSlot } from "../../../../src/rs/config/player/Equipment";

const OBSIDIAN_CAPE_ITEM_ID = 6568;
const OBSIDIAN_HELMET_ITEM_ID = 21298;
const OBSIDIAN_PLATEBODY_ITEM_ID = 21301;
const OBSIDIAN_PLATELEGS_ITEM_ID = 21304;

/** OSRS parity: Misthalin is always the starting unlocked region (region id 1). */
const LEAGUE_STARTING_AREA_REGION_ID = 1;

const LEAGUE_RELIC_SELECTION_VARBITS = [
    VARBIT_LEAGUE_RELIC_1,
    VARBIT_LEAGUE_RELIC_2,
    VARBIT_LEAGUE_RELIC_3,
    VARBIT_LEAGUE_RELIC_4,
    VARBIT_LEAGUE_RELIC_5,
    VARBIT_LEAGUE_RELIC_6,
    VARBIT_LEAGUE_RELIC_7,
    VARBIT_LEAGUE_RELIC_8,
] as const;

const LEAGUE_AREA_SELECTION_VARBITS = [
    VARBIT_LEAGUE_AREA_SELECTION_0,
    VARBIT_LEAGUE_AREA_SELECTION_1,
    VARBIT_LEAGUE_AREA_SELECTION_2,
    VARBIT_LEAGUE_AREA_SELECTION_3,
    VARBIT_LEAGUE_AREA_SELECTION_4,
    VARBIT_LEAGUE_AREA_SELECTION_5,
] as const;

const LEAGUE_COMBAT_MASTERY_PROGRESS_VARBITS = [
    VARBIT_LEAGUE_MELEE_MASTERY,
    VARBIT_LEAGUE_RANGED_MASTERY,
    VARBIT_LEAGUE_MAGIC_MASTERY,
] as const;

const LEAGUE_COMBAT_MASTERY_POINT_VARBITS = [
    VARBIT_LEAGUE_MASTERY_POINTS_TO_SPEND,
    VARBIT_LEAGUE_MASTERY_POINTS_EARNED,
] as const;

const LEAGUE_POINT_VARPS = [
    VARP_LEAGUE_POINTS_CLAIMED,
    VARP_LEAGUE_POINTS_COMPLETED,
    VARP_LEAGUE_POINTS_CURRENCY,
    VARP_LEAGUE_TWISTED_POINTS,
    VARP_LEAGUE_TRAILBLAZER_POINTS,
    VARP_LEAGUE_TRAILBLAZER_RELOADED_POINTS,
    VARP_LEAGUE_5_POINTS,
] as const;

const MASTERY_POINT_UNLOCK_COUNT = 10;

export type LeagueTaskNotification = {
    kind: "league_task";
    title: string;
    message: string;
    durationMs: number;
};

export type LeagueTaskAwardResult = {
    changed: boolean;
    varpUpdates: Array<{ id: number; value: number }>;
    varbitUpdates: Array<{ id: number; value: number }>;
    notification?: LeagueTaskNotification;
};

export type LeagueTaskBulkAwardResult = LeagueTaskAwardResult & {
    region: LeagueTaskRegion;
    completedCount: number;
    alreadyCompleteCount: number;
    pointsAwarded: number;
    totalInRegion: number;
};

function dedupeVarUpdates(
    updates: Array<{ id: number; value: number }>,
): Array<{ id: number; value: number }> {
    const byId = new Map<number, number>();
    for (const update of updates) {
        byId.set(update.id | 0, update.value | 0);
    }
    return [...byId.entries()].map(([id, value]) => ({ id, value }));
}

export type LeagueTaskPlayer = {
    getVarpValue: (id: number) => number;
    setVarpValue: (id: number, value: number) => void;
    getVarbitValue: (id: number) => number;
    setVarbitValue: (id: number, value: number) => void;
    getLeagueTaskProgress: (taskId: number) => number;
    setLeagueTaskProgress: (taskId: number, value: number) => void;
    clearLeagueTaskProgress: (taskId: number) => void;
    clearAllLeagueTaskProgress?: () => void;
    hasLeagueTaskCompleted?: (taskId: number) => boolean;
    addLeagueTaskCompleted?: (taskId: number) => void;
    getLeagueTasksCompletedCount?: () => number;
    getLeagueTasksCompletedIds?: () => readonly number[];
    setLeagueTasksCompleted?: (taskIds: readonly number[]) => void;
    syncLeagueTaskCompletionVarpsFromSet?: () => Array<{ id: number; value: number }>;
    /** Ephemeral UI selection state from leagueWidgets (cleared on full reset). */
    __leagueRelicPendingSelection?: unknown;
    __leagueMasteryPendingSelection?: unknown;
};

function setTrackedVarbit(
    player: LeagueTaskPlayer,
    varbitId: number,
    value: number,
    varbitUpdates: Array<{ id: number; value: number }>,
): void {
    const next = value | 0;
    if ((player.getVarbitValue(varbitId) | 0) === next) return;
    player.setVarbitValue(varbitId, next);
    varbitUpdates.push({ id: varbitId, value: next });
}

function setTrackedVarp(
    player: LeagueTaskPlayer,
    varpId: number,
    value: number,
    varpUpdates: Array<{ id: number; value: number }>,
): void {
    const next = value | 0;
    if ((player.getVarpValue(varpId) | 0) === next) return;
    player.setVarpValue(varpId, next);
    varpUpdates.push({ id: varpId, value: next });
}

function asCompletionSetPlayer(player: LeagueTaskPlayer): LeagueTaskCompletionSetPlayer | null {
    if (
        typeof player.hasLeagueTaskCompleted !== "function" ||
        typeof player.setLeagueTasksCompleted !== "function" ||
        typeof player.getLeagueTasksCompletedIds !== "function"
    ) {
        return null;
    }
    return player as LeagueTaskCompletionSetPlayer;
}

function countCompletedTasksForPlayer(player: LeagueTaskPlayer): number {
    if (typeof player.getLeagueTasksCompletedCount === "function") {
        return player.getLeagueTasksCompletedCount();
    }
    let count = 0;
    for (const row of LEAGUE_TASKS) {
        if (LeagueTaskService.isTaskComplete(player, row.taskId)) {
            count++;
        }
    }
    return count;
}

export type LeagueTaskEquipCheckPlayer = LeagueTaskPlayer & {
    appearance?: { equip?: number[] };
};

function packTotalTasksIntoGeneralTasks4Varp(prevVarpValue: number, totalTasks: number): number {
    return (
        (prevVarpValue & ~VARP_LEAGUE_GENERAL_TASKS_4_COUNT_MASK) |
        (totalTasks & VARP_LEAGUE_GENERAL_TASKS_4_COUNT_MASK)
    );
}

function getEquippedItemId(player: LeagueTaskEquipCheckPlayer, slot: EquipmentSlot): number {
    const equip = player.appearance?.equip;
    if (!Array.isArray(equip) || slot < 0 || slot >= equip.length) {
        return -1;
    }
    return equip[slot] | 0;
}

function playerHasObsidianCapeEquipped(player: LeagueTaskEquipCheckPlayer): boolean {
    return getEquippedItemId(player, EquipmentSlot.CAPE) === OBSIDIAN_CAPE_ITEM_ID;
}

function playerHasFullObsidianArmourEquipped(player: LeagueTaskEquipCheckPlayer): boolean {
    return (
        getEquippedItemId(player, EquipmentSlot.HEAD) === OBSIDIAN_HELMET_ITEM_ID &&
        getEquippedItemId(player, EquipmentSlot.BODY) === OBSIDIAN_PLATEBODY_ITEM_ID &&
        getEquippedItemId(player, EquipmentSlot.LEGS) === OBSIDIAN_PLATELEGS_ITEM_ID
    );
}

export class LeagueTaskService {
    static migrateCompletedTasksFromLegacy(player: LeagueTaskPlayer): void {
        const setPlayer = asCompletionSetPlayer(player);
        if (!setPlayer) {
            return;
        }
        migrateLeagueTasksCompletedFromLegacy(setPlayer);
        syncLeagueTaskCompletionVarpsFromSet(setPlayer);
    }

    static isTaskComplete(player: LeagueTaskPlayer, taskId: number): boolean {
        if (typeof player.hasLeagueTaskCompleted === "function") {
            return player.hasLeagueTaskCompleted(taskId);
        }
        const { varpId, mask } = getLeagueTaskBitfield(taskId);
        if (varpId < 0 || mask === 0) {
            return false;
        }
        return (player.getVarpValue(varpId) & mask) !== 0;
    }

    static countCompletedTasks(player: LeagueTaskPlayer): number {
        return countCompletedTasksForPlayer(player);
    }

    static clearTaskCompletion(
        player: LeagueTaskPlayer,
        taskId: number,
    ): { changed: boolean; varpUpdates: Array<{ id: number; value: number }> } {
        const { varpId, mask } = getLeagueTaskBitfield(taskId);
        if (varpId < 0 || mask === 0) {
            return { changed: false, varpUpdates: [] };
        }
        const prev = player.getVarpValue(varpId);
        const next = clearLeagueTaskCompletionVarpBit(prev, mask);
        if (next === ((prev | 0) >>> 0)) {
            return { changed: false, varpUpdates: [] };
        }
        if (typeof player.setLeagueTasksCompleted === "function") {
            const remaining = player
                .getLeagueTasksCompletedIds?.()
                .filter((id) => (id | 0) !== (taskId | 0)) ?? [];
            player.setLeagueTasksCompleted(remaining);
            const updates =
                player.syncLeagueTaskCompletionVarpsFromSet?.() ?? [{ id: varpId, value: next | 0 }];
            return { changed: true, varpUpdates: updates };
        }
        player.setVarpValue(varpId, next | 0);
        return { changed: true, varpUpdates: [{ id: varpId, value: next | 0 }] };
    }

    /**
     * Dev/admin: clear all league task completions, points, and unlocks funded by those points
     * (relics, regions, combat mastery). Skill-threshold tasks re-award on the next XP gain.
     */
    static resetAllTasks(player: LeagueTaskPlayer): LeagueTaskAwardResult {
        const varpUpdates: Array<{ id: number; value: number }> = [];
        const varbitUpdates: Array<{ id: number; value: number }> = [];

        player.clearAllLeagueTaskProgress?.();
        if (typeof player.setLeagueTasksCompleted === "function") {
            player.setLeagueTasksCompleted([]);
            const synced = player.syncLeagueTaskCompletionVarpsFromSet?.() ?? [];
            varpUpdates.push(...synced);
        } else {
            for (const row of LEAGUE_TASKS) {
                const cleared = LeagueTaskService.clearTaskCompletion(player, row.taskId);
                if (cleared.changed) {
                    varpUpdates.push(...cleared.varpUpdates);
                }
            }
        }

        for (const varpId of LEAGUE_POINT_VARPS) {
            setTrackedVarp(player, varpId, 0, varpUpdates);
        }

        const prevTasks4Varp = player.getVarpValue(VARP_LEAGUE_GENERAL_TASKS_4);
        const nextTasks4Varp = packTotalTasksIntoGeneralTasks4Varp(prevTasks4Varp, 0);
        if (nextTasks4Varp !== prevTasks4Varp) {
            player.setVarpValue(VARP_LEAGUE_GENERAL_TASKS_4, nextTasks4Varp);
            varpUpdates.push({ id: VARP_LEAGUE_GENERAL_TASKS_4, value: nextTasks4Varp });
        }
        varbitUpdates.push({
            id: VARBIT_LEAGUE_TOTAL_TASKS_COMPLETED,
            value: 0,
        });

        // Relic selections unlocked via claimed points.
        for (const varbitId of LEAGUE_RELIC_SELECTION_VARBITS) {
            setTrackedVarbit(player, varbitId, 0, varbitUpdates);
        }

        // Regions: Misthalin only (new-account default). Extra areas unlock via task counts.
        setTrackedVarbit(
            player,
            VARBIT_LEAGUE_AREA_SELECTION_0,
            LEAGUE_STARTING_AREA_REGION_ID,
            varbitUpdates,
        );
        for (let i = 1; i < LEAGUE_AREA_SELECTION_VARBITS.length; i++) {
            setTrackedVarbit(player, LEAGUE_AREA_SELECTION_VARBITS[i], 0, varbitUpdates);
        }
        setTrackedVarbit(
            player,
            VARBIT_LEAGUE_AREA_LAST_VIEWED,
            LEAGUE_STARTING_AREA_REGION_ID,
            varbitUpdates,
        );

        // Combat mastery progress / spendable points / challenge unlocks.
        for (const varbitId of LEAGUE_COMBAT_MASTERY_PROGRESS_VARBITS) {
            setTrackedVarbit(player, varbitId, 0, varbitUpdates);
        }
        for (const varbitId of LEAGUE_COMBAT_MASTERY_POINT_VARBITS) {
            setTrackedVarbit(player, varbitId, 0, varbitUpdates);
        }
        for (let i = 0; i < MASTERY_POINT_UNLOCK_COUNT; i++) {
            setTrackedVarbit(player, VARBIT_MASTERY_POINT_UNLOCK_BASE + i, 0, varbitUpdates);
        }

        varpUpdates.push(...syncLeaguePackedVarps(player));

        try {
            delete player.__leagueRelicPendingSelection;
        } catch {}
        try {
            delete player.__leagueMasteryPendingSelection;
        } catch {}

        return { changed: true, varpUpdates, varbitUpdates };
    }

    /**
     * OSRS parity: repair stale completion bits and sync varbit 10046 / varp 2610.
     * Clears equip-task bits when the required gear is not worn (fixes polluted saves).
     */
    static reconcileLeagueTaskState(player: LeagueTaskEquipCheckPlayer): LeagueTaskAwardResult {
        const varpUpdates: Array<{ id: number; value: number }> = [];
        const varbitUpdates: Array<{ id: number; value: number }> = [];
        let changed = false;

        const equipChecks: Array<{ taskId: number; satisfied: () => boolean }> = [
            { taskId: 651, satisfied: () => playerHasObsidianCapeEquipped(player) },
            { taskId: 652, satisfied: () => playerHasFullObsidianArmourEquipped(player) },
        ];
        for (const { taskId, satisfied } of equipChecks) {
            if (LeagueTaskService.isTaskComplete(player, taskId) && !satisfied()) {
                const cleared = LeagueTaskService.clearTaskCompletion(player, taskId);
                if (cleared.changed) {
                    changed = true;
                    varpUpdates.push(...cleared.varpUpdates);
                }
            }
        }

        const setPlayer = asCompletionSetPlayer(player);
        if (setPlayer) {
            const synced = syncLeagueTaskCompletionVarpsFromSet(setPlayer);
            if (synced.length > 0) {
                changed = true;
                varpUpdates.push(...synced);
            }
        }

        const totalCompleted = countCompletedTasksForPlayer(player);
        const prevTasks4Varp = player.getVarpValue(VARP_LEAGUE_GENERAL_TASKS_4);
        const prevTotalCount = prevTasks4Varp & VARP_LEAGUE_GENERAL_TASKS_4_COUNT_MASK;
        const nextTasks4Varp = packTotalTasksIntoGeneralTasks4Varp(prevTasks4Varp, totalCompleted);
        if (nextTasks4Varp !== prevTasks4Varp) {
            player.setVarpValue(VARP_LEAGUE_GENERAL_TASKS_4, nextTasks4Varp);
            varpUpdates.push({ id: VARP_LEAGUE_GENERAL_TASKS_4, value: nextTasks4Varp });
            changed = true;
        }
        if (prevTotalCount !== totalCompleted) {
            varbitUpdates.push({
                id: VARBIT_LEAGUE_TOTAL_TASKS_COMPLETED,
                value: totalCompleted,
            });
            changed = true;
        }

        return { changed, varpUpdates, varbitUpdates };
    }

    /**
     * OSRS parity: League task completion is driven by the server.
     * This applies completion bitfields + point varps and emits a toast notification once.
     */
    static completeTask(
        player: LeagueTaskPlayer,
        taskId: number,
        taskOverride?: { name: string; points: number },
    ): LeagueTaskAwardResult {
        const tid = taskId;
        const { varpId, mask } = getLeagueTaskBitfield(tid);
        if (varpId < 0 || mask === 0) {
            return { changed: false, varpUpdates: [], varbitUpdates: [] };
        }

        if (typeof player.hasLeagueTaskCompleted === "function" && player.hasLeagueTaskCompleted(tid)) {
            return { changed: false, varpUpdates: [], varbitUpdates: [] };
        }

        const prevMask = player.getVarpValue(varpId);
        const nextMask = mergeLeagueTaskCompletionVarp(prevMask, mask);
        if (
            typeof player.hasLeagueTaskCompleted !== "function" &&
            nextMask === ((prevMask | 0) >>> 0)
        ) {
            return { changed: false, varpUpdates: [], varbitUpdates: [] };
        }

        const def = taskOverride ?? getLeagueTaskByTaskId(tid);
        const points = def?.points ?? 0;
        const name = def?.name ?? `Task ${tid}`;

        const varpUpdates: Array<{ id: number; value: number }> = [];
        const varbitUpdates: Array<{ id: number; value: number }> = [];

        player.addLeagueTaskCompleted?.(tid);
        if (typeof player.syncLeagueTaskCompletionVarpsFromSet === "function") {
            varpUpdates.push(...player.syncLeagueTaskCompletionVarpsFromSet());
        } else {
            player.setVarpValue(varpId, nextMask | 0);
            varpUpdates.push({ id: varpId, value: nextMask | 0 });
        }

        const totalCompleted = countCompletedTasksForPlayer(player);
        const prevTasks4Varp = player.getVarpValue(VARP_LEAGUE_GENERAL_TASKS_4);
        const prevTotalCount = prevTasks4Varp & VARP_LEAGUE_GENERAL_TASKS_4_COUNT_MASK;
        const nextTasks4Varp = packTotalTasksIntoGeneralTasks4Varp(prevTasks4Varp, totalCompleted);
        player.setVarpValue(VARP_LEAGUE_GENERAL_TASKS_4, nextTasks4Varp);
        varpUpdates.push({ id: VARP_LEAGUE_GENERAL_TASKS_4, value: nextTasks4Varp });
        if (prevTotalCount !== totalCompleted) {
            varbitUpdates.push({
                id: VARBIT_LEAGUE_TOTAL_TASKS_COMPLETED,
                value: totalCompleted,
            });
        }

        if (points > 0) {
            const prevClaimed = player.getVarpValue(VARP_LEAGUE_POINTS_CLAIMED);
            const prevCompleted = player.getVarpValue(VARP_LEAGUE_POINTS_COMPLETED);
            const prevCurrency = player.getVarpValue(VARP_LEAGUE_POINTS_CURRENCY);

            const nextClaimed = prevClaimed + points;
            const nextCompleted = prevCompleted + points;
            const nextCurrency = prevCurrency + points;

            player.setVarpValue(VARP_LEAGUE_POINTS_CLAIMED, nextClaimed);
            player.setVarpValue(VARP_LEAGUE_POINTS_COMPLETED, nextCompleted);
            player.setVarpValue(VARP_LEAGUE_POINTS_CURRENCY, nextCurrency);
            varpUpdates.push({ id: VARP_LEAGUE_POINTS_CLAIMED, value: nextClaimed });
            varpUpdates.push({ id: VARP_LEAGUE_POINTS_COMPLETED, value: nextCompleted });
            varpUpdates.push({ id: VARP_LEAGUE_POINTS_CURRENCY, value: nextCurrency });
        }

        const notification: LeagueTaskNotification = {
            kind: "league_task",
            title: "League Task Completed",
            message: `${name}<br><br><col=ffffff>+${points} League Points</col>`,
            durationMs: 3000,
        };

        return { changed: true, varpUpdates, varbitUpdates, notification };
    }

    /**
     * Dev/admin: complete every incomplete league task for a task-list region in one pass.
     * Awards points once and emits a single summary toast (not one per task).
     */
    static completeTasksForRegion(
        player: LeagueTaskPlayer,
        region: LeagueTaskRegion,
    ): LeagueTaskBulkAwardResult {
        const inRegion = LEAGUE_TASKS.filter((row) => leagueTaskMatchesRegion(row, region));
        const toComplete: typeof LEAGUE_TASKS = [];
        let alreadyCompleteCount = 0;
        for (const row of inRegion) {
            const { varpId, mask } = getLeagueTaskBitfield(row.taskId);
            if (varpId < 0 || mask === 0) {
                continue;
            }
            if (LeagueTaskService.isTaskComplete(player, row.taskId)) {
                alreadyCompleteCount++;
            } else {
                toComplete.push(row);
            }
        }

        if (toComplete.length === 0) {
            return {
                changed: false,
                varpUpdates: [],
                varbitUpdates: [],
                region,
                completedCount: 0,
                alreadyCompleteCount,
                pointsAwarded: 0,
                totalInRegion: inRegion.length,
            };
        }

        let pointsAwarded = 0;
        const varpUpdates: Array<{ id: number; value: number }> = [];
        const varbitUpdates: Array<{ id: number; value: number }> = [];
        const useCompletionSet = typeof player.addLeagueTaskCompleted === "function";

        for (const row of toComplete) {
            pointsAwarded += row.points ?? 0;
            if (useCompletionSet) {
                player.addLeagueTaskCompleted!(row.taskId);
            } else {
                const { varpId, mask } = getLeagueTaskBitfield(row.taskId);
                const prevMask = player.getVarpValue(varpId);
                const nextMask = mergeLeagueTaskCompletionVarp(prevMask, mask);
                if (nextMask !== ((prevMask | 0) >>> 0)) {
                    player.setVarpValue(varpId, nextMask | 0);
                    varpUpdates.push({ id: varpId, value: nextMask | 0 });
                }
            }
        }

        if (useCompletionSet && typeof player.syncLeagueTaskCompletionVarpsFromSet === "function") {
            varpUpdates.push(...player.syncLeagueTaskCompletionVarpsFromSet());
        }

        const totalCompleted = countCompletedTasksForPlayer(player);
        const prevTasks4Varp = player.getVarpValue(VARP_LEAGUE_GENERAL_TASKS_4);
        const prevTotalCount = prevTasks4Varp & VARP_LEAGUE_GENERAL_TASKS_4_COUNT_MASK;
        const nextTasks4Varp = packTotalTasksIntoGeneralTasks4Varp(prevTasks4Varp, totalCompleted);
        player.setVarpValue(VARP_LEAGUE_GENERAL_TASKS_4, nextTasks4Varp);
        varpUpdates.push({ id: VARP_LEAGUE_GENERAL_TASKS_4, value: nextTasks4Varp });
        if (prevTotalCount !== totalCompleted) {
            varbitUpdates.push({
                id: VARBIT_LEAGUE_TOTAL_TASKS_COMPLETED,
                value: totalCompleted,
            });
        }

        if (pointsAwarded > 0) {
            const nextClaimed = player.getVarpValue(VARP_LEAGUE_POINTS_CLAIMED) + pointsAwarded;
            const nextCompleted = player.getVarpValue(VARP_LEAGUE_POINTS_COMPLETED) + pointsAwarded;
            const nextCurrency = player.getVarpValue(VARP_LEAGUE_POINTS_CURRENCY) + pointsAwarded;
            player.setVarpValue(VARP_LEAGUE_POINTS_CLAIMED, nextClaimed);
            player.setVarpValue(VARP_LEAGUE_POINTS_COMPLETED, nextCompleted);
            player.setVarpValue(VARP_LEAGUE_POINTS_CURRENCY, nextCurrency);
            varpUpdates.push({ id: VARP_LEAGUE_POINTS_CLAIMED, value: nextClaimed });
            varpUpdates.push({ id: VARP_LEAGUE_POINTS_COMPLETED, value: nextCompleted });
            varpUpdates.push({ id: VARP_LEAGUE_POINTS_CURRENCY, value: nextCurrency });
        }

        const notification: LeagueTaskNotification = {
            kind: "league_task",
            title: "League Tasks Completed",
            message:
                `${region}: ${toComplete.length} task${toComplete.length === 1 ? "" : "s"}` +
                `<br><br><col=ffffff>+${pointsAwarded} League Points</col>`,
            durationMs: 4000,
        };

        return {
            changed: true,
            varpUpdates: dedupeVarUpdates(varpUpdates),
            varbitUpdates: dedupeVarUpdates(varbitUpdates),
            notification,
            region,
            completedCount: toComplete.length,
            alreadyCompleteCount,
            pointsAwarded,
            totalInRegion: inRegion.length,
        };
    }
}
