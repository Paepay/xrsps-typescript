import { getItemDefinition } from "../../data/items";
import { SkillId } from "../../../../src/rs/skill/skills";
import { pickWeighted, rollAmount } from "./weightedRandom";
import {
    BONUS_LOOT_CHANCE,
    BONUS_LOOT_SKIP_CATEGORIES,
    ESSENCE_QTY,
    ITEM_PURE_ESSENCE,
    MAGIC_ARMOUR_MYSTIC,
    MAGIC_ARMOUR_WIZARD,
    MATERIAL_QTY,
    MELEE_ARMOUR_BY_TIER,
    MELEE_TIER_UNLOCK,
    RANGED_ARMOUR_BY_TIER,
    RANGED_TIER_UNLOCK,
    REGION_TALISMANS,
    SKILLING_MATERIAL_POOLS,
    TALISMAN_RUNECRAFT_LEVEL,
    type QuantityBand,
} from "./bonusLootTables";
import type {
    RegionalDifficulty,
    RegionalFavourDefinition,
    RegionalFavourRegion,
} from "./types";

/** Local copy to avoid importing generator (circular with formatRewardPreview). */
function isCombatFavourDef(def: RegionalFavourDefinition): boolean {
    return def.category === "KILL_NPC" || def.reward.kind === "combat_lamp";
}

export type FavourBonusLoot = {
    itemId: number;
    quantity: number;
    /** Display name for chat (unnoted base name preferred). */
    displayName: string;
};

export type BonusLootPlayerView = {
    getCombatLevel(): number;
    getSkillBaseLevel(skillId: number): number;
};

type CombatStyle = "melee" | "ranged" | "magic";

type WeightedItem = { itemId: number; weight: number };

function qtyFromBand(band: QuantityBand, random: () => number): number {
    return rollAmount(band.min, band.max, random);
}

/**
 * Convert an unnoted tradeable to its noted form when the cache links them.
 * Stackables / items without notes are returned unchanged.
 */
export function toNotedItemId(itemId: number): number {
    const def = getItemDefinition(itemId);
    if (!def) return itemId;
    if (def.noted) return itemId;
    if (def.stackable) return itemId;
    const noteId = def.noteId;
    if (!(noteId > 0)) return itemId;
    const noteDef = getItemDefinition(noteId);
    if (noteDef?.noted) return noteId;
    return itemId;
}

function unnotedBaseId(itemId: number): number {
    const def = getItemDefinition(itemId);
    if (!def) return itemId;
    if (def.noted && def.noteId > 0) return def.noteId;
    return itemId;
}

function itemDisplayName(itemId: number): string {
    const def = getItemDefinition(itemId);
    if (!def) return `Item ${itemId}`;
    if (def.noted && def.noteId > 0) {
        const base = getItemDefinition(def.noteId);
        if (base?.name) return base.name;
    }
    return def.name || `Item ${itemId}`;
}

/**
 * True when the player meets every skill requirement on the item
 * (wear/wield/use requirements from the item definition).
 */
export function playerMeetsItemRequirements(
    itemId: number,
    player: BonusLootPlayerView,
): boolean {
    const def = getItemDefinition(unnotedBaseId(itemId));
    const reqs = def?.requirements;
    if (!reqs) return true;
    for (let skillId = 0; skillId < reqs.length; skillId++) {
        const need = reqs[skillId] ?? 0;
        if (need > 0 && player.getSkillBaseLevel(skillId) < need) {
            return false;
        }
    }
    return true;
}

function pickWeightedItem(
    candidates: readonly WeightedItem[],
    random: () => number,
): number | undefined {
    const picked = pickWeighted(candidates, (c) => c.weight, random);
    return picked?.itemId;
}

