import { getCacheLoaderFactory } from "../../src/rs/cache/loader/CacheLoaderFactory";
import { LEAGUE_TASK_AREA_ID_TO_REGION } from "../../src/shared/leagues/leagueTaskRegion";
import { LEAGUE_TASKS } from "../../src/shared/leagues/leagueTasks.data";
import type { LeagueTaskRow } from "../../src/shared/leagues/leagueTypes";
import { buildNameLookups, parseTaskTrigger } from "../src/game/leagues/triggers/TriggerParser";
import { initCacheEnv } from "../src/world/CacheEnv";

const CATEGORY_NAMES: Record<number, string> = {
    1: "Skilling",
    2: "Combat",
    3: "Quest",
    4: "Diary",
    5: "Other",
    6: "Misc",
};

const TIER_NAMES: Record<number, string> = {
    1: "Easy",
    2: "Medium",
    3: "Hard",
    4: "Elite",
    5: "Master",
};

function classifyPattern(name: string): string {
    const n = name.trim();
    if (/^(defeat|kill|slay)\b/i.test(n)) return "npc_kill_pattern";
    if (/^(equip|wear)\b/i.test(n)) return "item_equip_pattern";
    if (/^(obtain|receive|get|loot)\b/i.test(n)) return "item_obtain_pattern";
    if (/^(craft|smith|cook|fletch|create|make|brew)\b/i.test(n)) return "item_craft_pattern";
    if (/^(chop|mine|catch|fish|pick|harvest)\b/i.test(n)) return "gather_pattern";
    if (/^complete\b/i.test(n)) return "complete";
    if (/^reach\b/i.test(n)) return "level_reach";
    if (/^fill\b/i.test(n)) return "collection_log";
    if (/^gain\b/i.test(n)) return "gain_unique";
    if (/^eat\b/i.test(n)) return "consume";
    if (/^use\b/i.test(n)) return "use_action";
    if (/^open\b/i.test(n)) return "open";
    if (/^steal\b/i.test(n)) return "steal";
    if (/^trade\b/i.test(n)) return "trade";
    if (/^light\b/i.test(n)) return "light";
    if (/^burn\b/i.test(n)) return "burn";
    if (/^read\b/i.test(n)) return "read";
    if (/^transform\b/i.test(n)) return "emote";
    if (/^pick up\b/i.test(n)) return "pickup";
    if (/^load\b/i.test(n)) return "load";
    if (/^check\b/i.test(n)) return "check";
    if (/^barehand\b/i.test(n)) return "barehand";
    if (/^blast furnace\b/i.test(n)) return "blast_furnace";
    if (/^take\b/i.test(n)) return "travel";
    if (/^consume\b/i.test(n)) return "consume";
    return "other";
}

type Status = "auto_wired" | "parsed_not_wired" | "pattern_no_cache_match" | "unparsed";
const byStatus: Record<Status, LeagueTaskRow[]> = {
    auto_wired: [],
    parsed_not_wired: [],
    pattern_no_cache_match: [],
    unparsed: [],
};

const WIRED = new Set(["npc_kill", "item_equip"]);

const cacheEnv = initCacheEnv("caches");
const cacheFactory = getCacheLoaderFactory(cacheEnv.info, cacheEnv.cacheSystem as any);
const loaders = buildNameLookups(
    cacheFactory.getNpcTypeLoader?.(),
    cacheFactory.getObjTypeLoader?.(),
);

