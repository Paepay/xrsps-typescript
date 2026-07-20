/**
 * Generate server/src/game/quests/questFavourCosts.data.ts from wiki dump.
 * Prerequisite: npx tsx scripts/cache/parse-quest-wiki-costs.ts
 * Usage: npx tsx scripts/cache/generate-quest-favour-costs-data.ts
 */
import fs from "fs";
import path from "path";

const dumpPath = path.resolve("scripts/cache/out/quest-favour-costs.json");
const completionsPath = path.resolve("server/src/game/quests/questCompletions.data.ts");
const outPath = path.resolve("server/src/game/quests/questFavourCosts.data.ts");

type DumpQuest = {
    page: string;
    name: string;
    difficulty: string;
    length: string;
    source: string;
    favourCost: number;
};

const dump = JSON.parse(fs.readFileSync(dumpPath, "utf8")) as {
    source: string;
    difficultyMult: Record<string, number>;
    lengthMult: Record<string, number>;
    quests: DumpQuest[];
};

/** Mirror questCompletions name normalization for matching. */
function normalizeQuestKey(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Wiki "The Restless Ghost" ↔ cache "Restless Ghost, The"; same for A/An. */
function wikiNameVariants(name: string): string[] {
    const trimmed = name.trim();
    const variants = new Set<string>([trimmed]);

    // Recipe for Disaster/Freeing X → Recipe for Disaster Freeing X (cache style)
    if (trimmed.includes("/")) {
        variants.add(trimmed.replace(/\//g, " "));
        const rfd = /^Recipe for Disaster\/(.+)$/i.exec(trimmed);
        if (rfd) {
            const sub = rfd[1];
            variants.add(`Recipe for Disaster ${sub}`);
            // "Defeating the Culinaromancer" → Culinaromancer
            const defeating = /^Defeating the (.+)$/i.exec(sub);
            if (defeating) {
                variants.add(`Recipe for Disaster ${defeating[1]}`);
                variants.add(defeating[1]);
            }
            // "Freeing the Mountain Dwarf" / "Freeing Evil Dave" → short cache keys
            const freeing = /^Freeing\s+(?:the\s+|sir\s+|king\s+)?(.+)$/i.exec(sub);
            if (freeing) {
                const rest = freeing[1];
                variants.add(`Recipe for Disaster ${rest}`);
                // "Goblin generals" → "Goblins", "Mountain Dwarf" → "Dwarf", etc.
                const shortMap: Record<string, string> = {
                    "goblin generals": "Goblins",
                    "mountain dwarf": "Dwarf",
                    "evil dave": "Dave",
                    "pirate pete": "Pirate",
                    "lumbridge guide": "Lumbridge Guide",
                    "amik varze": "Amik Varze",
                    "awowogei": "Awowogei",
                    "skrach uglogwee": "Uglogwee",
                };
                const short = shortMap[rest.toLowerCase()];
                if (short) variants.add(`Recipe for Disaster ${short}`);
            }
        }
    }

    for (const article of ["The", "A", "An"] as const) {
        const re = new RegExp(`^${article}\\s+(.+)$`, "i");
        const m = re.exec(trimmed);
        if (m) {
            variants.add(`${m[1]}, ${article}`);
            variants.add(m[1]);
        }
        const comma = new RegExp(`^(.+),\\s*${article}$`, "i");
        const c = comma.exec(trimmed);
        if (c) {
            variants.add(`${article} ${c[1]}`);
            variants.add(c[1]);
        }
    }

    // Known wiki ↔ cache spelling quirks
    if (/^perilous moons$/i.test(trimmed)) {
        variants.add("Perlious Moons"); // cache typo
    }

    return [...variants];
}

// Load cache quest names for matching
const completionsSrc = fs.readFileSync(completionsPath, "utf8");
const cacheNames: string[] = [];
for (const m of completionsSrc.matchAll(/name:\s*"([^"]+)"/g)) {
    cacheNames.push(m[1]);
}
const cacheByKey = new Map<string, string>();
for (const n of cacheNames) {
    cacheByKey.set(normalizeQuestKey(n), n);
}

type Matched = {
    wikiName: string;
    cacheName?: string;
    difficulty: string;
    length: string;
    favourCost: number;
    source: string;
};

const matched: Matched[] = [];
const unmatchedWiki: string[] = [];

for (const q of dump.quests) {
    let cacheName: string | undefined;
    for (const variant of wikiNameVariants(q.name)) {
        const hit = cacheByKey.get(normalizeQuestKey(variant));
        if (hit) {
            cacheName = hit;
            break;
        }
    }
    // Also try page title
    if (!cacheName) {
        for (const variant of wikiNameVariants(q.page)) {
            const hit = cacheByKey.get(normalizeQuestKey(variant));
            if (hit) {
                cacheName = hit;
                break;
            }
        }
    }
    if (!cacheName) unmatchedWiki.push(q.name);
    matched.push({
        wikiName: q.name,
        cacheName,
        difficulty: q.difficulty,
        length: q.length,
        favourCost: q.favourCost,
        source: q.source,
    });
}

const lines: string[] = [];
lines.push("/**");
lines.push(" * Auto-generated from OSRS wiki Quests/List (Difficulty × Length favour costs).");
lines.push(` * Source: ${dump.source}`);
lines.push(" * Do not hand-edit — regenerate with:");
lines.push(" *   npx tsx scripts/cache/parse-quest-wiki-costs.ts");
lines.push(" *   npx tsx scripts/cache/generate-quest-favour-costs-data.ts");
lines.push(" */");
lines.push("");
lines.push('export type QuestWikiDifficulty =');
lines.push('    | "Novice"');
lines.push('    | "Intermediate"');
lines.push('    | "Experienced"');
lines.push('    | "Master"');
lines.push('    | "Grandmaster"');
lines.push('    | "Special";');
lines.push("");
lines.push('export type QuestWikiLength =');
lines.push('    | "Very Short"');
lines.push('    | "Short"');
lines.push('    | "Medium"');
lines.push('    | "Long"');
lines.push('    | "Very Long";');
lines.push("");
lines.push("export type QuestFavourCostDef = {");
lines.push("    /** Wiki display name. */");
lines.push("    wikiName: string;");
lines.push("    /** Matching cache questCompletions.name when known. */");
lines.push("    cacheName?: string;");
lines.push("    difficulty: QuestWikiDifficulty;");
lines.push("    length: QuestWikiLength;");
lines.push("    /** favourCost = difficultyMult × lengthMult */");
lines.push("    favourCost: number;");
lines.push('    source: "f2p" | "members" | "miniquest";');
lines.push("};");
lines.push("");
lines.push("/** Wiki difficulty → cost multiplier. */");
lines.push("export const QUEST_DIFFICULTY_MULT = {");
for (const [k, v] of Object.entries(dump.difficultyMult)) {
    lines.push(`    ${JSON.stringify(k)}: ${v},`);
}
lines.push("} as const satisfies Record<QuestWikiDifficulty, number>;");
lines.push("");
lines.push("/** Wiki length → cost multiplier. */");
lines.push("export const QUEST_LENGTH_MULT = {");
for (const [k, v] of Object.entries(dump.lengthMult)) {
    // Only emit the integer primary bands used by the current wiki dump
    if (["Very Short", "Short", "Medium", "Long", "Very Long"].includes(k)) {
        lines.push(`    ${JSON.stringify(k)}: ${v},`);
    }
}
lines.push("} as const satisfies Record<QuestWikiLength, number>;");
lines.push("");
lines.push("export const QUEST_FAVOUR_COSTS: readonly QuestFavourCostDef[] = [");
for (const q of matched) {
    const cachePart = q.cacheName ? `, cacheName: ${JSON.stringify(q.cacheName)}` : "";
    lines.push(
        `    { wikiName: ${JSON.stringify(q.wikiName)}${cachePart}, difficulty: ${JSON.stringify(q.difficulty)}, length: ${JSON.stringify(q.length)}, favourCost: ${q.favourCost}, source: ${JSON.stringify(q.source)} },`,
    );
}
lines.push("];");
lines.push("");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"));
console.log(
    `Wrote ${matched.length} quest costs (${matched.filter((m) => m.cacheName).length} matched to cache, ${unmatchedWiki.length} unmatched) -> ${outPath}`,
);
if (unmatchedWiki.length) {
    console.log("Unmatched wiki names:");
    for (const n of unmatchedWiki) console.log(`  - ${n}`);
}
