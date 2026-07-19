/**
 * Generate server/src/game/quests/questCompletions.data.ts from the cache dump.
 * Usage: npx tsx scripts/cache/generate-quest-completions-data.ts
 */
import fs from "fs";
import path from "path";

const dumpPath = path.resolve("scripts/cache/out/quest-completions.json");
const outPath = path.resolve("server/src/game/quests/questCompletions.data.ts");

type DumpQuest = {
    questId: number;
    dbrowId: number;
    name: string;
    progress: { kind: "varp" | "varbit"; id: number };
    completeValue: number;
};

const dump = JSON.parse(fs.readFileSync(dumpPath, "utf8")) as {
    cache: string;
    quests: DumpQuest[];
};

const lines: string[] = [];
lines.push("/**");
lines.push(" * Auto-generated from cache via scripts/cache/dump-quest-completions.ts");
lines.push(` * Cache: ${dump.cache}`);
lines.push(" * Do not hand-edit — regenerate with:");
lines.push(" *   npx tsx scripts/cache/dump-quest-completions.ts");
lines.push(" *   npx tsx scripts/cache/generate-quest-completions-data.ts");
lines.push(" */");
lines.push("");
lines.push('export type QuestProgressKind = "varp" | "varbit";');
lines.push("");
lines.push("export type QuestCompletionDef = {");
lines.push("    questId: number;");
lines.push("    dbrowId: number;");
lines.push("    name: string;");
lines.push("    kind: QuestProgressKind;");
lines.push("    varId: number;");
lines.push("    completeValue: number;");
lines.push("};");
lines.push("");
lines.push("export const QUEST_COMPLETIONS: readonly QuestCompletionDef[] = [");
for (const q of dump.quests) {
    lines.push(
        `    { questId: ${q.questId}, dbrowId: ${q.dbrowId}, name: ${JSON.stringify(q.name)}, kind: "${q.progress.kind}", varId: ${q.progress.id}, completeValue: ${q.completeValue} },`,
    );
}
lines.push("];");
lines.push("");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"));
console.log(`Wrote ${dump.quests.length} quests -> ${outPath}`);
