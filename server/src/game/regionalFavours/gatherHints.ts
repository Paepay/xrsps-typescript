/**
 * Favour gather/process hint destinations.
 *
 * Prefer deriving areas from cache loc placements + npc-spawns + skill defs
 * via initGatherHintsFromWorld(). A small manual override table exists only for
 * items that have no clear world resource (shops / ambiguous process chains).
 */
import {
    getFishingSpotById,
    type FishingSpotMap,
} from "../skills/fishing";
import { FIELD_CROP_DEFINITIONS } from "../skills/fieldCrops";
import { getMiningRockById, type MiningLocMap } from "../skills/mining";
import { getWoodcuttingTreeById, type WoodcuttingLocMap } from "../skills/woodcutting";
import { SPINNING_WHEEL_LOC_IDS } from "../skills/spinning";
import {
    ITEM_AIR_RUNE,
    ITEM_ANCHOVIES,
    ITEM_ASHES,
    ITEM_ATTACK_POTION3,
    ITEM_BALL_OF_WOOL,
    ITEM_BONES,
    ITEM_BREAD,
    ITEM_BRONZE_ARROW,
    ITEM_BRONZE_BAR,
    ITEM_BRONZE_DAGGER,
    ITEM_BRONZE_MED_HELM,
    ITEM_BRONZE_NAILS,
    ITEM_BRONZE_SWORD,
    ITEM_BUCKET_MILK,
    ITEM_CAKE,
    ITEM_COWHIDE,
    ITEM_EGG,
    ITEM_FIRE_RUNE,
    ITEM_FLOWERS,
    ITEM_GARLIC,
    ITEM_IRON_ARROW,
    ITEM_IRON_BAR,
    ITEM_IRON_DAGGER,
    ITEM_LEATHER,
    ITEM_LEATHER_BOOTS,
    ITEM_LEATHER_GLOVES,
    ITEM_LOGS,
    ITEM_MIND_RUNE,
    ITEM_PLANK,
    ITEM_POT_FLOUR,
    ITEM_RED_DYE,
    ITEM_ROPE,
    ITEM_RUNE_ESSENCE,
    ITEM_PURE_ESSENCE,
    ITEM_SALMON,
    ITEM_SHRIMPS,
    ITEM_STEEL_BAR,
    ITEM_SWAMP_TAR,
    ITEM_TROUT,
    ITEM_VIAL_WATER,
    ITEM_WOOL,
    ITEM_YELLOW_DYE,
    MistAreas,
    NpcIds,
} from "./constants";
import type { ResourceHintIndex } from "./resourceHintIndex";
import type { TileBounds } from "./types";

/** Shop-bought runes / essence — Aubury's Rune Shop in SE Varrock. */
const AUBURY_SHOP_ITEM_IDS: readonly number[] = [
    ITEM_AIR_RUNE,
    ITEM_MIND_RUNE,
    ITEM_FIRE_RUNE,
    ITEM_RUNE_ESSENCE,
    ITEM_PURE_ESSENCE,
];

const AUBURY_HINT_NPC_IDS: readonly number[] = [NpcIds.Aubury, 11434, 11435];

export type GatherHintSpec = {
    area: TileBounds;
    objectNames?: readonly string[];
    rockId?: string;
    npcTypeIds?: readonly number[];
};

/** Cooked fish item → raw fish item used by fishing spot catch tables. */
const COOKED_TO_RAW_FISH: ReadonlyMap<number, number> = new Map([
    [ITEM_SHRIMPS, 317],
    [ITEM_ANCHOVIES, 321],
    [ITEM_TROUT, 335],
    [ITEM_SALMON, 331],
]);

/**
 * Explicit overrides when no single world resource can be derived.
 * Keep this tiny — prefer skill/loc/spawn data.
 */
