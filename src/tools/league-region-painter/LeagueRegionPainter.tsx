import {
    MouseEvent as ReactMouseEvent,
    WheelEvent as ReactWheelEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useElementSize } from "usehooks-ts";

import { LEAGUE_MAP_SQUARE_TO_AREA_ID } from "../../shared/leagues/leagueMapSquares.data";
import { getMapSquareId } from "../../rs/map/MapFileIndex";
import { clamp } from "../../util/MathUtil";
import {
    downloadText,
    getTileArea,
    mapSquareRecordToTypeScript,
    mapXYToSquareId,
    paintToGeoJson,
    paintToMapSquareMajority,
    packTile,
    tilePaintFromJson,
    tilePaintToJson,
    type TilePaintMap,
    countTilesByArea,
} from "./paintExport";
import { PAINTABLE_AREA_IDS, regionColor, regionName } from "./regionColors";
import "./LeagueRegionPainter.css";

const DEFAULT_CACHE = "osrs-237_2026-03-25";
const STORAGE_KEY = "league-region-paint-v2-tiles";
const TILE_SIZES = [0.25, 0.375, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16];
const DEFAULT_TILE_SIZE = 4;
const MAX_X = 100 * 64;
const MAX_Y = 200 * 64;
const LUMBRIDGE = { x: 3222, y: 3218 };
const MIN_BRUSH = 1;
const MAX_BRUSH = 64;

type ToolMode = "paint" | "pan" | "eyedropper";
type BrushShape = "square" | "circle";

const SQUARE_SEED = LEAGUE_MAP_SQUARE_TO_AREA_ID as Readonly<Record<number, number>>;

function loadSavedTiles(): TilePaintMap {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Map();
        return tilePaintFromJson(JSON.parse(raw)) ?? new Map();
    } catch {
        return new Map();
    }
}

function mapImageUrl(cacheName: string, mapX: number, mapY: number): string {
    return `/map-images/${cacheName}/${mapX}_${mapY}.png`;
}

function hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
}

