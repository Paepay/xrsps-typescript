import fs from "fs";
import path from "path";

import {
    DEFAULT_LEAGUE_TASKS_CSV_PATH,
    loadLeagueTaskRowsFromCsv,
} from "../../src/shared/leagues/leagueTaskCsv";
import type { LeagueTaskRow } from "../../src/shared/leagues/leagueTypes";
import type { LeagueTaskRegion } from "../../src/shared/leagues/leagueTaskRegion";
import { logger } from "../src/utils/logger";

function formatLeagueTasksTs(rows: LeagueTaskRow[]): string {
    const lines = rows.map((row) => `  ${JSON.stringify(row)}`);
    return (
        `import type { LeagueTaskRow } from "./leagueTypes";\n\n` +
        `// Source of truth: tasks.csv (all task data imported from CSV only).\n` +
        `// Regenerate: npx tsx server/scripts/import-league-tasks-from-csv.ts\n` +
        `export const LEAGUE_TASKS: LeagueTaskRow[] = [\n${lines.join(",\n")}\n];\n`
    );
}

export function main(): void {
    const csvPath = path.resolve(process.argv[2] ?? DEFAULT_LEAGUE_TASKS_CSV_PATH);
    const { rows, warnings } = loadLeagueTaskRowsFromCsv(csvPath);

    const counts = new Map<LeagueTaskRegion, number>();
    for (const row of rows) {
        counts.set(row.region ?? "General", (counts.get(row.region ?? "General") ?? 0) + 1);
    }

    const outPath = path.resolve("src/shared/leagues/leagueTasks.data.ts");
    const metaPath = path.resolve("src/shared/leagues/leagueTasks.meta.ts");
    fs.writeFileSync(outPath, formatLeagueTasksTs(rows), "utf8");
    fs.writeFileSync(
        metaPath,
        `/** When true, LEAGUE_TASKS replaces cache enum_5728 and struct params (tasks.csv import). */\nexport const LEAGUE_TASKS_USE_SNAPSHOT_ENUM = true;\n`,
        "utf8",
    );

    logger.info(`[leagues] imported ${rows.length} tasks from ${csvPath} -> ${outPath}`);
    logger.info("[leagues] region counts:");
    for (const region of [
        "General",
        "Misthalin",
        "Karamja",
        "Asgarnia",
        "Fremennik",
        "Kandarin",
        "Desert",
        "Morytania",
        "Tirannwn",
        "Wilderness",
        "Kourend",
        "Varlamore",
    ] as LeagueTaskRegion[]) {
        logger.info(`  ${region}: ${counts.get(region) ?? 0}`);
    }

    if (warnings.length > 0) {
        logger.info(`[leagues] import warnings (${warnings.length}):`);
        for (const w of warnings.slice(0, 20)) {
            logger.info(`  #${w.taskId} ${w.kind}: ${w.value}`);
        }
    }
}

main();
