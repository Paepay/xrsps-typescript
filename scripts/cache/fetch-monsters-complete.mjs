/**
 * Fetch osrsbox monsters-complete.json and split into 100-ID chunk files.
 *
 * Output: references/monsters-complete/{start}-{end}.json
 * Example: 0001-0100.json contains monster IDs 1..100 (sparse keys).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "references", "monsters-complete");
const SOURCE_URL =
    "https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/monsters-complete.json";
const CHUNK_SIZE = 100;

function padId(id) {
    return String(id).padStart(4, "0");
}

function chunkFileName(rangeStart) {
    const rangeEnd = rangeStart + CHUNK_SIZE - 1;
    return `${padId(rangeStart)}-${padId(rangeEnd)}.json`;
}

async function loadMonsters() {
    const tmpPath = path.join(ROOT, "references", "_monsters-complete-full.tmp.json");
    if (fs.existsSync(tmpPath)) {
        console.log(`Using cached download: ${tmpPath}`);
        return JSON.parse(fs.readFileSync(tmpPath, "utf8"));
    }
    console.log(`Fetching ${SOURCE_URL} ...`);
    const response = await fetch(SOURCE_URL);
    if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    fs.writeFileSync(tmpPath, text);
    console.log(`Downloaded ${text.length} bytes`);
    return JSON.parse(text);
}

function writeChunks(monsters) {
    const ids = Object.keys(monsters)
        .map(Number)
        .filter((id) => Number.isFinite(id) && id > 0)
        .sort((a, b) => a - b);
    if (ids.length === 0) throw new Error("No monster IDs found");

    const maxId = ids[ids.length - 1];
    fs.mkdirSync(OUT_DIR, { recursive: true });

    // Remove previous chunk files so stale ranges do not linger.
    for (const name of fs.readdirSync(OUT_DIR)) {
        if (/^\d{4}-\d{4}\.json$/.test(name)) {
            fs.unlinkSync(path.join(OUT_DIR, name));
        }
    }

    let filesWritten = 0;
    let entriesWritten = 0;
    for (let rangeStart = 1; rangeStart <= maxId; rangeStart += CHUNK_SIZE) {
        const rangeEnd = rangeStart + CHUNK_SIZE - 1;
        const chunk = {};
        for (let id = rangeStart; id <= rangeEnd; id++) {
            const entry = monsters[String(id)];
            if (entry) chunk[String(id)] = entry;
        }
        const keys = Object.keys(chunk);
        if (keys.length === 0) continue;
        const filePath = path.join(OUT_DIR, chunkFileName(rangeStart));
        fs.writeFileSync(filePath, `${JSON.stringify(chunk)}\n`);
        filesWritten++;
        entriesWritten += keys.length;
    }

    console.log(
        `Wrote ${filesWritten} chunk files (${entriesWritten} monsters, max id ${maxId}) to ${OUT_DIR}`,
    );
}

function cleanup() {
    const truncated = path.join(ROOT, "references", "monsters-complete.json");
    const tmpPath = path.join(ROOT, "references", "_monsters-complete-full.tmp.json");
    if (fs.existsSync(truncated)) {
        fs.unlinkSync(truncated);
        console.log(`Removed truncated ${truncated}`);
    }
    if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
        console.log(`Removed temp ${tmpPath}`);
    }
}

const monsters = await loadMonsters();
writeChunks(monsters);
cleanup();
console.log("Next: node scripts/cache/generate-npc-drop-tables.mjs");
