import { getLeagueAreaIdForTile, isLeagueAreaUnlocked } from "../leagues/LeagueAreaAccess";
import { LeagueAreaId } from "../../../../src/shared/leagues/leagueAreas";
import { getSkillName } from "../../../../src/rs/skill/skills";
import {
    getRegionalFavourRegionDisplayName,
    getRegionalFavourRegionForTile,
    REGIONAL_FAVOUR_REGION_TO_AREA_ID,
} from "./regions";
import { getRelatedNpcs } from "./relationships";
import {
    getRegionalFavourRegionForNpc,
    getRegionalFavoursForRegion,
} from "./registry";
import { pickWeighted, rollAmount } from "./weightedRandom";
import { computeRegionalReward } from "./rewards";
import { formatBonusLootPreviewHint } from "./bonusLoot";
import {
    combatFavourMonsterCb,
    combatTierWeightMultiplier,
    getPlayerNpcCombatCap,
    isCombatFavourInPlayerTier,
} from "./combatTiers";
import type {
    ActiveRegionalFavour,
    RegionalFavourDefinition,
    RegionalFavourHistory,
    RegionalFavourPlayerState,
    RegionalFavourRegion,
} from "./types";

export type RegionalFavourPlayerView = {
    getCombatLevel(): number;
    getSkillBaseLevel(skillId: number): number;
    getVarbitValue?(id: number): number;
    tileX: number;
    tileY: number;
};

const RECENT_FAVOUR_LIMIT = 5;
const RECENT_NPC_LIMIT = 3;
const RECENT_SKILL_LIMIT = 2;
const RECENT_CATEGORY_LIMIT = 2;

/** Combat favours: kill tasks (and any combat-lamp reward). Everything else is non-combat. */
export function isCombatFavour(def: RegionalFavourDefinition): boolean {
    return def.category === "KILL_NPC" || def.reward.kind === "combat_lamp";
}

/** @deprecated Use combatFavourMonsterCb — kept for callers expecting a "ceiling". */
export function combatFavourCeiling(def: RegionalFavourDefinition): number {
    return combatFavourMonsterCb(def);
}

function meetsRequirements(
    def: RegionalFavourDefinition,
    player: RegionalFavourPlayerView,
): boolean {
    try {
        // Combat CB gates are handled by the tier table (filterCombatLevelBand).
        if (
            def.minCombatLevel &&
            !isCombatFavour(def) &&
            player.getCombatLevel() < def.minCombatLevel
        ) {
            return false;
        }
        if (def.requirements) {
            for (const req of def.requirements) {
                if (player.getSkillBaseLevel(req.skillId) < req.level) return false;
            }
        }
        return true;
    } catch {
        return true;
    }
}

function belongsToRegion(def: RegionalFavourDefinition, region: RegionalFavourRegion): boolean {
    return def.region === region;
}

/**
 * Keep combat favours inside the player's CB tier table:
 * monster ≤ tier npcMax, and not more than 2 tiers below the player's band.
 * If that empties the combat pool, fall back to anything ≤ npcMax (prefer hardest).
 */
export function filterCombatLevelBand(
    defs: readonly RegionalFavourDefinition[],
    player: RegionalFavourPlayerView,
): RegionalFavourDefinition[] {
    const combatLevel = player.getCombatLevel();
    const cap = getPlayerNpcCombatCap(combatLevel);

    const nonCombat = defs.filter((def) => !isCombatFavour(def));
    const combat = defs.filter(isCombatFavour);

    if (combat.length === 0) return [...defs];

    const inTier = combat.filter((def) => isCombatFavourInPlayerTier(def, combatLevel));
    if (inTier.length > 0) {
        return [...nonCombat, ...inTier];
    }

    // Region may lack high-tier spawns (e.g. CB 126 in Asgarnia) — keep ≤ cap only.
    const underCap = combat.filter((def) => combatFavourMonsterCb(def) <= cap);
    if (underCap.length === 0) return [...nonCombat];

    let hardest = 0;
    for (const def of underCap) {
        hardest = Math.max(hardest, combatFavourMonsterCb(def));
    }
    const top = underCap.filter((def) => combatFavourMonsterCb(def) >= hardest - 15);
    return [...nonCombat, ...top];
}

