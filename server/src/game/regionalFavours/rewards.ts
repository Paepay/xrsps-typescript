import { SkillId } from "../../../../src/rs/skill/skills";
import type {
    RegionalDifficulty,
    RegionalRewardFormula,
    RegionalFavourDefinition,
} from "./types";

const DIFFICULTY_BASE: Record<
    RegionalDifficulty,
    { coinsMin: number; coinsMax: number; xpMin: number; xpMax: number }
> = {
    very_easy: { coinsMin: 100, coinsMax: 300, xpMin: 50, xpMax: 150 },
    easy: { coinsMin: 250, coinsMax: 750, xpMin: 100, xpMax: 400 },
    medium: { coinsMin: 500, coinsMax: 2000, xpMin: 300, xpMax: 1000 },
    hard: { coinsMin: 1500, coinsMax: 5000, xpMin: 750, xpMax: 2500 },
};

export type ComputedRegionalReward = {
    coins: number;
    xp: number;
    kind: RegionalRewardFormula["kind"];
    skillId?: SkillId;
    splitSkills?: SkillId[];
};

function lerp(min: number, max: number, t: number): number {
    return Math.floor(min + (max - min) * Math.max(0, Math.min(1, t)));
}

/**
 * Reward XP skill from category rules.
 * Walking/speak/visit/deliver → Agility.
 * Combat → combat lamp (no direct combat XP).
 */
export function resolveRewardSkill(def: RegionalFavourDefinition): SkillId | undefined {
    if (def.reward.kind === "combat_lamp") return undefined;
    if (def.reward.skillId !== undefined) return def.reward.skillId;
    switch (def.category) {
        case "SPEAK_TO_NPC":
        case "VISIT_LOCATION":
        case "DELIVER_ITEM":
            return SkillId.Agility;
        default:
            return def.recommendedSkillId;
    }
}

export function computeRegionalReward(
    def: RegionalFavourDefinition,
    amount: number,
    random: () => number = Math.random,
): ComputedRegionalReward {
    const band = DIFFICULTY_BASE[def.reward.difficulty] ?? DIFFICULTY_BASE.easy;
    const amountFactor = Math.min(1, Math.max(0.2, amount / Math.max(1, def.maxAmount)));
    const travel = def.reward.travelDistance ?? 0;
    const travelBoost = Math.min(0.35, travel / 2000);

    const coins = lerp(band.coinsMin, band.coinsMax, amountFactor * 0.7 + travelBoost + random() * 0.15);
    let xp = lerp(band.xpMin, band.xpMax, amountFactor * 0.75 + travelBoost * 0.5 + random() * 0.1);

    // Courier / walk tasks: modest Agility XP — never explode with teleports.
    if (
        def.category === "SPEAK_TO_NPC" ||
        def.category === "VISIT_LOCATION" ||
        def.category === "DELIVER_ITEM"
    ) {
        xp = Math.min(xp, band.xpMax);
        const skillId = SkillId.Agility;
        return {
            coins,
            xp,
            kind: "skill_xp",
            skillId,
        };
    }

    if (def.reward.kind === "combat_lamp") {
        return {
            coins,
            xp,
            kind: "combat_lamp",
        };
    }

    if (def.reward.kind === "split_xp" && def.reward.splitSkills?.length) {
        return {
            coins,
            xp,
            kind: "split_xp",
            splitSkills: [...def.reward.splitSkills],
        };
    }

    return {
        coins,
        xp,
        kind: "skill_xp",
        skillId: resolveRewardSkill(def),
    };
}
