import { getRegionalContact, isSeekContactFavourId } from "./contacts";
import { getGatherHintForItem } from "./gatherHints";
import { getRegionalFavourDefinition } from "./registry";
import type { ActiveRegionalFavour, RegionalFavourRegion, TileBounds } from "./types";

export type FavourHintTile = {
    worldX: number;
    worldY: number;
    height?: number;
    /** Only snap the in-world arrow to these NPC type ids (empty = never snap to NPCs). */
    npcTypeIds?: readonly number[];
    /** LocType.name values for local object arrows (e.g. "Mithril rocks"). */
    objectNames?: readonly string[];
    /** Mining rock id (e.g. "mithril") — preferred over name matching. */
    rockId?: string;
};

export type FavourHintNpcLookup = {
    findNearestNpcTile(
        typeIds: readonly number[],
        nearX: number,
        nearY: number,
    ): { x: number; y: number } | undefined;
};

export type FavourHintInventory = {
    getItemCount(itemId: number): number;
};

function areaCenter(
    area: TileBounds,
    extras?: Pick<FavourHintTile, "npcTypeIds" | "objectNames" | "rockId">,
): FavourHintTile {
    return {
        worldX: (area.minX + area.maxX) >> 1,
        worldY: (area.minY + area.maxY) >> 1,
        height: area.level ?? 0,
        npcTypeIds: extras?.npcTypeIds,
        objectNames: extras?.objectNames,
        rockId: extras?.rockId,
    };
}

function resolveNpcTile(
    lookup: FavourHintNpcLookup | undefined,
    typeIds: readonly number[],
    nearX: number,
    nearY: number,
): FavourHintTile | undefined {
    if (!lookup || typeIds.length === 0) return undefined;
    const tile = lookup.findNearestNpcTile(typeIds, nearX, nearY);
    if (!tile) return undefined;
    return {
        worldX: tile.x,
        worldY: tile.y,
        height: 0,
        npcTypeIds: typeIds,
    };
}

function isGatherLike(category: string | undefined): boolean {
    return (
        category === "GATHER_ITEM" ||
        category === "PRODUCE_ITEM" ||
        category === "PROCESS_ITEM" ||
        category === "RETURN_ITEM" ||
        category === "MULTI_STEP"
    );
}

/**
 * Resolve where the favour "go next" hint arrow should point.
 * Gather-like tasks point at the resource until the player has enough items.
 */
export function resolveFavourHintTarget(
    active: ActiveRegionalFavour | undefined,
    region: RegionalFavourRegion | undefined,
    playerTileX: number,
    playerTileY: number,
    lookup?: FavourHintNpcLookup,
    inventory?: FavourHintInventory,
): FavourHintTile | undefined {
    if (!active) {
        if (!region) return undefined;
        const contact = getRegionalContact(region);
        if (!contact) return undefined;
        const ids = [contact.npcId, ...(contact.aliasNpcIds ?? [])];
        return resolveNpcTile(lookup, ids, playerTileX, playerTileY);
    }

    const def = getRegionalFavourDefinition(active.favourId);
    const turnInIds = [active.turnInNpcId];

    if (active.objectiveComplete) {
        return resolveNpcTile(lookup, turnInIds, playerTileX, playerTileY);
    }

    // Gather / produce: resource first, then turn-in once the player has enough.
    if (def && isGatherLike(def.category) && def.targetItemId) {
        const need = Math.max(1, active.requiredAmount | 0);
        const have = inventory?.getItemCount(def.targetItemId) ?? 0;
        // Existing-item tasks: inventory count. Post-assignment: favour progress.
        const resourceDone =
            active.objectiveComplete ||
            (def.acceptsExistingItems ? have >= need : active.progress >= need);
        if (!resourceDone) {
            const fromDefNames = def.targetObjectNames;
            const registry = getGatherHintForItem(def.targetItemId);
            const area = def.targetArea ?? registry?.area;
            const objectNames =
                fromDefNames && fromDefNames.length > 0
                    ? fromDefNames
                    : registry?.objectNames;
            const rockId = registry?.rockId;
            if (area) {
                return areaCenter(area, { objectNames, rockId });
            }
            if ((objectNames && objectNames.length > 0) || rockId) {
                return {
                    worldX: playerTileX,
                    worldY: playerTileY,
                    height: 0,
                    objectNames,
                    rockId,
                };
            }
            return undefined;
        }
        return resolveNpcTile(lookup, turnInIds, playerTileX, playerTileY);
    }

    if (def?.category === "VISIT_LOCATION" && def.targetArea) {
        return areaCenter(def.targetArea);
    }

    if (
        def?.targetArea &&
        (def.category === "USE_OBJECT" || def.category === "PERFORM_SKILL_ACTION")
    ) {
        return areaCenter(def.targetArea, {
            objectNames: def.targetObjectNames,
        });
    }

    const targetNpcIds =
        def?.targetNpcIds && def.targetNpcIds.length > 0
            ? def.targetNpcIds
            : isSeekContactFavourId(active.favourId)
              ? turnInIds
              : def?.category === "SPEAK_TO_NPC" ||
                  def?.category === "KILL_NPC" ||
                  def?.category === "DELIVER_ITEM"
                ? turnInIds
                : undefined;

    if (targetNpcIds && targetNpcIds.length > 0) {
        const tile = resolveNpcTile(lookup, targetNpcIds, playerTileX, playerTileY);
        if (tile) return tile;
    }

    return resolveNpcTile(lookup, turnInIds, playerTileX, playerTileY);
}
