/**
 * Per-world-tile paint storage + export (GeoJSON polygons / sparse JSON).
 *
 * Packed key: (tileX << 14) | tileY  (Y fits in 14 bits: max world Y is 12800).
 */

import { LEAGUE_AREA_ID_TO_NAME } from "../../shared/leagues/leagueAreas";

export type SquareSeed = Readonly<Record<number, number>>; // mapSquareId -> areaId
export type TilePaintMap = Map<number, number>; // packedTile -> areaId (0 = explicit neutral)

const Y_BITS = 14;
const Y_MASK = (1 << Y_BITS) - 1;

export function packTile(tileX: number, tileY: number): number {
    return ((tileX | 0) << Y_BITS) | (tileY & Y_MASK);
}

export function unpackTile(packed: number): { tileX: number; tileY: number } {
    return { tileX: packed >>> Y_BITS, tileY: packed & Y_MASK };
}

export function mapXYToSquareId(mapX: number, mapY: number): number {
    return (mapX << 8) | mapY;
}

export function squareIdToMapXY(squareId: number): { mapX: number; mapY: number } {
    return { mapX: squareId >> 8, mapY: squareId & 0xff };
}

export function squareWorldBounds(mapX: number, mapY: number): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
} {
    return {
        minX: mapX * 64,
        minY: mapY * 64,
        maxX: mapX * 64 + 64,
        maxY: mapY * 64 + 64,
    };
}

/** Resolve area for a world tile: explicit paint wins, else square seed. */
export function getTileArea(
    tileX: number,
    tileY: number,
    tilePaint: TilePaintMap,
    squareSeed: SquareSeed,
): number {
    const packed = packTile(tileX, tileY);
    if (tilePaint.has(packed)) return tilePaint.get(packed)!;
    const squareId = mapXYToSquareId(tileX >> 6, tileY >> 6);
    return squareSeed[squareId] ?? 0;
}

export function applyBrush(
    tilePaint: TilePaintMap,
    centerX: number,
    centerY: number,
    brushAreaId: number,
    brushSize: number,
    shape: "square" | "circle",
): TilePaintMap {
    const next = new Map(tilePaint);
    const half = (brushSize - 1) / 2;
    const r = brushSize / 2;
    const r2 = r * r;
    const minX = Math.floor(centerX - half);
    const maxX = Math.ceil(centerX + half);
    const minY = Math.floor(centerY - half);
    const maxY = Math.ceil(centerY + half);

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (x < 0 || y < 0 || x >= 6400 || y >= 12800) continue;
            if (shape === "circle") {
                const dx = x - centerX;
                const dy = y - centerY;
                if (dx * dx + dy * dy > r2) continue;
            }
            const packed = packTile(x, y);
            if (brushAreaId === 0) next.set(packed, 0);
            else next.set(packed, brushAreaId);
        }
    }
    return next;
}

/**
 * Edge-walk outline for a set of unit cells (world tiles).
 * cells: "x,y" strings. Returns rings in world-tile coords.
 */
export function cellsToPolygonRings(cellKeys: Iterable<string>): number[][][] {
    const cells = new Set(cellKeys);
    if (cells.size === 0) return [];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const key of cells) {
        const [x, y] = key.split(",").map(Number);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }

    type Edge = { x0: number; y0: number; x1: number; y1: number };
    const hEdges = new Map<string, Edge>();
    const vEdges = new Map<string, Edge>();

    const addH = (x: number, y: number) => {
        const key = `${x},${y}`;
        if (hEdges.has(key)) hEdges.delete(key);
        else hEdges.set(key, { x0: x, y0: y, x1: x + 1, y1: y });
    };
    const addV = (x: number, y: number) => {
        const key = `${x},${y}`;
        if (vEdges.has(key)) vEdges.delete(key);
        else vEdges.set(key, { x0: x, y0: y, x1: x, y1: y + 1 });
    };

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (!cells.has(`${x},${y}`)) continue;
            addH(x, y);
            addH(x, y + 1);
            addV(x, y);
            addV(x + 1, y);
        }
    }

    type Pt = string;
    const pt = (x: number, y: number): Pt => `${x},${y}`;
    const adj = new Map<Pt, Pt[]>();
    const link = (x0: number, y0: number, x1: number, y1: number) => {
        const a = pt(x0, y0);
        const b = pt(x1, y1);
        if (!adj.has(a)) adj.set(a, []);
        if (!adj.has(b)) adj.set(b, []);
        adj.get(a)!.push(b);
        adj.get(b)!.push(a);
    };
    for (const e of hEdges.values()) link(e.x0, e.y0, e.x1, e.y1);
    for (const e of vEdges.values()) link(e.x0, e.y0, e.x1, e.y1);

    const used = new Set<string>();
    const edgeKey = (a: Pt, b: Pt) => `${a}->${b}`;
    const rings: number[][][] = [];

    for (const start of adj.keys()) {
        for (const first of adj.get(start) ?? []) {
            if (used.has(edgeKey(start, first))) continue;

            const ring: Array<[number, number]> = [];
            let cur = start;
            let next = first;
            let guard = 0;
            while (guard++ < 500000) {
                used.add(edgeKey(cur, next));
                const [cx, cy] = cur.split(",").map(Number) as [number, number];
                ring.push([cx, cy]);
                if (next === start) break;

                const prev = cur;
                cur = next;
                const [px, py] = prev.split(",").map(Number) as [number, number];
                const [qx, qy] = cur.split(",").map(Number) as [number, number];
                const inDx = qx - px;
                const inDy = qy - py;

                const rank = (to: Pt): number => {
                    const [tx, ty] = to.split(",").map(Number) as [number, number];
                    const odx = tx - qx;
                    const ody = ty - qy;
                    const cross = inDx * ody - inDy * odx;
                    if (cross > 0) return 0;
                    if (cross === 0) return 1;
                    return 2;
                };

                const candidates = adj.get(cur) ?? [];
                const unused = candidates
                    .filter((c) => c !== prev && !used.has(edgeKey(cur, c)))
                    .sort((a, b) => rank(a) - rank(b));
                const chosen =
                    unused[0] ?? candidates.find((c) => !used.has(edgeKey(cur, c))) ?? null;
                if (!chosen) break;
                next = chosen;
            }

            if (ring.length >= 3) {
                const firstPt = ring[0];
                const lastPt = ring[ring.length - 1];
                if (firstPt[0] !== lastPt[0] || firstPt[1] !== lastPt[1]) {
                    ring.push([firstPt[0], firstPt[1]]);
                }
                rings.push(ring.map(([x, y]) => [x, y]));
            }
        }
    }
    return rings;
}