const MANUAL_HINT_OVERRIDES: ReadonlyMap<number, GatherHintSpec> = new Map([
    // Shops / multi-hop crafts with no unique scenery in Misthalin skill data.
    [ITEM_ROPE, { area: MistAreas.DraynorVillage }],
    [ITEM_PLANK, { area: MistAreas.DraynorVillage }],
    [ITEM_GARLIC, { area: MistAreas.DraynorVillage }],
    [ITEM_RED_DYE, { area: MistAreas.DraynorVillage }],
    [ITEM_YELLOW_DYE, { area: MistAreas.DraynorVillage }],
    // Aubury's Rune Shop (SE Varrock) — buy runes / teleport to essence.
    [
        ITEM_AIR_RUNE,
        { area: MistAreas.AuburyRuneShop, npcTypeIds: AUBURY_HINT_NPC_IDS },
    ],
    [
        ITEM_MIND_RUNE,
        { area: MistAreas.AuburyRuneShop, npcTypeIds: AUBURY_HINT_NPC_IDS },
    ],
    [
        ITEM_FIRE_RUNE,
        { area: MistAreas.AuburyRuneShop, npcTypeIds: AUBURY_HINT_NPC_IDS },
    ],
    [
        ITEM_RUNE_ESSENCE,
        { area: MistAreas.AuburyRuneShop, npcTypeIds: AUBURY_HINT_NPC_IDS },
    ],
    [
        ITEM_PURE_ESSENCE,
        { area: MistAreas.AuburyRuneShop, npcTypeIds: AUBURY_HINT_NPC_IDS },
    ],
    [ITEM_VIAL_WATER, { area: MistAreas.VarrockSquare }],
    [ITEM_ATTACK_POTION3, { area: MistAreas.VarrockSquare }],
    [ITEM_LEATHER_GLOVES, { area: MistAreas.VarrockSquare }],
    [ITEM_LEATHER_BOOTS, { area: MistAreas.VarrockSquare }],
    [ITEM_BONES, { area: MistAreas.LumbridgeSwamp }],
    [ITEM_SWAMP_TAR, { area: MistAreas.LumbridgeSwamp }],
]);

let derivedHints: Map<number, GatherHintSpec> = new Map();
let initialized = false;

function setHint(target: Map<number, GatherHintSpec>, itemId: number, spec: GatherHintSpec): void {
    if (!(itemId > 0)) return;
    if (!spec.area) return;
    target.set(itemId, spec);
}

/**
 * Build item→hint map from world placements + skill definitions.
 * Call once after cache / loc maps are ready (wsServer bootstrap).
 */
