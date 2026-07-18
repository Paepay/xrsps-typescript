/**
 * League task trigger type definitions.
 * These define what event completes a task.
 */

// Tier 1 - Direct ID lookup triggers
export type NpcKillTrigger = {
    type: "npc_kill";
    npcIds: number[];
    count?: number; // For "Kill 10 Goblins" style tasks
};

export type ItemEquipTrigger = {
    type: "item_equip";
    itemIds: number[];
};

export type ItemObtainTrigger = {
    type: "item_obtain";
    itemIds: number[];
    count?: number;
};

export type ItemCraftTrigger = {
    type: "item_craft";
    itemIds: number[];
    count?: number;
};

export type QuestCompleteTrigger = {
    type: "quest_complete";
    questId: number;
};

// Tier 2 - Skill / level threshold triggers (checked on XP gain)
export type LevelReachTrigger = {
    type: "level_reach";
    /** skill = one skill; any = first skill at level; total = total level; base = every skill; first_level_up = any skill above start */
    mode: "skill" | "any" | "total" | "base" | "first_level_up";
    /** Required for mode "skill". */
    skillId?: number;
    /** Threshold level (unused for first_level_up). */
    level: number;
    /** Skills ignored for mode "any" (from task description exclusions). */
    excludeSkillIds?: number[];
};

export type XpGainTrigger = {
    type: "xp_gain";
    skillId: number;
    amount: number;
};

export type AreaEnterTrigger = {
    type: "area_enter";
    regionIds: number[];
};

// Tier 3 - Custom validator
export type CustomTrigger = {
    type: "custom";
    validator: string; // Name of registered validator function
};

// Union of all trigger types
export type TaskTrigger =
    | NpcKillTrigger
    | ItemEquipTrigger
    | ItemObtainTrigger
    | ItemCraftTrigger
    | QuestCompleteTrigger
    | LevelReachTrigger
    | XpGainTrigger
    | AreaEnterTrigger
    | CustomTrigger;

// Event types emitted by game systems
export type NpcKillEvent = {
    type: "npc_kill";
    npcId: number;
    npcName: string;
    playerId: number;
};

export type ItemEquipEvent = {
    type: "item_equip";
    itemId: number;
    playerId: number;
};

export type ItemObtainEvent = {
    type: "item_obtain";
    itemId: number;
    count: number;
    playerId: number;
};

export type ItemCraftEvent = {
    type: "item_craft";
    itemId: number;
    count: number;
    playerId: number;
};

export type TaskEvent = NpcKillEvent | ItemEquipEvent | ItemObtainEvent | ItemCraftEvent;
