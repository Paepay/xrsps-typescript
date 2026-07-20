import type { RegionalFavourDefinition } from "./types";

/**
 * Player combat → max assignable NPC combat level.
 * Players may also receive NPCs from up to {@link COMBAT_TIER_LOOKBACK} tiers below their own.
 */
export type CombatFavourTier = {
    /** Inclusive player combat level floor (use 1 for the first band). */
    playerMin: number;
    /** Inclusive player combat level ceiling. */
    playerMax: number;
    /** Highest monster combat level this player band may be assigned. */
    npcMax: number;
};

export const COMBAT_FAVOUR_TIERS: readonly CombatFavourTier[] = [
    { playerMin: 1, playerMax: 10, npcMax: 15 }, // includes CB 3–10
    { playerMin: 11, playerMax: 20, npcMax: 25 },
    { playerMin: 21, playerMax: 30, npcMax: 35 },
    { playerMin: 31, playerMax: 40, npcMax: 45 },
    { playerMin: 41, playerMax: 50, npcMax: 60 },
    { playerMin: 51, playerMax: 60, npcMax: 70 },
    { playerMin: 61, playerMax: 70, npcMax: 85 },
    { playerMin: 71, playerMax: 80, npcMax: 100 },
    { playerMin: 81, playerMax: 90, npcMax: 110 },
    { playerMin: 91, playerMax: 100, npcMax: 120 },
    { playerMin: 101, playerMax: 126, npcMax: Number.POSITIVE_INFINITY },
] as const;

/** How many tiers below the player's band are still eligible. */
export const COMBAT_TIER_LOOKBACK = 2;

export function getPlayerCombatTierIndex(playerCombatLevel: number): number {
    const cb = Math.max(1, Math.floor(playerCombatLevel));
    for (let i = 0; i < COMBAT_FAVOUR_TIERS.length; i++) {
        const tier = COMBAT_FAVOUR_TIERS[i];
        if (cb >= tier.playerMin && cb <= tier.playerMax) return i;
    }
    return COMBAT_FAVOUR_TIERS.length - 1;
}

export function getPlayerNpcCombatCap(playerCombatLevel: number): number {
    return COMBAT_FAVOUR_TIERS[getPlayerCombatTierIndex(playerCombatLevel)].npcMax;
}

/**
 * Monster combat level stored on kill favours via recommendedLevelMin ≈ monsterCb - 2.
 * Falls back to minCombatLevel / recommended band midpoint.
 */
export function combatFavourMonsterCb(def: RegionalFavourDefinition): number {
    if (def.recommendedLevelMin !== undefined) {
        return Math.max(1, (def.recommendedLevelMin | 0) + 2);
    }
    if (def.minCombatLevel !== undefined) {
        return Math.max(1, def.minCombatLevel | 0);
    }
    if (def.recommendedLevelMax !== undefined) {
        return Math.max(1, (def.recommendedLevelMax | 0) - 12);
    }
    return 1;
}

/** Lowest tier whose npcMax can host this monster CB. */
export function getNpcCombatTierIndex(monsterCombatLevel: number): number {
    const cb = Math.max(1, Math.floor(monsterCombatLevel));
    for (let i = 0; i < COMBAT_FAVOUR_TIERS.length; i++) {
        if (cb <= COMBAT_FAVOUR_TIERS[i].npcMax) return i;
    }
    return COMBAT_FAVOUR_TIERS.length - 1;
}

/**
 * Hard eligibility: monster ≤ player cap, and not more than LOOKBACK tiers below.
 */
export function isCombatFavourInPlayerTier(
    def: RegionalFavourDefinition,
    playerCombatLevel: number,
): boolean {
    const monsterCb = combatFavourMonsterCb(def);
    const cap = getPlayerNpcCombatCap(playerCombatLevel);
    if (monsterCb > cap) return false;

    const playerTier = getPlayerCombatTierIndex(playerCombatLevel);
    const npcTier = getNpcCombatTierIndex(monsterCb);
    const minTier = Math.max(0, playerTier - COMBAT_TIER_LOOKBACK);
    return npcTier >= minTier && npcTier <= playerTier;
}

/**
 * Prefer current tier, then 1 below, then 2 below.
 */
export function combatTierWeightMultiplier(
    def: RegionalFavourDefinition,
    playerCombatLevel: number,
): number {
    const monsterCb = combatFavourMonsterCb(def);
    const playerTier = getPlayerCombatTierIndex(playerCombatLevel);
    const npcTier = getNpcCombatTierIndex(monsterCb);
    const delta = playerTier - npcTier; // 0 = same tier, 1–2 = lower
    if (delta < 0) return 0;
    if (delta === 0) return 2.2;
    if (delta === 1) return 1.35;
    if (delta === 2) return 0.85;
    return 0;
}

/**
 * Higher monster tiers pay more (combat favours).
 * Tier 0 ≈ 1.0x … tier 10 ≈ 3.5x.
 */
export function combatTierRewardMultiplier(monsterCombatLevel: number): number {
    const tier = getNpcCombatTierIndex(monsterCombatLevel);
    return 1 + tier * 0.25;
}
