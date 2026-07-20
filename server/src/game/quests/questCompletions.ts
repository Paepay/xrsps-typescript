import type { PlayerState } from "../player";
import {
    QUEST_COMPLETIONS,
    type QuestCompletionDef,
    type QuestProgressKind,
} from "./questCompletions.data";
import { findQuestFavourCost } from "./questFavourCosts";
import type { RegionalFavourPlayerState } from "../regionalFavours/types";

/** Varp: total quest points (drop tables / UI). */
export const VARP_QUEST_POINTS = 101;

/** High QP for testing gates via ::allquests. */
export const ALL_QUESTS_QUEST_POINTS = 500;

export type QuestVarUpdate = {
    kind: QuestProgressKind;
    id: number;
    value: number;
};

/**
 * Extra finish-state vars that quest_status_get alone does not cover
 * (spell unlocks, post-quest flags, favour).
 * Applied after cache quest completions; values are max'd with any prior write.
 */
const EXTRA_COMPLETION_VARS: readonly QuestVarUpdate[] = [
    // Spell / diary gates that check higher than quest-list complete thresholds
    { kind: "varp", id: 139, value: 180 }, // Legend's Quest — Charge
    { kind: "varp", id: 161, value: 110 }, // Underground Pass — Iban Blast stage
    { kind: "varbit", id: 9133, value: 1 }, // Iban's book read
    { kind: "varbit", id: 6067, value: 6 }, // Mage Arena II fully complete
    { kind: "varbit", id: 5619, value: 9 }, // Client of Kourend (teleport gate)
    // Arceuus spellbook favour (not a quest row)
    { kind: "varbit", id: 4896, value: 1000 },
    { kind: "varbit", id: 9631, value: 1 },
];