/**
 * How well this favour matches the player's current levels.
 * Combat uses the explicit CB tier table; skilling keeps the soft recommended band.
 */
function levelFitMultiplier(
    def: RegionalFavourDefinition,
    player: RegionalFavourPlayerView,
): number {
    if (isCombatFavour(def)) {
        return combatTierWeightMultiplier(def, player.getCombatLevel());
    }

    if (def.recommendedSkillId !== undefined && def.recommendedLevelMin !== undefined) {
        const level = player.getSkillBaseLevel(def.recommendedSkillId);
        const min = def.recommendedLevelMin;
        const max = def.recommendedLevelMax ?? min + 25;
        if (level < min) return 0.05;
        if (level <= max) {
            const span = Math.max(1, max - min);
            const ideal = min + span * 0.55;
            const dist = Math.abs(level - ideal) / span;
            return 2.1 - dist * 0.85;
        }
        const over = level - max;
        if (over <= 15) return 0.7;
        if (over <= 40) return 0.3;
        return 0.1;
    }

    // Courier / visit with no skill band — neutral so levelled gather/produce can win.
    return 1;
}

/**
 * Scale required amount toward the high end when the player sits high in the level band.
 */
export function rollAmountForPlayer(
    def: RegionalFavourDefinition,
    player: RegionalFavourPlayerView,
    random: () => number = Math.random,
): number {
    const lo = Math.max(1, Math.floor(def.minAmount));
    const hi = Math.max(lo, Math.floor(def.maxAmount));
    if (lo >= hi) return lo;

    let t = 0.45;
    if (isCombatFavour(def)) {
        const combatLevel = player.getCombatLevel();
        const min = def.minCombatLevel ?? def.recommendedLevelMin ?? 1;
        const max = def.recommendedLevelMax ?? min + 30;
        t = max > min ? (combatLevel - min) / (max - min) : 0.5;
    } else if (def.recommendedSkillId !== undefined && def.recommendedLevelMin !== undefined) {
        const level = player.getSkillBaseLevel(def.recommendedSkillId);
        const min = def.recommendedLevelMin;
        const max = def.recommendedLevelMax ?? min + 25;
        t = max > min ? (level - min) / (max - min) : 0.5;
    }
    t = Math.max(0, Math.min(1, t));

    const center = lo + (hi - lo) * t;
    const spread = Math.max(1, (hi - lo) * 0.35);
    const rolled = center + (random() * 2 - 1) * spread;
    return Math.max(lo, Math.min(hi, Math.round(rolled)));
}

function calculateWeight(
    def: RegionalFavourDefinition,
    player: RegionalFavourPlayerView,
    preferredGiverNpcId: number | undefined,
    history: RegionalFavourHistory,
): number {
    let weight = def.baseWeight;

    if (preferredGiverNpcId !== undefined && def.giverNpcId === preferredGiverNpcId) {
        weight *= 2.5;
    } else if (preferredGiverNpcId !== undefined) {
        const related = getRelatedNpcs(preferredGiverNpcId);
        if (related.includes(def.giverNpcId)) weight *= 1.4;
    }

    const recentFavourIds = Array.isArray(history.recentFavourIds) ? history.recentFavourIds : [];
    const recentGiverNpcIds = Array.isArray(history.recentGiverNpcIds)
        ? history.recentGiverNpcIds
        : [];
    const recentCategories = Array.isArray(history.recentCategories)
        ? history.recentCategories
        : [];
    const recentRewardSkills = Array.isArray(history.recentRewardSkills)
        ? history.recentRewardSkills
        : [];

    if (recentFavourIds.includes(def.id)) weight *= 0.05;
    if (recentGiverNpcIds.includes(def.giverNpcId)) weight *= 0.25;
    if (recentCategories.includes(def.category)) weight *= 0.4;
    if (def.reward.skillId !== undefined && recentRewardSkills.includes(def.reward.skillId)) {
        weight *= 0.35;
    }

    const fit = levelFitMultiplier(def, player);
    if (fit <= 0) return 0;
    weight *= fit;

    // Soft preference for tasks near the player (giver in same general area — use travel distance).
    const travel = def.reward.travelDistance ?? 100;
    if (travel < 100) weight *= 1.15;
    if (travel > 400) weight *= 0.85;

    return Math.max(0.01, weight);
}

