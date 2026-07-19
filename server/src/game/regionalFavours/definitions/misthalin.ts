import { SkillId } from "../../../../../src/rs/skill/skills";
import {
    ITEM_AIR_RUNE,
    ITEM_ANCHOVIES,
    ITEM_ASHES,
    ITEM_ATTACK_POTION3,
    ITEM_BALL_OF_WOOL,
    ITEM_BIG_BONES,
    ITEM_BONES,
    ITEM_BREAD,
    ITEM_BRONZE_ARROW,
    ITEM_BRONZE_BAR,
    ITEM_BRONZE_DAGGER,
    ITEM_BRONZE_MED_HELM,
    ITEM_BRONZE_NAILS,
    ITEM_BRONZE_SWORD,
    ITEM_BUCKET_MILK,
    ITEM_CABBAGE,
    ITEM_CADAVA_BERRIES,
    ITEM_CAKE,
    ITEM_CLAY,
    ITEM_COAL,
    ITEM_COPPER_ORE,
    ITEM_COWHIDE,
    ITEM_EGG,
    ITEM_FIRE_RUNE,
    ITEM_FLOWERS,
    ITEM_GARLIC,
    ITEM_IRON_ARROW,
    ITEM_IRON_BAR,
    ITEM_IRON_DAGGER,
    ITEM_IRON_ORE,
    ITEM_LEATHER,
    ITEM_LEATHER_BOOTS,
    ITEM_LEATHER_GLOVES,
    ITEM_LETTER,
    ITEM_LOGS,
    ITEM_MIND_RUNE,
    ITEM_MITHRIL_ORE,
    ITEM_ONION,
    ITEM_PLANK,
    ITEM_POT_FLOUR,
    ITEM_POTATO,
    ITEM_RAW_ANCHOVIES,
    ITEM_RAW_SALMON,
    ITEM_RAW_SHRIMPS,
    ITEM_RAW_TROUT,
    ITEM_REDBERRIES,
    ITEM_RED_DYE,
    ITEM_ROPE,
    ITEM_RUNE_ESSENCE,
    ITEM_SALMON,
    ITEM_SHRIMPS,
    ITEM_STEEL_BAR,
    ITEM_SWAMP_TAR,
    ITEM_TIN_ORE,
    ITEM_TROUT,
    ITEM_VIAL_WATER,
    ITEM_WOOL,
    ITEM_YELLOW_DYE,
    MistAreas,
    MistCombat,
    NPC_DISPLAY_NAMES,
    NpcIds,
} from "../constants";
import type { RegionalFavourDefinition, TileBounds } from "../types";

function npcLabel(npcId: number): string {
    return NPC_DISPLAY_NAMES[npcId] ?? `NPC ${npcId}`;
}

function speak(
    id: string,
    giver: number,
    target: number,
    name: string,
    travelDistance: number,
    difficulty: RegionalFavourDefinition["reward"]["difficulty"] = "very_easy",
): RegionalFavourDefinition {
    return {
        id,
        region: "misthalin",
        giverNpcId: giver,
        turnInNpcId: target,
        category: "SPEAK_TO_NPC",
        reward: { kind: "skill_xp", skillId: SkillId.Agility, difficulty, travelDistance },
        targetNpcIds: [target],
        minAmount: 1,
        maxAmount: 1,
        baseWeight: 12,
        acceptsExistingItems: false,
        requiresPostAssignmentProgress: true,
        objectiveText: `Speak to ${name}.`,
        instructionText: `Find ${name} in Misthalin and speak with them, then claim your reward.`,
        assignmentDialog: [
            `Could you find ${name} for me?`,
            "Just have a word with them and they'll sort you out.",
        ],
        completionDialog: ["Thanks for passing that along.", "Here's something for the walk."],
        recommendedSkillId: SkillId.Agility,
        recommendedLevelMin: 1,
        recommendedLevelMax: 99,
    };
}

function visit(
    id: string,
    giver: number,
    turnIn: number,
    area: TileBounds,
    label: string,
    travelDistance: number,
): RegionalFavourDefinition {
    return {
        id,
        region: "misthalin",
        giverNpcId: giver,
        turnInNpcId: turnIn,
        category: "VISIT_LOCATION",
        reward: { kind: "skill_xp", skillId: SkillId.Agility, difficulty: "easy", travelDistance },
        targetArea: area,
        minAmount: 1,
        maxAmount: 1,
        baseWeight: 10,
        acceptsExistingItems: false,
        requiresPostAssignmentProgress: true,
        objectiveText: `Visit ${label}.`,
        instructionText: `Travel to ${label}, then return to claim your reward.`,
        assignmentDialog: [`I need someone to check on ${label}.`, "Go there, then come back."],
        completionDialog: ["Good work getting there.", "Take this for your travels."],
        recommendedSkillId: SkillId.Agility,
    };
}

function deliver(
    id: string,
    giver: number,
    turnIn: number,
    turnInName: string,
    travelDistance: number,
): RegionalFavourDefinition {
    return {
        id,
        region: "misthalin",
        giverNpcId: giver,
        turnInNpcId: turnIn,
        category: "DELIVER_ITEM",
        reward: { kind: "skill_xp", skillId: SkillId.Agility, difficulty: "easy", travelDistance },
        deliveryItemId: ITEM_LETTER,
        targetItemId: ITEM_LETTER,
        minAmount: 1,
        maxAmount: 1,
        baseWeight: 14,
        acceptsExistingItems: false,
        requiresPostAssignmentProgress: true,
        objectiveText: `Deliver a letter to ${turnInName}.`,
        instructionText: `Take the letter to ${turnInName}. If you lose it, ask the favour giver to replace it.`,
        assignmentDialog: [
            `Take this letter to ${turnInName}.`,
            "Don't open it — just deliver it safely.",
        ],
        completionDialog: ["Ah, the letter. Thank you.", "Here's payment for the journey."],
        recommendedSkillId: SkillId.Agility,
    };
}

