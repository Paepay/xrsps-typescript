import fs from "fs";
import path from "path";

import { getLeagueTaskBitfield, isLeagueTaskBitSetInVarp } from "../../src/shared/leagues/leagueTaskVarps";
import { LEAGUE_TASK_COMPLETION_VARPS } from "../../src/shared/leagues/leagueTaskVarps";
import { getLeagueTaskByTaskId } from "../../src/shared/leagues/leagueTasks";
import { LEAGUE_TASKS } from "../../src/shared/leagues/leagueTasks.data";
import {
    VARBIT_LEAGUE_TOTAL_TASKS_COMPLETED,
    VARP_LEAGUE_GENERAL_TASKS_4,
    VARP_LEAGUE_POINTS_COMPLETED,
} from "../../src/shared/vars";

const playerName = (process.argv[2] ?? "paepay5").trim().toLowerCase();
const storePath = path.resolve("server/data/player-state.json");
const data = JSON.parse(fs.readFileSync(storePath, "utf8")) as Record<string, any>;
const save = data[playerName];
if (!save) {
    console.error(`No save for key: ${playerName}`);
    console.error("Available:", Object.keys(data).sort().join(", "));
    process.exit(1);
}

const varps: Record<number, number> = {};
const varbits: Record<number, number> = {};
for (const [k, v] of Object.entries(save.varps ?? {})) {
    varps[Number(k)] = Number(v) | 0;
}
for (const [k, v] of Object.entries(save.varbits ?? {})) {
    varbits[Number(k)] = Number(v) | 0;
}

function isComplete(taskId: number): boolean {
    const { varpId } = getLeagueTaskBitfield(taskId);
    return isLeagueTaskBitSetInVarp(varps[varpId] ?? 0, taskId);
}

console.log(`=== ${playerName} (${save.name ?? playerName}) ===\n`);

console.log("Counters:");
console.log(`  varbit 10046 (derived from varp 2610): ${(varps[VARP_LEAGUE_GENERAL_TASKS_4] ?? 0) & 0x7ff}`);
console.log(`  varbit 10046 (legacy save): ${varbits[VARBIT_LEAGUE_TOTAL_TASKS_COMPLETED] ?? "n/a"}`);
console.log(`  varp 2610 bits 0-10: ${(varps[VARP_LEAGUE_GENERAL_TASKS_4] ?? 0) & 0x7ff}`);
console.log(`  varp 2612 (legacy wrong): ${varps[2612] ?? 0}`);
console.log(`  varp 2610 raw: ${varps[VARP_LEAGUE_GENERAL_TASKS_4] ?? 0}`);
console.log(`  points completed varp: ${varps[VARP_LEAGUE_POINTS_COMPLETED] ?? 0}`);

const v2812 = varps[2812] ?? 0;
const v2636 = varps[2636] ?? 0;
console.log(`\nVarp 2812 (group 20 completion): ${v2812} (bits 11=${(v2812 >> 11) & 1}, 12=${(v2812 >> 12) & 1})`);
console.log(`Varp 2636 (poh_nexus - old collision): ${v2636} (bits 11=${(v2636 >> 11) & 1}, 12=${(v2636 >> 12) & 1})`);

console.log("\nCompleted tasks (from bitfields):");
const completed: Array<{ taskId: number; name: string; points: number }> = [];
for (const row of LEAGUE_TASKS) {
    if (isComplete(row.taskId)) {
        completed.push({ taskId: row.taskId, name: row.name, points: row.points });
    }
}
completed.sort((a, b) => a.taskId - b.taskId);
let totalPoints = 0;
for (const t of completed) {
    totalPoints += t.points;
    console.log(`  [${t.taskId}] ${t.name} (+${t.points})`);
}
console.log(`\nBitfield count: ${completed.length}, total points from tasks: ${totalPoints}`);

console.log("\nNon-zero completion varps:");
for (const varpId of LEAGUE_TASK_COMPLETION_VARPS) {
    const v = varps[varpId] ?? 0;
    if (v !== 0) {
        console.log(`  varp ${varpId} = ${v}`);
    }
}

for (const taskId of [189, 190, 651, 652]) {
    const def = getLeagueTaskByTaskId(taskId);
    console.log(
        `\nTask ${taskId} (${def?.name ?? "?"}): complete=${isComplete(taskId)} varbit16018/19 N/A`,
    );
}

console.log("\nEquipment (appearance.equip):", save.appearance?.equip ?? []);
