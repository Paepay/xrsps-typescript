/**
 * Parses task names to extract trigger criteria.
 * Uses pattern matching to identify trigger type and target.
 */
import { SkillId, SKILL_NAME } from "../../../../../src/rs/skill/skills";
import type { LevelReachTrigger, TaskTrigger } from "./TriggerTypes";

export type NameToIdsLookup = (name: string) => number[];

export interface TriggerParserLoaders {
    getNpcIdsByName: NameToIdsLookup;
    getItemIdsByName: NameToIdsLookup;
}

const SKILL_NAME_TO_ID: Record<string, SkillId> = (() => {
    const map: Record<string, SkillId> = {};
    for (const [idText, name] of Object.entries(SKILL_NAME)) {
        const id = Number(idText) as SkillId;
        map[name.toLowerCase()] = id;
    }
    map.runecrafting = SkillId.Runecraft;
    map.rc = SkillId.Runecraft;
    map.hp = SkillId.Hitpoints;
    map.hitpoint = SkillId.Hitpoints;
    map.range = SkillId.Ranged;
    map.ranging = SkillId.Ranged;
    map.mage = SkillId.Magic;
    map.def = SkillId.Defence;
    map.str = SkillId.Strength;
    map.att = SkillId.Attack;
    map.atk = SkillId.Attack;
    return map;
})();

function resolveSkillIdByName(name: string): SkillId | undefined {
    const key = name.trim().toLowerCase();
    if (!key) return undefined;
    return SKILL_NAME_TO_ID[key];
}

function parseExcludedSkillIds(description: string): number[] | undefined {
    const match = description.match(/not including\s+(.+?)\)/i);
    if (!match) return undefined;
    const parts = match[1]
        .split(/,| and /i)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
    const ids: number[] = [];
    for (const part of parts) {
        const skillId = resolveSkillIdByName(part);
        if (skillId !== undefined) {
            ids.push(skillId);
        }
    }
    return ids.length > 0 ? ids : undefined;
}

function parseLevelReachTrigger(name: string, description: string): LevelReachTrigger | undefined {
    if (/^achieve your first level up$/i.test(name)) {
        return { type: "level_reach", mode: "first_level_up", level: 0 };
    }

    const firstLevelMatch = name.match(/^achieve your first level\s+(\d+)$/i);
    if (firstLevelMatch) {
        const level = Number.parseInt(firstLevelMatch[1], 10);
        if (!Number.isFinite(level) || level <= 0) return undefined;
        return {
            type: "level_reach",
            mode: "any",
            level,
            excludeSkillIds: parseExcludedSkillIds(description),
        };
    }

    const totalMatch = name.match(/^reach total level\s+(\d+)$/i);
    if (totalMatch) {
        const level = Number.parseInt(totalMatch[1], 10);
        if (!Number.isFinite(level) || level <= 0) return undefined;
        return { type: "level_reach", mode: "total", level };
    }

    const baseMatch = name.match(/^reach base level\s+(\d+)$/i);
    if (baseMatch) {
        const level = Number.parseInt(baseMatch[1], 10);
        if (!Number.isFinite(level) || level <= 0) return undefined;
        return { type: "level_reach", mode: "base", level };
    }

    const skillMatch = name.match(/^reach level\s+(\d+)\s+(.+)$/i);
    if (skillMatch) {
        const level = Number.parseInt(skillMatch[1], 10);
        const skillId = resolveSkillIdByName(skillMatch[2]);
        if (!Number.isFinite(level) || level <= 0 || skillId === undefined) return undefined;
        return { type: "level_reach", mode: "skill", skillId, level };
    }

    return undefined;
}

/**
 * Parse a task name and description to determine its trigger.
 * Returns undefined if the task can't be auto-parsed (needs manual trigger).
 */
