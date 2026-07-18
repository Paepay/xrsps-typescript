/**
 * Thieving stall definitions and depletion tracking.
 *
 * Sources: OSRS wiki stall pages (r237+), cache Steal-from locs, LostCityRS steal_from_stall.
 * Success is always 100% when not spotted by an owner/guard with line of sight.
 */

import type { Vec2 } from "./woodcutting";

export interface StallLootEntry {
    itemId: number;
    minAmount: number;
    maxAmount: number;
    weight: number;
    /** Message fragment after "You steal " */
    message: string;
}

export interface StallLocVariant {
    locId: number;
    emptyLocId: number;
    /** Override respawn when this loc differs from the type default (e.g. Keldagrim bakery). */
    respawnTicks?: number;
}

export interface ThievingStallDef {
    /** Skill-guide activity id. */
    guideId: string;
    name: string;
    /** Stall name used in level/attempt messages. */
    stallName: string;
    reqLevel: number;
    xp: number;
    respawnTicks: number;
    lootTable: StallLootEntry[];
    lootTotal: number;
    locs: StallLocVariant[];
    /** Owner NPC type ids (block steal + shout if LoS). */
    ownerNpcIds?: number[];
    /** Guard NPC type ids (attack if LoS). */
    guardNpcIds?: number[];
}

const ALWAYS = 128;

function loot(
    itemId: number,
    amount: number | [number, number],
    weight: number,
    message: string,
): StallLootEntry {
    const [minAmount, maxAmount] = Array.isArray(amount) ? amount : [amount, amount];
    return { itemId, minAmount, maxAmount, weight, message };
}

/** Seconds → game ticks (0.6s). */
export function secondsToTicks(seconds: number): number {
    return Math.max(1, Math.round(seconds / 0.6));
}

const EMPTY_MARKET = 634;
const EMPTY_HOSIDIUS = 6944;
const EMPTY_KELDAGRIM = 6984;
const EMPTY_WINE = 14012;
const EMPTY_FRUIT = 27537;

/** Shared Ardougne-style guard type ids (r237 pickpocket-verified where applicable). */
const ARDOUGNE_GUARDS = [
    397, 398, 399, 400, 1546, 1547, 1548, 1549, 1550, 3010, 3011, 3254, 3269, 3270, 3271, 3272,
    3273, 3274, 3283, 3297, 3300, 4522, 4523, 4524, 4525, 4526, 5418, 8854, 11902, 11936,
];

