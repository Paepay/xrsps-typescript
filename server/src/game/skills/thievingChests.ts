/**
 * Thieving chest definitions and depletion tracking.
 *
 * Sources: OSRS wiki chest pages (object ids), LostCityRS trapped_chest procs.
 * Trap chests: Open without searching damages; Search for traps disarms then loots.
 * Lockpick chests: require lockpick (steel arrowtips, dorgesh, stone).
 */

import type { Vec2 } from "./woodcutting";
import { secondsToTicks } from "./thievingStalls";

export interface ChestLootEntry {
    itemId: number;
    minAmount: number;
    maxAmount: number;
    /** Weight within lootTotal; use lootTotal for always-drop tables. */
    weight: number;
}

export type ChestTrapDamage =
    | { kind: "hp_percent"; percent: number; flat: number }
    | { kind: "formula"; /** (9*hp + 225) / 50 for blood rune chest */ id: "blood_rune" };

export interface ThievingChestDef {
    guideId: string;
    name: string;
    reqLevel: number;
    xp: number;
    respawnTicks: number;
    locIds: number[];
    /** Transform while empty / already looted. */
    emptyLocId: number;
    /** Brief opened visual before empty (optional). */
    openLocId?: number;
    openTicks?: number;
    lootTable: ChestLootEntry[];
    lootTotal: number;
    /** Requires searching for traps (classic Ardougne-style). */
    trapped: boolean;
    /** Requires lockpick in inventory. */
    requiresLockpick?: boolean;
    trapDamage?: ChestTrapDamage;
    /** Teleport after successful loot (second magical trap). */
    teleCoord?: { x: number; y: number; level: number };
}

function always(itemId: number, amount: number | [number, number]): ChestLootEntry {
    const [minAmount, maxAmount] = Array.isArray(amount) ? amount : [amount, amount];
    return { itemId, minAmount, maxAmount, weight: 128 };
}

const EMPTY_TRAP_CHEST = 11740;
const EMPTY_PICK_CHEST = 11741;
const OPEN_TRAP_CHEST = 11740; // visual empty/open placeholder while waiting

