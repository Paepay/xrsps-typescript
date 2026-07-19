/**
 * Disassemble CS2 scripts related to quest status / progress.
 * Usage: npx tsx scripts/cache/dump-quest-status-scripts.ts [scriptId...]
 */
import { CacheSystem } from "../../src/rs/cache/CacheSystem";
import { IndexType } from "../../src/rs/cache/IndexType";
import { parseScriptFromBytes } from "../../src/rs/cs2/Script";
import { loadCache, loadCacheInfos, loadCacheList } from "./load-util";

const OP_NAMES: Record<number, string> = {
    0: "PUSH_INT",
    1: "GET_VARP",
    6: "JUMP",
    7: "IF_EQ",
    8: "IF_NE",
    9: "IF_LT",
    10: "IF_GT",
    11: "IF_LE",
    12: "IF_GE",
    21: "RETURN",
    25: "GET_VARBIT",
    31: "IF_GT_legacy?",
    32: "IF_GE_legacy?",
    33: "LOAD_INT",
    34: "STORE_INT",
    40: "GOSUB",
    60: "SWITCH",
    7502: "DB_GETFIELD",
    7505: "DB_FIND",
};

const ids = (process.argv.slice(2).map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n))
    .length
    ? process.argv.slice(2).map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n))
    : [4029, 4023, 4025, 4026, 4027, 4028, 4030, 1350]);

const caches = loadCacheInfos();
const cacheInfo = loadCacheList(caches).latest;
const loaded = loadCache(cacheInfo);
const cacheSystem = CacheSystem.fromFiles("dat2", loaded.files);
const index = cacheSystem.getIndex(IndexType.DAT2.clientScript);

for (const id of ids) {
    try {
        const arch = index.getArchive(id);
        const file = arch.getFile(0);
        if (!file) {
            console.log(`Script ${id}: missing file`);
            continue;
        }
        const s = parseScriptFromBytes(id, file.data);
        console.log(
            `\n=== Script ${id} ops=${s.instructions.length} switches=${s.switches?.[0]?.size ?? 0} ===`,
        );
        if (s.instructions.length <= 120) {
            for (let i = 0; i < s.instructions.length; i++) {
                const op = s.instructions[i];
                console.log(`  [${i}] ${OP_NAMES[op] ?? `op${op}`} ${s.intOperands[i]}`);
            }
        } else {
            // Summarize: count GET_VARP/GET_VARBIT and PUSH_INT constants after them
            let varReads = 0;
            for (let i = 0; i < s.instructions.length; i++) {
                if (s.instructions[i] === 1 || s.instructions[i] === 25) varReads++;
            }
            console.log(`  (large) varReads=${varReads}`);
            if (s.switches?.[0]) {
                const keys = [...s.switches[0].keys()].sort((a, b) => a - b);
                console.log(`  switchKeys sample: ${keys.slice(0, 20).join(", ")}... (${keys.length})`);
            }
        }
    } catch (e) {
        console.log(`Script ${id}: error ${(e as Error).message}`);
    }
}