/**
 * Pick combat or non-combat at ~50/50, then weighted-pick within that bucket by level fit.
 * Falls back to the other bucket when one side has no eligible favours.
 */
function pickFavourBalanced(
    eligible: RegionalFavourDefinition[],
    player: RegionalFavourPlayerView,
    preferredGiverNpcId: number | undefined,
    history: RegionalFavourHistory,
    random: () => number,
): RegionalFavourDefinition | undefined {
    const combat = eligible.filter(isCombatFavour);
    const nonCombat = eligible.filter((def) => !isCombatFavour(def));

    let bucket: RegionalFavourDefinition[];
    if (combat.length === 0) {
        bucket = nonCombat;
    } else if (nonCombat.length === 0) {
        bucket = combat;
    } else {
        bucket = random() < 0.5 ? combat : nonCombat;
    }

    return pickWeighted(
        bucket,
        (def) => calculateWeight(def, player, preferredGiverNpcId, history),
        random,
    );
}

function pushRecent<T>(list: T[], value: T, limit: number): T[] {
    const next = [value, ...list.filter((v) => v !== value)];
    return next.slice(0, limit);
}

export function getRegionHistory(
    state: RegionalFavourPlayerState,
    region: RegionalFavourRegion,
): RegionalFavourHistory {
    if (!state.historyByRegion) state.historyByRegion = {};
    const existing = state.historyByRegion[region];
    if (existing) {
        // Repair corrupt / partially migrated saves so generation never throws.
        const legacy = existing as RegionalFavourHistory & { recentTaskIds?: unknown };
        if (!Array.isArray(existing.recentFavourIds)) {
            existing.recentFavourIds = Array.isArray(legacy.recentTaskIds)
                ? [...(legacy.recentTaskIds as string[])]
                : [];
        }
        if (!Array.isArray(existing.recentGiverNpcIds)) existing.recentGiverNpcIds = [];
        if (!Array.isArray(existing.recentRewardSkills)) existing.recentRewardSkills = [];
        if (!Array.isArray(existing.recentCategories)) existing.recentCategories = [];
        return existing;
    }
    const created = {
        recentFavourIds: [] as string[],
        recentGiverNpcIds: [] as number[],
        recentRewardSkills: [] as number[],
        recentCategories: [] as import("./types").RegionalFavourCategory[],
    };
    state.historyByRegion[region] = created;
    return created;
}

export function recordFavourInHistory(
    state: RegionalFavourPlayerState,
    def: RegionalFavourDefinition,
): void {
    const h = getRegionHistory(state, def.region);
    h.recentFavourIds = pushRecent(h.recentFavourIds, def.id, RECENT_FAVOUR_LIMIT);
    h.recentGiverNpcIds = pushRecent(h.recentGiverNpcIds, def.giverNpcId, RECENT_NPC_LIMIT);
    h.recentCategories = pushRecent(h.recentCategories, def.category, RECENT_CATEGORY_LIMIT);
    if (def.reward.skillId !== undefined) {
        h.recentRewardSkills = pushRecent(
            h.recentRewardSkills,
            def.reward.skillId,
            RECENT_SKILL_LIMIT,
        );
    }
}

export function createActiveFromDefinition(
    def: RegionalFavourDefinition,
    random: () => number = Math.random,
    player?: RegionalFavourPlayerView,
): ActiveRegionalFavour {
    const amount = player
        ? rollAmountForPlayer(def, player, random)
        : rollAmount(def.minAmount, def.maxAmount, random);
    const reward = computeRegionalReward(def, amount, random);
    return {
        favourId: def.id,
        region: def.region,
        giverNpcId: def.giverNpcId,
        turnInNpcId: def.turnInNpcId,
        requiredAmount: amount,
        progress: 0,
        objectiveComplete: amount <= 0,
        rewardClaimed: false,
        assignmentTimestamp: Date.now(),
        deliveryItemId: def.deliveryItemId,
        coinReward: reward.coins,
        xpReward: reward.xp,
        rewardKind: reward.kind,
        rewardSkillId: reward.skillId,
        splitSkills: reward.splitSkills,
        objectiveText: (def.objectiveText ?? "Complete the favour.").replace(
            /\d+/,
            String(amount),
        ),
        instructionText: def.instructionText ?? "",
    };
}