export const THIEVING_STALLS: ThievingStallDef[] = [
    {
        guideId: "vegetable_stall",
        name: "Vegetable stall",
        stallName: "vegetable stall",
        reqLevel: 2,
        xp: 10,
        respawnTicks: secondsToTicks(1.2),
        lootTotal: 20,
        lootTable: [
            loot(1957, 1, 4, "an onion"),
            loot(1965, 1, 4, "a cabbage"),
            loot(1942, 1, 4, "a potato"),
            loot(1982, 1, 4, "a tomato"),
            loot(1550, 1, 4, "a garlic"),
        ],
        locs: [
            { locId: 4706, emptyLocId: EMPTY_MARKET },
            { locId: 4708, emptyLocId: EMPTY_MARKET },
            { locId: 58100, emptyLocId: EMPTY_MARKET },
        ],
    },
    {
        guideId: "cake_stall",
        name: "Bakery stall",
        stallName: "baker's stall",
        reqLevel: 5,
        xp: 16,
        respawnTicks: secondsToTicks(2.4),
        lootTotal: 20,
        lootTable: [
            loot(2309, 1, 5, "some bread"),
            loot(1891, 1, 13, "a cake"),
            loot(1901, 1, 2, "a chocolate slice"),
        ],
        locs: [
            { locId: 11730, emptyLocId: EMPTY_MARKET },
            { locId: 6163, emptyLocId: EMPTY_KELDAGRIM, respawnTicks: secondsToTicks(9.6) },
            { locId: 6945, emptyLocId: EMPTY_HOSIDIUS },
            { locId: 51937, emptyLocId: EMPTY_MARKET },
        ],
        guardNpcIds: ARDOUGNE_GUARDS,
    },
    {
        guideId: "tea_stall",
        name: "Tea stall",
        stallName: "tea stall",
        reqLevel: 5,
        xp: 16,
        respawnTicks: secondsToTicks(2.4),
        lootTotal: ALWAYS,
        lootTable: [loot(1978, 1, ALWAYS, "a cup of tea")],
        locs: [
            { locId: 635, emptyLocId: EMPTY_MARKET },
            { locId: 20350, emptyLocId: EMPTY_MARKET },
        ],
    },
    {
        guideId: "crafting_stall",
        name: "Crafting stall",
        stallName: "crafting stall",
        reqLevel: 5,
        xp: 20,
        respawnTicks: secondsToTicks(4.8),
        lootTotal: 18,
        lootTable: [
            loot(1755, 1, 3, "a chisel"),
            loot(1592, 1, 3, "a ring mould"),
            loot(1597, 1, 3, "a necklace mould"),
            loot(1595, 1, 3, "an amulet mould"),
            loot(11065, 1, 3, "a bracelet mould"),
            loot(2357, 1, 3, "a gold bar"),
        ],
        locs: [
            { locId: 4874, emptyLocId: EMPTY_MARKET },
            { locId: 6166, emptyLocId: EMPTY_KELDAGRIM },
        ],
    },
    {
        guideId: "monkey_food_stall",
        name: "Monkey food stall",
        stallName: "food stall",
        reqLevel: 5,
        xp: 16,
        respawnTicks: secondsToTicks(3.6),
        lootTotal: ALWAYS,
        lootTable: [loot(1963, 1, ALWAYS, "a banana")],
        locs: [{ locId: 4875, emptyLocId: EMPTY_MARKET }],
    },
    {
        guideId: "silk_stall",
        name: "Silk stall",
        stallName: "silk stall",
        reqLevel: 20,
        xp: 24,
        respawnTicks: secondsToTicks(4.8),
        lootTotal: ALWAYS,
        lootTable: [loot(950, 1, ALWAYS, "a piece of silk")],
        locs: [
            { locId: 11729, emptyLocId: EMPTY_MARKET },
            { locId: 36569, emptyLocId: EMPTY_MARKET },
            { locId: 51933, emptyLocId: EMPTY_MARKET },
            { locId: 58101, emptyLocId: EMPTY_MARKET },
        ],
        guardNpcIds: ARDOUGNE_GUARDS,
    },
    {
        guideId: "wine_stall",
        name: "Wine stall",
        stallName: "wine stall",
        reqLevel: 22,
        xp: 27,
        respawnTicks: secondsToTicks(4.8),
        lootTotal: 100,
        lootTable: [
            loot(7919, 1, 11, "a bottle of wine"),
            loot(1987, 1, 17, "some grapes"),
            loot(1935, 1, 39, "a jug"),
            loot(1937, 1, 20, "a jug of water"),
            loot(1993, 1, 13, "a jug of wine"),
        ],
        locs: [{ locId: 14011, emptyLocId: EMPTY_WINE }],
    },
    {
        guideId: "fruit_stall",
        name: "Fruit stall",
        stallName: "fruit stall",
        reqLevel: 25,
        xp: 28.5,
        respawnTicks: secondsToTicks(2.4),
        lootTotal: 100,
        lootTable: [
            loot(1955, 1, 40, "a cooking apple"),
            loot(1963, 1, 20, "a banana"),
            loot(247, 1, 5, "some jangerberries"),
            loot(2102, 1, 5, "a lemon"),
            loot(1951, 1, 5, "some redberries"),
            loot(2114, 1, 5, "a pineapple"),
            loot(2120, 1, 5, "a lime"),
            loot(5504, 1, 7, "a strawberry"),
            loot(464, 1, 5, "a strange fruit"),
            loot(19653, 1, 2, "a golovanova fruit top"),
            loot(5972, 1, 1, "a papaya fruit"),
        ],
        locs: [{ locId: 28823, emptyLocId: EMPTY_FRUIT }],
        // Guard dogs in Hosidius market (common variants)
        guardNpcIds: [131, 132, 7209],
    },
    {
        guideId: "seed_stall",
        name: "Seed stall",
        stallName: "seed stall",
        reqLevel: 27,
        xp: 10,
        respawnTicks: secondsToTicks(2.4),
        lootTotal: 94,
        lootTable: [
            loot(5318, 1, 30, "some potato seeds"),
            loot(5319, 1, 25, "some onion seeds"),
            loot(5324, 1, 20, "some cabbage seeds"),
            loot(5322, 1, 10, "some tomato seeds"),
            loot(5320, 1, 5, "some sweetcorn seeds"),
            loot(5323, 1, 3, "a strawberry seed"),
            loot(5321, 1, 1, "a watermelon seed"),
        ],
        locs: [{ locId: 7053, emptyLocId: EMPTY_MARKET }],
    },
    {
        guideId: "fur_stall",
        name: "Fur stall",
        stallName: "fur stall",
        reqLevel: 35,
        xp: 45,
        respawnTicks: secondsToTicks(7.2),
        lootTotal: 2,
        lootTable: [
            loot(948, 1, 1, "some fur"),
            loot(958, 1, 1, "a grey wolf fur"),
        ],
        locs: [
            { locId: 11732, emptyLocId: EMPTY_MARKET },
            { locId: 4278, emptyLocId: EMPTY_MARKET },
            { locId: 51934, emptyLocId: EMPTY_MARKET },
            { locId: 58102, emptyLocId: EMPTY_MARKET },
        ],
        guardNpcIds: ARDOUGNE_GUARDS,
    },
    {
        guideId: "fish_stall",
        name: "Fish stall",
        stallName: "fish stall",
        reqLevel: 42,
        xp: 42,
        respawnTicks: secondsToTicks(7.2),
        lootTotal: 20,
        lootTable: [
            loot(331, 1, 14, "a raw salmon"),
            loot(359, 1, 5, "a raw tuna"),
            loot(377, 1, 1, "a raw lobster"),
        ],
        locs: [
            { locId: 4277, emptyLocId: EMPTY_MARKET },
            { locId: 4705, emptyLocId: EMPTY_MARKET },
            { locId: 4707, emptyLocId: EMPTY_MARKET },
            { locId: 31712, emptyLocId: EMPTY_MARKET },
            { locId: 58103, emptyLocId: EMPTY_MARKET },
        ],
    },
    {
        guideId: "crossbow_stall",
        name: "Crossbow stall",
        stallName: "crossbow stall",
        reqLevel: 49,
        xp: 52,
        respawnTicks: secondsToTicks(4.8),
        lootTotal: 15,
        lootTable: [
            loot(877, 3, 5, "some bronze bolts"),
            loot(9420, 1, 3, "bronze limbs"),
            loot(9142, 1, 2, "some mithril bolts"),
            loot(9422, 1, 2, "mithril limbs"),
            loot(9440, 1, 3, "a wooden stock"),
        ],
        locs: [{ locId: 17031, emptyLocId: EMPTY_KELDAGRIM }],
    },
    {
        guideId: "silver_stall",
        name: "Silver stall",
        stallName: "silver stall",
        reqLevel: 50,
        xp: 205,
        respawnTicks: secondsToTicks(19.2),
        lootTotal: 3,
        lootTable: [
            loot(442, 1, 1, "some silver ore"),
            loot(2355, 1, 1, "a silver bar"),
            loot(5525, 1, 1, "a tiara"),
        ],
        locs: [
            { locId: 11734, emptyLocId: EMPTY_MARKET },
            { locId: 6164, emptyLocId: EMPTY_KELDAGRIM },
            { locId: 36570, emptyLocId: EMPTY_MARKET },
            { locId: 58104, emptyLocId: EMPTY_MARKET },
        ],
        guardNpcIds: ARDOUGNE_GUARDS,
    },
    {
        guideId: "magic_stall",
        name: "Magic stall",
        stallName: "magic stall",
        reqLevel: 65,
        xp: 90,
        respawnTicks: secondsToTicks(7.2),
        lootTotal: 5,
        lootTable: [
            loot(556, 1, 1, "an air rune"),
            loot(557, 1, 1, "an earth rune"),
            loot(554, 1, 1, "a fire rune"),
            loot(561, 1, 1, "a nature rune"),
            loot(563, 1, 1, "a law rune"),
        ],
        locs: [{ locId: 4877, emptyLocId: EMPTY_MARKET }],
    },
    {
        guideId: "scimitar_stall",
        name: "Scimitar stall",
        stallName: "scimitar stall",
        reqLevel: 65,
        xp: 210,
        respawnTicks: secondsToTicks(19.2),
        lootTotal: 10,
        lootTable: [
            loot(1323, 1, 4, "an iron scimitar"),
            loot(1325, 1, 3, "a steel scimitar"),
            loot(1329, 1, 2, "a mithril scimitar"),
            loot(1331, 1, 1, "an adamant scimitar"),
        ],
        locs: [{ locId: 4878, emptyLocId: EMPTY_MARKET }],
    },
    {
        guideId: "spice_stall",
        name: "Spice stall",
        stallName: "spice stall",
        reqLevel: 65,
        xp: 92,
        respawnTicks: secondsToTicks(6),
        lootTotal: ALWAYS,
        lootTable: [loot(2007, 1, ALWAYS, "some spice")],
        locs: [
            { locId: 11733, emptyLocId: EMPTY_MARKET },
            { locId: 36572, emptyLocId: EMPTY_MARKET },
            { locId: 51936, emptyLocId: EMPTY_MARKET },
            { locId: 58105, emptyLocId: EMPTY_MARKET },
        ],
        guardNpcIds: ARDOUGNE_GUARDS,
    },
    {
        guideId: "gem_stall",
        name: "Gem stall",
        stallName: "gem stall",
        reqLevel: 75,
        xp: 408,
        respawnTicks: secondsToTicks(60),
        lootTotal: 128,
        lootTable: [
            loot(1623, 1, 105, "an uncut sapphire"),
            loot(1621, 1, 17, "an uncut emerald"),
            loot(1619, 1, 5, "an uncut ruby"),
            loot(1617, 1, 1, "an uncut diamond"),
        ],
        locs: [
            { locId: 11731, emptyLocId: EMPTY_MARKET },
            { locId: 6162, emptyLocId: EMPTY_KELDAGRIM },
            { locId: 36571, emptyLocId: EMPTY_MARKET },
            { locId: 51935, emptyLocId: EMPTY_MARKET },
            { locId: 58106, emptyLocId: EMPTY_MARKET },
        ],
        guardNpcIds: ARDOUGNE_GUARDS,
    },
    {
        guideId: "ore_stall",
        name: "Ore stall",
        stallName: "ore stall",
        reqLevel: 82,
        xp: 350,
        respawnTicks: secondsToTicks(30),
        lootTotal: 100,
        lootTable: [
            loot(453, 1, 30, "some coal"),
            loot(440, 1, 25, "some iron ore"),
            loot(442, 1, 20, "some silver ore"),
            loot(444, 1, 15, "some gold ore"),
            loot(447, 1, 5, "some mithril ore"),
            loot(449, 1, 3, "some adamantite ore"),
            loot(451, 1, 2, "some runite ore"),
        ],
        locs: [
            { locId: 30279, emptyLocId: 30278 },
            { locId: 30280, emptyLocId: 30278 },
            { locId: 58107, emptyLocId: EMPTY_MARKET },
        ],
    },
];

