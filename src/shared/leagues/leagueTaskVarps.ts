/**
 * League task completion bitfield varps.
 *
 * OSRS parity: CS2 uses `group = taskId / 32` and reads a varp that contains 32 completion bits.
 * These varps are not contiguous in the cache and are split across several ranges.
 */
export const LEAGUE_TASK_COMPLETION_VARPS: ReadonlyArray<number> = Object.freeze([
    // Groups 0-15 → varps 2616-2631
    2616, 2617, 2618, 2619, 2620, 2621, 2622, 2623, 2624, 2625, 2626, 2627, 2628, 2629, 2630, 2631,
    // Groups 16-43 → varps 2808-2835
    2808, 2809, 2810, 2811, 2812, 2813, 2814, 2815, 2816, 2817, 2818, 2819, 2820, 2821, 2822, 2823,
    2824, 2825, 2826, 2827, 2828, 2829, 2830, 2831, 2832, 2833, 2834, 2835,
    // Groups 44-47 → varps 3339-3342
    3339, 3340, 3341, 3342,
    // Groups 48-61 → varps 4036-4049
    4036, 4037, 4038, 4039, 4040, 4041, 4042, 4043, 4044, 4045, 4046, 4047, 4048, 4049,
]);

/** Fast lookup for server-authoritative completion varp guards. */
export const LEAGUE_TASK_COMPLETION_VARP_IDS = new Set<number>(LEAGUE_TASK_COMPLETION_VARPS);

/** Base varp for league task completion group 0 (%league_task_completed_0). */
export const LEAGUE_TASK_COMPLETION_VARP_BASE = 2616;

/**
 * CS2 may resolve completion with `2616 + group` instead of `%league_task_completed_N`.
 * Map colliding varp ids (e.g. 2636 = poh_nexus_teleport6) to the real completion varp (2812).
 */
export const LEAGUE_TASK_COMPLETION_VARP_READ_ALIAS: ReadonlyMap<number, number> = (() => {
    const alias = new Map<number, number>();
    for (let group = 0; group < LEAGUE_TASK_COMPLETION_VARPS.length; group++) {
        const wrongId = LEAGUE_TASK_COMPLETION_VARP_BASE + group;
        const canonicalId = LEAGUE_TASK_COMPLETION_VARPS[group]!;
        if (wrongId !== canonicalId) {
            alias.set(wrongId, canonicalId);
        }
    }
    return alias;
})();

export function isLeagueTaskCompletionVarp(varpId: number): boolean {
    return LEAGUE_TASK_COMPLETION_VARP_IDS.has(varpId | 0);
}

/** Canonical varp id for reads/writes (maps `2616 + group` collisions to %league_task_completed_N). */
export function resolveLeagueTaskCompletionVarpWrite(varpId: number): number {
    return resolveLeagueTaskCompletionVarpRead(varpId);
}

/**
 * League completion varps are server-authoritative.
 * Blocks client CS2 SET_VARP / varp_transmit on canonical ids and `2616 + group` alias ids.
 */
export function isLeagueTaskCompletionVarpClientWriteBlocked(varpId: number): boolean {
    const id = varpId | 0;
    if (isLeagueTaskCompletionVarp(id)) {
        return true;
    }
    return LEAGUE_TASK_COMPLETION_VARP_READ_ALIAS.has(id);
}

/** Remove stale `2616 + group` varp entries persisted before alias handling (do not merge into canonical). */
export function scrubAliasedLeagueTaskCompletionVarps(player: {
    hasVarpValue?: (id: number) => boolean;
    deleteVarpValue?: (id: number) => void;
}): void {
    for (const wrongId of LEAGUE_TASK_COMPLETION_VARP_READ_ALIAS.keys()) {
        if (player.hasVarpValue?.(wrongId)) {
            player.deleteVarpValue?.(wrongId);
        }
    }
}

export function getLeagueTaskCompletionVarpsForPlayer(
    player: { getVarpValue: (id: number) => number },
    opts?: { includeZero?: boolean },
): Record<number, number> {
    const includeZero = opts?.includeZero === true;
    const varps: Record<number, number> = {};
    for (const varpId of LEAGUE_TASK_COMPLETION_VARPS) {
        const value = player.getVarpValue(varpId) | 0;
        if (includeZero || value !== 0) {
            varps[varpId] = value;
        }
    }
    return varps;
}

/** Redirect mistaken `2616 + group` completion reads to canonical %league_task_completed_N varps. */
export function resolveLeagueTaskCompletionVarpRead(varpId: number): number {
    const id = varpId | 0;
    return LEAGUE_TASK_COMPLETION_VARP_READ_ALIAS.get(id) ?? id;
}

export function getLeagueTaskBitfield(taskId: number): { varpId: number; mask: number } {
    const tid = taskId | 0;
    const bit = tid & 31;
    const group = tid >> 5;
    const mappedVarpId = LEAGUE_TASK_COMPLETION_VARPS[group];
    const varpId = mappedVarpId ?? LEAGUE_TASK_COMPLETION_VARP_BASE + group;
    if (varpId < 0) {
        return { varpId: -1, mask: 0 };
    }
    return { varpId, mask: 1 << bit };
}

/** OSRS parity: CS2 `testbit` uses unsigned shift — avoids signed-varp false positives. */
export function isLeagueTaskBitSetInVarp(varpValue: number, taskId: number): boolean {
    const bit = taskId & 31;
    return (((varpValue | 0) >>> bit) & 1) !== 0;
}

export function mergeLeagueTaskCompletionVarp(prevVarpValue: number, mask: number): number {
    return ((prevVarpValue | 0) >>> 0) | ((mask | 0) >>> 0);
}

export function clearLeagueTaskCompletionVarpBit(prevVarpValue: number, mask: number): number {
    return ((prevVarpValue | 0) >>> 0) & ~((mask | 0) >>> 0);
}

/** Rebuild canonical completion varp values from server-authoritative completed task ids. */
export function buildLeagueTaskCompletionVarpsFromCompletedIds(
    completedTaskIds: Iterable<number>,
): Record<number, number> {
    const varps: Record<number, number> = {};
    for (const varpId of LEAGUE_TASK_COMPLETION_VARPS) {
        varps[varpId] = 0;
    }
    for (const rawTaskId of completedTaskIds) {
        const taskId = rawTaskId | 0;
        const { varpId, mask } = getLeagueTaskBitfield(taskId);
        if (varpId < 0 || mask === 0) {
            continue;
        }
        varps[varpId] = mergeLeagueTaskCompletionVarp(varps[varpId] ?? 0, mask);
    }
    return varps;
}