export type GenerateOptions = {
    region?: RegionalFavourRegion;
    preferredGiverNpcId?: number;
    /** If set, only pick favours from this giver (within the region). */
    forceGiverNpcId?: number;
    random?: () => number;
    /**
     * When true, skip the league-area unlock gate.
     * Used for in-person NPC/contact assignment — talking to them is the access check.
     */
    skipAreaUnlockCheck?: boolean;
    /** Favour ids to skip (e.g. delivery that failed inventory insert). */
    excludeFavourIds?: ReadonlySet<string>;
};

function resolveGenerateRegion(
    player: RegionalFavourPlayerView,
    options: GenerateOptions,
): RegionalFavourRegion {
    if (options.region) return options.region;
    if (options.forceGiverNpcId !== undefined) {
        const fromForce = getRegionalFavourRegionForNpc(options.forceGiverNpcId);
        if (fromForce) return fromForce;
    }
    if (options.preferredGiverNpcId !== undefined) {
        const fromPreferred = getRegionalFavourRegionForNpc(options.preferredGiverNpcId);
        if (fromPreferred) return fromPreferred;
    }
    return getRegionalFavourRegionForTile(player.tileX, player.tileY) ?? "misthalin";
}

export function generateRegionalFavour(
    player: RegionalFavourPlayerView,
    state: RegionalFavourPlayerState,
    options: GenerateOptions = {},
): { def: RegionalFavourDefinition; active: ActiveRegionalFavour } | undefined {
    const region = resolveGenerateRegion(player, options);
    const random = options.random ?? Math.random;

    // Remote/command generation may require the league area unlocked.
    // NPC/contact assignment sets skipAreaUnlockCheck — the conversation is the gate.
    // Also allow if the player is already standing in the target region.
    if (!options.skipAreaUnlockCheck) {
        const unlockAreaId = REGIONAL_FAVOUR_REGION_TO_AREA_ID[region] ?? LeagueAreaId.Misthalin;
        const unlocked =
            !player.getVarbitValue || isLeagueAreaUnlocked(player, unlockAreaId);
        const standingHere = getRegionalFavourRegionForTile(player.tileX, player.tileY) === region;
        if (!unlocked && !standingHere) {
            return undefined;
        }
    }

    const history = getRegionHistory(state, region);
    const excluded = options.excludeFavourIds;
    const recentFavourIds = Array.isArray(history.recentFavourIds) ? history.recentFavourIds : [];

    // Always start from the target region's pool. forceGiver only narrows within that region —
    // contacts / givers never hand out another region's favours.
    let pool = [...getRegionalFavoursForRegion(region)].filter(
        (def) => !excluded?.has(def.id),
    );
    if (options.forceGiverNpcId !== undefined) {
        const forced = pool.filter((def) => def.giverNpcId === options.forceGiverNpcId);
        if (forced.length > 0) {
            pool = forced;
        } else {
            // Forced giver has no tasks in this region — do not fall back to other regions.
            return undefined;
        }
    }

    const filterEligible = (defs: RegionalFavourDefinition[]) =>
        filterCombatLevelBand(
            defs.filter(
                (def) =>
                    belongsToRegion(def, region) &&
                    meetsRequirements(def, player) &&
                    !recentFavourIds.includes(def.id),
            ),
            player,
        );

    let eligible = filterEligible(pool);

    // Fallback: ignore recent task ids (still same region / same forced giver)
    if (eligible.length < 3) {
        eligible = filterCombatLevelBand(
            pool.filter(
                (def) => belongsToRegion(def, region) && meetsRequirements(def, player),
            ),
            player,
        );
    }

    // Fallback: if forced giver was too narrow after requirements, stay in-region but any giver
    if (eligible.length === 0 && options.forceGiverNpcId) {
        pool = [...getRegionalFavoursForRegion(region)].filter((def) => !excluded?.has(def.id));
        eligible = filterEligible(pool);
        if (eligible.length === 0) {
            eligible = filterCombatLevelBand(
                pool.filter(
                    (d) => belongsToRegion(d, region) && meetsRequirements(d, player),
                ),
                player,
            );
        }
    }

    if (eligible.length === 0) {
        eligible = filterCombatLevelBand(
            [...getRegionalFavoursForRegion(region)].filter(
                (d) =>
                    belongsToRegion(d, region) &&
                    meetsRequirements(d, player) &&
                    !excluded?.has(d.id),
            ),
            player,
        );
    }
    if (eligible.length === 0) {
        // Last resort: ignore combat band only when the region has no band-fitting tasks.
        eligible = [...getRegionalFavoursForRegion(region)].filter(
            (d) =>
                belongsToRegion(d, region) &&
                meetsRequirements(d, player) &&
                !excluded?.has(d.id),
        );
    }
    if (eligible.length === 0) {
        eligible = [...getRegionalFavoursForRegion(region)].filter(
            (d) => belongsToRegion(d, region) && !excluded?.has(d.id),
        );
    }
    if (eligible.length === 0) return undefined;

    const preferred = options.forceGiverNpcId ?? options.preferredGiverNpcId;
    const selected = pickFavourBalanced(eligible, player, preferred, history, random);
    if (!selected || !belongsToRegion(selected, region)) return undefined;

    const active = createActiveFromDefinition(selected, random, player);
    if (active.region !== region) return undefined;
    // Speak/deliver with amount 1 start incomplete until action.
    if (
        selected.category === "SPEAK_TO_NPC" ||
        selected.category === "DELIVER_ITEM" ||
        selected.category === "VISIT_LOCATION"
    ) {
        active.progress = 0;
        active.objectiveComplete = false;
    }

    return { def: selected, active };
}

