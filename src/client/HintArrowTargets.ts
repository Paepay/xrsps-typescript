import { ClientState } from "./ClientState";

export type HintArrowWorldTarget = {
    worldX: number;
    worldY: number;
    plane: number;
    /** True when snapped to an NPC or loc rather than the raw server tile. */
    snapped: boolean;
    kind: "npc" | "object" | "tile";
};

export type HintArrowSceneNpc = {
    serverId: number;
    typeId: number;
    worldX: number;
    worldY: number;
    plane: number;
};

export type HintArrowSceneLoc = {
    worldX: number;
    worldY: number;
    plane: number;
    name: string;
};

/**
 * Match a LocType.name against favour rock filters.
 * Prefer rockId (mining id) so copper never matches a mithril task.
 */
export function locNameMatchesRockHint(
    locName: string,
    rockId?: string,
    objectNames?: readonly string[],
): boolean {
    const name = (locName ?? "").trim().toLowerCase();
    if (!name) return false;

    if (objectNames && objectNames.length > 0) {
        for (const n of objectNames) {
            if (n.trim().toLowerCase() === name) return true;
        }
    }

    const id = (rockId ?? "").trim().toLowerCase();
    if (!id) return false;

    // Mirror server/src/game/skills/mining.ts ROCK_NAME_ALIASES for common ores.
    if (name === `${id} rocks` || name === `${id} ore rocks`) return true;
    if (id === "adamantite" && (name === "adamantite rocks" || name === "adamant rocks")) {
        return true;
    }
    if (id === "amethyst" && (name === "amethyst crystals" || name === "amethyst rocks")) {
        return true;
    }
    return false;
}

/**
 * Resolve where favour/quest hint arrows should draw this frame.
 * - Object names / rockId → matching locs in the loaded scene (rocks, etc.)
 * - NPC type ids → only those types (never random nearby NPCs)
 * - Otherwise the server tile
 */
export function resolveHintArrowWorldTargets(opts: {
    npcs: Iterable<HintArrowSceneNpc>;
    /** Nearby locs with names (caller may pre-filter; we still re-check rock filters). */
    locs: Iterable<HintArrowSceneLoc>;
    maxObjectTargets?: number;
}): HintArrowWorldTarget[] {
    const hintType = ClientState.hintArrowType | 0;
    if (hintType === 0) return [];

    const npcTypeFilter = ClientState.hintArrowNpcTypeIds;
    const objectNames = ClientState.hintArrowObjectNames;
    const rockId = ClientState.hintArrowRockId;
    const hasObjectFilter = (rockId && rockId.length > 0) || objectNames.length > 0;
    const maxObjects = Math.max(1, opts.maxObjectTargets ?? 8);

    if (hintType === 1) {
        const targetId = ClientState.hintArrowTargetId | 0;
        for (const npc of opts.npcs) {
            if ((npc.serverId | 0) !== targetId) continue;
            if (npcTypeFilter.length > 0 && !npcTypeFilter.includes(npc.typeId | 0)) continue;
            return [
                {
                    worldX: npc.worldX,
                    worldY: npc.worldY,
                    plane: npc.plane | 0,
                    snapped: true,
                    kind: "npc",
                },
            ];
        }
    }

    // Prefer matching objects when the favour is a gather/resource hint.
    if (hasObjectFilter) {
        const matches: HintArrowWorldTarget[] = [];
        for (const loc of opts.locs) {
            if (!locNameMatchesRockHint(loc.name, rockId, objectNames)) continue;
            matches.push({
                worldX: loc.worldX,
                worldY: loc.worldY,
                plane: loc.plane | 0,
                snapped: true,
                kind: "object",
            });
            if (matches.length >= maxObjects) break;
        }
        if (matches.length > 0) return matches;
    }

    // Snap to filtered NPC types near the server hint tile (turn-in / speak).
    // Never do this while a gather object filter is active — area tiles sit on other rocks.
    if (npcTypeFilter.length > 0 && !hasObjectFilter) {
        const hintWx = (ClientState.hintArrowWorldX | 0) + 0.5;
        const hintWy = (ClientState.hintArrowWorldY | 0) + 0.5;
        let bestDist = 2.25; // ~1.5 tiles
        let best: HintArrowWorldTarget | undefined;
        for (const npc of opts.npcs) {
            if (!npcTypeFilter.includes(npc.typeId | 0)) continue;
            const dx = npc.worldX - hintWx;
            const dy = npc.worldY - hintWy;
            const dist = dx * dx + dy * dy;
            if (dist > bestDist) continue;
            bestDist = dist;
            best = {
                worldX: npc.worldX,
                worldY: npc.worldY,
                plane: npc.plane | 0,
                snapped: true,
                kind: "npc",
            };
        }
        if (best) return [best];
    }

    const hintWx = ClientState.hintArrowWorldX | 0;
    const hintWy = ClientState.hintArrowWorldY | 0;
    if (hintWx === 0 && hintWy === 0 && hintType !== 1) return [];
    return [
        {
            worldX: hintWx + 0.5,
            worldY: hintWy + 0.5,
            plane: ClientState.plane | 0,
            snapped: false,
            kind: "tile",
        },
    ];
}

/** Nearest target to a world position (for minimap single marker). */
export function pickNearestHintTarget(
    targets: HintArrowWorldTarget[],
    fromX: number,
    fromY: number,
): HintArrowWorldTarget | undefined {
    let best: HintArrowWorldTarget | undefined;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const t of targets) {
        const dx = t.worldX - fromX;
        const dy = t.worldY - fromY;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
            bestDist = dist;
            best = t;
        }
    }
    return best;
}
