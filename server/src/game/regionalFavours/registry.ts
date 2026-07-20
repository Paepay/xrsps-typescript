import { MISTHALIN_FAVOUR_DEFINITIONS } from "./definitions/misthalin";
import { ASGARNIA_FAVOUR_DEFINITIONS } from "./definitions/asgarnia";
import {
    buildSeekContactDefinitions,
    getRegionalContactByNpcId,
    isSeekContactFavourId,
} from "./contacts";
import { NpcIds, REGIONAL_NPC_ALIASES, resolveRegionalNpcId } from "./constants";
import type { RegionalFavourDefinition, RegionalFavourRegion } from "./types";

const byId = new Map<string, RegionalFavourDefinition>();
const byGiver = new Map<number, RegionalFavourDefinition[]>();
const byRegion = new Map<RegionalFavourRegion, RegionalFavourDefinition[]>();

function index(defs: readonly RegionalFavourDefinition[]): void {
    for (const def of defs) {
        if (byId.has(def.id)) {
            throw new Error(`Duplicate favour id: ${def.id}`);
        }
        byId.set(def.id, def);
        const giverList = byGiver.get(def.giverNpcId) ?? [];
        giverList.push(def);
        byGiver.set(def.giverNpcId, giverList);
        const regionList = byRegion.get(def.region) ?? [];
        regionList.push(def);
        byRegion.set(def.region, regionList);
    }
}

/** Seek-contact defs are look-up only — never part of the random favour pool. */
function indexSeekOnly(defs: readonly RegionalFavourDefinition[]): void {
    for (const def of defs) {
        if (byId.has(def.id)) {
            throw new Error(`Duplicate favour id: ${def.id}`);
        }
        byId.set(def.id, def);
    }
}

index(MISTHALIN_FAVOUR_DEFINITIONS);
index(ASGARNIA_FAVOUR_DEFINITIONS);
indexSeekOnly(buildSeekContactDefinitions());

// Hint coverage is asserted after gatherHints are derived from world data
// (see initRegionalFavourHints / wsServer bootstrap).

export function getRegionalFavourDefinition(favourId: string): RegionalFavourDefinition | undefined {
    return byId.get(favourId);
}

export function getRegionalFavoursForGiver(npcId: number): readonly RegionalFavourDefinition[] {
    const resolved = resolveRegionalNpcId(npcId);
    return byGiver.get(resolved) ?? byGiver.get(npcId) ?? [];
}

/**
 * Home favour region for an NPC: contact → giver pool → turn-in / speak target.
 * Never guesses Misthalin — callers fall back to the player's tile region if needed.
 */
export function getRegionalFavourRegionForNpc(
    npcId: number,
): RegionalFavourRegion | undefined {
    const resolved = resolveRegionalNpcId(npcId);
    const contact = getRegionalContactByNpcId(resolved) ?? getRegionalContactByNpcId(npcId);
    if (contact) return contact.region;

    const asGiver = getRegionalFavoursForGiver(resolved);
    if (asGiver.length > 0) return asGiver[0].region;

    for (const def of byId.values()) {
        if (isSeekContactFavourId(def.id)) continue;
        if (resolveRegionalNpcId(def.turnInNpcId) === resolved) return def.region;
        if (def.targetNpcIds?.some((id) => resolveRegionalNpcId(id) === resolved)) {
            return def.region;
        }
    }
    return undefined;
}

export function getRegionalFavoursForRegion(
    region: RegionalFavourRegion,
): readonly RegionalFavourDefinition[] {
    return byRegion.get(region) ?? [];
}

export function getAllRegionalFavourDefinitions(): readonly RegionalFavourDefinition[] {
    return [...byId.values()];
}

export function isRegionalFavourNpc(npcId: number): boolean {
    return byGiver.has(npcId) || [...byId.values()].some((d) => d.turnInNpcId === npcId);
}

export function getAllRegionalFavourNpcIds(): number[] {
    const ids = new Set<number>();
    for (const def of byId.values()) {
        ids.add(def.giverNpcId);
        ids.add(def.turnInNpcId);
        for (const targetId of def.targetNpcIds ?? []) {
            ids.add(targetId);
        }
    }
    return [...ids];
}

/** Every type id that must receive regional-task talk handlers (canonical + aliases). */
export function getAllRegionalFavourNpcTypeIdsForScripts(): number[] {
    const ids = new Set<number>(getAllRegionalFavourNpcIds());
    for (const [alias, canonical] of Object.entries(REGIONAL_NPC_ALIASES)) {
        ids.add(Number(alias));
        ids.add(canonical);
    }
    for (const id of Object.values(NpcIds)) {
        if (typeof id === "number") ids.add(id);
    }
    return [...ids];
}
