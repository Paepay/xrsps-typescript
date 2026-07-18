import fs from "fs";
import path from "path";

import { getCacheLoaderFactory } from "../../src/rs/cache/loader/CacheLoaderFactory";
import { LEAGUE_TASK_AREA_ID_TO_REGION } from "../../src/shared/leagues/leagueTaskRegion";
import { LEAGUE_TASKS } from "../../src/shared/leagues/leagueTasks.data";
import type { LeagueTaskRow } from "../../src/shared/leagues/leagueTypes";
import { buildNameLookups, parseTaskTrigger } from "../src/game/leagues/triggers/TriggerParser";
import { logger } from "../src/utils/logger";
import { initCacheEnv } from "../src/world/CacheEnv";

const DEFAULT_OUT_PATH = "league-tasks-inventory.csv";

const CATEGORY_NAMES: Record<number, string> = {
    1: "Skilling",
    2: "Combat",
    3: "Quest",
    4: "Diary",
    5: "Other",
    6: "Misc",
};

const TIER_NAMES: Record<number, string> = {
    1: "Easy",
    2: "Medium",
    3: "Hard",
    4: "Elite",
    5: "Master",
};

/** Tasks with explicit server hooks outside LeagueTaskManager. */
const MANUALLY_IMPLEMENTED_TASK_IDS = new Set([189, 190, 651, 652]);

function escapeCsvField(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function regionForRow(row: LeagueTaskRow): string {
    if (row.region) return row.region;
    return LEAGUE_TASK_AREA_ID_TO_REGION[row.area ?? 0] ?? "General";
}

function readyToUseForTask(
    row: LeagueTaskRow,
    loaders: ReturnType<typeof buildNameLookups>,
): string {
    if (MANUALLY_IMPLEMENTED_TASK_IDS.has(row.taskId)) {
        return "yes";
    }

    const trigger = parseTaskTrigger(row.name, row.description ?? "", loaders);
    if (!trigger) {
        return "no";
    }

    if (trigger.type === "npc_kill" || trigger.type === "item_equip") {
        return "yes";
    }

    if (trigger.type === "item_obtain" || trigger.type === "item_craft") {
        return "partial";
    }

    return "no";
}

function getRagingEchoesTaskIds(
    enumLoader: { load: (id: number) => { intValues?: number[] } | undefined } | undefined,
    structLoader: { load: (id: number) => { params?: Map<number, unknown> } | undefined } | undefined,
): Set<number> {
    const taskIds = new Set<number>();
    const tasksEnum = enumLoader?.load(5728);
    const taskStructIds = tasksEnum?.intValues ?? [];

    for (const structId of taskStructIds) {
        const taskStruct = structLoader?.load(structId);
        const taskId = taskStruct?.params?.get(873) as number | undefined;
        if (typeof taskId === "number" && taskId >= 0) {
            taskIds.add(taskId);
        }
    }

    return taskIds;
}

function main(): void {
    const outPath = path.resolve(process.argv[2] ?? DEFAULT_OUT_PATH);

    const cacheEnv = initCacheEnv("caches");
    const cacheFactory = getCacheLoaderFactory(cacheEnv.info, cacheEnv.cacheSystem as any);
    const enumLoader = cacheFactory.getEnumTypeLoader?.();
    const structLoader = cacheFactory.getStructTypeLoader?.();
    const loaders = buildNameLookups(
        cacheFactory.getNpcTypeLoader?.(),
        cacheFactory.getObjTypeLoader?.(),
    );

    const reTaskIds = getRagingEchoesTaskIds(enumLoader, structLoader);
    const rows = LEAGUE_TASKS.filter((row) => reTaskIds.has(row.taskId)).sort(
        (a, b) => a.taskId - b.taskId,
    );

    const lines = ["Task,Difficulty,Region,Type,Points,ready-to-use,auto-completed"];
    for (const row of rows) {
        const taskLabel = `[${row.taskId}] ${row.name}`;
        const difficulty = TIER_NAMES[row.tier] ?? String(row.tier);
        const region = regionForRow(row);
        const type = CATEGORY_NAMES[row.category ?? 0] ?? String(row.category ?? "");
        const points = String(row.points | 0);
        const readyToUse = readyToUseForTask(row, loaders);

        lines.push(
            [
                escapeCsvField(taskLabel),
                escapeCsvField(difficulty),
                escapeCsvField(region),
                escapeCsvField(type),
                points,
                readyToUse,
                "",
            ].join(","),
        );
    }

    fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
    logger.info(`[leagues] wrote ${rows.length} tasks to ${outPath}`);
}

main();
