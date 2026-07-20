import {
    QUEST_FAVOUR_COSTS,
    type QuestFavourCostDef,
} from "./questFavourCosts.data";

function normalizeQuestKey(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const BY_CACHE_NAME = new Map<string, QuestFavourCostDef>();
const BY_WIKI_NAME = new Map<string, QuestFavourCostDef>();

for (const def of QUEST_FAVOUR_COSTS) {
    BY_WIKI_NAME.set(normalizeQuestKey(def.wikiName), def);
    if (def.cacheName) {
        BY_CACHE_NAME.set(normalizeQuestKey(def.cacheName), def);
    }
}

export function getAllQuestFavourCosts(): readonly QuestFavourCostDef[] {
    return QUEST_FAVOUR_COSTS;
}

export function findQuestFavourCost(search: string): QuestFavourCostDef | undefined {
    const key = normalizeQuestKey(search);
    if (!key) return undefined;

    const exact = BY_CACHE_NAME.get(key) ?? BY_WIKI_NAME.get(key);
    if (exact) return exact;

    for (const def of QUEST_FAVOUR_COSTS) {
        if (
            normalizeQuestKey(def.wikiName).includes(key) ||
            (def.cacheName && normalizeQuestKey(def.cacheName).includes(key))
        ) {
            return def;
        }
    }
    return undefined;
}

export function getQuestFavourCostForCacheName(cacheName: string): number | undefined {
    return BY_CACHE_NAME.get(normalizeQuestKey(cacheName))?.favourCost;
}

export function getQuestFavourCostForDisplayName(displayName: string): QuestFavourCostDef | undefined {
    return findQuestFavourCost(displayName);
}

/** Favour points awarded for completing a non-seek regional favour. */
export const FAVOUR_POINTS_PER_TASK = 1;