export function formatRewardPreview(
    active: ActiveRegionalFavour,
    def?: RegionalFavourDefinition,
): string {
    const favourSuffix = " + 1 Favour";
    const bonusHint = def ? formatBonusLootPreviewHint(def) : "";
    if (active.rewardKind === "combat_lamp") {
        return `${active.coinReward} coins + combat XP lamp (${active.xpReward} XP)${favourSuffix}${bonusHint}`;
    }
    if (active.rewardKind === "split_xp" && active.splitSkills?.length) {
        const share = Math.floor(active.xpReward / active.splitSkills.length);
        const skills = active.splitSkills.map((s) => getSkillName(s)).join(", ");
        return `${active.coinReward} coins + ${share} XP in ${skills}${favourSuffix}${bonusHint}`;
    }
    if (active.rewardSkillId !== undefined && active.xpReward > 0) {
        return `${active.coinReward} coins + ${active.xpReward} ${getSkillName(active.rewardSkillId)} XP${favourSuffix}${bonusHint}`;
    }
    return `${active.coinReward} coins${favourSuffix}${bonusHint}`;
}

export function formatActiveFavourStatus(active: ActiveRegionalFavour, def?: RegionalFavourDefinition): string[] {
    const lines = [
        `Favour: ${getRegionalFavourRegionDisplayName(active.region)}`,
        `Objective: ${active.objectiveText}`,
        `Progress: ${Math.min(active.progress, active.requiredAmount)}/${active.requiredAmount}`,
    ];
    if (def) {
        lines.push(`How: ${def.instructionText}`);
    } else if (active.instructionText) {
        lines.push(`How: ${active.instructionText}`);
    }
    if (active.objectiveComplete) {
        lines.push("Favour complete — return to turn in for your reward.");
        lines.push(`Reward: ${formatRewardPreview(active, def)}`);
    } else {
        lines.push(`Reward preview: ${formatRewardPreview(active, def)}`);
    }
    return lines;
}

export function isPlayerInArea(
    tileX: number,
    tileY: number,
    area: { minX: number; maxX: number; minY: number; maxY: number },
): boolean {
    return tileX >= area.minX && tileX <= area.maxX && tileY >= area.minY && tileY <= area.maxY;
}

export function isTileInMisthalin(tileX: number, tileY: number): boolean {
    const areaId = getLeagueAreaIdForTile(tileX, tileY);
    return areaId === LeagueAreaId.Misthalin || areaId === null;
}