function pickCombatStyle(player: BonusLootPlayerView, random: () => number): CombatStyle {
    const melee = Math.max(
        player.getSkillBaseLevel(SkillId.Attack),
        player.getSkillBaseLevel(SkillId.Strength),
        player.getSkillBaseLevel(SkillId.Defence),
    );
    const ranged = player.getSkillBaseLevel(SkillId.Ranged);
    const magic = player.getSkillBaseLevel(SkillId.Magic);
    const picked = pickWeighted(
        [
            { style: "melee" as const, weight: Math.max(1, melee) },
            { style: "ranged" as const, weight: Math.max(1, ranged) },
            { style: "magic" as const, weight: Math.max(1, magic) },
        ],
        (e) => e.weight,
        random,
    );
    return picked?.style ?? "melee";
}

function rollMeleeArmour(player: BonusLootPlayerView, random: () => number): FavourBonusLoot | undefined {
    const candidates: WeightedItem[] = [];
    for (const unlock of MELEE_TIER_UNLOCK) {
        for (const itemId of MELEE_ARMOUR_BY_TIER[unlock.tier]) {
            if (playerMeetsItemRequirements(itemId, player)) {
                candidates.push({ itemId, weight: unlock.weight });
            }
        }
    }
    const piece = pickWeightedItem(candidates, random);
    if (piece === undefined) return undefined;
    return { itemId: piece, quantity: 1, displayName: itemDisplayName(piece) };
}

function rollMagicArmour(player: BonusLootPlayerView, random: () => number): FavourBonusLoot | undefined {
    const candidates: WeightedItem[] = [];
    for (const itemId of MAGIC_ARMOUR_WIZARD) {
        if (playerMeetsItemRequirements(itemId, player)) {
            candidates.push({ itemId, weight: 40 });
        }
    }
    for (const itemId of MAGIC_ARMOUR_MYSTIC) {
        if (playerMeetsItemRequirements(itemId, player)) {
            // Prefer mystic slightly when the player can wear it.
            candidates.push({ itemId, weight: 55 });
        }
    }
    const piece = pickWeightedItem(candidates, random);
    if (piece === undefined) return undefined;
    return { itemId: piece, quantity: 1, displayName: itemDisplayName(piece) };
}

function rollRangedArmour(player: BonusLootPlayerView, random: () => number): FavourBonusLoot | undefined {
    const candidates: WeightedItem[] = [];
    for (const unlock of RANGED_TIER_UNLOCK) {
        for (const itemId of RANGED_ARMOUR_BY_TIER[unlock.tier]) {
            if (playerMeetsItemRequirements(itemId, player)) {
                candidates.push({ itemId, weight: unlock.weight });
            }
        }
    }
    const piece = pickWeightedItem(candidates, random);
    if (piece === undefined) return undefined;
    return { itemId: piece, quantity: 1, displayName: itemDisplayName(piece) };
}

function rollCombatBonus(
    player: BonusLootPlayerView,
    random: () => number,
): FavourBonusLoot | undefined {
    const style = pickCombatStyle(player, random);
    if (style === "magic") return rollMagicArmour(player, random);
    if (style === "ranged") return rollRangedArmour(player, random);
    return rollMeleeArmour(player, random);
}

function resolveSkillingSkill(def: RegionalFavourDefinition): SkillId | undefined {
    if (def.recommendedSkillId !== undefined) return def.recommendedSkillId;
    if (def.reward.skillId !== undefined) return def.reward.skillId;
    if (def.reward.splitSkills?.length) return def.reward.splitSkills[0];
    return undefined;
}

function rollMaterialFromPool(
    skillId: SkillId,
    level: number,
    difficulty: RegionalDifficulty,
    player: BonusLootPlayerView,
    random: () => number,
): FavourBonusLoot | undefined {
    const pool = SKILLING_MATERIAL_POOLS[skillId];
    if (!pool?.length) return undefined;
    // Only materials the player can use at their current level — never fall back to higher tiers.
    const eligible = pool.filter(
        (e) =>
            level >= (e.minLevel ?? 1) &&
            playerMeetsItemRequirements(e.itemId, player),
    );
    if (eligible.length === 0) return undefined;
    const picked = pickWeighted(eligible, (e) => e.weight, random);
    if (!picked) return undefined;
    const qty = qtyFromBand(MATERIAL_QTY[difficulty], random);
    const itemId = picked.noted ? toNotedItemId(picked.itemId) : picked.itemId;
    return {
        itemId,
        quantity: qty,
        displayName: itemDisplayName(picked.itemId),
    };
}