/** Clothes stall: steal option exists but always refuses (OSRS parity). */
export const CLOTHES_STALL_LOC_IDS = [6165] as const;

export const MONKEY_GENERAL_STALL: ThievingStallDef = {
    guideId: "monkey_general_stall",
    name: "Monkey general stall",
    stallName: "general stall",
    reqLevel: 5,
    xp: 25,
    respawnTicks: secondsToTicks(4.8),
    lootTotal: 3,
    lootTable: [
        loot(1931, 1, 1, "a pot"),
        loot(2347, 1, 1, "a hammer"),
        loot(590, 1, 1, "a tinderbox"),
    ],
    locs: [{ locId: 4876, emptyLocId: EMPTY_MARKET }],
};

const ALL_STALLS: ThievingStallDef[] = [...THIEVING_STALLS, MONKEY_GENERAL_STALL];

export type StallLocBinding = {
    stall: ThievingStallDef;
    variant: StallLocVariant;
};

const STALL_BY_LOC = new Map<number, StallLocBinding>();
for (const stall of ALL_STALLS) {
    for (const variant of stall.locs) {
        STALL_BY_LOC.set(variant.locId, { stall, variant });
    }
}

export function getStallByLocId(locId: number): StallLocBinding | undefined {
    return STALL_BY_LOC.get(locId);
}

