/**
 * Runtime lookup for painter tile overrides over the map-square seed table.
 */
import { packLeagueTile } from "./leagueTilePack";
import { LEAGUE_TILE_AREA_OVERRIDE_PAIRS } from "./leagueRegionTileOverrides.data";

/** packedTile -> areaId (0 = explicit neutral / unmapped). */
const TILE_OVERRIDE_BY_PACKED = new Map<number, number>();

for (let i = 0; i < LEAGUE_TILE_AREA_OVERRIDE_PAIRS.length; i += 2) {
    TILE_OVERRIDE_BY_PACKED.set(
        LEAGUE_TILE_AREA_OVERRIDE_PAIRS[i],
        LEAGUE_TILE_AREA_OVERRIDE_PAIRS[i + 1],
    );
}

export function getLeagueTileAreaOverride(tileX: number, tileY: number): number | undefined {
    return TILE_OVERRIDE_BY_PACKED.get(packLeagueTile(tileX, tileY));
}

export function hasLeagueTileAreaOverrides(): boolean {
    return TILE_OVERRIDE_BY_PACKED.size > 0;
}

export function getLeagueTileAreaOverrideCount(): number {
    return TILE_OVERRIDE_BY_PACKED.size;
}