function gather(
    id: string,
    giver: number,
    itemId: number,
    label: string,
    minAmount: number,
    maxAmount: number,
    skillId: SkillId,
    minLevel: number,
    difficulty: RegionalFavourDefinition["reward"]["difficulty"],
    acceptsExisting = true,
): RegionalFavourDefinition {
    return {
        id,
        region: "misthalin",
        giverNpcId: giver,
        turnInNpcId: giver,
        category: "GATHER_ITEM",
        reward: { kind: "skill_xp", skillId, difficulty },
        targetItemId: itemId,
        minAmount,
        maxAmount,
        requirements: minLevel > 1 ? [{ skillId, level: minLevel }] : undefined,
        baseWeight: 11,
        acceptsExistingItems: acceptsExisting,
        requiresPostAssignmentProgress: !acceptsExisting,
        objectiveText: `Bring ${label} to ${npcLabel(giver)}.`,
        instructionText: acceptsExisting
            ? `Gather ${label} and turn them in to ${npcLabel(giver)}.`
            : `Obtain ${label} after accepting this favour, then turn them in to ${npcLabel(giver)}.`,
        assignmentDialog: [
            `I need ${label}.`,
            `Bring them to ${npcLabel(giver)} when you have enough.`,
        ],
        completionDialog: ["Perfect, just what I needed.", "Here's your reward."],
        recommendedSkillId: skillId,
        recommendedLevelMin: minLevel,
        recommendedLevelMax: minLevel + 20,
    };
}

function produce(
    id: string,
    giver: number,
    itemId: number,
    label: string,
    minAmount: number,
    maxAmount: number,
    skillId: SkillId,
    minLevel: number,
    difficulty: RegionalFavourDefinition["reward"]["difficulty"],
): RegionalFavourDefinition {
    return {
        id,
        region: "misthalin",
        giverNpcId: giver,
        turnInNpcId: giver,
        category: "PRODUCE_ITEM",
        reward: { kind: "skill_xp", skillId, difficulty },
        targetItemId: itemId,
        minAmount,
        maxAmount,
        requirements: [{ skillId, level: minLevel }],
        baseWeight: 10,
        acceptsExistingItems: false,
        requiresPostAssignmentProgress: true,
        objectiveText: `Produce ${label} for ${npcLabel(giver)}.`,
        instructionText: `Personally make ${label}, then turn them in to ${npcLabel(giver)}.`,
        assignmentDialog: [
            `Make me ${label} yourself.`,
            `Bring them to ${npcLabel(giver)} — I can tell if they're shop-bought.`,
        ],
        completionDialog: ["Fine work.", "Take this."],
        recommendedSkillId: skillId,
        recommendedLevelMin: minLevel,
        recommendedLevelMax: minLevel + 25,
    };
}

function kill(
    id: string,
    giver: number,
    npcIds: readonly number[],
    label: string,
    minAmount: number,
    maxAmount: number,
    minCombat: number,
    difficulty: RegionalFavourDefinition["reward"]["difficulty"],
): RegionalFavourDefinition {
    return {
        id,
        region: "misthalin",
        giverNpcId: giver,
        turnInNpcId: giver,
        category: "KILL_NPC",
        reward: { kind: "combat_lamp", difficulty },
        targetNpcIds: [...npcIds],
        minAmount,
        maxAmount,
        minCombatLevel: minCombat,
        baseWeight: 10,
        acceptsExistingItems: false,
        requiresPostAssignmentProgress: true,
        objectiveText: `Kill ${label}.`,
        instructionText: `Defeat ${label} in Misthalin after accepting this favour, then return.`,
        assignmentDialog: [`We've had trouble with ${label}.`, "Deal with them, then report back."],
        completionDialog: [
            "The area should be safer now.",
            "Take these coins and a combat lamp for your efforts.",
        ],
        recommendedLevelMin: minCombat,
        recommendedLevelMax: minCombat + 30,
    };
}

function bury(
    id: string,
    giver: number,
    itemId: number,
    label: string,
    minAmount: number,
    maxAmount: number,
    minPrayer: number,
): RegionalFavourDefinition {
    return {
        id,
        region: "misthalin",
        giverNpcId: giver,
        turnInNpcId: giver,
        category: "BURY_OR_OFFER_BONES",
        reward: { kind: "skill_xp", skillId: SkillId.Prayer, difficulty: "easy" },
        targetItemId: itemId,
        minAmount,
        maxAmount,
        requirements: minPrayer > 1 ? [{ skillId: SkillId.Prayer, level: minPrayer }] : undefined,
        baseWeight: 9,
        acceptsExistingItems: false,
        requiresPostAssignmentProgress: true,
        objectiveText: `Bury ${label}.`,
        instructionText: `Bury ${label} after accepting this favour.`,
        assignmentDialog: [`The dead deserve rest.`, `Bury ${label} for me.`],
        completionDialog: ["You've shown respect.", "A small Prayer blessing for you."],
        recommendedSkillId: SkillId.Prayer,
        recommendedLevelMin: minPrayer,
        recommendedLevelMax: minPrayer + 20,
    };
}