for (const task of LEAGUE_TASKS) {
    const trigger = parseTaskTrigger(task.name, task.description ?? "", loaders);
    if (!trigger) {
        const pat = classifyPattern(task.name);
        if (
            [
                "npc_kill_pattern",
                "item_equip_pattern",
                "item_obtain_pattern",
                "item_craft_pattern",
                "gather_pattern",
            ].includes(pat)
        ) {
            byStatus.pattern_no_cache_match.push(task);
        } else {
            byStatus.unparsed.push(task);
        }
    } else if (WIRED.has(trigger.type)) {
        byStatus.auto_wired.push(task);
    } else {
        byStatus.parsed_not_wired.push(task);
    }
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Map<string, number> {
    const map = new Map<string, number>();
    for (const item of items) {
        const key = keyFn(item);
        map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
}

const totalPoints = LEAGUE_TASKS.reduce((s, t) => s + t.points, 0);

console.log("=== LEAGUE TASK INVENTORY ===");
console.log("Total tasks:", LEAGUE_TASKS.length);
console.log(
    "Task ID range:",
    Math.min(...LEAGUE_TASKS.map((t) => t.taskId)),
    "-",
    Math.max(...LEAGUE_TASKS.map((t) => t.taskId)),
);
console.log("Total points available:", totalPoints);
console.log("");

console.log("--- By League Struct (UI list) ---");
const byLeague = countBy(LEAGUE_TASKS, (t) => String(t.leagueStructId ?? 0));
for (const [id, count] of [...byLeague.entries()].sort((a, b) => b[1] - a[1])) {
    const num = Number(id);
    const label =
        num === 6211
            ? "Raging Echoes (6211)"
            : num === 723
              ? "Legacy pool (723)"
              : `struct ${id}`;
    console.log(`  ${label}: ${count}`);
}
console.log("");

console.log("--- By Tier ---");
const byTier = countBy(LEAGUE_TASKS, (t) => TIER_NAMES[t.tier] ?? String(t.tier));
for (const tier of [1, 2, 3, 4, 5]) {
    const name = TIER_NAMES[tier];
    console.log(`  ${name}: ${byTier.get(name) ?? 0}`);
}
console.log("");

console.log("--- By Category ---");
const byCategory = countBy(
    LEAGUE_TASKS,
    (t) => CATEGORY_NAMES[t.category ?? 0] ?? String(t.category),
);
for (const [k, v] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
}
console.log("");

console.log("--- By Region ---");
const byArea = countBy(
    LEAGUE_TASKS,
    (t) => LEAGUE_TASK_AREA_ID_TO_REGION[t.area ?? 0] ?? "Unknown",
);
for (const [k, v] of [...byArea.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
}
console.log("");

console.log("--- Auto-completion Status ---");
console.log("  Wired (npc_kill + item_equip):", byStatus.auto_wired.length);
console.log("  Parsed but NOT wired (obtain/craft):", byStatus.parsed_not_wired.length);
console.log("  Pattern matched but no cache ID:", byStatus.pattern_no_cache_match.length);
console.log("  Needs custom trigger:", byStatus.unparsed.length);
console.log("");

console.log("--- By Name Pattern ---");
const byPattern = countBy(LEAGUE_TASKS, (t) => classifyPattern(t.name));
for (const [k, v] of [...byPattern.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
}
console.log("");

console.log("--- Parsed-not-wired breakdown ---");
const pt = new Map<string, number>();
for (const t of byStatus.parsed_not_wired) {
    const tr = parseTaskTrigger(t.name, t.description ?? "", loaders)!;
    pt.set(tr.type, (pt.get(tr.type) ?? 0) + 1);
}
for (const [k, v] of [...pt.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
}

function printSamples(title: string, tasks: LeagueTaskRow[], limit = 15): void {
    console.log("");
    console.log(`--- ${title} ---`);
    for (const t of tasks.slice(0, limit)) {
        const region = LEAGUE_TASK_AREA_ID_TO_REGION[t.area ?? 0] ?? "General";
        console.log(`  [${t.taskId}] ${t.name} (${t.points}pts, ${region})`);
    }
}

printSamples("WIRED auto-complete samples", byStatus.auto_wired);
printSamples("QUICK TO WIRE: parsed obtain/craft", byStatus.parsed_not_wired);
printSamples(
    "AUTO-COMPLETE CANDIDATES: Complete quest/diary",
    byStatus.unparsed.filter((x) => /^complete/i.test(x.name)),
    20,
);
printSamples(
    "AUTO-COMPLETE CANDIDATES: Reach level",
    byStatus.unparsed.filter((x) => /^reach/i.test(x.name)),
    50,
);
printSamples("Pattern-no-cache-match samples", byStatus.pattern_no_cache_match, 25);

function statusFor(task: LeagueTaskRow): "wired" | "parsed_not_wired" | "needs_custom" {
    const trigger = parseTaskTrigger(task.name, task.description ?? "", loaders);
    if (!trigger) return "needs_custom";
    if (trigger.type === "npc_kill" || trigger.type === "item_equip") return "wired";
    return "parsed_not_wired";
}

function analyzePool(label: string, filter: (t: LeagueTaskRow) => boolean): void {
    const pool = LEAGUE_TASKS.filter(filter);
    const by = { wired: 0, parsed_not_wired: 0, needs_custom: 0 };
    const pts = { wired: 0, parsed_not_wired: 0, needs_custom: 0 };
    for (const t of pool) {
        const s = statusFor(t);
        by[s]++;
        pts[s] += t.points;
    }
    const totalPts = pool.reduce((a, t) => a + t.points, 0);
    console.log("");
    console.log(`=== ${label} (${pool.length} tasks, ${totalPts} pts) ===`);
    console.log(`  wired: ${by.wired} (${pts.wired} pts)`);
    console.log(`  parsed not wired: ${by.parsed_not_wired} (${pts.parsed_not_wired} pts)`);
    console.log(`  needs custom: ${by.needs_custom} (${pts.needs_custom} pts)`);
}

// enum 2670: league_type -> league struct
const enumLoader = cacheFactory.getEnumTypeLoader?.();
const structLoader = cacheFactory.getStructTypeLoader?.();
const leagueEnum = enumLoader?.load(2670);
console.log("");
console.log("=== enum 2670 league_type -> struct ===");
const leagueNames: Record<number, string> = {
    1: "Twisted",
    2: "Trailblazer",
    3: "Shattered",
    4: "TB Reloaded",
    5: "Raging Echoes",
};
if (leagueEnum?.keys && leagueEnum.intValues) {
    for (let i = 0; i < leagueEnum.keys.length; i++) {
        const lt = leagueEnum.keys[i];
        const sid = leagueEnum.intValues[i];
        const s = structLoader?.load(sid);
        const tasksEnumId = s?.params?.get(868) as number | undefined;
        const tasksEnum = tasksEnumId ? enumLoader?.load(tasksEnumId) : undefined;
        const count = tasksEnum?.intValues?.length ?? 0;
        console.log(
            `  league ${lt} (${leagueNames[lt] ?? "?"}) -> struct ${sid}, tasks enum ${tasksEnumId}, count ${count}`,
        );
    }
}

analyzePool("ALL CACHE TASKS", () => true);
analyzePool("Raging Echoes struct 6211", (t) => t.leagueStructId === 6211);
analyzePool("Shared pool struct 1721", (t) => t.leagueStructId === 1721);
analyzePool("Struct 4699", (t) => t.leagueStructId === 4699);
analyzePool("Legacy struct 723", (t) => t.leagueStructId === 723);
analyzePool("Struct 3771", (t) => t.leagueStructId === 3771);

const re = LEAGUE_TASKS.filter((t) => t.leagueStructId === 6211);
console.log("");
console.log("=== RE (6211) wired tasks by tier ===");
for (const tier of [1, 2, 3, 4, 5]) {
    const items = re.filter((t) => t.tier === tier && statusFor(t) === "wired");
    console.log(`  Tier ${tier}: ${items.length} wired`);
}

// enum 5728 = Raging Echoes task list shown in client UI
const tasksEnum5728 = enumLoader?.load(5728);
const taskStructIds5728 = tasksEnum5728?.intValues ?? [];
const taskIdsInEnum5728 = new Set<number>();
for (const sid of taskStructIds5728) {
    const s = structLoader?.load(sid);
    const tid = s?.params?.get(873) as number | undefined;
    if (typeof tid === "number" && tid >= 0) {
        taskIdsInEnum5728.add(tid);
    }
}
const inData = new Set(LEAGUE_TASKS.map((t) => t.taskId));
const missingFromData = [...taskIdsInEnum5728].filter((id) => !inData.has(id));
const inEnum5728 = LEAGUE_TASKS.filter((t) => taskIdsInEnum5728.has(t.taskId));

console.log("");
console.log("=== Raging Echoes UI list (enum 5728) ===");
console.log(`  struct entries: ${taskStructIds5728.length}`);
console.log(`  unique taskIds: ${taskIdsInEnum5728.size}`);
console.log(`  in snapshot: ${inEnum5728.length}`);
console.log(`  in enum but missing snapshot: ${missingFromData.length}`);
analyzePool("Tasks shown in RE UI (enum 5728)", (t) => taskIdsInEnum5728.has(t.taskId));

console.log("");
console.log("=== AUTO-COMPLETE PRIORITY TIERS ===");
console.log("Tier A - Already works today (npc_kill/item_equip wired):", byStatus.auto_wired.length);
console.log("Tier B - Wire onItemObtain/onItemCraft (90 tasks, ~1 day):", byStatus.parsed_not_wired.length);
console.log("Tier C - Reach level / total level (59 tasks, hook skill XP):", byStatus.unparsed.filter((t) => /^reach/i.test(t.name)).length);
console.log("Tier D - Complete quest (51 quest-category, hook quest system):", byStatus.unparsed.filter((t) => (t.category ?? 0) === 3 && /^complete/i.test(t.name)).length);
console.log("Tier E - Complete diary (125 diary-category):", byStatus.unparsed.filter((t) => (t.category ?? 0) === 4).length);
console.log("Tier F - Collection log fill (25 tasks):", byStatus.unparsed.filter((t) => /^fill/i.test(t.name)).length);
console.log("Tier G - Manual/special (emotes, minigames, complex sets): remainder");

const reByCategory = countBy(inEnum5728, (t) => CATEGORY_NAMES[t.category ?? 0] ?? String(t.category));
console.log("");
console.log("--- RE UI tasks by category ---");
for (const [k, v] of [...reByCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
}

const manuallyImplemented = [189, 190, 651, 652];
console.log("");
console.log("--- Manually implemented task hooks ---");
for (const taskId of manuallyImplemented) {
    const row = LEAGUE_TASKS.find((t) => t.taskId === taskId);
    if (row) {
        console.log(`  [${taskId}] ${row.name}`);
    }
}
