/**
 * Repairs polluted league task completion data in player-state.json.
 * Usage: npx tsx server/scripts/repair-player-league-save.ts <playerKey>
 */
import fs from "fs";
import path from "path";

import { getLeagueTaskBitfield } from "../../src/shared/leagues/leagueTaskVarps";
import { LEAGUE_TASKS } from "../../src/shared/leagues/leagueTasks.data";
import {
    VARBIT_LEAGUE_TOTAL_TASKS_COMPLETED,
    VARP_LEAGUE_GENERAL_TASKS_4,
    VARP_LEAGUE_GENERAL_TASKS_4_COUNT_MASK,
    VARP_LEAGUE_POINTS_CLAIMED,
    VARP_LEAGUE_POINTS_COMPLETED,
    VARP_LEAGUE_POINTS_CURRENCY,
} from "../../src/shared/vars";

const playerKey = (process.argv[2] ?? "").trim().toLowerCase();
if (!playerKey) {
    console.error("Usage: npx tsx server/scripts/repair-player-league-save.ts <playerKey>");
    process.exit(1);
}

const storePath = path.resolve("server/data/player-state.json");
const data = JSON.parse(fs.readFileSync(storePath, "utf8")) as Record<string, any>;
const save = data[playerKey];
if (!save) {
    console.error(`No save for: ${playerKey}`);
    process.exit(1);
}

const varps: Record<string, number> = { ...(save.varps ?? {}) };
const varbits: Record<string, number> = { ...(save.varbits ?? {}) };

/** Tasks to keep completed (tutorial + journal open). */
const KEEP_COMPLETE = new Set([189, 190]);

/** Known polluted tasks on this account from inspection. */
const FORCE_CLEAR = new Set([0, 259, 272, 651, 652]);

function clearTask(taskId: number): void {
    const { varpId, mask } = getLeagueTaskBitfield(taskId);
    const key = String(varpId);
    const prev = Number(varps[key] ?? 0) | 0;
    const next = prev & ~mask;
    if (next === 0) {
        delete varps[key];
    } else {
        varps[key] = next;
    }
}

function setTask(taskId: number): void {
    const { varpId, mask } = getLeagueTaskBitfield(taskId);
    const key = String(varpId);
    varps[key] = (Number(varps[key] ?? 0) | 0) | mask;
}

for (const row of LEAGUE_TASKS) {
    const tid = row.taskId;
    if (FORCE_CLEAR.has(tid) || (!KEEP_COMPLETE.has(tid))) {
        clearTask(tid);
    }
}

for (const tid of KEEP_COMPLETE) {
    setTask(tid);
}

let completedCount = 0;
let totalPoints = 0;
for (const tid of KEEP_COMPLETE) {
    completedCount++;
    const row = LEAGUE_TASKS.find((entry) => entry.taskId === tid);
    if (row) {
        totalPoints += row.points;
    }
}

save.leagueTasksCompleted = [...KEEP_COMPLETE];

delete varbits[String(VARBIT_LEAGUE_TOTAL_TASKS_COMPLETED)];
// Count lives in varp 2610 bits 0-10 only (varbit 10046 is derived on load).

const prev2610 = Number(varps[String(VARP_LEAGUE_GENERAL_TASKS_4)] ?? 0) | 0;
varps[String(VARP_LEAGUE_GENERAL_TASKS_4)] =
    (prev2610 & ~VARP_LEAGUE_GENERAL_TASKS_4_COUNT_MASK) |
    (completedCount & VARP_LEAGUE_GENERAL_TASKS_4_COUNT_MASK);

delete varps["2612"];

varps[String(VARP_LEAGUE_POINTS_CLAIMED)] = totalPoints;
varps[String(VARP_LEAGUE_POINTS_COMPLETED)] = totalPoints;
varps[String(VARP_LEAGUE_POINTS_CURRENCY)] = totalPoints;

save.varps = varps;
save.varbits = varbits;
data[playerKey] = save;

fs.writeFileSync(storePath, JSON.stringify(data, null, 2));

console.log(`Repaired ${playerKey}:`);
console.log(`  tasks completed: ${completedCount}`);
console.log(`  league points: ${totalPoints}`);
console.log(`  kept task ids: ${[...KEEP_COMPLETE].join(", ")}`);
