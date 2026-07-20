/**
 * Region-scoped kill-target hint areas from npc-spawns (ResourceHintIndex).
 */
import type { ResourceHintIndex } from "./resourceHintIndex";
import type { RegionalFavourRegion, TileBounds } from "./types";

export type KillHintSpec = {
    area: TileBounds;
    npcTypeIds: readonly number[];
};

const indexesByRegion = new Map<RegionalFavourRegion, ResourceHintIndex>();

export function setResourceHintIndexForRegion(
    region: RegionalFavourRegion,
    index: ResourceHintIndex,
): void {
    indexesByRegion.set(region, index);
}

export function getResourceHintIndexForRegion(
    region: RegionalFavourRegion,
): ResourceHintIndex | undefined {
    return indexesByRegion.get(region);
}

/** Densest spawn cluster for these type ids inside the favour region. */
export function getKillHintForNpcIds(
    region: RegionalFavourRegion | undefined,
    npcTypeIds: readonly number[] | undefined,
): KillHintSpec | undefined {
    if (!region || !npcTypeIds || npcTypeIds.length === 0) return undefined;
    const index = indexesByRegion.get(region);
    if (!index) return undefined;
    const area = index.getBoundsForNpcTypeIds(npcTypeIds, 40);
    if (!area) return undefined;
    return { area, npcTypeIds };
}
