import fs from "fs";
import path from "path";

import type { ImportedMonsterDefinition, NpcDropTableDefinition } from "./types";

type GeneratedNpcDropTablesFile = {
    version?: number;
    tables?: Record<
        string,
        {
            name?: string;
            combatLevel?: number;
            duplicate?: boolean;
            table?: NpcDropTableDefinition;
        }
    >;
};

const NPC_DROP_TABLES_PATH = path.resolve(__dirname, "../../../data/npc-drop-tables.json");

let cachedEntries: ImportedMonsterDefinition[] | undefined;

/**
 * Load pre-generated NPC drop tables (from references/monsters-complete chunks).
 * Regenerate with: node scripts/cache/generate-npc-drop-tables.mjs
 */
export function loadMonstersCompleteDefinitions(): ImportedMonsterDefinition[] {
    if (cachedEntries) return cachedEntries;
    try {
        if (!fs.existsSync(NPC_DROP_TABLES_PATH)) {
            cachedEntries = [];
            return cachedEntries;
        }
        const raw = JSON.parse(
            fs.readFileSync(NPC_DROP_TABLES_PATH, "utf8"),
        ) as GeneratedNpcDropTablesFile;
        const out: ImportedMonsterDefinition[] = [];
        for (const [idKey, entry] of Object.entries(raw.tables ?? {})) {
            const npcTypeId = Number(idKey);
            if (!Number.isFinite(npcTypeId) || npcTypeId <= 0) continue;
            if (!entry?.table) continue;
            const name = String(entry.name ?? "").trim();
            if (!name) continue;
            out.push({
                npcTypeId,
                name,
                combatLevel: entry.combatLevel,
                duplicate: entry.duplicate === true,
                incomplete: false,
                table: entry.table,
            });
        }
        cachedEntries = out;
    } catch {
        cachedEntries = [];
    }
    return cachedEntries;
}