function rollRunecraftBonus(
    region: RegionalFavourRegion,
    difficulty: RegionalDifficulty,
    player: BonusLootPlayerView,
    random: () => number,
): FavourBonusLoot | undefined {
    const rcLevel = player.getSkillBaseLevel(SkillId.Runecraft);
    const talismans = (REGION_TALISMANS[region] ?? []).filter((id) => {
        const need = TALISMAN_RUNECRAFT_LEVEL[id] ?? 1;
        return rcLevel >= need;
    });
    // ~35% talisman when the player can use a regional altar; otherwise essence.
    if (talismans.length > 0 && random() < 0.35) {
        const talisman = pickWeightedItem(
            talismans.map((itemId) => ({ itemId, weight: 1 })),
            random,
        );
        if (talisman !== undefined) {
            return {
                itemId: talisman,
                quantity: 1,
                displayName: itemDisplayName(talisman),
            };
        }
    }
    const qty = qtyFromBand(ESSENCE_QTY[difficulty], random);
    const itemId = toNotedItemId(ITEM_PURE_ESSENCE);
    return {
        itemId,
        quantity: qty,
        displayName: itemDisplayName(ITEM_PURE_ESSENCE),
    };
}

function rollSkillingBonus(
    def: RegionalFavourDefinition,
    player: BonusLootPlayerView,
    random: () => number,
): FavourBonusLoot | undefined {
    const skillId = resolveSkillingSkill(def);
    if (skillId === undefined) return undefined;

    if (skillId === SkillId.Runecraft) {
        return rollRunecraftBonus(def.region, def.reward.difficulty, player, random);
    }

    // Magic skilling favours (cast spells) can drop wizard gear the player can wear.
    if (skillId === SkillId.Magic && (def.category === "CAST_SPELL" || random() < 0.35)) {
        const gear = rollMagicArmour(player, random);
        if (gear) return gear;
    }

    // Crafting / smithing: small chance of wearable gear the player qualifies for.
    if (skillId === SkillId.Crafting && random() < 0.25) {
        const gear = rollRangedArmour(player, random);
        if (gear) return gear;
    }
    if (skillId === SkillId.Smithing && random() < 0.25) {
        const gear = rollMeleeArmour(player, random);
        if (gear) return gear;
    }

    const level = player.getSkillBaseLevel(skillId);
    return rollMaterialFromPool(skillId, level, def.reward.difficulty, player, random);
}

/**
 * Roll an optional bonus item for a completed regional favour.
 * Returns undefined when the roll fails or the favour type is excluded.
 * Guarantees the player meets wear/use levels for whatever is rolled.
 */
export function rollFavourBonusLoot(
    def: RegionalFavourDefinition,
    player: BonusLootPlayerView,
    random: () => number = Math.random,
): FavourBonusLoot | undefined {
    if (def.noReward) return undefined;
    if ((BONUS_LOOT_SKIP_CATEGORIES as Set<string>).has(def.category)) return undefined;

    const chance = BONUS_LOOT_CHANCE[def.reward.difficulty] ?? BONUS_LOOT_CHANCE.easy;
    if (random() >= chance) return undefined;

    if (isCombatFavourDef(def)) {
        return rollCombatBonus(player, random);
    }
    return rollSkillingBonus(def, player, random);
}

/** Short HUD/preview hint appended to the normal coin/XP summary. */
export function formatBonusLootPreviewHint(def: RegionalFavourDefinition): string {
    if (def.noReward) return "";
    if ((BONUS_LOOT_SKIP_CATEGORIES as Set<string>).has(def.category)) return "";
    if (isCombatFavourDef(def)) {
        return " + chance of armour upgrade";
    }
    const skillId = resolveSkillingSkill(def);
    if (skillId === SkillId.Runecraft) {
        return " + chance of essence/talisman";
    }
    if (skillId !== undefined) {
        return " + chance of skilling supplies";
    }
    return " + chance of bonus supplies";
}
