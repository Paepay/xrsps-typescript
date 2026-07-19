import { getLeagueAreaIdForTile, isLeagueAreaUnlocked } from "../leagues/LeagueAreaAccess";
import { LeagueAreaId } from "../../../../src/shared/leagues/leagueAreas";
import { getSkillName } from "../../../../src/rs/skill/skills";
import {
    getRegionalFavourRegionDisplayName,
    getRegionalFavourRegionForTile,
    REGIONAL_FAVOUR_REGION_TO_AREA_ID,
} from "./regions";
import { getRelatedNpcs } from "./relationships";
import { getRegionalFavoursForGiver, getRegionalFavoursForRegion } from "./registry";
import { pickWeighted, rollAmount } from "./weightedRandom";
import { computeRegionalReward } from "./rewards";
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

function meetsRequirements(
    def: RegionalFavourDefinition,
    player: RegionalFavourPlayerView,
): boolean {
    try {
        if (def.minCombatLevel && player.getCombatLevel() < def.minCombatLevel) return false;
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

    if (def.recommendedSkillId !== undefined && def.recommendedLevelMin !== undefined) {
        const level = player.getSkillBaseLevel(def.recommendedSkillId);
        const min = def.recommendedLevelMin;
        const max = def.recommendedLevelMax ?? min + 25;
        if (level < min) weight *= 0.1;
        else if (level > max + 30) weight *= 0.35;
        else if (level >= min && level <= max) weight *= 1.35;
    }

    // Soft preference for tasks near the player (giver in same general area — use travel distance).
    const travel = def.reward.travelDistance ?? 100;
    if (travel < 100) weight *= 1.15;
    if (travel > 400) weight *= 0.85;

    return Math.max(0.01, weight);
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
): ActiveRegionalFavour {
    const amount = rollAmount(def.minAmount, def.maxAmount, random);
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

export function generateRegionalFavour(
    player: RegionalFavourPlayerView,
    state: RegionalFavourPlayerState,
    options: GenerateOptions = {},
): { def: RegionalFavourDefinition; active: ActiveRegionalFavour } | undefined {
    const region = options.region ?? "misthalin";
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
        defs.filter(
            (def) =>
                belongsToRegion(def, region) &&
                meetsRequirements(def, player) &&
                !recentFavourIds.includes(def.id),
        );

    let eligible = filterEligible(pool);

    // Fallback: ignore recent task ids (still same region / same forced giver)
    if (eligible.length < 3) {
        eligible = pool.filter(
            (def) => belongsToRegion(def, region) && meetsRequirements(def, player),
        );
    }

    // Fallback: if forced giver was too narrow after requirements, stay in-region but any giver
    if (eligible.length === 0 && options.forceGiverNpcId) {
        pool = [...getRegionalFavoursForRegion(region)].filter((def) => !excluded?.has(def.id));
        eligible = filterEligible(pool);
        if (eligible.length === 0) {
            eligible = pool.filter((d) => belongsToRegion(d, region) && meetsRequirements(d, player));
        }
    }

    if (eligible.length === 0) {
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
    const selected = pickWeighted(
        eligible,
        (def) => calculateWeight(def, player, preferred, history),
        random,
    );
    if (!selected || !belongsToRegion(selected, region)) return undefined;

    const active = createActiveFromDefinition(selected, random);
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

export function formatRewardPreview(active: ActiveRegionalFavour): string {
    if (active.rewardKind === "combat_lamp") {
        return `${active.coinReward} coins + combat XP lamp (${active.xpReward} XP)`;
    }
    if (active.rewardKind === "split_xp" && active.splitSkills?.length) {
        const share = Math.floor(active.xpReward / active.splitSkills.length);
        const skills = active.splitSkills.map((s) => getSkillName(s)).join(", ");
        return `${active.coinReward} coins + ${share} XP in ${skills}`;
    }
    if (active.rewardSkillId !== undefined && active.xpReward > 0) {
        return `${active.coinReward} coins + ${active.xpReward} ${getSkillName(active.rewardSkillId)} XP`;
    }
    return `${active.coinReward} coins`;
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
        lines.push(`Reward: ${formatRewardPreview(active)}`);
    } else {
        lines.push(`Reward preview: ${formatRewardPreview(active)}`);
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