export function parseTaskTrigger(
    name: string,
    description: string,
    loaders: TriggerParserLoaders,
): TaskTrigger | undefined {
    const nameLower = name.toLowerCase();
    const descLower = description.toLowerCase();

    // === NPC Kill patterns ===
    // "Defeat a Moss Giant", "Kill 10 Goblins", "Slay a Black Dragon"
    const killPatterns = [
        /^(defeat|kill|slay)\s+(a\s+|an\s+|the\s+)?(\d+\s+)?(.+)$/i,
        /^(\d+)\s+(.+?)\s+(kill|kills)$/i, // "10 Goblin Kills" or "1 Zulrah Kill"
    ];

    for (const pattern of killPatterns) {
        const match = name.match(pattern);
        if (match) {
            let npcName: string;
            let count = 1;

            if (pattern === killPatterns[1]) {
                // "10 Goblin Kills" pattern
                count = parseInt(match[1], 10) || 1;
                npcName = match[2].trim();
            } else {
                // "Defeat a Moss Giant" pattern
                count = match[3] ? parseInt(match[3], 10) || 1 : 1;
                npcName = match[4].trim();
            }

            // Clean up NPC name (remove trailing location info)
            // "Moss Giant in Tirannwn" -> "Moss Giant"
            npcName = npcName.replace(/\s+(in|at|on|near)\s+.+$/i, "").trim();

            const npcIds = loaders.getNpcIdsByName(npcName);
            if (npcIds.length > 0) {
                return {
                    type: "npc_kill",
                    npcIds,
                    count: count > 1 ? count : undefined,
                };
            }
        }
    }

    // === Item Equip patterns ===
    // "Equip a Dragon Scimitar", "Wear a Fire Cape"
    const equipMatch = name.match(/^(equip|wear)\s+(a\s+|an\s+|the\s+|any\s+)?(.+)$/i);
    if (equipMatch) {
        let itemName = equipMatch[3].trim();

        // Handle "Piece of X" or "Full X set" - these need special handling
        if (itemName.toLowerCase().includes("piece of") || itemName.toLowerCase().includes("set")) {
            // These are complex, skip auto-parsing
            return undefined;
        }

        const itemIds = loaders.getItemIdsByName(itemName);
        if (itemIds.length > 0) {
            return {
                type: "item_equip",
                itemIds,
            };
        }
    }

    // === Item Obtain patterns ===
    // "Obtain a Dragon Axe", "Receive a Pet"
    const obtainMatch = name.match(
        /^(obtain|receive|get|loot)\s+(a\s+|an\s+|the\s+)?(\d+\s+)?(.+)$/i,
    );
    if (obtainMatch) {
        const count = obtainMatch[3] ? parseInt(obtainMatch[3], 10) || 1 : 1;
        const itemName = obtainMatch[4].trim();

        const itemIds = loaders.getItemIdsByName(itemName);
        if (itemIds.length > 0) {
            return {
                type: "item_obtain",
                itemIds,
                count: count > 1 ? count : undefined,
            };
        }
    }

    // === Item Craft patterns ===
    // "Craft a Black D'hide Body", "Smith a Rune Platebody", "Cook a Shark"
    const craftMatch = name.match(
        /^(craft|smith|cook|fletch|create|make|brew)\s+(a\s+|an\s+|the\s+)?(\d+\s+)?(.+)$/i,
    );
    if (craftMatch) {
        const count = craftMatch[3] ? parseInt(craftMatch[3], 10) || 1 : 1;
        let itemName = craftMatch[4].trim();

        // Remove "(u)" suffix for unstrung items
        itemName = itemName.replace(/\s*\(u\)\s*$/i, "");

        const itemIds = loaders.getItemIdsByName(itemName);
        if (itemIds.length > 0) {
            return {
                type: "item_craft",
                itemIds,
                count: count > 1 ? count : undefined,
            };
        }
    }

    // === Resource Gather patterns ===
    // "Chop 100 Magic Logs", "Mine a Runite Ore", "Catch a Shark"
    const gatherMatch = name.match(
        /^(chop|mine|catch|fish|pick|harvest)\s+(a\s+|an\s+|the\s+)?(\d+\s+)?(.+)$/i,
    );
    if (gatherMatch) {
        const count = gatherMatch[3] ? parseInt(gatherMatch[3], 10) || 1 : 1;
        const itemName = gatherMatch[4].trim();

        const itemIds = loaders.getItemIdsByName(itemName);
        if (itemIds.length > 0) {
            // Gathering is essentially obtaining the item
            return {
                type: "item_obtain",
                itemIds,
                count: count > 1 ? count : undefined,
            };
        }
    }

    // === Skill / level threshold patterns ===
    // "Reach Level 99 Attack", "Achieve Your First Level 5", "Reach Total Level 100", "Reach Base Level 10"
    const levelReach = parseLevelReachTrigger(name, description);
    if (levelReach) {
        return levelReach;
    }

    // No pattern matched - needs manual trigger
    return undefined;
}

/**
 * Build name-to-IDs lookup functions from cache loaders.
 */
export function buildNameLookups(
    npcTypeLoader: { load: (id: number) => { name?: string } | undefined } | undefined,
    objTypeLoader: { load: (id: number) => { name?: string } | undefined } | undefined,
): TriggerParserLoaders {
    // Build NPC name -> IDs map
    const npcNameToIds = new Map<string, number[]>();
    if (npcTypeLoader) {
        for (let id = 0; id < 20000; id++) {
            const npc = npcTypeLoader.load(id);
            if (npc?.name && npc.name !== "null") {
                const nameLower = npc.name.toLowerCase();
                let ids = npcNameToIds.get(nameLower);
                if (!ids) {
                    ids = [];
                    npcNameToIds.set(nameLower, ids);
                }
                ids.push(id);
            }
        }
    }

    // Build item name -> IDs map
    const itemNameToIds = new Map<string, number[]>();
    if (objTypeLoader) {
        for (let id = 0; id < 30000; id++) {
            const item = objTypeLoader.load(id);
            if (item?.name && item.name !== "null") {
                const nameLower = item.name.toLowerCase();
                let ids = itemNameToIds.get(nameLower);
                if (!ids) {
                    ids = [];
                    itemNameToIds.set(nameLower, ids);
                }
                ids.push(id);
            }
        }
    }

    return {
        getNpcIdsByName: (name: string) => npcNameToIds.get(name.toLowerCase()) ?? [],
        getItemIdsByName: (name: string) => itemNameToIds.get(name.toLowerCase()) ?? [],
    };
}