function multi(
    id: string,
    giver: number,
    itemId: number,
    label: string,
    minAmount: number,
    maxAmount: number,
    split: SkillId[],
    minLevel: number,
    primarySkill: SkillId,
): RegionalFavourDefinition {
    return {
        id,
        region: "misthalin",
        giverNpcId: giver,
        turnInNpcId: giver,
        category: "MULTI_STEP",
        reward: {
            kind: "split_xp",
            splitSkills: split,
            skillId: primarySkill,
            difficulty: "medium",
        },
        targetItemId: itemId,
        minAmount,
        maxAmount,
        requirements: [{ skillId: primarySkill, level: minLevel }],
        baseWeight: 8,
        acceptsExistingItems: false,
        requiresPostAssignmentProgress: true,
        objectiveText: label,
        instructionText: `${label} after accepting this favour, then turn in the result.`,
        assignmentDialog: ["I need a bit of real work, not shortcuts.", label],
        completionDialog: ["That's proper craftsmanship.", "Split reward for the effort."],
        recommendedSkillId: primarySkill,
        recommendedLevelMin: minLevel,
        recommendedLevelMax: minLevel + 25,
    };
}

const H = NpcIds.Hans;
const COOK = NpcIds.Cook;
const DUKE = NpcIds.DukeHoracio;
const AERECK = NpcIds.FatherAereck;
const BOB = NpcIds.Bob;
const GUIDE = NpcIds.LumbridgeGuide;
const FRED = NpcIds.Fred;
const URHNEY = NpcIds.FatherUrhney;
const MORGAN = NpcIds.Morgan;
const NED = NpcIds.Ned;
const AGGIE = NpcIds.Aggie;
const WOM = NpcIds.WiseOldMan;
const SEDRIDOR = NpcIds.Sedridor;
const AUBURY = NpcIds.Aubury;
const ROMEO = NpcIds.Romeo;
const JULIET = NpcIds.Juliet;
const LAWRENCE = NpcIds.FatherLawrence;
const APO = NpcIds.Apothecary;
const THESS = NpcIds.Thessalia;
const ARIS = NpcIds.GypsyAris;
const ROALD = NpcIds.KingRoald;
const RELDO = NpcIds.Reldo;
const CURATOR = NpcIds.CuratorHaigHalen;
const MINAS = NpcIds.HistorianMinas;