/**
 * Build GeoJSON without exploding every seed square into 4096 cells.
 *
 * - Untouched seed squares → one 64×64 rectangle each (fast)
 * - Map squares that have any tile overrides → polygonize only that 64×64
 *   effective tile mask per area
 */
export function paintToGeoJson(tilePaint: TilePaintMap, squareSeed: SquareSeed): object {
    // packed overrides grouped by map-square id
    const dirtySquares = new Set<number>();
    for (const packed of tilePaint.keys()) {
        const { tileX, tileY } = unpackTile(packed);
        dirtySquares.add(mapXYToSquareId(tileX >> 6, tileY >> 6));
    }

    const byAreaRings = new Map<number, number[][][]>();
    const byAreaTileCount = new Map<number, number>();

    const addRing = (areaId: number, ring: number[][], tileCount: number) => {
        if (!(areaId > 0) || ring.length < 4) return;
        if (!byAreaRings.has(areaId)) byAreaRings.set(areaId, []);
        byAreaRings.get(areaId)!.push(ring);
        byAreaTileCount.set(areaId, (byAreaTileCount.get(areaId) ?? 0) + tileCount);
    };

    const rectRing = (minX: number, minY: number, maxX: number, maxY: number): number[][] => [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY],
    ];

    // Clean seed squares → single rect
    for (const [squareIdStr, seedArea] of Object.entries(squareSeed)) {
        if (!(seedArea > 0)) continue;
        const squareId = Number(squareIdStr);
        if (dirtySquares.has(squareId)) continue;
        const { mapX, mapY } = squareIdToMapXY(squareId);
        const { minX, minY, maxX, maxY } = squareWorldBounds(mapX, mapY);
        addRing(seedArea, rectRing(minX, minY, maxX, maxY), 4096);
    }

    // Dirty squares → expand only 64×64 and polygonize per area inside the square
    for (const squareId of dirtySquares) {
        const { mapX, mapY } = squareIdToMapXY(squareId);
        const baseX = mapX * 64;
        const baseY = mapY * 64;
        const byAreaCells = new Map<number, string[]>();

        for (let ly = 0; ly < 64; ly++) {
            for (let lx = 0; lx < 64; lx++) {
                const tx = baseX + lx;
                const ty = baseY + ly;
                const area = getTileArea(tx, ty, tilePaint, squareSeed);
                if (!(area > 0)) continue;
                if (!byAreaCells.has(area)) byAreaCells.set(area, []);
                byAreaCells.get(area)!.push(`${tx},${ty}`);
            }
        }

        for (const [areaId, cells] of byAreaCells) {
            const rings = cellsToPolygonRings(cells);
            for (const ring of rings) {
                addRing(areaId, ring, cells.length);
            }
            // tileCount is over-counted if multiple rings; store unique cell count once
            byAreaTileCount.set(
                areaId,
                (byAreaTileCount.get(areaId) ?? 0) - cells.length * Math.max(0, rings.length - 1),
            );
        }
    }

    const features: object[] = [];
    for (const areaId of [...byAreaRings.keys()].sort((a, b) => a - b)) {
        const rings = byAreaRings.get(areaId)!;
        features.push({
            type: "Feature",
            properties: {
                areaId,
                name: LEAGUE_AREA_ID_TO_NAME[areaId] ?? `Area ${areaId}`,
                tileCount: byAreaTileCount.get(areaId) ?? 0,
                partCount: rings.length,
            },
            geometry:
                rings.length === 1
                    ? { type: "Polygon", coordinates: [rings[0]] }
                    : { type: "MultiPolygon", coordinates: rings.map((r) => [r]) },
        });
    }

    return {
        type: "FeatureCollection",
        properties: {
            version: 2,
            resolution: "hybrid-tile",
            dirtySquareCount: dirtySquares.size,
            note: "Clean map-squares are 64x64 rects; overridden squares are tile-accurate outlines.",
        },
        features,
    };
}

