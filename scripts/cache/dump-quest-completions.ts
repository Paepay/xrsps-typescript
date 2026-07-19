/**
 * Build a full quest completion map from cache:
 * - Progress varp/varbit from CS2 script 4024
 * - Start/complete thresholds from quest DB table 0 columns 18/19
 *   (decoded from quest_status_get script 4029 packed fields 288/304)
 *
 * Usage: npx tsx scripts/cache/dump-quest-completions.ts
 */
import fs from "fs";
import path from "path";

import { CacheSystem } from "../../src/rs/cache/CacheSystem";
import { IndexType } from "../../src/rs/cache/IndexType";
import { DbRepository } from "../../src/rs/config/db/DbRepository";
import { ScriptVarTypeId } from "../../src/rs/config/db/ScriptVarType";
import { Opcodes } from "../../src/rs/cs2/Opcodes";
import { parseScriptFromBytes, type Script } from "../../src/rs/cs2/Script";
import { loadCache, loadCacheInfos, loadCacheList } from "./load-util";

const QUEST_TABLE_ID = 0;
const QUEST_PROGRESS_SCRIPT_ID = 4024;
/** Packed db_getfield operands from script 4029 → column ids */
const COL_START = (288 >> 4) & 0x7f; // 18
const COL_COMPLETE = (304 >> 4) & 0x7f; // 19

type ProgressRef = { kind: "varp" | "varbit"; id: number };

type QuestCompletion = {
    questId: number;
    dbrowId: number;
    name: string;
    progress: ProgressRef | null;
    startValue: number | null;
    completeValue: number | null;
};

function loadScript(cacheSystem: CacheSystem, scriptId: number): Script {
    const index = cacheSystem.getIndex(IndexType.DAT2.clientScript);
    const arch = index.getArchive(scriptId);
    const file = arch.getFile(0);
    if (!file) throw new Error(`Missing script ${scriptId}`);
    return parseScriptFromBytes(scriptId, file.data);
}

function extractProgressVars(script: Script): Map<number, ProgressRef> {
    const results = new Map<number, ProgressRef>();
    const switchIndex = script.instructions.findIndex((op) => op === Opcodes.SWITCH);
    if (switchIndex < 0 || !script.switches?.[0]) {
        throw new Error("Script 4024: expected SWITCH table");
    }
    for (const [questId, pcOffset] of script.switches[0].entries()) {
        const targetPc = switchIndex + 1 + pcOffset;
        let pc = targetPc;
        while (pc < script.instructions.length && pc <= targetPc + 8) {
            const op = script.instructions[pc];
            if (op === Opcodes.GET_VARP) {
                results.set(questId, { kind: "varp", id: script.intOperands[pc] });
                break;
            }
            if (op === Opcodes.GET_VARBIT) {
                results.set(questId, { kind: "varbit", id: script.intOperands[pc] });
                break;
            }
            if (op === Opcodes.RETURN) break;
            if (op === Opcodes.JUMP) {
                pc = pc + 1 + script.intOperands[pc];
                continue;
            }
            pc++;
        }
    }
    return results;
}

function discoverIdNameColumns(table: {
    columns: Map<number, { types: number[] }>;
}): { idColumnId: number; nameColumnId: number } {
    let idColumnId = -1;
    let nameColumnId = -1;
    for (const [colId, colDef] of table.columns) {
        if (colDef.types.length !== 1) continue;
        if (colDef.types[0] === ScriptVarTypeId.INTEGER && idColumnId === -1) {
            idColumnId = colId;
        }
        if (colDef.types[0] === ScriptVarTypeId.STRING && nameColumnId === -1) {
            nameColumnId = colId;
        }
    }
    if (idColumnId < 0 || nameColumnId < 0) {
        throw new Error(`Could not discover quest id/name columns (${idColumnId}/${nameColumnId})`);
    }
    return { idColumnId, nameColumnId };
}

function main(): void {
    const caches = loadCacheInfos();
    const cacheInfo = loadCacheList(caches).latest;
    console.log(`Loading cache ${cacheInfo.name}...`);
    const loaded = loadCache(cacheInfo);
    const cacheSystem = CacheSystem.fromFiles("dat2", loaded.files);

    console.log("Parsing script 4024...");
    const progressVars = extractProgressVars(loadScript(cacheSystem, QUEST_PROGRESS_SCRIPT_ID));

    console.log("Loading quest DB table...");
    const db = new DbRepository(cacheSystem);
    const table = db.getTables().get(QUEST_TABLE_ID);
    if (!table) throw new Error("Missing quest DB table 0");
    const { idColumnId, nameColumnId } = discoverIdNameColumns(table);

    const startCol = table.columns.get(COL_START);
    const completeCol = table.columns.get(COL_COMPLETE);
    console.log(
        `columns: id=${idColumnId} name=${nameColumnId} start=${COL_START}(${startCol?.types.map((t) => ScriptVarTypeId[t] ?? t)}) complete=${COL_COMPLETE}(${completeCol?.types.map((t) => ScriptVarTypeId[t] ?? t)})`,
    );

    const rows = db.getRows(QUEST_TABLE_ID);
    const quests: QuestCompletion[] = [];
    for (const row of rows) {
        const questId = row.getColumn(idColumnId)?.values?.[0];
        const name = row.getColumn(nameColumnId)?.values?.[0];
        if (typeof questId !== "number" || questId < 0 || typeof name !== "string") continue;

        const startRaw = row.getColumn(COL_START)?.values?.[0];
        const completeRaw = row.getColumn(COL_COMPLETE)?.values?.[0];
        // Script 4024 switches on dbrow id (RuneLite Quest.id), not quest:id column.
        quests.push({
            questId,
            dbrowId: row.id,
            name,
            progress: progressVars.get(row.id) ?? null,
            startValue: typeof startRaw === "number" ? startRaw : null,
            completeValue: typeof completeRaw === "number" ? completeRaw : null,
        });
    }

    quests.sort((a, b) => a.questId - b.questId);

    const complete = quests.filter(
        (q) => q.progress && q.completeValue !== null && q.completeValue >= 0,
    );
    const missingProgress = quests.filter((q) => !q.progress);
    const missingComplete = quests.filter(
        (q) => q.progress && (q.completeValue === null || q.completeValue < 0),
    );

    const outDir = path.resolve("scripts/cache/out");
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "quest-completions.json");
    fs.writeFileSync(
        outPath,
        JSON.stringify(
            {
                cache: cacheInfo.name,
                source: {
                    progressScriptId: QUEST_PROGRESS_SCRIPT_ID,
                    statusScriptId: 4029,
                    startColumn: COL_START,
                    completeColumn: COL_COMPLETE,
                },
                counts: {
                    questRows: quests.length,
                    withProgressAndComplete: complete.length,
                    missingProgress: missingProgress.length,
                    missingComplete: missingComplete.length,
                },
                quests,
            },
            null,
            2,
        ),
    );

    console.log(`Wrote ${outPath}`);
    console.log(
        `quests=${quests.length} completable=${complete.length} missingProgress=${missingProgress.length} missingComplete=${missingComplete.length}`,
    );
    for (const sample of ["Rune Mysteries", "Cook's Assistant", "Prince Ali Rescue", "Desert Treasure"]) {
        const q = quests.find((x) => x.name.toLowerCase().includes(sample.toLowerCase()));
        console.log(" sample", sample, q);
    }
    console.log(
        "Next: npx tsx scripts/cache/generate-quest-completions-data.ts  (updates server questCompletions.data.ts)",
    );
}

main();