export function initGatherHintsFromWorld(deps: {
    index: ResourceHintIndex;
    miningLocMap?: MiningLocMap["map"] | Map<number, { rockId: string }>;
    woodcuttingLocMap?: WoodcuttingLocMap["map"] | Map<number, string>;
    fishingSpotMap?: FishingSpotMap["map"] | Map<number, string>;
}): void {
    const next = new Map<number, GatherHintSpec>();
    const { index } = deps;

    // ——— Field crops (onion / potato / cabbage / wheat→flour) ———
    for (const crop of FIELD_CROP_DEFINITIONS) {
        const area = index.getBoundsForLocIds(crop.locIds, 32);
        if (!area) continue;
        // Flour favours use pot of flour; point at wheat fields.
        if (crop.id === "wheat") {
            setHint(next, ITEM_POT_FLOUR, {
                area,
                objectNames: ["Wheat"],
            });
        }
        setHint(next, crop.itemId, {
            area,
            objectNames:
                crop.id === "onion"
                    ? ["Onion"]
                    : crop.id === "potato"
                      ? ["Potato"]
                      : crop.id === "cabbage"
                        ? ["Cabbage"]
                        : ["Wheat"],
        });
    }

    // ——— Mining ores ———
    if (deps.miningLocMap) {
        const rockLocIds = new Map<string, number[]>();
        for (const [locId, mapping] of deps.miningLocMap) {
            const list = rockLocIds.get(mapping.rockId) ?? [];
            list.push(locId | 0);
            rockLocIds.set(mapping.rockId, list);
        }
        for (const [rockId, locIds] of rockLocIds) {
            const rock = getMiningRockById(rockId);
            if (!rock) continue;
            const area = index.getBoundsForLocIds(locIds, 40);
            if (!area) continue;
            setHint(next, rock.oreItemId, {
                area,
                objectNames: [rock.name],
                rockId: rock.id,
            });
        }
    }

    // ——— Woodcutting logs ———
    if (deps.woodcuttingLocMap) {
        const treeLocIds = new Map<string, number[]>();
        for (const [locId, treeId] of deps.woodcuttingLocMap) {
            const list = treeLocIds.get(treeId) ?? [];
            list.push(locId | 0);
            treeLocIds.set(treeId, list);
        }
        for (const [treeId, locIds] of treeLocIds) {
            const tree = getWoodcuttingTreeById(treeId);
            if (!tree) continue;
            // Normal trees are everywhere — keep a tight densest cluster.
            const maxSpan = treeId === "normal" ? 24 : 48;
            const area = index.getBoundsForLocIds(locIds, maxSpan);
            if (!area) continue;
            setHint(next, tree.logItemId, {
                area,
                objectNames: [tree.name],
            });
        }
        // Ashes: burn logs — same tree cluster as normal logs.
        const logHint = next.get(ITEM_LOGS);
        if (logHint) {
            setHint(next, ITEM_ASHES, { ...logHint });
        }
    }

    // ——— Fishing (raw + cooked produce) ———
    if (deps.fishingSpotMap) {
        const spotToNpcIds = new Map<string, number[]>();
        for (const [npcTypeId, spotId] of deps.fishingSpotMap) {
            const list = spotToNpcIds.get(spotId) ?? [];
            list.push(npcTypeId | 0);
            spotToNpcIds.set(spotId, list);
        }
        for (const [spotId, npcTypeIds] of spotToNpcIds) {
            const spot = getFishingSpotById(spotId);
            if (!spot) continue;
            const area = index.getBoundsForNpcTypeIds(npcTypeIds, 40);
            if (!area) continue;
            for (const method of spot.methods) {
                for (const catchDef of method.catches) {
                    setHint(next, catchDef.itemId, {
                        area,
                        npcTypeIds,
                    });
                }
            }
        }
        for (const [cookedId, rawId] of COOKED_TO_RAW_FISH) {
            const rawHint = next.get(rawId);
            if (rawHint) setHint(next, cookedId, { ...rawHint });
        }
    }

    // ——— Livestock NPCs ———
    const chickenArea = index.getBoundsForNpcName("chicken", 32);
    if (chickenArea) {
        setHint(next, ITEM_EGG, {
            area: chickenArea,
            npcTypeIds: index.getNpcTypeIdsForNames(["chicken"]),
        });
    }
    const sheepArea =
        index.getBoundsForNpcName("sheep", 40) ?? index.getBoundsForNpcName("ram", 40);
    if (sheepArea) {
        setHint(next, ITEM_WOOL, {
            area: sheepArea,
            npcTypeIds: index.getNpcTypeIdsForNames(["sheep", "ram"]),
        });
    }
    const cowArea = index.getBoundsForNpcName("cow", 40);
    if (cowArea) {
        const cowIds = index.getNpcTypeIdsForNames(["cow", "cow calf"]);
        setHint(next, ITEM_COWHIDE, {
            area: cowArea,
            npcTypeIds: cowIds,
        });
        setHint(next, ITEM_LEATHER, {
            area: cowArea,
            npcTypeIds: cowIds,
        });
    }
    const dairyArea =
        index.getBoundsForLocNames(["Dairy cow"], 40) ??
        index.getBoundsForNpcName("dairy cow", 40);
    if (dairyArea) {
        setHint(next, ITEM_BUCKET_MILK, {
            area: dairyArea,
            objectNames: ["Dairy cow"],
        });
    }

    // ——— Process stations by LocType.name / known loc ids ———
    const furnace = index.getBoundsForLocNames(["Furnace"], 24);
    if (furnace) {
        for (const itemId of [ITEM_BRONZE_BAR, ITEM_IRON_BAR, ITEM_STEEL_BAR]) {
            setHint(next, itemId, { area: furnace, objectNames: ["Furnace"] });
        }
    }
    const anvil = index.getBoundsForLocNames(["Anvil", "Rusted anvil"], 24);
    if (anvil) {
        for (const itemId of [
            ITEM_BRONZE_DAGGER,
            ITEM_BRONZE_SWORD,
            ITEM_BRONZE_MED_HELM,
            ITEM_IRON_DAGGER,
            ITEM_BRONZE_ARROW,
            ITEM_IRON_ARROW,
            ITEM_BRONZE_NAILS,
        ]) {
            setHint(next, itemId, {
                area: anvil,
                objectNames: ["Anvil", "Rusted anvil"],
            });
        }
    }
    const range = index.getBoundsForLocNames(["Cooking range", "Range"], 24);
    if (range) {
        for (const itemId of [ITEM_BREAD, ITEM_CAKE]) {
            setHint(next, itemId, {
                area: range,
                objectNames: ["Cooking range", "Range"],
            });
        }
    }
    const spinning =
        index.getBoundsForLocIds(SPINNING_WHEEL_LOC_IDS, 24) ??
        index.getBoundsForLocNames(["Spinning wheel"], 24);
    if (spinning) {
        setHint(next, ITEM_BALL_OF_WOOL, {
            area: spinning,
            objectNames: ["Spinning wheel"],
        });
    }

    // ——— Berry bushes / flowers by scenery name ———
    const redberry = index.getBoundsForLocNames(["Redberry bush"], 24);
    if (redberry) {
        setHint(next, 1951, { area: redberry, objectNames: ["Redberry bush"] });
    }
    const cadava = index.getBoundsForLocNames(["Cadava bush"], 24);
    if (cadava) {
        setHint(next, 753, { area: cadava, objectNames: ["Cadava bush"] });
    }
    const flowers = index.getBoundsForLocNames(["Orange flowers", "Flowers"], 24);
    if (flowers) {
        setHint(next, ITEM_FLOWERS, {
            area: flowers,
            objectNames: ["Orange flowers", "Flowers"],
        });
    }

    // Manual overrides win for ambiguous shop/process items.
    for (const [itemId, spec] of MANUAL_HINT_OVERRIDES) {
        setHint(next, itemId, spec);
    }

    // Aubury spawn coords beat the static shop fallback when present.
    const auburyArea =
        index.getBoundsForNpcTypeIds(AUBURY_HINT_NPC_IDS, 12) ??
        index.getBoundsForNpcName("aubury", 12);
    if (auburyArea) {
        const fromName = index.getNpcTypeIdsForNames(["aubury"]);
        const auburyNpcIds = fromName.length > 0 ? fromName : [...AUBURY_HINT_NPC_IDS];
        for (const itemId of AUBURY_SHOP_ITEM_IDS) {
            setHint(next, itemId, {
                area: auburyArea,
                npcTypeIds: auburyNpcIds,
            });
        }
    }

    derivedHints = next;
    initialized = true;
}

export function isGatherHintsInitialized(): boolean {
    return initialized;
}

export function getGatherHintForItem(itemId: number | undefined): GatherHintSpec | undefined {
    if (!(itemId && itemId > 0)) return undefined;
    const id = itemId | 0;
    return derivedHints.get(id) ?? MANUAL_HINT_OVERRIDES.get(id);
}

/** Test helper: replace derived map. */
export function replaceGatherHintsForTests(hints: ReadonlyMap<number, GatherHintSpec>): void {
    derivedHints = new Map(hints);
    initialized = true;
}
