/**
 * Dump quest progress varp/varbit IDs from CS2 script 4024 (quest progress getter).
 * Also dumps script 4029 (quest_status_get) for reference.
 *
 * Usage: npx tsx scripts/cache/dump-quest-progress-vars.ts
 */
import fs from "fs";
import path from "path";

import { CacheSystem } from "../../src/rs/cache/CacheSystem";
import { IndexType } from "../../src/rs/cache/IndexType";
import { Opcodes } from "../../src/rs/cs2/Opcodes";
import { parseScriptFromBytes, type Script } from "../../src/rs/cs2/Script";
import { loadCache, loadCacheInfos, loadCacheList } from "./load-util";

const QUEST_PROGRESS_SCRIPT_ID = 4024;
const QUEST_STATUS_SCRIPT_ID = 4029;

type QuestVarRef = {
    questId: number;
    kind: "varp" | "varbit";
    id: number;
};

function loadScript(cacheSystem: CacheSystem, scriptId: number): Script {
    const index = cacheSystem.getIndex(IndexType.DAT2.clientScript);
    const arch = index.getArchive(scriptId);
    const file = arch.getFile(0);
    if (!file) {
        throw new Error(`Missing script ${scriptId}`);
    }
    return parseScriptFromBytes(scriptId, file.data);
}

/**
 * Script 4024 pattern: switch(questId) { case N: return %varp / %varbit; }
 * After SWITCH, each case body is typically GET_VARP/GET_VARBIT then RETURN.
 */
function extractQuestProgressVars(script: Script): QuestVarRef[] {
    const results: QuestVarRef[] = [];
    const switchIndex = script.instructions.findIndex((op) => op === Opcodes.SWITCH);
    if (switchIndex < 0 || !script.switches?.[0]) {
        throw new Error("Script 4024: expected SWITCH table");
    }

    const switchTable = script.switches[0];
    for (const [questId, pcOffset] of switchTable.entries()) {
        // pcOffset is relative to the instruction after SWITCH
        const targetPc = switchIndex + 1 + pcOffset;
        // Skip leading JUMP if present, find first GET_VARP/GET_VARBIT
        let pc = targetPc;
        while (pc < script.instructions.length) {
            const op = script.instructions[pc];
            if (op === Opcodes.GET_VARP) {
                results.push({ questId, kind: "varp", id: script.intOperands[pc] });
                break;
            }
            if (op === Opcodes.GET_VARBIT) {
                results.push({ questId, kind: "varbit", id: script.intOperands[pc] });
                break;
            }
            if (op === Opcodes.RETURN) {
                break;
            }
            // Follow unconditional jump once
            if (op === Opcodes.JUMP) {
                pc = pc + 1 + script.intOperands[pc];
                continue;
            }
            pc++;
            if (pc > targetPc + 8) break;
        }
    }

    return results.sort((a, b) => a.questId - b.questId);
}

function main(): void {
    const caches = loadCacheInfos();
    const cacheInfo = loadCacheList(caches).latest;
    console.log(`Loading cache ${cacheInfo.name}...`);
    const loaded = loadCache(cacheInfo);
    const cacheSystem = CacheSystem.fromFiles("dat2", loaded.files);

    const progressScript = loadScript(cacheSystem, QUEST_PROGRESS_SCRIPT_ID);
    const refs = extractQuestProgressVars(progressScript);

    const outDir = path.resolve("scripts/cache/out");
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "quest-progress-vars.json");

    const payload = {
        cache: cacheInfo.name,
        sourceScriptId: QUEST_PROGRESS_SCRIPT_ID,
        note:
            "Switch keys are quest dbrow IDs (RuneLite Quest.id). Completion thresholds are in DB columns 18/19 — see dump-quest-completions.ts.",
        count: refs.length,
        quests: refs.map((r) => ({
            dbrowId: r.questId,
            kind: r.kind,
            id: r.id,
        })),
    };
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log(`Wrote ${refs.length} quest progress vars -> ${outPath}`);
    console.log(
        `  varps=${refs.filter((r) => r.kind === "varp").length} varbits=${refs.filter((r) => r.kind === "varbit").length}`,
    );

    // Also dump status script size for follow-up work
    const statusScript = loadScript(cacheSystem, QUEST_STATUS_SCRIPT_ID);
    console.log(
        `Script ${QUEST_STATUS_SCRIPT_ID}: ${statusScript.instructions.length} ops (quest_status_get)`,
    );
}

main();
