/**
 * Clear all quest completion vars for an account in player-state.json.
 * Usage: npx tsx scripts/cache/clear-quest-completions-for-account.ts [account]
 */
import fs from "fs";
import path from "path";
import { QUEST_COMPLETIONS } from "../../server/src/game/quests/questCompletions.data";

/** Varp: total quest points (drop tables / UI). */
const VARP_QUEST_POINTS = 101;

const account = (process.argv[2] ?? "p").trim().toLowerCase();
const storePath = path.resolve("server/data/player-state.json");

const questVarpIds = new Set<number>([
    VARP_QUEST_POINTS,
    139, // Legend's Quest extras
    161, // Underground Pass extras
]);
const questVarbitIds = new Set<number>([
    9133, // Iban's book
    6067, // Mage Arena II
    5619, // Client of Kourend
    4896, // Arceuus favour
    9631,
]);

for (const q of QUEST_COMPLETIONS) {
    if (q.kind === "varp") questVarpIds.add(q.varId);
    else questVarbitIds.add(q.varId);
}

const data = JSON.parse(fs.readFileSync(storePath, "utf8")) as Record<
    string,
    { varps?: Record<string, number>; varbits?: Record<string, number> }
>;
const player = data[account];
if (!player) {
    console.error(`Account "${account}" not found in ${storePath}`);
    process.exit(1);
}

const varps: Record<string, number> = { ...(player.varps ?? {}) };
const varbits: Record<string, number> = { ...(player.varbits ?? {}) };

let clearedVarps = 0;
let clearedVarbits = 0;

for (const id of questVarpIds) {
    const key = String(id);
    if (Object.prototype.hasOwnProperty.call(varps, key) && (varps[key] | 0) !== 0) {
        delete varps[key];
        clearedVarps++;
    }
}
for (const id of questVarbitIds) {
    const key = String(id);
    if (Object.prototype.hasOwnProperty.call(varbits, key) && (varbits[key] | 0) !== 0) {
        delete varbits[key];
        clearedVarbits++;
    }
}

if (Object.keys(varps).length > 0) player.varps = varps;
else delete player.varps;
if (Object.keys(varbits).length > 0) player.varbits = varbits;
else delete player.varbits;

data[account] = player;
fs.writeFileSync(storePath, JSON.stringify(data, null, 2) + "\n");
console.log(
    `Cleared quest completions for "${account}": ${clearedVarps} varps, ${clearedVarbits} varbits.`,
);
console.log(`If "${account}" is logged in, relog (or restart the server) so the wipe applies.`);