export const THIEVING_CHESTS: ThievingChestDef[] = [
    {
        guideId: "chest_10_coins",
        name: "10 coin chest",
        reqLevel: 13,
        xp: 7.8,
        respawnTicks: secondsToTicks(7),
        locIds: [11735],
        emptyLocId: EMPTY_TRAP_CHEST,
        openLocId: OPEN_TRAP_CHEST,
        openTicks: 4,
        lootTable: [always(995, 10)],
        lootTotal: 128,
        trapped: true,
        trapDamage: { kind: "hp_percent", percent: 12, flat: 3 },
    },
    {
        guideId: "chest_nature_runes",
        name: "Nature rune chest",
        reqLevel: 28,
        xp: 25,
        respawnTicks: secondsToTicks(15),
        locIds: [11736],
        emptyLocId: EMPTY_TRAP_CHEST,
        openLocId: OPEN_TRAP_CHEST,
        openTicks: 4,
        lootTable: [always(561, 1), always(995, 3)],
        lootTotal: 128,
        trapped: true,
        trapDamage: { kind: "hp_percent", percent: 12, flat: 3 },
    },
    {
        guideId: "chest_50_coins",
        name: "50 coin chest",
        reqLevel: 43,
        xp: 125,
        respawnTicks: secondsToTicks(50),
        locIds: [11737],
        emptyLocId: EMPTY_TRAP_CHEST,
        openLocId: OPEN_TRAP_CHEST,
        openTicks: 4,
        lootTable: [always(995, 50)],
        lootTotal: 128,
        trapped: true,
        trapDamage: { kind: "hp_percent", percent: 12, flat: 3 },
    },
    {
        guideId: "chest_steel_arrowtips",
        name: "Steel arrowtips chest",
        reqLevel: 47,
        xp: 150,
        respawnTicks: secondsToTicks(90),
        locIds: [11742],
        emptyLocId: EMPTY_PICK_CHEST,
        openLocId: EMPTY_PICK_CHEST,
        openTicks: 4,
        lootTable: [always(41, 5), always(995, 20)],
        lootTotal: 128,
        trapped: true,
        requiresLockpick: true,
        trapDamage: { kind: "hp_percent", percent: 12, flat: 3 },
    },
    {
        guideId: "chest_dorgesh_kaan_average",
        name: "Dorgesh-Kaan average chest",
        reqLevel: 52,
        xp: 200,
        respawnTicks: secondsToTicks(90),
        locIds: [22697, 22698],
        emptyLocId: EMPTY_PICK_CHEST,
        lootTable: [
            { itemId: 995, minAmount: 1, maxAmount: 250, weight: 3 },
            { itemId: 4539, minAmount: 1, maxAmount: 1, weight: 1 },
            { itemId: 4550, minAmount: 1, maxAmount: 1, weight: 1 },
            { itemId: 5014, minAmount: 1, maxAmount: 1, weight: 1 },
            { itemId: 11076, minAmount: 1, maxAmount: 2, weight: 1 },
        ],
        lootTotal: 7,
        trapped: false,
        requiresLockpick: true,
    },
    {
        guideId: "chest_blood_rune",
        name: "Blood rune chest",
        reqLevel: 59,
        xp: 250,
        respawnTicks: secondsToTicks(135),
        locIds: [11738],
        emptyLocId: EMPTY_TRAP_CHEST,
        openLocId: OPEN_TRAP_CHEST,
        openTicks: 4,
        lootTable: [always(565, 2), always(995, 500)],
        lootTotal: 128,
        trapped: true,
        trapDamage: { kind: "formula", id: "blood_rune" },
        teleCoord: { x: 2584, y: 3337, level: 0 },
    },
    {
        guideId: "chest_stone",
        name: "Stone chest",
        reqLevel: 64,
        xp: 280,
        respawnTicks: 0,
        locIds: [34429],
        emptyLocId: 48757,
        lootTable: [
            { itemId: 995, minAmount: 20, maxAmount: 260, weight: 100 },
            { itemId: 13383, minAmount: 1, maxAmount: 1, weight: 66 },
            { itemId: 13391, minAmount: 1, maxAmount: 1, weight: 85 },
            { itemId: 1623, minAmount: 1, maxAmount: 1, weight: 12 },
            { itemId: 1619, minAmount: 1, maxAmount: 1, weight: 8 },
            { itemId: 13392, minAmount: 1, maxAmount: 1, weight: 1 },
        ],
        lootTotal: 272,
        trapped: false,
        requiresLockpick: true,
    },
    {
        guideId: "chest_ardougne_castle",
        name: "Ardougne Castle chest",
        reqLevel: 72,
        xp: 500,
        respawnTicks: secondsToTicks(500),
        locIds: [11739],
        emptyLocId: EMPTY_TRAP_CHEST,
        openLocId: OPEN_TRAP_CHEST,
        openTicks: 4,
        lootTable: [always(995, 1000), always(383, 1), always(449, 1), always(1623, 1)],
        lootTotal: 128,
        trapped: true,
        trapDamage: { kind: "hp_percent", percent: 12, flat: 3 },
        teleCoord: { x: 2696, y: 3281, level: 0 },
    },
    {
        guideId: "chest_dorgesh_kaan_rich",
        name: "Dorgesh-Kaan rich chest",
        reqLevel: 78,
        xp: 650,
        respawnTicks: secondsToTicks(300),
        locIds: [22681, 22682],
        emptyLocId: EMPTY_PICK_CHEST,
        lootTable: [
            { itemId: 995, minAmount: 100, maxAmount: 500, weight: 3 },
            { itemId: 1623, minAmount: 1, maxAmount: 1, weight: 1 },
            { itemId: 1621, minAmount: 1, maxAmount: 1, weight: 1 },
            { itemId: 1619, minAmount: 1, maxAmount: 1, weight: 1 },
            { itemId: 1617, minAmount: 1, maxAmount: 1, weight: 1 },
        ],
        lootTotal: 7,
        trapped: false,
        requiresLockpick: true,
    },
    {
        guideId: "chest_rogues_castle",
        name: "Rogues' Castle chest",
        reqLevel: 84,
        xp: 701.7,
        respawnTicks: 34,
        locIds: [26757],
        emptyLocId: 26758,
        lootTable: [
            { itemId: 561, minAmount: 40, maxAmount: 40, weight: 11 },
            { itemId: 223, minAmount: 6, maxAmount: 6, weight: 10 },
            { itemId: 563, minAmount: 40, maxAmount: 40, weight: 10 },
            { itemId: 453, minAmount: 20, maxAmount: 20, weight: 8 },
            { itemId: 995, minAmount: 4500, maxAmount: 4500, weight: 6 },
            { itemId: 1617, minAmount: 3, maxAmount: 3, weight: 3 },
            { itemId: 1615, minAmount: 2, maxAmount: 2, weight: 1 },
        ],
        lootTotal: 49,
        trapped: true,
        trapDamage: { kind: "hp_percent", percent: 12, flat: 3 },
    },
];

const CHEST_BY_LOC = new Map<number, ThievingChestDef>();
for (const chest of THIEVING_CHESTS) {
    for (const id of chest.locIds) {
        CHEST_BY_LOC.set(id, chest);
    }
}

