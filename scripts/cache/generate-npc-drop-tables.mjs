/**
 * Build server/data/npc-drop-tables.json from references/monsters-complete/*.json
 *
 * Usage: node scripts/cache/generate-npc-drop-tables.mjs
 *
 * Prerequisite: node scripts/cache/fetch-monsters-complete.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const CHUNKS_DIR = path.join(ROOT, "references", "monsters-complete");
const OUT_PATH = path.join(ROOT, "server", "data", "npc-drop-tables.json");

/** Drops matching these prefixes go into an independent tertiary pool (not weighted main). */
const TERTIARY_NAME_PREFIXES = [
    "clue scroll",
    "reward casket",
    "jar of ",
    "pet ",
    "brimstone key",
    "key (elite)",
];

function normalizeDropName(name) {
    return String(name ?? "")
        .replace(/<!--.*?-->/g, "")
        .trim()
        .toLowerCase();
}

function isTertiaryDrop(drop) {
    const name = normalizeDropName(drop.name);
    if (!name) return false;
    return TERTIARY_NAME_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function toEntry(drop) {
    const itemId = drop.id ?? -1;
    if (!(itemId > 0)) return undefined;
    const rarity = Number(drop.rarity);
    if (!Number.isFinite(rarity) || rarity < 0) return undefined;
    return {
        itemId,
        quantity: drop.quantity ?? "1",
        rarity: rarity * Math.max(1, drop.rolls ?? 1),
    };
}

function buildTable(drops) {
    const always = [];
    const main = [];
    const tertiary = [];
    for (const raw of drops ?? []) {
        const entry = toEntry(raw);
        if (!entry) continue;
        if (isTertiaryDrop(raw)) {
            tertiary.push(entry);
            continue;
        }
        if (entry.rarity >= 1) always.push(entry);
        else if (entry.rarity > 0) main.push(entry);
    }
    if (always.length === 0 && main.length === 0 && tertiary.length === 0) {
        return undefined;
    }
    const pools = [];
    if (main.length > 0) {
        pools.push({ kind: "weighted", category: "main", entries: main });
    }
    if (tertiary.length > 0) {
        pools.push({ kind: "independent", category: "tertiary", entries: tertiary });
    }
    return {
        always: always.length > 0 ? always : undefined,
        pools: pools.length > 0 ? pools : undefined,
    };
}

function loadChunks() {
    if (!fs.existsSync(CHUNKS_DIR)) {
        throw new Error(`Missing chunk dir: ${CHUNKS_DIR} (run fetch-monsters-complete.mjs first)`);
    }
    const names = fs
        .readdirSync(CHUNKS_DIR)
        .filter((name) => /^\d{4}-\d{4}\.json$/.test(name))
        .sort();
    if (names.length === 0) {
        throw new Error(`No chunk files in ${CHUNKS_DIR}`);
    }
    const monsters = [];
    for (const name of names) {
        const chunk = JSON.parse(fs.readFileSync(path.join(CHUNKS_DIR, name), "utf8"));
        for (const entry of Object.values(chunk)) {
            if (entry && typeof entry === "object") monsters.push(entry);
        }
    }
    return monsters;
}

const monsters = loadChunks();
const tables = {};
let withTables = 0;
for (const monster of monsters) {
    const npcTypeId = Number(monster.id);
    if (!Number.isFinite(npcTypeId) || npcTypeId <= 0) continue;
    const table = buildTable(monster.drops);
    if (!table) continue;
    tables[String(npcTypeId)] = {
        name: String(monster.name ?? "").trim(),
        combatLevel: monster.combat_level ?? undefined,
        duplicate: monster.duplicate === true,
        table,
    };
    withTables++;
}

const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "references/monsters-complete",
    count: withTables,
    tables,
};

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload)}\n`);
console.log(`Wrote ${withTables} NPC drop tables → ${OUT_PATH}`);
console.log(`File size: ${(fs.statSync(OUT_PATH).size / 1e6).toFixed(2)} MB`);
