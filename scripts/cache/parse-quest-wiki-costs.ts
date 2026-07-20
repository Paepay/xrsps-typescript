/**
 * Parse OSRS wiki Quests/List HTML dumps into difficulty/length favour costs.
 * Inputs: scripts/cache/out/Quests-*-html.json (MediaWiki parse API)
 * Output: scripts/cache/out/quest-favour-costs.json
 */
import fs from "fs";
import path from "path";

const OUT_DIR = path.resolve("scripts/cache/out");

type WikiQuestRow = {
    page: string;
    name: string;
    difficulty: string;
    length: string;
    source: "f2p" | "members" | "miniquest";
};

function stripHtml(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
}

function decodeEntities(s: string): string {
    return s
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

function parseHtmlFile(file: string, source: WikiQuestRow["source"]): WikiQuestRow[] {
    const j = JSON.parse(fs.readFileSync(path.join(OUT_DIR, file), "utf8")) as {
        parse: { text: { "*": string } };
    };
    const html = j.parse.text["*"];
    const rows: WikiQuestRow[] = [];
    const re = /<tr[^>]*data-rowid="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
        const page = decodeEntities(stripHtml(m[1]));
        const cells = [...m[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
            decodeEntities(stripHtml(c[1])),
        );
        // Quests: #, Name, Difficulty, Length, QP, Series, Release
        // Miniquests: Name, Difficulty, Length, Series, Release, Leagues region (no #)
        let name: string;
        let difficulty: string;
        let length: string;
        if (source === "miniquest") {
            if (cells.length < 3) continue;
            name = cells[0] || page;
            difficulty = cells[1];
            length = cells[2];
        } else {
            if (cells.length < 4) continue;
            name = cells[1] || page;
            difficulty = cells[2];
            length = cells[3];
        }
        if (!difficulty || !length) continue;
        rows.push({ page, name, difficulty, length, source });
    }
    return rows;
}

const DIFFICULTY_MULT: Record<string, number> = {
    Novice: 1,
    Intermediate: 3,
    Experienced: 5,
    Master: 10,
    Grandmaster: 15,
    Special: 20,
};

/** Exact wiki length → multiplier. */
const LENGTH_MULT: Record<string, number> = {
    "Very Short": 1,
    Short: 2,
    Medium: 3,
    Long: 4,
    "Very Long": 5,
};

function normalizeLengthKey(raw: string): string {
    // Wiki sometimes uses en-dash or hyphen variants
    return raw
        .replace(/\u2013|\u2014|-/g, "–")
        .replace(/\s+/g, " ")
        .trim();
}

function lengthMultiplier(raw: string): number | undefined {
    const key = normalizeLengthKey(raw);
    if (LENGTH_MULT[key] !== undefined) return LENGTH_MULT[key];
    if (/very\s*short/i.test(key)) return 1;
    if (/very\s*long/i.test(key)) return 5;
    if (/^short$/i.test(key)) return 2;
    if (/^medium$/i.test(key)) return 3;
    if (/^long$/i.test(key)) return 4;
    return undefined;
}

function favourCost(difficulty: string, length: string): number | undefined {
    const d = DIFFICULTY_MULT[difficulty];
    const l = lengthMultiplier(length);
    if (d === undefined || l === undefined) return undefined;
    return d * l;
}

const f2p = parseHtmlFile("Quests-Free-to-play-html.json", "f2p");
const members = parseHtmlFile("Quests-Members-html.json", "members");
const miniquests = parseHtmlFile("Miniquests-html.json", "miniquest");
const all = [...f2p, ...members, ...miniquests];

const lengths = new Map<string, number>();
const diffs = new Map<string, number>();
const unknown: WikiQuestRow[] = [];
const costs: Array<WikiQuestRow & { favourCost: number }> = [];

for (const r of all) {
    lengths.set(r.length, (lengths.get(r.length) || 0) + 1);
    diffs.set(r.difficulty, (diffs.get(r.difficulty) || 0) + 1);
    const cost = favourCost(r.difficulty, r.length);
    if (cost === undefined) {
        unknown.push(r);
        continue;
    }
    costs.push({ ...r, favourCost: cost });
}

const out = {
    source: "https://oldschool.runescape.wiki/w/Quests/List",
    formula: "Math.round(difficultyMult * lengthMult)",
    difficultyMult: DIFFICULTY_MULT,
    lengthMult: LENGTH_MULT,
    counts: { f2p: f2p.length, members: members.length, miniquests: miniquests.length, total: all.length },
    difficulties: [...diffs.entries()],
    lengths: [...lengths.entries()],
    unknown,
    quests: costs,
};

fs.writeFileSync(path.join(OUT_DIR, "quest-favour-costs.json"), JSON.stringify(out, null, 2));
console.log(
    `Parsed ${all.length} rows -> ${costs.length} costs, ${unknown.length} unknown. Wrote quest-favour-costs.json`,
);
console.log("difficulties", [...diffs.entries()]);
console.log("lengths", [...lengths.entries()]);
if (unknown.length) console.log("unknown sample", unknown.slice(0, 10));