export function getChestByLocId(locId: number): ThievingChestDef | undefined {
    return CHEST_BY_LOC.get(locId);
}

export function computeChestTrapDamage(
    currentHp: number,
    formula: ChestTrapDamage | undefined,
): number {
    if (!formula) {
        return Math.max(1, Math.floor((currentHp * 12) / 100) + 3);
    }
    if (formula.kind === "hp_percent") {
        return Math.max(1, Math.floor((currentHp * formula.percent) / 100) + formula.flat);
    }
    // Blood rune / Chaos Druid Tower: (9*hp + 225) / 50
    return Math.max(1, Math.floor((9 * currentHp + 225) / 50));
}

export function rollChestLoot(chest: {
    lootTable: ChestLootEntry[];
    lootTotal: number;
}): Array<{ itemId: number; quantity: number }> {
    const results: Array<{ itemId: number; quantity: number }> = [];
    // Always-drop style (all entries always awarded) when every weight is 128 and lootTotal is 128
    // and multiple always() entries — award all.
    const allAlways =
        chest.lootTable.length > 0 &&
        chest.lootTable.every((e) => e.weight === 128) &&
        chest.lootTotal === 128;

    if (allAlways) {
        for (const entry of chest.lootTable) {
            const quantity =
                entry.minAmount === entry.maxAmount
                    ? entry.minAmount
                    : entry.minAmount +
                      Math.floor(Math.random() * (entry.maxAmount - entry.minAmount + 1));
            results.push({ itemId: entry.itemId, quantity });
        }
        return results;
    }

    // Weighted single-roll (Dorgesh / stone)
    let remaining = chest.lootTotal;
    for (let i = chest.lootTable.length - 1; i >= 0; i--) {
        const entry = chest.lootTable[i];
        const roll = Math.floor(Math.random() * remaining);
        remaining -= entry.weight;
        if (roll >= remaining) {
            const quantity =
                entry.minAmount === entry.maxAmount
                    ? entry.minAmount
                    : entry.minAmount +
                      Math.floor(Math.random() * (entry.maxAmount - entry.minAmount + 1));
            results.push({ itemId: entry.itemId, quantity });
            return results;
        }
    }
    const fallback = chest.lootTable[0];
    if (fallback) {
        results.push({ itemId: fallback.itemId, quantity: fallback.minAmount });
    }
    return results;
}

/** Stone chest success chance (Mod Ash): linear between level bands, +lockpick bonus. */
export function rollStoneChestSuccess(thievingLevel: number, hasLockpick: boolean): boolean {
    // Without lockpick: lvl50≈19.2%, lvl99≈60.4%. With: +~10%.
    // Interpolate high/low from wiki chart: normal low=-56 high=154, lockpick low=-31 high=179
    // Using OSRS skilling success: chance = (low*(99-lvl) + high*(lvl-1)) / 98 / 256
    const low = hasLockpick ? -31 : -56;
    const high = hasLockpick ? 179 : 154;
    const lvl = Math.max(1, Math.min(99, thievingLevel));
    const numer = low * (99 - lvl) + high * (lvl - 1);
    const chance = numer / 98 / 256;
    return Math.random() < Math.max(0, Math.min(1, chance));
}

export type ThievingChestNodeState = {
    key: string;
    locId: number;
    emptyLocId: number;
    tile: Vec2;
    level: number;
    respawnTick: number;
};

export function buildThievingChestTileKey(tile: Vec2, level: number): string {
    return `${tile.x}|${tile.y}|${level}`;
}

export class ThievingChestTracker {
    private nodes = new Map<string, ThievingChestNodeState>();

    isDepleted(key: string): boolean {
        return this.nodes.has(key);
    }

    markDepleted(
        info: {
            key: string;
            locId: number;
            emptyLocId: number;
            tile: Vec2;
            level: number;
            respawnTicks: number;
        },
        tick: number,
    ): void {
        if (info.respawnTicks <= 0) return; // Instant respawn (stone chests)
        if (this.nodes.has(info.key)) return;
        this.nodes.set(info.key, {
            key: info.key,
            locId: info.locId,
            emptyLocId: info.emptyLocId,
            tile: info.tile,
            level: info.level,
            respawnTick: tick + Math.max(1, info.respawnTicks),
        });
    }

    processRespawns(
        tick: number,
        emitLocChange: (oldId: number, newId: number, tile: Vec2, level: number) => void,
    ): void {
        for (const [key, state] of this.nodes.entries()) {
            if (tick < state.respawnTick) continue;
            emitLocChange(state.emptyLocId, state.locId, state.tile, state.level);
            this.nodes.delete(key);
        }
    }
}