export const MISTHALIN_FAVOUR_DEFINITIONS: RegionalFavourDefinition[] = [
    // ——— Hans ———
    speak("mist_hans_speak_cook", H, COOK, "the Cook", 40),
    speak("mist_hans_speak_bob", H, BOB, "Bob", 50),
    speak("mist_hans_speak_duke", H, DUKE, "Duke Horacio", 20),
    speak("mist_hans_speak_aereck", H, AERECK, "Father Aereck", 60),
    speak("mist_hans_speak_fred", H, FRED, "Fred the Farmer", 120),
    deliver("mist_hans_letter_aubury", H, AUBURY, "Aubury", 450),
    deliver("mist_hans_letter_sedridor", H, SEDRIDOR, "Sedridor", 280),
    deliver("mist_hans_letter_romeo", H, ROMEO, "Romeo", 400),
    deliver("mist_hans_letter_guide", H, GUIDE, "the Lumbridge Guide", 30),
    visit("mist_hans_visit_tower", H, H, MistAreas.WizardsTower, "the Wizards' Tower", 250),
    visit("mist_hans_visit_varrock", H, H, MistAreas.VarrockSquare, "Varrock Square", 450),
    visit("mist_hans_visit_draynor", H, H, MistAreas.DraynorVillage, "Draynor Village", 220),
    visit("mist_hans_visit_graveyard", H, H, MistAreas.LumbridgeGraveyard, "the Lumbridge graveyard", 80),
    kill("mist_hans_kill_goblins", H, MistCombat.Goblins, "goblins near Lumbridge", 5, 15, 3, "easy"),
    bury("mist_hans_bury_bones", H, ITEM_BONES, "bones", 5, 15, 1),
    gather("mist_hans_chop_logs", H, ITEM_LOGS, "logs", 5, 15, SkillId.Woodcutting, 1, "easy", false),

    // ——— Cook ———
    gather("mist_cook_eggs", COOK, ITEM_EGG, "eggs", 3, 10, SkillId.Cooking, 1, "very_easy"),
    gather("mist_cook_milk", COOK, ITEM_BUCKET_MILK, "buckets of milk", 2, 8, SkillId.Cooking, 1, "very_easy"),
    gather("mist_cook_flour", COOK, ITEM_POT_FLOUR, "pots of flour", 2, 8, SkillId.Cooking, 1, "very_easy"),
    gather("mist_cook_potato", COOK, ITEM_POTATO, "potatoes", 5, 15, SkillId.Cooking, 1, "very_easy"),
    gather("mist_cook_onion", COOK, ITEM_ONION, "onions", 5, 12, SkillId.Cooking, 1, "very_easy"),
    gather("mist_cook_cabbage", COOK, ITEM_CABBAGE, "cabbages", 5, 12, SkillId.Cooking, 1, "very_easy"),
    gather("mist_cook_redberries", COOK, ITEM_REDBERRIES, "redberries", 3, 10, SkillId.Cooking, 1, "easy"),
    produce("mist_cook_shrimp", COOK, ITEM_SHRIMPS, "cooked shrimp", 5, 15, SkillId.Cooking, 1, "easy"),
    produce("mist_cook_anchovies", COOK, ITEM_ANCHOVIES, "cooked anchovies", 5, 12, SkillId.Cooking, 1, "easy"),
    produce("mist_cook_trout", COOK, ITEM_TROUT, "cooked trout", 5, 15, SkillId.Cooking, 15, "medium"),
    produce("mist_cook_salmon", COOK, ITEM_SALMON, "cooked salmon", 5, 12, SkillId.Cooking, 25, "medium"),
    produce("mist_cook_bread", COOK, ITEM_BREAD, "bread", 3, 10, SkillId.Cooking, 1, "easy"),
    gather("mist_cook_logs", COOK, ITEM_LOGS, "logs for the kitchen", 5, 15, SkillId.Woodcutting, 1, "easy", false),
    deliver("mist_cook_food_duke", COOK, DUKE, "Duke Horacio", 40),
    deliver("mist_cook_food_fred", COOK, FRED, "Fred the Farmer", 120),
    deliver("mist_cook_food_aereck", COOK, AERECK, "Father Aereck", 70),
    speak("mist_cook_speak_fred", COOK, FRED, "Fred the Farmer", 120),

    // ——— Duke Horacio ———
    deliver("mist_duke_letter_roald", DUKE, ROALD, "King Roald", 480),
    deliver("mist_duke_supplies_cook", DUKE, COOK, "the Cook", 30),
    speak("mist_duke_speak_aereck", DUKE, AERECK, "Father Aereck", 60),
    speak("mist_duke_speak_hans", DUKE, H, "Hans", 20),
    speak("mist_duke_speak_sedridor", DUKE, SEDRIDOR, "Sedridor", 260),
    kill("mist_duke_goblins", DUKE, MistCombat.Goblins, "goblins", 8, 20, 3, "easy"),
    kill("mist_duke_rats", DUKE, MistCombat.GiantRats, "giant rats", 5, 15, 5, "easy"),
    gather("mist_duke_bronze_bars", DUKE, ITEM_BRONZE_BAR, "bronze bars", 3, 10, SkillId.Smithing, 1, "easy"),
    gather("mist_duke_iron_bars", DUKE, ITEM_IRON_BAR, "iron bars", 3, 8, SkillId.Smithing, 15, "medium"),
    gather("mist_duke_bronze_dagger", DUKE, ITEM_BRONZE_DAGGER, "bronze daggers", 1, 5, SkillId.Smithing, 1, "easy"),
    gather("mist_duke_arrows", DUKE, ITEM_BRONZE_ARROW, "bronze arrows", 20, 50, SkillId.Fletching, 1, "easy"),
    visit("mist_duke_varrock_palace", DUKE, DUKE, MistAreas.VarrockPalace, "Varrock Palace", 500),
    visit("mist_duke_graveyard", DUKE, DUKE, MistAreas.LumbridgeGraveyard, "the Lumbridge graveyard", 80),
    visit("mist_duke_tower", DUKE, DUKE, MistAreas.WizardsTower, "the Wizards' Tower", 260),

    // ——— Father Aereck ———
    bury("mist_aereck_bury_bones", AERECK, ITEM_BONES, "bones", 8, 20, 1),
    bury("mist_aereck_bury_big", AERECK, ITEM_BIG_BONES, "big bones", 3, 10, 1),
    gather("mist_aereck_bring_bones", AERECK, ITEM_BONES, "bones", 10, 25, SkillId.Prayer, 1, "easy"),
    visit("mist_aereck_graveyard", AERECK, AERECK, MistAreas.LumbridgeGraveyard, "the graveyard", 40),
    speak("mist_aereck_speak_urhney", AERECK, URHNEY, "Father Urhney", 180),
    speak("mist_aereck_speak_lawrence", AERECK, LAWRENCE, "Father Lawrence", 420),
    deliver("mist_aereck_records_lawrence", AERECK, LAWRENCE, "Father Lawrence", 420),
    kill("mist_aereck_skeletons", AERECK, MistCombat.Skeletons, "skeletons", 5, 12, 10, "medium"),
    kill("mist_aereck_ghosts", AERECK, MistCombat.Ghosts, "ghosts", 3, 10, 10, "medium"),
    gather("mist_aereck_logs", AERECK, ITEM_LOGS, "logs for church repairs", 5, 15, SkillId.Woodcutting, 1, "easy", false),

    // ——— Bob ———
    gather("mist_bob_copper", BOB, ITEM_COPPER_ORE, "copper ore", 5, 15, SkillId.Mining, 1, "easy", false),
    gather("mist_bob_tin", BOB, ITEM_TIN_ORE, "tin ore", 5, 15, SkillId.Mining, 1, "easy", false),
    gather("mist_bob_iron", BOB, ITEM_IRON_ORE, "iron ore", 5, 15, SkillId.Mining, 15, "medium", false),
    gather("mist_bob_coal", BOB, ITEM_COAL, "coal", 5, 12, SkillId.Mining, 30, "medium", false),
    gather("mist_bob_mithril", BOB, ITEM_MITHRIL_ORE, "mithril ore", 3, 8, SkillId.Mining, 55, "hard", false),
    gather("mist_bob_clay", BOB, ITEM_CLAY, "clay", 5, 15, SkillId.Mining, 1, "very_easy", false),
    gather("mist_bob_bronze_bars", BOB, ITEM_BRONZE_BAR, "bronze bars", 3, 10, SkillId.Smithing, 1, "easy"),
    gather("mist_bob_iron_bars", BOB, ITEM_IRON_BAR, "iron bars", 3, 8, SkillId.Smithing, 15, "medium"),
    produce("mist_bob_bronze_dagger", BOB, ITEM_BRONZE_DAGGER, "bronze daggers", 1, 5, SkillId.Smithing, 1, "easy"),
    produce("mist_bob_bronze_sword", BOB, ITEM_BRONZE_SWORD, "bronze swords", 1, 4, SkillId.Smithing, 4, "easy"),
    produce("mist_bob_bronze_helm", BOB, ITEM_BRONZE_MED_HELM, "bronze medium helms", 1, 4, SkillId.Smithing, 3, "easy"),
    produce("mist_bob_iron_dagger", BOB, ITEM_IRON_DAGGER, "iron daggers", 1, 4, SkillId.Smithing, 15, "medium"),
    deliver("mist_bob_to_duke", BOB, DUKE, "Duke Horacio", 50),
    deliver("mist_bob_to_fred", BOB, FRED, "Fred the Farmer", 120),

    // ——— Lumbridge Guide ———
    visit("mist_guide_bob", GUIDE, GUIDE, MistAreas.LumbridgeCastle, "Bob's axe shop area", 40),
    speak("mist_guide_cook", GUIDE, COOK, "the Cook", 40),
    speak("mist_guide_aereck", GUIDE, AERECK, "Father Aereck", 60),
    visit("mist_guide_graveyard", GUIDE, GUIDE, MistAreas.LumbridgeGraveyard, "the graveyard", 70),
    visit("mist_guide_fred", GUIDE, GUIDE, MistAreas.FredFarm, "Fred's farm", 120),
    visit("mist_guide_swamp", GUIDE, GUIDE, MistAreas.LumbridgeSwamp, "the swamp entrance", 100),
    visit("mist_guide_tower", GUIDE, GUIDE, MistAreas.WizardsTower, "the Wizards' Tower", 250),
    visit("mist_guide_draynor", GUIDE, GUIDE, MistAreas.DraynorVillage, "Draynor Village", 220),
    visit("mist_guide_varrock", GUIDE, GUIDE, MistAreas.VarrockSquare, "Varrock", 450),
    speak("mist_guide_hans", GUIDE, H, "Hans", 20),
    deliver("mist_guide_letter_hans", GUIDE, H, "Hans", 20),

    // ——— Fred ———
    gather("mist_fred_wool", FRED, ITEM_WOOL, "wool", 5, 15, SkillId.Crafting, 1, "easy", false),
    produce("mist_fred_balls", FRED, ITEM_BALL_OF_WOOL, "balls of wool", 5, 15, SkillId.Crafting, 1, "easy"),
    multi(
        "mist_fred_shear_spin",
        FRED,
        ITEM_BALL_OF_WOOL,
        "Shear sheep and spin balls of wool",
        5,
        10,
        [SkillId.Crafting],
        1,
        SkillId.Crafting,
    ),
    gather("mist_fred_eggs", FRED, ITEM_EGG, "eggs", 3, 10, SkillId.Cooking, 1, "very_easy"),
    gather("mist_fred_milk", FRED, ITEM_BUCKET_MILK, "buckets of milk", 2, 8, SkillId.Cooking, 1, "very_easy"),
    gather("mist_fred_potato", FRED, ITEM_POTATO, "potatoes", 5, 15, SkillId.Farming, 1, "very_easy"),
    gather("mist_fred_onion", FRED, ITEM_ONION, "onions", 5, 12, SkillId.Farming, 1, "very_easy"),
    gather("mist_fred_logs", FRED, ITEM_LOGS, "logs for fence repairs", 5, 15, SkillId.Woodcutting, 1, "easy", false),
    deliver("mist_fred_wool_thessalia", FRED, THESS, "Thessalia", 420),
    deliver("mist_fred_milk_cook", FRED, COOK, "the Cook", 120),
    speak("mist_fred_speak_cook", FRED, COOK, "the Cook", 120),
    speak("mist_fred_speak_hans", FRED, H, "Hans", 120),

    // ——— Father Urhney ———
    speak("mist_urhney_aereck", URHNEY, AERECK, "Father Aereck", 180),
    deliver("mist_urhney_letter_aereck", URHNEY, AERECK, "Father Aereck", 180),
    visit("mist_urhney_swamp", URHNEY, URHNEY, MistAreas.LumbridgeSwamp, "the swamp near his hut", 40),
    kill("mist_urhney_skeletons", URHNEY, MistCombat.Skeletons, "skeletons", 5, 12, 10, "medium"),
    kill("mist_urhney_rats", URHNEY, MistCombat.GiantRats, "giant rats", 5, 15, 5, "easy"),
    gather("mist_urhney_tar", URHNEY, ITEM_SWAMP_TAR, "swamp tar", 5, 15, SkillId.Herblore, 1, "easy", false),
    gather("mist_urhney_logs", URHNEY, ITEM_LOGS, "logs for repairs", 5, 12, SkillId.Woodcutting, 1, "easy", false),

    // ——— Morgan ———
    gather("mist_morgan_garlic", MORGAN, ITEM_GARLIC, "garlic", 1, 5, SkillId.Cooking, 1, "easy"),
    gather("mist_morgan_food", MORGAN, ITEM_BREAD, "bread", 2, 8, SkillId.Cooking, 1, "easy"),
    gather("mist_morgan_bones", MORGAN, ITEM_BONES, "bones", 5, 15, SkillId.Prayer, 1, "easy"),
    kill("mist_morgan_skeletons", MORGAN, MistCombat.Skeletons, "skeletons", 5, 12, 10, "medium"),
    speak("mist_morgan_aereck", MORGAN, AERECK, "Father Aereck", 200),
    speak("mist_morgan_lawrence", MORGAN, LAWRENCE, "Father Lawrence", 350),
    deliver("mist_morgan_medicine_aereck", MORGAN, AERECK, "Father Aereck", 200),
    visit("mist_morgan_manor", MORGAN, MORGAN, MistAreas.DraynorManor, "Draynor Manor", 80),

    // ——— Ned ———
    gather("mist_ned_logs", NED, ITEM_LOGS, "logs", 5, 20, SkillId.Woodcutting, 1, "easy", false),
    gather("mist_ned_wool_balls", NED, ITEM_BALL_OF_WOOL, "balls of wool", 5, 15, SkillId.Crafting, 1, "easy"),
    gather("mist_ned_rope", NED, ITEM_ROPE, "rope", 1, 5, SkillId.Crafting, 1, "easy"),
    gather("mist_ned_nails", NED, ITEM_BRONZE_NAILS, "bronze nails", 10, 40, SkillId.Smithing, 1, "easy"),
    gather("mist_ned_plank", NED, ITEM_PLANK, "planks", 3, 10, SkillId.Construction, 1, "easy"),
    deliver("mist_ned_to_fred", NED, FRED, "Fred the Farmer", 150),
    speak("mist_ned_cook", NED, COOK, "the Cook", 180),

    // ——— Aggie ———
    gather("mist_aggie_onions", AGGIE, ITEM_ONION, "onions", 5, 15, SkillId.Farming, 1, "very_easy"),
    gather("mist_aggie_redberries", AGGIE, ITEM_REDBERRIES, "redberries", 3, 10, SkillId.Herblore, 1, "easy"),
    gather("mist_aggie_cadava", AGGIE, ITEM_CADAVA_BERRIES, "cadava berries", 2, 8, SkillId.Herblore, 1, "easy"),
    gather("mist_aggie_vials", AGGIE, ITEM_VIAL_WATER, "vials of water", 3, 10, SkillId.Herblore, 1, "very_easy"),
    produce("mist_aggie_red_dye", AGGIE, ITEM_RED_DYE, "red dye", 1, 3, SkillId.Crafting, 1, "easy"),
    produce("mist_aggie_yellow_dye", AGGIE, ITEM_YELLOW_DYE, "yellow dye", 1, 3, SkillId.Crafting, 1, "easy"),
    deliver("mist_aggie_dye_thessalia", AGGIE, THESS, "Thessalia", 400),
    deliver("mist_aggie_to_apothecary", AGGIE, APO, "the Apothecary", 400),
    speak("mist_aggie_apothecary", AGGIE, APO, "the Apothecary", 400),

    // ——— Wise Old Man ———
    visit("mist_wom_tower", WOM, WOM, MistAreas.WizardsTower, "the Wizards' Tower", 200),
    visit("mist_wom_varrock", WOM, WOM, MistAreas.VarrockSquare, "Varrock Square", 120),
    speak("mist_wom_sedridor", WOM, SEDRIDOR, "Sedridor", 200),
    speak("mist_wom_aubury", WOM, AUBURY, "Aubury", 80),
    speak("mist_wom_urhney", WOM, URHNEY, "Father Urhney", 280),
    speak("mist_wom_reldo", WOM, RELDO, "Reldo", 60),
    kill("mist_wom_ghosts", WOM, MistCombat.Ghosts, "ghosts", 3, 10, 10, "medium"),
    kill("mist_wom_skeletons", WOM, MistCombat.Skeletons, "skeletons", 5, 12, 10, "medium"),
    deliver("mist_wom_notes_aubury", WOM, AUBURY, "Aubury", 80),

    // ——— Sedridor ———
    // Rune altar crafting excluded (altars outside Misthalin overworld). Essence mine is always-accessible.
    gather("mist_sedridor_essence", SEDRIDOR, ITEM_RUNE_ESSENCE, "rune essence", 10, 30, SkillId.Mining, 1, "easy", false),
    gather("mist_sedridor_air", SEDRIDOR, ITEM_AIR_RUNE, "air runes", 20, 50, SkillId.Runecraft, 1, "easy"),
    gather("mist_sedridor_mind", SEDRIDOR, ITEM_MIND_RUNE, "mind runes", 20, 50, SkillId.Runecraft, 2, "easy"),
    gather("mist_sedridor_fire", SEDRIDOR, ITEM_FIRE_RUNE, "fire runes", 20, 40, SkillId.Runecraft, 14, "medium"),
    deliver("mist_sedridor_to_aubury", SEDRIDOR, AUBURY, "Aubury", 280),
    deliver("mist_sedridor_to_duke", SEDRIDOR, DUKE, "Duke Horacio", 260),
    speak("mist_sedridor_aris", SEDRIDOR, ARIS, "Gypsy Aris", 300),
    visit("mist_sedridor_varrock", SEDRIDOR, SEDRIDOR, MistAreas.VarrockSquare, "Varrock Square", 300),

    // ——— Aubury ———
    gather("mist_aubury_essence", AUBURY, ITEM_RUNE_ESSENCE, "rune essence", 10, 30, SkillId.Mining, 1, "easy", false),
    gather("mist_aubury_air", AUBURY, ITEM_AIR_RUNE, "air runes", 20, 50, SkillId.Runecraft, 1, "easy"),
    gather("mist_aubury_mind", AUBURY, ITEM_MIND_RUNE, "mind runes", 20, 50, SkillId.Runecraft, 2, "easy"),
    deliver("mist_aubury_to_sedridor", AUBURY, SEDRIDOR, "Sedridor", 280),
    deliver("mist_aubury_to_hans", AUBURY, H, "Hans", 450),
    deliver("mist_aubury_to_aris", AUBURY, ARIS, "Gypsy Aris", 40),
    speak("mist_aubury_reldo", AUBURY, RELDO, "Reldo", 50),
    speak("mist_aubury_sedridor", AUBURY, SEDRIDOR, "Sedridor", 280),
    visit("mist_aubury_tower", AUBURY, AUBURY, MistAreas.WizardsTower, "the Wizards' Tower", 280),

    // ——— Romeo ———
    speak("mist_romeo_juliet", ROMEO, JULIET, "Juliet", 80),
    deliver("mist_romeo_letter_juliet", ROMEO, JULIET, "Juliet", 80),
    gather("mist_romeo_flowers", ROMEO, ITEM_FLOWERS, "flowers", 1, 3, SkillId.Farming, 1, "very_easy"),
    speak("mist_romeo_lawrence", ROMEO, LAWRENCE, "Father Lawrence", 60),
    speak("mist_romeo_apothecary", ROMEO, APO, "the Apothecary", 40),
    gather("mist_romeo_cadava", ROMEO, ITEM_CADAVA_BERRIES, "cadava berries", 2, 6, SkillId.Herblore, 1, "easy"),
    gather("mist_romeo_redberries", ROMEO, ITEM_REDBERRIES, "redberries", 3, 8, SkillId.Herblore, 1, "easy"),

    // ——— Juliet ———
    speak("mist_juliet_romeo", JULIET, ROMEO, "Romeo", 80),
    deliver("mist_juliet_letter_romeo", JULIET, ROMEO, "Romeo", 80),
    speak("mist_juliet_lawrence", JULIET, LAWRENCE, "Father Lawrence", 70),
    speak("mist_juliet_apothecary", JULIET, APO, "the Apothecary", 50),
    gather("mist_juliet_flowers", JULIET, ITEM_FLOWERS, "flowers", 1, 3, SkillId.Farming, 1, "very_easy"),
    produce("mist_juliet_cake", JULIET, ITEM_CAKE, "cake", 1, 2, SkillId.Cooking, 40, "medium"),
    gather("mist_juliet_berries", JULIET, ITEM_REDBERRIES, "redberries", 3, 8, SkillId.Herblore, 1, "easy"),
    speak("mist_juliet_thessalia", JULIET, THESS, "Thessalia", 40),

    // ——— Father Lawrence ———
    speak("mist_lawrence_aereck", LAWRENCE, AERECK, "Father Aereck", 420),
    deliver("mist_lawrence_records_aereck", LAWRENCE, AERECK, "Father Aereck", 420),
    bury("mist_lawrence_bury", LAWRENCE, ITEM_BONES, "bones", 8, 20, 1),
    visit("mist_lawrence_lumbridge_church", LAWRENCE, LAWRENCE, MistAreas.LumbridgeCastle, "the Lumbridge church area", 420),
    visit("mist_lawrence_chapel", LAWRENCE, LAWRENCE, MistAreas.VarrockChapel, "the Varrock chapel", 30),
    speak("mist_lawrence_romeo", LAWRENCE, ROMEO, "Romeo", 50),
    kill("mist_lawrence_ghosts", LAWRENCE, MistCombat.Ghosts, "ghosts", 3, 10, 10, "medium"),

    // ——— Apothecary ———
    gather("mist_apo_redberries", APO, ITEM_REDBERRIES, "redberries", 3, 10, SkillId.Herblore, 1, "easy"),
    gather("mist_apo_cadava", APO, ITEM_CADAVA_BERRIES, "cadava berries", 2, 8, SkillId.Herblore, 1, "easy"),
    gather("mist_apo_onions", APO, ITEM_ONION, "onions", 5, 12, SkillId.Herblore, 1, "very_easy"),
    gather("mist_apo_vials", APO, ITEM_VIAL_WATER, "vials of water", 3, 10, SkillId.Herblore, 1, "very_easy"),
    produce("mist_apo_attack_pot", APO, ITEM_ATTACK_POTION3, "attack potions", 1, 3, SkillId.Herblore, 3, "easy"),
    deliver("mist_apo_medicine_romeo", APO, ROMEO, "Romeo", 40),
    speak("mist_apo_aggie", APO, AGGIE, "Aggie", 400),
    speak("mist_apo_juliet", APO, JULIET, "Juliet", 50),

    // ——— Thessalia ———
    gather("mist_thess_wool", THESS, ITEM_BALL_OF_WOOL, "balls of wool", 5, 15, SkillId.Crafting, 1, "easy"),
    gather("mist_thess_cowhide", THESS, ITEM_COWHIDE, "cowhide", 3, 10, SkillId.Crafting, 1, "easy", false),
    gather("mist_thess_leather", THESS, ITEM_LEATHER, "leather", 3, 10, SkillId.Crafting, 1, "easy"),
    produce("mist_thess_gloves", THESS, ITEM_LEATHER_GLOVES, "leather gloves", 1, 5, SkillId.Crafting, 1, "easy"),
    produce("mist_thess_boots", THESS, ITEM_LEATHER_BOOTS, "leather boots", 1, 5, SkillId.Crafting, 7, "easy"),
    deliver("mist_thess_juliet", THESS, JULIET, "Juliet", 40),
    deliver("mist_thess_romeo", THESS, ROMEO, "Romeo", 50),
    speak("mist_thess_fred", THESS, FRED, "Fred the Farmer", 420),
    speak("mist_thess_aggie", THESS, AGGIE, "Aggie", 400),

    // ——— Gypsy Aris ———
    gather("mist_aris_air", ARIS, ITEM_AIR_RUNE, "air runes", 20, 40, SkillId.Magic, 1, "easy"),
    gather("mist_aris_bones", ARIS, ITEM_BONES, "bones", 5, 15, SkillId.Prayer, 1, "easy"),
    gather("mist_aris_ashes", ARIS, ITEM_ASHES, "ashes", 5, 12, SkillId.Firemaking, 1, "easy"),
    kill("mist_aris_dark_wizards", ARIS, MistCombat.DarkWizards, "dark wizards", 5, 12, 15, "medium"),
    speak("mist_aris_sedridor", ARIS, SEDRIDOR, "Sedridor", 300),
    speak("mist_aris_aubury", ARIS, AUBURY, "Aubury", 40),
    deliver("mist_aris_warning_duke", ARIS, DUKE, "Duke Horacio", 450),
    visit("mist_aris_sewers", ARIS, ARIS, MistAreas.VarrockSewersEntrance, "the Varrock sewers entrance", 60),

    // ——— King Roald ———
    deliver("mist_roald_to_duke", ROALD, DUKE, "Duke Horacio", 480),
    speak("mist_roald_reldo", ROALD, RELDO, "Reldo", 40),
    speak("mist_roald_aubury", ROALD, AUBURY, "Aubury", 50),
    speak("mist_roald_aris", ROALD, ARIS, "Gypsy Aris", 60),
    visit("mist_roald_lumbridge", ROALD, ROALD, MistAreas.LumbridgeCastle, "Lumbridge Castle", 480),
    gather("mist_roald_iron_bars", ROALD, ITEM_IRON_BAR, "iron bars", 3, 10, SkillId.Smithing, 15, "medium"),
    gather("mist_roald_steel_bars", ROALD, ITEM_STEEL_BAR, "steel bars", 2, 6, SkillId.Smithing, 30, "hard"),
    gather("mist_roald_iron_arrows", ROALD, ITEM_IRON_ARROW, "iron arrows", 20, 50, SkillId.Fletching, 15, "medium"),
    kill("mist_roald_dark_wizards", ROALD, MistCombat.DarkWizards, "dark wizards", 5, 15, 15, "medium"),
    kill("mist_roald_highwaymen", ROALD, MistCombat.Highwaymen, "highwaymen", 3, 10, 10, "easy"),
    visit("mist_roald_sewers", ROALD, ROALD, MistAreas.VarrockSewersEntrance, "the Varrock sewers entrance", 50),

    // ——— Reldo ———
    speak("mist_reldo_roald", RELDO, ROALD, "King Roald", 40),
    speak("mist_reldo_wom", RELDO, WOM, "the Wise Old Man", 80),
    speak("mist_reldo_aubury", RELDO, AUBURY, "Aubury", 50),
    deliver("mist_reldo_to_curator", RELDO, CURATOR, "Curator Haig Halen", 40),
    deliver("mist_reldo_to_duke", RELDO, DUKE, "Duke Horacio", 450),
    visit("mist_reldo_museum", RELDO, RELDO, MistAreas.VarrockMuseum, "the Varrock Museum", 40),
    speak("mist_reldo_minas", RELDO, MINAS, "Historian Minas", 40),

    // ——— Curator / Minas ———
    speak("mist_curator_reldo", CURATOR, RELDO, "Reldo", 40),
    speak("mist_curator_minas", CURATOR, MINAS, "Historian Minas", 20),
    deliver("mist_curator_to_roald", CURATOR, ROALD, "King Roald", 50),
    visit("mist_curator_museum", CURATOR, CURATOR, MistAreas.VarrockMuseum, "the museum exhibits", 20),
    gather("mist_curator_logs", CURATOR, ITEM_LOGS, "logs for repairs", 5, 12, SkillId.Woodcutting, 1, "easy", false),
    speak("mist_minas_curator", MINAS, CURATOR, "Curator Haig Halen", 20),
    speak("mist_minas_reldo", MINAS, RELDO, "Reldo", 40),
    visit("mist_minas_palace", MINAS, MINAS, MistAreas.VarrockPalace, "Varrock Palace", 60),
    deliver("mist_minas_notes_curator", MINAS, CURATOR, "Curator Haig Halen", 20),
];

/** Tasks excluded: rune altar crafting (altars outside Misthalin), demon kills, vampire kills, guard-kill tasks. */
export const MISTHALIN_EXCLUDED_NOTES = [
    "Craft air/mind/water/earth/body runes at altars — altars are outside Misthalin overworld",
    "Kill vampires — no suitable Misthalin vampire target in spawns",
    "Kill demons — not assigned for early Misthalin pool",
    "Kill guards — intentionally excluded",
] as const;
