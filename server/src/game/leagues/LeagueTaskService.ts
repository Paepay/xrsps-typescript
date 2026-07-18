import {
    clearLeagueTaskCompletionVarpBit,
    getLeagueTaskBitfield,
    mergeLeagueTaskCompletionVarp,
} from "../../../../src/shared/leagues/leagueTaskVarps";
import { getLeagueTaskByTaskId } from "../../../../src/shared/leagues/leagueTasks";
import { LEAGUE_TASKS } from "../../../../src/shared/leagues/leagueTasks.data";
import {
    migrateLeagueTasksCompletedFromLegacy,
    syncLeagueTaskCompletionVarpsFromSet,
    type LeagueTaskCompletionSetPlayer,
} from "./leagueTaskCompletionSet";
import {
    VARBIT_LEAGUE_TOTAL_TASKS_COMPLETED,
    VARP_LEAGUE_GENERAL_TASKS_4,
    VARP_LEAGUE_GENERAL_TASKS_4_COUNT_MASK,
    VARP_LEAGUE_POINTS_CLAIMED,
    VARP_LEAGUE_POINTS_COMPLETED,
    VARP_LEAGUE_POINTS_CURRENCY,
} from "../../../../src/shared/vars";
import { EquipmentSlot } from "../../../../src/rs/config/player/Equipment";

const OBSIDIAN_CAPE_ITEM_ID = 6568;
const OBSIDIAN_HELMET_ITEM_ID = 21298;
const OBSIDIAN_PLATEBODY_ITEM_ID = 21301;
const OBSIDIAN_PLATELEGS_ITEM_ID = 21304;

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

export type LeagueTaskPlayer = {
    getVarpValue: (id: number) => number;
    setVarpValue: (id: number, value: number) => void;
    getVarbitValue: (id: number) => number;
    setVarbitValue: (id: number, value: number) => void;
    getLeagueTaskProgress: (taskId: number) => number;
    setLeagueTaskProgress: (taskId: number, value: number) => void;
    clearLeagueTaskProgress: (taskId: number) => void;
    hasLeagueTaskCompleted?: (taskId: number) => boolean;
    addLeagueTaskCompleted?: (taskId: number) => void;
    getLeagueTasksCompletedCount?: () => number;
    getLeagueTasksCompletedIds?: () => readonly number[];
    setLeagueTasksCompleted?: (taskIds: readonly number[]) => void;
    syncLeagueTaskCompletionVarpsFromSet?: () => Array<{ id: number; value: number }>;
};

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
}