/** @deprecated Prefer paintToGeoJson hybrid; kept for tests. */
export function collectAreaTiles(
    areaId: number,
    tilePaint: TilePaintMap,
    squareSeed: SquareSeed,
): string[] {
    const cells: string[] = [];
    for (const [packed, painted] of tilePaint) {
        if (painted !== areaId) continue;
        const { tileX, tileY } = unpackTile(packed);
        cells.push(`${tileX},${tileY}`);
    }
    // Do not expand seed squares here — that OOM/hangs the browser.
    void squareSeed;
    return cells;
}

/** Sparse tile overrides only (not expanded seed). */
export function tilePaintToJson(tilePaint: TilePaintMap): object {
    const tiles: Record<string, number> = {};
    const sorted = [...tilePaint.keys()].sort((a, b) => a - b);
    for (const packed of sorted) {
        const { tileX, tileY } = unpackTile(packed);
        tiles[`${tileX},${tileY}`] = tilePaint.get(packed)!;
    }
    return {
        version: 2,
        resolution: "tile",
        tileCount: sorted.length,
        tiles,
    };
}

export function tilePaintFromJson(raw: unknown): TilePaintMap | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as { version?: number; tiles?: Record<string, number> };
    if (!obj.tiles || typeof obj.tiles !== "object") return null;
    const map: TilePaintMap = new Map();
    for (const [key, areaId] of Object.entries(obj.tiles)) {
        const [xStr, yStr] = key.split(",");
        const tileX = Number(xStr);
        const tileY = Number(yStr);
        if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) continue;
        map.set(packTile(tileX, tileY), areaId | 0);
    }
    return map;
}

/** Majority-vote map-square table from effective tile paint (compat export). */
export function paintToMapSquareMajority(
    tilePaint: TilePaintMap,
    squareSeed: SquareSeed,
): Record<number, number> {
    const squareIds = new Set<number>();
    for (const id of Object.keys(squareSeed)) squareIds.add(Number(id));
    for (const packed of tilePaint.keys()) {
        const { tileX, tileY } = unpackTile(packed);
        squareIds.add(mapXYToSquareId(tileX >> 6, tileY >> 6));
    }

    const out: Record<number, number> = {};
    for (const squareId of [...squareIds].sort((a, b) => a - b)) {
        const counts = new Map<number, number>();
        const { mapX, mapY } = squareIdToMapXY(squareId);
        const baseX = mapX * 64;
        const baseY = mapY * 64;
        for (let ly = 0; ly < 64; ly++) {
            for (let lx = 0; lx < 64; lx++) {
                const area = getTileArea(baseX + lx, baseY + ly, tilePaint, squareSeed);
                if (!(area > 0)) continue;
                counts.set(area, (counts.get(area) ?? 0) + 1);
            }
        }
        let best = 0;
        let bestN = 0;
        for (const [area, n] of counts) {
            if (n > bestN) {
                best = area;
                bestN = n;
            }
        }
        if (best > 0) out[squareId] = best;
    }
    return out;
}

export function mapSquareRecordToTypeScript(record: Record<number, number>): string {
    const lines = Object.entries(record).map(([id, area]) => `    ${id}: ${area},`);
    return `/**
 * OSRS map-square id -> league area region id.
 * Majority-vote from per-tile painter (/tools/league-regions).
 */
export const LEAGUE_MAP_SQUARE_TO_AREA_ID: Readonly<Record<number, number>> = Object.freeze({
${lines.join("\n")}
});
`;
}

export function downloadText(filename: string, text: string, mime = "text/plain"): void {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function countTilesByArea(
    tilePaint: TilePaintMap,
    squareSeed: SquareSeed,
): Record<number, number> {
    const counts: Record<number, number> = {};
    // Approximate: seed squares * 4096, then adjust by overrides
    for (const area of Object.values(squareSeed)) {
        if (area > 0) counts[area] = (counts[area] ?? 0) + 4096;
    }
    for (const [packed, painted] of tilePaint) {
        const { tileX, tileY } = unpackTile(packed);
        const squareId = mapXYToSquareId(tileX >> 6, tileY >> 6);
        const seed = squareSeed[squareId] ?? 0;
        if (seed > 0) counts[seed] = (counts[seed] ?? 0) - 1;
        if (painted > 0) counts[painted] = (counts[painted] ?? 0) + 1;
    }
    return counts;
}
