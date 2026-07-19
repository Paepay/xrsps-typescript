import type { SkillId } from "../../../../src/rs/skill/skills";

export type RegionalFavourRegion =
    | "misthalin"
    | "karamja"
    | "asgarnia"
    | "kandarin"
    | "morytania"
    | "desert"
    | "tirannwn"
    | "fremennik"
    | "wilderness"
    | "kourend"
    | "varlamore";

export type RegionalFavourCategory =
    | "SPEAK_TO_NPC"
    | "VISIT_LOCATION"
    | "DELIVER_ITEM"
    | "GATHER_ITEM"
    | "PRODUCE_ITEM"
    | "PROCESS_ITEM"
    | "KILL_NPC"
    | "USE_OBJECT"
    | "PERFORM_SKILL_ACTION"
    | "MULTI_STEP"
    | "RETURN_ITEM"
    | "CAST_SPELL"
    | "BURY_OR_OFFER_BONES";

export type RegionalRewardKind = "skill_xp" | "combat_lamp" | "split_xp";

export type RegionalDifficulty = "very_easy" | "easy" | "medium" | "hard";

export type TileBounds = {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    level?: number;
};

export type SkillRequirement = {
    skillId: SkillId;
    level: number;
};

export type RegionalRewardFormula = {
    kind: RegionalRewardKind;
    /** Primary skill for non-combat rewards. */
    skillId?: SkillId;
    /** Split XP skills (optional). */
    splitSkills?: SkillId[];
    difficulty: RegionalDifficulty;
    /** Optional travel distance bias for agility/courier rewards (tiles). */
    travelDistance?: number;
};

export type RegionalFavourDefinition = {
    id: string;
    region: RegionalFavourRegion;
    giverNpcId: number;
    turnInNpcId: number;
    category: RegionalFavourCategory;
    reward: RegionalRewardFormula;
    targetNpcIds?: number[];
    targetItemId?: number;
    /** Item granted for delivery tasks (reclaimable). */
    deliveryItemId?: number;
    targetObjectId?: number;
    targetArea?: TileBounds;
    minAmount: number;
    maxAmount: number;
    requirements?: SkillRequirement[];
    minCombatLevel?: number;
    baseWeight: number;
    /** Inventory items already owned may be submitted at turn-in. */
    acceptsExistingItems: boolean;
    /** Progress only counts actions after assignment. */
    requiresPostAssignmentProgress: boolean;
    objectiveText: string;
    instructionText: string;
    assignmentDialog: string[];
    completionDialog: string[];
    /** Soft level band for weighting (player skill). */
    recommendedSkillId?: SkillId;
    recommendedLevelMin?: number;
    recommendedLevelMax?: number;
    /** Seek-contact favours: completing grants no coins/XP. */
    noReward?: boolean;
};

export type ActiveRegionalFavour = {
    favourId: string;
    region: RegionalFavourRegion;
    giverNpcId: number;
    turnInNpcId: number;
    requiredAmount: number;
    progress: number;
    objectiveComplete: boolean;
    rewardClaimed: boolean;
    assignmentTimestamp: number;
    deliveryItemId?: number;
    coinReward: number;
    xpReward: number;
    rewardKind: RegionalRewardKind;
    rewardSkillId?: SkillId;
    splitSkills?: SkillId[];
    objectiveText: string;
    instructionText: string;
};

export type RegionalFavourHistory = {
    recentFavourIds: string[];
    recentGiverNpcIds: number[];
    recentRewardSkills: number[];
    recentCategories: RegionalFavourCategory[];
};

export type RegionalFavourPlayerState = {
    /**
     * One active favour per region. HUD shows the entry for the region
     * the player is currently standing in.
     */
    activeByRegion: Partial<Record<RegionalFavourRegion, ActiveRegionalFavour>>;
    /** @deprecated Migrated into activeByRegion on load. */
    active?: ActiveRegionalFavour;
    historyByRegion: Partial<Record<RegionalFavourRegion, RegionalFavourHistory>>;
    /** @deprecated Migrated into historyByRegion.misthalin on load. */
    history?: RegionalFavourHistory;
    completedCount: number;
    skipsAvailable: number;
    completedSinceLastSkip: number;
    /** Queue of combat lamp XP amounts awaiting rub/claim. */
    pendingCombatLampXp: number[];
    /** Whether the on-screen favour HUD is visible. */
    hudVisible: boolean;
    /** Last region used for HUD (detects region changes while HUD is on). */
    lastHudRegion?: RegionalFavourRegion;
};

export const emptyRegionalFavourHistory = (): RegionalFavourHistory => ({
    recentFavourIds: [],
    recentGiverNpcIds: [],
    recentRewardSkills: [],
    recentCategories: [],
});

export const emptyRegionalFavourPlayerState = (): RegionalFavourPlayerState => ({
    activeByRegion: {},
    historyByRegion: {},
    completedCount: 0,
    skipsAvailable: 1,
    completedSinceLastSkip: 0,
    pendingCombatLampXp: [],
    hudVisible: false,
});

/** Client HUD payload (binary packet REGIONAL_FAVOUR_HUD). */
export type RegionalFavourHudPayload = {
    visible: boolean;
    regionName: string;
    objective: string;
    progress: number;
    required: number;
    turnInName: string;
    instruction: string;
    complete: boolean;
    /** True when an assigned favour is tracked (not seek-contact placeholder). */
    hasActiveFavour: boolean;
    /** Human-readable reward summary for the $ HUD button. */
    rewardPreview: string;
};