export function getStallRespawnTicks(binding: StallLocBinding): number {
    return binding.variant.respawnTicks ?? binding.stall.respawnTicks;
}

export function rollStallLoot(stall: {
    lootTable: StallLootEntry[];
    lootTotal: number;
}): { itemId: number; quantity: number; message: string } | undefined {
    if (stall.lootTable.length === 0) return undefined;
    let remaining = stall.lootTotal;
    for (let i = stall.lootTable.length - 1; i >= 0; i--) {
        const entry = stall.lootTable[i];
        const roll = Math.floor(Math.random() * remaining);
        remaining -= entry.weight;
        if (roll >= remaining) {
            const quantity =
                entry.minAmount === entry.maxAmount
                    ? entry.minAmount
                    : entry.minAmount +
                      Math.floor(Math.random() * (entry.maxAmount - entry.minAmount + 1));
            return { itemId: entry.itemId, quantity, message: entry.message };
        }
    }
    const fallback = stall.lootTable[0];
    return { itemId: fallback.itemId, quantity: fallback.minAmount, message: fallback.message };
}

export type ThievingStallNodeState = {
    key: string;
    locId: number;
    emptyLocId: number;
    tile: Vec2;
    level: number;
    respawnTick: number;
};

export function buildThievingStallTileKey(tile: Vec2, level: number): string {
    return `${tile.x}|${tile.y}|${level}`;
}

export class ThievingStallTracker {
    private nodes = new Map<string, ThievingStallNodeState>();

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