function normalizeQuestKey(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const QUESTS_BY_NORMALIZED_NAME = new Map<string, QuestCompletionDef>();
for (const quest of QUEST_COMPLETIONS) {
    QUESTS_BY_NORMALIZED_NAME.set(normalizeQuestKey(quest.name), quest);
}

export function getAllQuestCompletions(): readonly QuestCompletionDef[] {
    return QUEST_COMPLETIONS;
}

export function findQuestCompletion(search: string): QuestCompletionDef | undefined {
    const key = normalizeQuestKey(search);
    if (!key) return undefined;

    const exact = QUESTS_BY_NORMALIZED_NAME.get(key);
    if (exact) return exact;

    for (const quest of QUEST_COMPLETIONS) {
        if (normalizeQuestKey(quest.name).includes(key)) {
            return quest;
        }
    }
    return undefined;
}

export function isQuestCompleteForPlayer(
    player: Pick<PlayerState, "getVarpValue" | "getVarbitValue">,
    quest: QuestCompletionDef,
): boolean {
    const current =
        quest.kind === "varp" ? player.getVarpValue(quest.varId) : player.getVarbitValue(quest.varId);
    return current >= quest.completeValue;
}

export function findQuestCompletionByDisplayName(
    displayName: string,
): QuestCompletionDef | undefined {
    const key = normalizeQuestKey(displayName);
    const exact = QUESTS_BY_NORMALIZED_NAME.get(key);
    if (exact) return exact;

    // Journal names sometimes differ slightly ("Restless Ghost, The" vs "The Restless Ghost")
    for (const quest of QUEST_COMPLETIONS) {
        const qKey = normalizeQuestKey(quest.name);
        if (qKey === key || qKey.includes(key) || key.includes(qKey)) {
            return quest;
        }
    }
    return undefined;
}

type QuestVarServices = {
    queueVarp: (playerId: number, varpId: number, value: number) => void;
    queueVarbit: (playerId: number, varbitId: number, value: number) => void;
};

function applyVarUpdate(
    player: PlayerState,
    update: QuestVarUpdate,
    services: QuestVarServices,
    mergeMax: boolean,
): void {
    if (update.kind === "varp") {
        const next = mergeMax
            ? Math.max(player.getVarpValue(update.id) | 0, update.value | 0)
            : update.value | 0;
        player.setVarpValue(update.id, next);
        services.queueVarp(player.id, update.id, next);
        return;
    }
    const next = mergeMax
        ? Math.max(player.getVarbitValue(update.id) | 0, update.value | 0)
        : update.value | 0;
    player.setVarbitValue(update.id, next);
    services.queueVarbit(player.id, update.id, next);
}

export function applyQuestCompletionDef(
    player: PlayerState,
    quest: QuestCompletionDef,
    services: QuestVarServices,
): void {
    applyVarUpdate(
        player,
        { kind: quest.kind, id: quest.varId, value: quest.completeValue },
        services,
        false,
    );
}

export type PurchaseQuestResult =
    | { ok: true; quest: QuestCompletionDef; cost: number; favourRemaining: number }
    | {
          ok: false;
          reason:
              | "unknown_quest"
              | "no_cost"
              | "already_complete"
              | "insufficient_favour";
          quest?: QuestCompletionDef;
          cost?: number;
          favourPoints?: number;
      };

type FavourPointPlayer = PlayerState & {
    getRegionalFavourState(): RegionalFavourPlayerState;
    setRegionalFavourState(state: RegionalFavourPlayerState): void;
};

/**
 * Spend Favour points (Difficulty × Length from wiki) to mark a quest complete.
 */
export function purchaseQuestCompletion(
    player: FavourPointPlayer,
    search: string,
    services: QuestVarServices,
): PurchaseQuestResult {
    const quest = findQuestCompletion(search);
    if (!quest) {
        return { ok: false, reason: "unknown_quest" };
    }
    if (isQuestCompleteForPlayer(player, quest)) {
        return { ok: false, reason: "already_complete", quest };
    }

    const costDef = findQuestFavourCost(quest.name);
    if (!costDef) {
        return { ok: false, reason: "no_cost", quest };
    }
    const cost = costDef.favourCost;

    const favourState = player.getRegionalFavourState();
    const favourPoints = favourState.favourPoints | 0;
    if (favourPoints < cost) {
        return {
            ok: false,
            reason: "insufficient_favour",
            quest,
            cost,
            favourPoints,
        };
    }

    const nextFavour = favourPoints - cost;
    const favourStateNext = player.getRegionalFavourState();
    favourStateNext.favourPoints = nextFavour;
    player.setRegionalFavourState(favourStateNext);
    applyQuestCompletionDef(player, quest, services);

    return {
        ok: true,
        quest,
        cost,
        favourRemaining: nextFavour,
    };
}

export function applyAllQuestCompletions(
    player: PlayerState,
    services: QuestVarServices,
): { questCount: number; extraCount: number } {
    for (const quest of QUEST_COMPLETIONS) {
        applyQuestCompletionDef(player, quest, services);
    }
    for (const extra of EXTRA_COMPLETION_VARS) {
        applyVarUpdate(player, extra, services, true);
    }
    player.setVarpValue(VARP_QUEST_POINTS, ALL_QUESTS_QUEST_POINTS);
    services.queueVarp(player.id, VARP_QUEST_POINTS, ALL_QUESTS_QUEST_POINTS);
    return { questCount: QUEST_COMPLETIONS.length, extraCount: EXTRA_COMPLETION_VARS.length };
}

/**
 * Snapshot of quest-related vars currently set on the player (for login client sync).
 * Persistence already stores these via exportPersistentVars; this rebuilds the client view.
 */
export function collectQuestProgressClientSync(
    player: Pick<PlayerState, "getVarpValue" | "getVarbitValue">,
): { varps: Array<{ varpId: number; value: number }>; varbits: Array<{ varbitId: number; value: number }> } {
    const varpMap = new Map<number, number>();
    const varbitMap = new Map<number, number>();

    const consider = (kind: QuestProgressKind, id: number) => {
        if (kind === "varp") {
            const value = player.getVarpValue(id) | 0;
            if (value !== 0) varpMap.set(id, value);
            return;
        }
        const value = player.getVarbitValue(id) | 0;
        if (value !== 0) varbitMap.set(id, value);
    };

    for (const quest of QUEST_COMPLETIONS) {
        consider(quest.kind, quest.varId);
    }
    for (const extra of EXTRA_COMPLETION_VARS) {
        consider(extra.kind, extra.id);
    }
    consider("varp", VARP_QUEST_POINTS);

    return {
        varps: [...varpMap.entries()].map(([varpId, value]) => ({ varpId, value })),
        varbits: [...varbitMap.entries()].map(([varbitId, value]) => ({ varbitId, value })),
    };
}