export function LeagueRegionPainterPage() {
    const [cacheName, setCacheName] = useState(DEFAULT_CACHE);
    const [tilePaint, setTilePaint] = useState<TilePaintMap>(() => loadSavedTiles());
    const [brush, setBrush] = useState<number>(1);
    const [brushSize, setBrushSize] = useState(1);
    const [brushShape, setBrushShape] = useState<BrushShape>("square");
    const [mode, setMode] = useState<ToolMode>("paint");
    const [opacity, setOpacity] = useState(0.5);
    const [showOverlay, setShowOverlay] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [pos, setPos] = useState(LUMBRIDGE);
    const [tileSizeIndex, setTileSizeIndex] = useState(TILE_SIZES.indexOf(DEFAULT_TILE_SIZE));
    const [hover, setHover] = useState<{ tileX: number; tileY: number; areaId: number } | null>(
        null,
    );
    const [status, setStatus] = useState("");
    const [paintEpoch, setPaintEpoch] = useState(0);

    const [ref, { width = 0, height = 0 }] = useElementSize();
    const dragRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const paintingRef = useRef(false);
    const panningRef = useRef(false);
    const lastPanRef = useRef({ x: 0, y: 0 });
    const spaceHeldRef = useRef(false);
    const tilePaintRef = useRef(tilePaint);
    tilePaintRef.current = tilePaint;
    const brushRef = useRef(brush);
    brushRef.current = brush;
    const brushSizeRef = useRef(brushSize);
    brushSizeRef.current = brushSize;
    const brushShapeRef = useRef(brushShape);
    brushShapeRef.current = brushShape;

    const tileSize = TILE_SIZES[tileSizeIndex];
    const cameraX = pos.x | 0;
    const cameraY = pos.y | 0;
    const halfWidth = (width / 2) | 0;
    const halfHeight = (height / 2) | 0;

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tilePaintToJson(tilePaint)));
        } catch {
            setStatus("Warning: paint too large for localStorage — export JSON soon");
        }
    }, [tilePaint]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                spaceHeldRef.current = true;
                e.preventDefault();
            }
            if (e.key === "p" || e.key === "P") setMode("paint");
            if (e.key === "h" || e.key === "H") setMode("pan");
            if (e.key === "i" || e.key === "I") setMode("eyedropper");
            if (e.key === "0") setBrush(0);
            if (e.key === "[" || e.key === "{") {
                setBrushSize((s) => clamp(s - (e.shiftKey ? 5 : 1), MIN_BRUSH, MAX_BRUSH));
            }
            if (e.key === "]" || e.key === "}") {
                setBrushSize((s) => clamp(s + (e.shiftKey ? 5 : 1), MIN_BRUSH, MAX_BRUSH));
            }
            if (e.key === "c" || e.key === "C") {
                setBrushShape((s) => (s === "square" ? "circle" : "square"));
            }
            const num = Number(e.key);
            if (num >= 1 && num <= 9 && PAINTABLE_AREA_IDS[num - 1] != null) {
                setBrush(PAINTABLE_AREA_IDS[num - 1]);
                setMode("paint");
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === "Space") spaceHeldRef.current = false;
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, []);

    const pointerToWorld = useCallback(
        (offsetX: number, offsetY: number) => {
            const deltaX = (offsetX - halfWidth) / tileSize + 0.5;
            const deltaY = (halfHeight - offsetY) / tileSize + 0.5;
            return {
                tileX: Math.floor(cameraX + deltaX),
                tileY: Math.floor(cameraY + deltaY),
            };
        },
        [cameraX, cameraY, halfHeight, halfWidth, tileSize],
    );

    /** Mutate in-place during a drag stroke to avoid cloning the whole Map every move. */
    const paintAtStroke = useCallback((tileX: number, tileY: number) => {
        const brushArea = brushRef.current;
        const size = brushSizeRef.current;
        const shape = brushShapeRef.current;
        const half = (size - 1) / 2;
        const r = size / 2;
        const r2 = r * r;
        const map = tilePaintRef.current;
        const minX = Math.floor(tileX - half);
        const maxX = Math.ceil(tileX + half);
        const minY = Math.floor(tileY - half);
        const maxY = Math.ceil(tileY + half);
        let changed = false;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (x < 0 || y < 0 || x >= 6400 || y >= 12800) continue;
                if (shape === "circle") {
                    const dx = x - tileX;
                    const dy = y - tileY;
                    if (dx * dx + dy * dy > r2) continue;
                }
                const packed = packTile(x, y);
                const nextVal = brushArea === 0 ? 0 : brushArea;
                if (map.get(packed) !== nextVal) {
                    map.set(packed, nextVal);
                    changed = true;
                }
            }
        }
        if (changed) setPaintEpoch((e) => e + 1);
    }, []);

    // Map imagery (map squares)
    const mapTiles = useMemo(() => {
        const imageSize = 64 * tileSize;
        const mapX = pos.x >> 6;
        const mapY = pos.y >> 6;
        const x = halfWidth - (cameraX % 64) * tileSize - tileSize / 2;
        const y = halfHeight - (cameraY % 64) * tileSize - tileSize / 2;
        const renderStartX = -Math.ceil(x / imageSize) - 1;
        const renderStartY = -Math.ceil(y / imageSize) - 1;
        const renderEndX = Math.ceil((width - x) / imageSize) + 1;
        const renderEndY = Math.ceil((height - y) / imageSize) + 1;

        const tiles: Array<{
            key: number;
            left: number;
            bottom: number;
            size: number;
            url: string;
        }> = [];

        for (let rx = renderStartX; rx < renderEndX; rx++) {
            for (let ry = renderStartY; ry < renderEndY; ry++) {
                const imageMapX = mapX + rx;
                const imageMapY = mapY + ry;
                if (imageMapX < 0 || imageMapY < 0 || imageMapX >= 100 || imageMapY >= 200) continue;
                tiles.push({
                    key: getMapSquareId(imageMapX, imageMapY),
                    left: x + rx * imageSize,
                    bottom: y + ry * imageSize,
                    size: imageSize,
                    url: mapImageUrl(cacheName, imageMapX, imageMapY),
                });
            }
        }
        return tiles;
    }, [cacheName, cameraX, cameraY, halfHeight, halfWidth, height, pos.x, pos.y, tileSize, width]);

    // Canvas overlay: paint individual tiles in view
    useEffect(() => {
        const canvas = overlayRef.current;
        if (!canvas || width <= 0 || height <= 0) return;
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        if (!showOverlay) return;

        const paint = tilePaintRef.current;
        const halfTs = tileSize / 2;

        // Visible world tile range
        const minTileX = Math.floor(cameraX - halfWidth / tileSize) - 1;
        const maxTileX = Math.ceil(cameraX + halfWidth / tileSize) + 1;
        const minTileY = Math.floor(cameraY - halfHeight / tileSize) - 1;
        const maxTileY = Math.ceil(cameraY + halfHeight / tileSize) + 1;

        const worldToScreen = (tx: number, ty: number) => {
            const sx = halfWidth + (tx - cameraX) * tileSize - halfTs;
            // canvas Y grows down; world Y grows up → flip
            const sy = halfHeight - (ty - cameraY) * tileSize - halfTs;
            return { sx, sy };
        };

        // Skip denser sampling when zoomed far out
        const step = tileSize < 0.5 ? 2 : tileSize < 1 ? 1 : 1;

        for (let ty = minTileY; ty <= maxTileY; ty += step) {
            for (let tx = minTileX; tx <= maxTileX; tx += step) {
                if (tx < 0 || ty < 0) continue;
                const areaId = getTileArea(tx, ty, paint, SQUARE_SEED);
                if (!(areaId > 0)) continue;
                const { sx, sy } = worldToScreen(tx, ty);
                ctx.fillStyle = hexToRgba(regionColor(areaId), opacity);
                ctx.fillRect(sx, sy, tileSize * step + 0.5, tileSize * step + 0.5);
            }
        }

        if (showGrid && tileSize >= 4) {
            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.lineWidth = 1;
            for (let tx = minTileX; tx <= maxTileX; tx++) {
                const { sx } = worldToScreen(tx, cameraY);
                ctx.beginPath();
                ctx.moveTo(sx, 0);
                ctx.lineTo(sx, height);
                ctx.stroke();
            }
            for (let ty = minTileY; ty <= maxTileY; ty++) {
                const { sy } = worldToScreen(cameraX, ty);
                ctx.beginPath();
                ctx.moveTo(0, sy);
                ctx.lineTo(width, sy);
                ctx.stroke();
            }
        }

        // Brush preview
        if (hover && mode === "paint") {
            const half = (brushSize - 1) / 2;
            const r = brushSize / 2;
            ctx.strokeStyle = hexToRgba(regionColor(brush), 0.95);
            ctx.lineWidth = 2;
            if (brushShape === "circle") {
                const { sx, sy } = worldToScreen(hover.tileX, hover.tileY);
                const cx = sx + tileSize / 2;
                const cy = sy + tileSize / 2;
                ctx.beginPath();
                ctx.arc(cx, cy, r * tileSize, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                const minX = Math.floor(hover.tileX - half);
                const maxX = Math.ceil(hover.tileX + half);
                const minY = Math.floor(hover.tileY - half);
                const maxY = Math.ceil(hover.tileY + half);
                const tl = worldToScreen(minX, maxY);
                const br = worldToScreen(maxX + 1, minY - 1);
                ctx.strokeRect(tl.sx, tl.sy, br.sx - tl.sx, br.sy - tl.sy);
            }
        }
    }, [
        brush,
        brushShape,
        brushSize,
        cameraX,
        cameraY,
        halfHeight,
        halfWidth,
        height,
        hover,
        mode,
        opacity,
        paintEpoch,
        pos.x,
        pos.y,
        showGrid,
        showOverlay,
        tileSize,
        width,
    ]);

    const counts = useMemo(
        () => countTilesByArea(tilePaint, SQUARE_SEED),
        [tilePaint],
    );

    const onPointerDown = (event: ReactMouseEvent) => {
        const rect = dragRef.current?.getBoundingClientRect();
        const x = event.clientX - (rect?.left ?? 0);
        const y = event.clientY - (rect?.top ?? 0);

        const wantPan =
            mode === "pan" ||
            spaceHeldRef.current ||
            event.button === 1 ||
            event.button === 2 ||
            (event.button === 0 && event.altKey);

        if (wantPan) {
            panningRef.current = true;
            lastPanRef.current = { x, y };
            event.preventDefault();
            return;
        }

        const { tileX, tileY } = pointerToWorld(x, y);
        if (mode === "eyedropper") {
            const areaId = getTileArea(tileX, tileY, tilePaintRef.current, SQUARE_SEED);
            setBrush(areaId);
            setMode("paint");
            setStatus(`Eyedropped ${regionName(areaId)} at ${tileX},${tileY}`);
            return;
        }

        paintingRef.current = true;
        // Clone once at stroke start; mutate that map for the rest of the drag
        const clone = new Map(tilePaintRef.current);
        tilePaintRef.current = clone;
        paintAtStroke(tileX, tileY);
    };

    const onPointerMove = (event: ReactMouseEvent) => {
        const rect = dragRef.current?.getBoundingClientRect();
        const x = event.clientX - (rect?.left ?? 0);
        const y = event.clientY - (rect?.top ?? 0);
        const { tileX, tileY } = pointerToWorld(x, y);
        setHover({
            tileX,
            tileY,
            areaId: getTileArea(tileX, tileY, tilePaintRef.current, SQUARE_SEED),
        });

        if (panningRef.current) {
            const dx = (lastPanRef.current.x - x) / tileSize;
            const dy = (y - lastPanRef.current.y) / tileSize;
            lastPanRef.current = { x, y };
            setPos((p) => ({
                x: clamp(p.x + dx, 0, MAX_X),
                y: clamp(p.y + dy, 0, MAX_Y),
            }));
            return;
        }

        if (paintingRef.current && mode === "paint") {
            paintAtStroke(tileX, tileY);
        }
    };

    const stopPointer = () => {
        if (paintingRef.current) {
            // Commit stroke to React state (triggers localStorage persist)
            setTilePaint(new Map(tilePaintRef.current));
        }
        paintingRef.current = false;
        panningRef.current = false;
    };

    const onWheel = (event: ReactWheelEvent) => {
        if (event.shiftKey) {
            // Shift+wheel = brush size
            setBrushSize((s) =>
                clamp(s - Math.sign(event.deltaY) * (event.ctrlKey ? 5 : 1), MIN_BRUSH, MAX_BRUSH),
            );
            event.preventDefault();
            return;
        }

        const offsetX = event.nativeEvent.offsetX;
        const offsetY = event.nativeEvent.offsetY;
        const deltaX = (offsetX - halfWidth) / tileSize;
        const deltaY = (halfHeight - offsetY) / tileSize;
        const newIndex = clamp(tileSizeIndex - Math.sign(event.deltaY), 0, TILE_SIZES.length - 1);
        const newSize = TILE_SIZES[newIndex];
        setTileSizeIndex(newIndex);
        setPos((p) => ({
            x: clamp(p.x + deltaX - (offsetX - halfWidth) / newSize, 0, MAX_X),
            y: clamp(p.y + deltaY - (halfHeight - offsetY) / newSize, 0, MAX_Y),
        }));
    };

    const exportTileJson = () => {
        const body = JSON.stringify(tilePaintToJson(tilePaint), null, 2);
        downloadText("league-region-tiles.json", body, "application/json");
        setStatus(`Exported ${tilePaint.size} painted tile overrides`);
    };

    const exportGeo = () => {
        setStatus("Building polygons (hybrid, should be quick)…");
        // Yield so the status can paint, then run on a worker-ish timeout
        setTimeout(() => {
            try {
                const t0 = performance.now();
                const geo = paintToGeoJson(tilePaint, SQUARE_SEED);
                const body = JSON.stringify(geo);
                downloadText("league-region-polygons.geojson", body, "application/geo+json");
                const ms = Math.round(performance.now() - t0);
                const dirty =
                    (geo as { properties?: { dirtySquareCount?: number } }).properties
                        ?.dirtySquareCount ?? "?";
                setStatus(`Exported GeoJSON in ${ms}ms (${dirty} refined map-squares)`);
            } catch (err) {
                console.error(err);
                setStatus(
                    "GeoJSON failed — use Download tile JSON instead (your paint is safe in localStorage).",
                );
            }
        }, 30);
    };

    const exportMajorityTs = () => {
        setStatus("Computing majority map-squares…");
        setTimeout(() => {
            const record = paintToMapSquareMajority(tilePaint, SQUARE_SEED);
            downloadText(
                "leagueMapSquares.data.ts",
                mapSquareRecordToTypeScript(record),
                "text/typescript",
            );
            setStatus(`Exported majority-vote map-square table (${Object.keys(record).length} squares)`);
        }, 20);
    };

    const clearOverrides = () => {
        if (!window.confirm("Clear all per-tile paint overrides? (seed squares remain as base)")) return;
        setTilePaint(new Map());
        setPaintEpoch((e) => e + 1);
        setStatus("Cleared tile overrides");
    };

    const fillVisibleSquare = () => {
        if (!hover) return;
        const mapX = hover.tileX >> 6;
        const mapY = hover.tileY >> 6;
        const baseX = mapX * 64;
        const baseY = mapY * 64;
        setTilePaint((prev) => {
            const next = new Map(prev);
            for (let ly = 0; ly < 64; ly++) {
                for (let lx = 0; lx < 64; lx++) {
                    const packed = packTile(baseX + lx, baseY + ly);
                    if (brush === 0) next.set(packed, 0);
                    else next.set(packed, brush);
                }
            }
            return next;
        });
        setPaintEpoch((e) => e + 1);
        setStatus(
            `Filled map square ${mapXYToSquareId(mapX, mapY)} (${mapX},${mapY}) with ${regionName(brush)}`,
        );
    };

    return (
        <div className="lrp-root">
            <aside className="lrp-sidebar">
                <h1>League region painter</h1>
                <p className="lrp-hint">
                    Paint individual world tiles. Left-drag paints. Alt / Space / MMB pans. Wheel
                    zooms. Shift+wheel / [ ] resize brush. C toggles square/circle.
                </p>

                <label className="lrp-field">
                    Map cache folder
                    <input
                        value={cacheName}
                        onChange={(e) => setCacheName(e.target.value.trim())}
                        spellCheck={false}
                    />
                </label>

                <div className="lrp-modes">
                    {(["paint", "pan", "eyedropper"] as ToolMode[]).map((m) => (
                        <button
                            key={m}
                            type="button"
                            className={mode === m ? "active" : ""}
                            onClick={() => setMode(m)}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                <label className="lrp-field">
                    Brush size ({brushSize}×{brushSize} tiles)
                    <input
                        type="range"
                        min={MIN_BRUSH}
                        max={MAX_BRUSH}
                        step={1}
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                    />
                </label>

                <div className="lrp-modes">
                    <button
                        type="button"
                        className={brushShape === "square" ? "active" : ""}
                        onClick={() => setBrushShape("square")}
                    >
                        square
                    </button>
                    <button
                        type="button"
                        className={brushShape === "circle" ? "active" : ""}
                        onClick={() => setBrushShape("circle")}
                    >
                        circle
                    </button>
                </div>

                <div className="lrp-brushes">
                    <button
                        type="button"
                        className={`lrp-brush ${brush === 0 ? "active" : ""}`}
                        onClick={() => {
                            setBrush(0);
                            setMode("paint");
                        }}
                    >
                        <span className="lrp-swatch eraser" />
                        Eraser / neutral
                    </button>
                    {PAINTABLE_AREA_IDS.map((id) => (
                        <button
                            key={id}
                            type="button"
                            className={`lrp-brush ${brush === id ? "active" : ""}`}
                            onClick={() => {
                                setBrush(id);
                                setMode("paint");
                            }}
                        >
                            <span className="lrp-swatch" style={{ background: regionColor(id) }} />
                            {regionName(id)}
                            <span className="lrp-count">{counts[id] ?? 0}</span>
                        </button>
                    ))}
                </div>

                <label className="lrp-field">
                    Overlay opacity ({Math.round(opacity * 100)}%)
                    <input
                        type="range"
                        min={0.1}
                        max={0.85}
                        step={0.05}
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                    />
                </label>

                <label className="lrp-check">
                    <input
                        type="checkbox"
                        checked={showOverlay}
                        onChange={(e) => setShowOverlay(e.target.checked)}
                    />
                    Show region overlay
                </label>
                <label className="lrp-check">
                    <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                    />
                    Tile grid (when zoomed in)
                </label>

                <div className="lrp-actions">
                    <button type="button" onClick={exportTileJson}>
                        Download tile JSON
                    </button>
                    <button type="button" onClick={exportGeo}>
                        Download GeoJSON polygons
                    </button>
                    <button type="button" onClick={exportMajorityTs}>
                        Download majority .ts (compat)
                    </button>
                    <button type="button" onClick={fillVisibleSquare}>
                        Fill hovered map-square
                    </button>
                    <button type="button" onClick={() => setPos(LUMBRIDGE)}>
                        Go Lumbridge
                    </button>
                    <button type="button" className="danger" onClick={clearOverrides}>
                        Clear tile overrides
                    </button>
                </div>

                {status ? <p className="lrp-status">{status}</p> : null}

                <p className="lrp-footer">
                    Base colors come from the old map-square seed. Your strokes are per-tile overrides (
                    {tilePaint.size} stored). Export GeoJSON when done.
                </p>
            </aside>

            <main className="lrp-main">
                <div className="lrp-hud">
                    {hover ? (
                        <span>
                            tile <strong>{hover.tileX},{hover.tileY}</strong> · square{" "}
                            {mapXYToSquareId(hover.tileX >> 6, hover.tileY >> 6)} ·{" "}
                            <strong style={{ color: regionColor(hover.areaId) }}>
                                {regionName(hover.areaId)}
                            </strong>
                        </span>
                    ) : (
                        <span>Hover the map</span>
                    )}
                    <span>
                        brush{" "}
                        <strong style={{ color: regionColor(brush) }}>{regionName(brush)}</strong>{" "}
                        {brushSize}px {brushShape} · {mode} · zoom {tileSize}
                    </span>
                </div>

                <div className="lrp-map" ref={ref}>
                    {mapTiles.map((t) => (
                        <div
                            key={t.key}
                            className="lrp-tile"
                            style={{
                                left: t.left,
                                bottom: t.bottom,
                                width: t.size,
                                height: t.size,
                            }}
                        >
                            <img
                                src={t.url}
                                alt=""
                                draggable={false}
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                                }}
                            />
                        </div>
                    ))}
                    <canvas className="lrp-overlay-canvas" ref={overlayRef} />
                    <div
                        className={`lrp-drag mode-${mode}`}
                        ref={dragRef}
                        onMouseDown={onPointerDown}
                        onMouseMove={onPointerMove}
                        onMouseUp={stopPointer}
                        onMouseLeave={stopPointer}
                        onWheel={onWheel}
                        onContextMenu={(e) => e.preventDefault()}
                    />
                </div>
            </main>
        </div>
    );
}
