/**
 * World placement index for favour hint derivation.
 * Built from cache loc archives + npc-spawns.json — not hand-authored TileBounds.
 */
import fs from "fs";
import path from "path";

import { LEAGUE_MAP_SQUARE_TO_AREA_ID } from "../../../../src/shared/leagues/leagueMapSquares.data";
import { getLeagueAreaIdForTile } from "../leagues/LeagueAreaAccess";
import { logger } from "../../utils/logger";
import type { CacheEnv } from "../../world/CacheEnv";
import { LocTileLookupService, type LocTilePlacement } from "../../world/LocTileLookupService";
import type { TileBounds } from "./types";
import type { RegionalFavourRegion } from "./types";
import { REGIONAL_FAVOUR_REGION_TO_AREA_ID } from "./regions";

export type PlacementCluster = {
    count: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

type MutableCluster = PlacementCluster & {
    /** Per 16×16 cell counts for densest-subcluster selection. */
    cells: Map<string, number>;
};

function emptyCluster(): MutableCluster {
    return {
        count: 0,
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
        cells: new Map(),
    };
}

function addPoint(cluster: MutableCluster, x: number, y: number): void {
    cluster.count++;
    cluster.minX = Math.min(cluster.minX, x);
    cluster.maxX = Math.max(cluster.maxX, x);
    cluster.minY = Math.min(cluster.minY, y);
    cluster.maxY = Math.max(cluster.maxY, y);
    const cx = Math.floor(x / 16);
    const cy = Math.floor(y / 16);
    const key = `${cx}:${cy}`;
    cluster.cells.set(key, (cluster.cells.get(key) ?? 0) + 1);
}

/** Prefer a tight densest cell when the full span is huge (e.g. "Tree"). */
export function clusterToBounds(cluster: PlacementCluster, maxSpan: number = 48): TileBounds {
    const spanX = cluster.maxX - cluster.minX;
    const spanY = cluster.maxY - cluster.minY;
    if (spanX <= maxSpan && spanY <= maxSpan) {
        return {
            minX: cluster.minX,
            maxX: cluster.maxX,
            minY: cluster.minY,
            maxY: cluster.maxY,
        };
    }

    const mutable = cluster as MutableCluster;
    if (mutable.cells && mutable.cells.size > 0) {
        let bestKey = "";
        let bestCount = -1;
        for (const [key, count] of mutable.cells) {
            if (count > bestCount) {
                bestCount = count;
                bestKey = key;
            }
        }
        if (bestKey) {
            const [cx, cy] = bestKey.split(":").map((v) => Number(v));
            const minX = cx * 16;
            const minY = cy * 16;
            return {
                minX,
                maxX: minX + 15,
                minY,
                maxY: minY + 15,
            };
        }
    }

    const midX = (cluster.minX + cluster.maxX) >> 1;
    const midY = (cluster.minY + cluster.maxY) >> 1;
    const half = maxSpan >> 1;
    return {
        minX: midX - half,
        maxX: midX + half,
        minY: midY - half,
        maxY: midY + half,
    };
}

function mapSquaresForArea(areaId: number): Array<{ mapX: number; mapY: number }> {
    const out: Array<{ mapX: number; mapY: number }> = [];
    for (const [squareIdRaw, mappedArea] of Object.entries(LEAGUE_MAP_SQUARE_TO_AREA_ID)) {
        if ((mappedArea | 0) !== (areaId | 0)) continue;
        const squareId = Number(squareIdRaw) | 0;
        // map square id packing matches getMapSquareId / league data
        const mapX = (squareId >> 8) & 0xff;
        const mapY = squareId & 0xff;
        out.push({ mapX, mapY });
    }
    return out;
}

export class ResourceHintIndex {
    private readonly byLocId = new Map<number, MutableCluster>();
    private readonly byLocName = new Map<string, MutableCluster>();
    private readonly byNpcTypeId = new Map<number, MutableCluster>();
    private readonly byNpcName = new Map<string, MutableCluster>();
    private readonly npcTypeIdsByName = new Map<string, Set<number>>();

    static buildForRegion(
        region: RegionalFavourRegion,
        cacheEnv: CacheEnv,
        opts?: {
            npcSpawnsPath?: string;
            /** When provided, also index placements by LocType.name. */
            resolveLocName?: (locId: number) => string | undefined;
        },
    ): ResourceHintIndex {
        const index = new ResourceHintIndex();
        const areaId = REGIONAL_FAVOUR_REGION_TO_AREA_ID[region];
        const squares = mapSquaresForArea(areaId);
        const lookup = new LocTileLookupService(cacheEnv);

        let locCount = 0;
        for (const { mapX, mapY } of squares) {
            lookup.forEachPlacementInSquare(mapX, mapY, (placement) => {
                if ((placement.level | 0) !== 0) return;
                if (getLeagueAreaIdForTile(placement.x, placement.y) !== areaId) return;
                index.addLoc(placement, opts?.resolveLocName?.(placement.id));
                locCount++;
            });
        }

        const spawnsFile =
            opts?.npcSpawnsPath ?? path.resolve(process.cwd(), "server/data/npc-spawns.json");
        index.loadNpcSpawns(spawnsFile, areaId);

        logger.info(
            `[regionalFavours] resource hint index region=${region} squares=${squares.length} locPlacements=${locCount} npcTypes=${index.byNpcTypeId.size}`,
        );
        return index;
    }

    private addLoc(placement: LocTilePlacement, locName?: string): void {
        if ((placement.level | 0) !== 0) return;
        let cluster = this.byLocId.get(placement.id);
        if (!cluster) {
            cluster = emptyCluster();
            this.byLocId.set(placement.id, cluster);
        }
        addPoint(cluster, placement.x | 0, placement.y | 0);

        const name = locName?.trim().toLowerCase();
        if (name && name.length > 0 && name !== "null") {
            let byName = this.byLocName.get(name);
            if (!byName) {
                byName = emptyCluster();
                this.byLocName.set(name, byName);
            }
            addPoint(byName, placement.x | 0, placement.y | 0);
        }
    }

    private loadNpcSpawns(filePath: string, areaId: number): void {
        if (!fs.existsSync(filePath)) {
            logger.warn(`[regionalFavours] npc spawns missing for hint index: ${filePath}`);
            return;
        }
        let raw: unknown;
        try {
            raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
        } catch (err) {
            logger.warn(`[regionalFavours] failed to parse npc spawns`, err);
            return;
        }
        const list = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as { spawns?: unknown })?.spawns)
              ? ((raw as { spawns: unknown[] }).spawns as unknown[])
              : [];

        for (const entry of list) {
            const e = entry as {
                id?: number;
                npcId?: number;
                typeId?: number;
                name?: string;
                x?: number;
                y?: number;
                tileX?: number;
                tileY?: number;
                level?: number;
                plane?: number;
            };
            const typeId = (e.id ?? e.npcId ?? e.typeId ?? 0) | 0;
            const x = (e.x ?? e.tileX ?? 0) | 0;
            const y = (e.y ?? e.tileY ?? 0) | 0;
            const level = (e.level ?? e.plane ?? 0) | 0;
            if (!(typeId > 0) || level !== 0) continue;
            if (getLeagueAreaIdForTile(x, y) !== areaId) continue;

            let byType = this.byNpcTypeId.get(typeId);
            if (!byType) {
                byType = emptyCluster();
                this.byNpcTypeId.set(typeId, byType);
            }
            addPoint(byType, x, y);

            const name = typeof e.name === "string" ? e.name.trim().toLowerCase() : "";
            if (name) {
                let byName = this.byNpcName.get(name);
                if (!byName) {
                    byName = emptyCluster();
                    this.byNpcName.set(name, byName);
                }
                addPoint(byName, x, y);
                let idSet = this.npcTypeIdsByName.get(name);
                if (!idSet) {
                    idSet = new Set();
                    this.npcTypeIdsByName.set(name, idSet);
                }
                idSet.add(typeId);
            }
        }
    }

    getBoundsForLocIds(locIds: readonly number[], maxSpan?: number): TileBounds | undefined {
        const merged = emptyCluster();
        for (const id of locIds) {
            const cluster = this.byLocId.get(id | 0);
            if (!cluster) continue;
            // Re-add via cell merge: approximate by expanding bounds + cell counts
            merged.count += cluster.count;
            merged.minX = Math.min(merged.minX, cluster.minX);
            merged.maxX = Math.max(merged.maxX, cluster.maxX);
            merged.minY = Math.min(merged.minY, cluster.minY);
            merged.maxY = Math.max(merged.maxY, cluster.maxY);
            for (const [key, count] of cluster.cells) {
                merged.cells.set(key, (merged.cells.get(key) ?? 0) + count);
            }
        }
        if (!(merged.count > 0)) return undefined;
        return clusterToBounds(merged, maxSpan);
    }

    getBoundsForLocNames(names: readonly string[], maxSpan?: number): TileBounds | undefined {
        const merged = emptyCluster();
        for (const raw of names) {
            const cluster = this.byLocName.get(raw.trim().toLowerCase());
            if (!cluster) continue;
            merged.count += cluster.count;
            merged.minX = Math.min(merged.minX, cluster.minX);
            merged.maxX = Math.max(merged.maxX, cluster.maxX);
            merged.minY = Math.min(merged.minY, cluster.minY);
            merged.maxY = Math.max(merged.maxY, cluster.maxY);
            for (const [key, count] of cluster.cells) {
                merged.cells.set(key, (merged.cells.get(key) ?? 0) + count);
            }
        }
        if (!(merged.count > 0)) return undefined;
        return clusterToBounds(merged, maxSpan);
    }

    getBoundsForNpcTypeIds(
        typeIds: readonly number[],
        maxSpan?: number,
    ): TileBounds | undefined {
        const merged = emptyCluster();
        for (const id of typeIds) {
            const cluster = this.byNpcTypeId.get(id | 0);
            if (!cluster) continue;
            merged.count += cluster.count;
            merged.minX = Math.min(merged.minX, cluster.minX);
            merged.maxX = Math.max(merged.maxX, cluster.maxX);
            merged.minY = Math.min(merged.minY, cluster.minY);
            merged.maxY = Math.max(merged.maxY, cluster.maxY);
            for (const [key, count] of cluster.cells) {
                merged.cells.set(key, (merged.cells.get(key) ?? 0) + count);
            }
        }
        if (!(merged.count > 0)) return undefined;
        return clusterToBounds(merged, maxSpan);
    }

    getBoundsForNpcName(name: string, maxSpan?: number): TileBounds | undefined {
        const cluster = this.byNpcName.get(name.trim().toLowerCase());
        if (!cluster || !(cluster.count > 0)) return undefined;
        return clusterToBounds(cluster, maxSpan);
    }

    getNpcTypeIdsForName(name: string): number[] {
        const set = this.npcTypeIdsByName.get(name.trim().toLowerCase());
        return set ? [...set].sort((a, b) => a - b) : [];
    }

    getNpcTypeIdsForNames(names: readonly string[]): number[] {
        const ids = new Set<number>();
        for (const name of names) {
            for (const id of this.getNpcTypeIdsForName(name)) {
                ids.add(id);
            }
        }
        return [...ids].sort((a, b) => a - b);
    }
}
