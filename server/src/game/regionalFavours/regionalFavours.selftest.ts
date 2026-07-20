import {
    getAllRegionalFavourDefinitions,
    getAllRegionalFavourNpcTypeIdsForScripts,
    getRegionalFavourDefinition,
    getRegionalFavourRegionForNpc,
    getRegionalFavoursForGiver,
    getRegionalFavoursForRegion,
} from "./registry";
import { emptyRegionalFavourPlayerState } from "./types";
import { AsgCombat, ITEM_ONION, NpcIds, resolveRegionalNpcId } from "./constants";
import { pickWeighted, rollAmount } from "./weightedRandom";
import { MISTHALIN_EXCLUDED_NOTES } from "./definitions/misthalin";
import { ASGARNIA_EXCLUDED_NOTES } from "./definitions/asgarnia";
import { cloneRegionalFavourState } from "./RegionalFavourService";
import { getRegionalFavourRegionForTile } from "./regions";
import {
    createSeekContactActive,
    formatSeekContactObjective,
    getRegionalContact,
    isSeekContactFavourId,
    REGIONAL_CONTACTS,
    seekContactFavourId,
} from "./contacts";
import { collectFavourHintCoverageIssues } from "./hintCoverage";
import { getGatherHintForItem } from "./gatherHints";
import { getKillHintForNpcIds } from "./killHints";
import { resolveFavourHintTarget } from "./hintTarget";
import { initRegionalFavourHints } from "./initHints";
import { buildMiningLocMap } from "../skills/mining";
import { buildWoodcuttingLocMap } from "../skills/woodcutting";
import { buildFishingSpotMap } from "../skills/fishing";
import {
    computeRegionalReward,
    favourRequirementLevel,
    favourRequirementRewardMultiplier,
} from "./rewards";
import {
    combatTierRewardMultiplier,
    getNpcCombatTierIndex,
} from "./combatTiers";
import { SkillId } from "../../../../src/rs/skill/skills";
import { generateRegionalFavour, isCombatFavour } from "./generator";
import { getCacheLoaderFactory } from "../../../../src/rs/cache/loader/CacheLoaderFactory";
import { initCacheEnv } from "../../world/CacheEnv";
import path from "path";
import {
    formatBonusLootPreviewHint,
    playerMeetsItemRequirements,
    rollFavourBonusLoot,
    toNotedItemId,
} from "./bonusLoot";
import { ITEM_PURE_ESSENCE, REGION_TALISMANS } from "./bonusLootTables";

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(msg);
}

const mistDefs = getRegionalFavoursForRegion("misthalin");
const asgDefs = getRegionalFavoursForRegion("asgarnia");
const defs = getAllRegionalFavourDefinitions();
assert(mistDefs.length > 50, "expected a large Misthalin pool");
assert(asgDefs.length > 50, "expected a large Asgarnia pool");
assert(new Set(mistDefs.map((d) => d.id)).size === mistDefs.length, "duplicate task ids");
assert(new Set(asgDefs.map((d) => d.id)).size === asgDefs.length, "duplicate Asgarnia task ids");

for (const def of mistDefs) {
    assert(def.region === "misthalin", `non-misthalin task ${def.id}`);
    assert(def.minAmount >= 1 && def.maxAmount >= def.minAmount, `bad amounts ${def.id}`);
}

for (const def of asgDefs) {
    assert(def.region === "asgarnia", `non-asgarnia task ${def.id}`);
    assert(def.minAmount >= 1 && def.maxAmount >= def.minAmount, `bad amounts ${def.id}`);
}

const player = {
    getCombatLevel: () => 50,
    getSkillBaseLevel: (skillId: number) => (skillId === SkillId.Mining ? 55 : 40),
    tileX: 3222,
    tileY: 3218,
};

assert(getRegionalFavourRegionForTile(3222, 3218) === "misthalin", "Lumbridge is Misthalin");
assert(getRegionalFavourRegionForTile(2960, 3336) === "asgarnia", "Falador is Asgarnia");

const state = emptyRegionalFavourPlayerState();
const generated = generateRegionalFavour(player, state, {
    forceGiverNpcId: NpcIds.Hans,
});
assert(!!generated, "Hans should generate a task");
assert(generated!.def.giverNpcId === NpcIds.Hans, "forced giver Hans");
assert(generated!.active.region === "misthalin", "Hans task is Misthalin");

const asgPlayer = {
    getCombatLevel: () => 50,
    getSkillBaseLevel: (skillId: number) => (skillId === SkillId.Mining ? 55 : 40),
    tileX: 2960,
    tileY: 3336,
};
const asgGenerated = generateRegionalFavour(asgPlayer, emptyRegionalFavourPlayerState(), {
    region: "asgarnia",
    forceGiverNpcId: NpcIds.Squire,
    skipAreaUnlockCheck: true,
});
assert(!!asgGenerated, "Squire should generate a task");
assert(asgGenerated!.def.giverNpcId === NpcIds.Squire, "forced giver Squire");
assert(asgGenerated!.active.region === "asgarnia", "Squire task is Asgarnia");

// 50/50 combat vs non-combat across the Asgarnia pool.
{
    let combat = 0;
    let nonCombat = 0;
    let seed = 3;
    const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0x100000000;
    };
    for (let i = 0; i < 200; i++) {
        const result = generateRegionalFavour(asgPlayer, emptyRegionalFavourPlayerState(), {
            region: "asgarnia",
            skipAreaUnlockCheck: true,
            random,
        });
        assert(!!result, "expected generated Asgarnia favour in balance sample");
        if (isCombatFavour(result!.def)) combat++;
        else nonCombat++;
    }
    assert(combat >= 70 && combat <= 130, `Asgarnia combat share ~50% (got ${combat}/200)`);
    assert(nonCombat >= 70 && nonCombat <= 130, `Asgarnia non-combat share ~50% (got ${nonCombat}/200)`);
}

// 50/50 combat vs non-combat across the Misthalin pool.
{
    let combat = 0;
    let nonCombat = 0;
    let seed = 1;
    const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0x100000000;
    };
    for (let i = 0; i < 200; i++) {
        const result = generateRegionalFavour(player, emptyRegionalFavourPlayerState(), {
            region: "misthalin",
            skipAreaUnlockCheck: true,
            random,
        });
        assert(!!result, "expected generated favour in balance sample");
        if (isCombatFavour(result!.def)) combat++;
        else nonCombat++;
    }
    assert(combat >= 70 && combat <= 130, `combat share ~50% (got ${combat}/200)`);
    assert(nonCombat >= 70 && nonCombat <= 130, `non-combat share ~50% (got ${nonCombat}/200)`);
}

// High mining level should prefer mithril over copper when mining favours compete.
{
    const miner = {
        getCombatLevel: () => 40,
        getSkillBaseLevel: (skillId: number) => (skillId === SkillId.Mining ? 60 : 20),
        tileX: 3222,
        tileY: 3218,
    };
    let mithril = 0;
    let copper = 0;
    let seed = 7;
    const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0x100000000;
    };
    for (let i = 0; i < 80; i++) {
        const result = generateRegionalFavour(miner, emptyRegionalFavourPlayerState(), {
            forceGiverNpcId: NpcIds.Bob,
            skipAreaUnlockCheck: true,
            random,
        });
        if (!result || isCombatFavour(result.def)) continue;
        if (result.def.id.includes("mithril")) mithril++;
        if (result.def.id.includes("copper")) copper++;
    }
    assert(mithril > copper, `level-fit prefers mithril (${mithril}) over copper (${copper})`);
}

// Low combat level should not receive high-CB kill favours.
{
    const newbie = {
        getCombatLevel: () => 5,
        getSkillBaseLevel: () => 5,
        tileX: 3222,
        tileY: 3218,
    };
    for (let i = 0; i < 40; i++) {
        const result = generateRegionalFavour(newbie, emptyRegionalFavourPlayerState(), {
            forceGiverNpcId: NpcIds.KingRoald,
            skipAreaUnlockCheck: true,
            random: () => i / 40,
        });
        if (!result || !isCombatFavour(result.def)) continue;
        assert(
            (result.def.minCombatLevel ?? 1) <= 5,
            `CB5 must not get minCombat ${result.def.minCombatLevel} (${result.def.id})`,
        );
    }
}

// High combat level must not receive trivial kills when harder targets exist.
{
    const maxed = {
        getCombatLevel: () => 126,
        getSkillBaseLevel: () => 99,
        tileX: 2960,
        tileY: 3336,
    };
    for (let i = 0; i < 120; i++) {
        const result = generateRegionalFavour(maxed, emptyRegionalFavourPlayerState(), {
            region: "asgarnia",
            skipAreaUnlockCheck: true,
            random: () => (i * 0.0083) % 1,
        });
        assert(!!result, "CB126 should still receive Asgarnia favours");
        assert(result!.active.region === "asgarnia", "CB126 Asgarnia region lock");
        if (!isCombatFavour(result!.def)) continue;
        const obj = (result!.def.objectiveText ?? "").toLowerCase();
        assert(!obj.includes("spider"), `CB126 must not get spiders (${result!.def.id})`);
        assert(!obj.includes("duck"), `CB126 must not get ducks (${result!.def.id})`);
        assert(!obj.includes("chicken"), `CB126 must not get chickens (${result!.def.id})`);
        // Asgarnia top combat is ~trolls/ice; fallback keeps hardest ≤15 CB of peak.
        assert(
            (result!.def.recommendedLevelMin ?? 1) >= 40,
            `CB126 combat favour too easy: recommendedMin=${result!.def.recommendedLevelMin} (${result!.def.id})`,
        );
    }
}

// CB 21–30: npcMax 35, current tier + up to 2 tiers lower (npcMax 15 / 25 / 35).
{
    const mid = {
        getCombatLevel: () => 30,
        getSkillBaseLevel: () => 40,
        tileX: 2960,
        tileY: 3336,
    };
    let overCap = 0;
    let inWindow = 0;
    for (let i = 0; i < 100; i++) {
        const result = generateRegionalFavour(mid, emptyRegionalFavourPlayerState(), {
            region: "asgarnia",
            skipAreaUnlockCheck: true,
            random: () => (i * 0.017) % 1,
        });
        if (!result || !isCombatFavour(result.def)) continue;
        const monsterCb = (result.def.recommendedLevelMin ?? 1) + 2;
        if (monsterCb > 35) overCap++;
        if (monsterCb <= 35) inWindow++;
    }
    assert(overCap === 0, `CB30 must not get NPCs above 35 (got ${overCap})`);
    assert(inWindow >= 8, `CB30 should get combat favours ≤35 (got ${inWindow})`);
}

// CB 5–10: npcMax 15.
{
    const low = {
        getCombatLevel: () => 8,
        getSkillBaseLevel: () => 10,
        tileX: 2960,
        tileY: 3336,
    };
    for (let i = 0; i < 60; i++) {
        const result = generateRegionalFavour(low, emptyRegionalFavourPlayerState(), {
            region: "asgarnia",
            skipAreaUnlockCheck: true,
            random: () => (i * 0.013) % 1,
        });
        if (!result || !isCombatFavour(result.def)) continue;
        const monsterCb = (result.def.recommendedLevelMin ?? 1) + 2;
        assert(monsterCb <= 15, `CB8 must not get NPC CB ${monsterCb} (${result.def.id})`);
    }
}

// Higher combat tiers pay more.
assert(
    combatTierRewardMultiplier(69) > combatTierRewardMultiplier(21),
    "troll tier pays more than guard tier",
);
assert(getNpcCombatTierIndex(21) < getNpcCombatTierIndex(69), "guard tier < troll tier");

// Asgarnia NPCs (including turn-in-only) resolve to Asgarnia — never Misthalin by default.
assert(getRegionalFavourRegionForNpc(NpcIds.Wydin) === "asgarnia", "Wydin is Asgarnia");
assert(getRegionalFavourRegionForNpc(NpcIds.Cassie) === "asgarnia", "Cassie turn-in is Asgarnia");
assert(getRegionalFavourRegionForNpc(NpcIds.Squire) === "asgarnia", "Squire is Asgarnia");
{
    const portPlayer = {
        getCombatLevel: () => 50,
        getSkillBaseLevel: () => 40,
        tileX: 3014,
        tileY: 3204,
    };
    for (let i = 0; i < 20; i++) {
        const result = generateRegionalFavour(portPlayer, emptyRegionalFavourPlayerState(), {
            forceGiverNpcId: NpcIds.Wydin,
            skipAreaUnlockCheck: true,
        });
        assert(!!result, "Wydin should assign without explicit region");
        assert(result!.active.region === "asgarnia", "Wydin must only assign Asgarnia");
        assert(result!.def.region === "asgarnia", "Wydin def region Asgarnia");
    }
}

// Higher requirement levels yield higher rewards.
{
    const easy = mistDefs.find((d) => d.id === "mist_hans_kill_chickens")!;
    const hard = mistDefs.find((d) => d.id === "mist_league_lesser_demon")!;
    assert(favourRequirementLevel(hard) > favourRequirementLevel(easy), "hard req level higher");
    assert(
        favourRequirementRewardMultiplier(hard) > favourRequirementRewardMultiplier(easy),
        "hard reward multiplier higher",
    );
    const easyReward = computeRegionalReward(easy, easy.maxAmount, () => 0.5);
    const hardReward = computeRegionalReward(hard, hard.maxAmount, () => 0.5);
    assert(hardReward.xp > easyReward.xp, "higher req → more XP");
    assert(hardReward.coins > easyReward.coins, "higher req → more coins");
}

const migrated = cloneRegionalFavourState({
    active: generated!.active,
    history: emptyRegionalFavourPlayerState().history,
    completedCount: 0,
    skipsAvailable: 1,
    completedSinceLastSkip: 0,
    pendingCombatLampXp: [],
    hudVisible: false,
    activeByRegion: {},
});
assert(!!migrated.activeByRegion.misthalin, "legacy active migrates into activeByRegion");

const reward = computeRegionalReward(generated!.def, generated!.active.requiredAmount, () => 0.5);
assert(reward.coins > 0, "reward coins");

const hansTasks = getRegionalFavoursForGiver(NpcIds.Hans);
assert(hansTasks.length >= 5, "Hans has several favours");

const leagueIds = [
    "mist_league_tea_stall",
    "mist_league_pickpocket_ham",
    "mist_league_pickpocket_guard",
    "mist_league_cook_range",
    "mist_league_cabbage_varrock",
    "mist_league_lesser_demon",
    "mist_league_pure_essence",
    "mist_league_kill_ram",
] as const;
for (const id of leagueIds) {
    const def = getRegionalFavourDefinition(id);
    assert(!!def, `league overlap favour ${id} registered`);
}
assert(
    getRegionalFavourDefinition("mist_league_tea_stall")?.skillActionIds?.includes("stall:tea_stall"),
    "tea stall favour matches stall:tea_stall skill action",
);
assert(
    getRegionalFavourDefinition("mist_league_cook_range")?.category === "PERFORM_SKILL_ACTION",
    "cook range favour is PERFORM_SKILL_ACTION",
);

assert(rollAmount(3, 3, () => 0) === 3, "rollAmount fixed");
const picked = pickWeighted(
    [
        { id: "a", w: 0 },
        { id: "b", w: 100 },
    ],
    (x) => x.w,
    () => 0.5,
);
assert(picked?.id === "b", "weighted pick");

assert(REGIONAL_CONTACTS.length === 11, "eleven regional contacts");
assert(getRegionalContact("misthalin")?.npcId === NpcIds.Hans, "Misthalin contact Hans");
assert(getRegionalContact("asgarnia")?.npcId === NpcIds.Squire, "Asgarnia contact Squire");

assert(isSeekContactFavourId(seekContactFavourId("misthalin")), "seek id prefix");
assert(
    getRegionalFavourDefinition(seekContactFavourId("misthalin"))?.noReward === true,
    "seek def registered with noReward",
);
assert(
    !getRegionalFavoursForRegion("misthalin").some((d) => isSeekContactFavourId(d.id)),
    "seek defs excluded from random pool",
);
assert(
    !getRegionalFavoursForRegion("asgarnia").some((d) => isSeekContactFavourId(d.id)),
    "Asgarnia seek defs excluded from random pool",
);
const seekActive = createSeekContactActive(getRegionalContact("misthalin")!);
assert(seekActive.objectiveText === "Speak to Hans", "seek active objective");
assert(seekActive.coinReward === 0 && seekActive.xpReward === 0, "seek has no reward");
assert(
    defs.length === mistDefs.length + asgDefs.length + REGIONAL_CONTACTS.length,
    "seek defs in byId only",
);

assert(resolveRegionalNpcId(10477) === NpcIds.Thessalia, "Thessalia wiki alias");
assert(
    getAllRegionalFavourNpcTypeIdsForScripts().includes(NpcIds.Thessalia),
    "Thessalia wired for talk scripts",
);

const repaired = cloneRegionalFavourState({
    ...emptyRegionalFavourPlayerState(),
    historyByRegion: {
        misthalin: {
            recentFavourIds: "x" as any,
            recentGiverNpcIds: 1 as any,
            recentRewardSkills: null as any,
            recentCategories: {} as any,
        },
    },
});
assert(Array.isArray(repaired.historyByRegion.misthalin?.recentFavourIds), "repair task ids");
assert(Array.isArray(repaired.historyByRegion.misthalin?.recentGiverNpcIds), "repair giver ids");
assert(repaired.historyByRegion.misthalin?.recentGiverNpcIds?.length === 0, "non-array cleared");

// ——— Derive hints from cache (same path as wsServer) ———
const env = initCacheEnv(path.join(process.cwd(), "caches"));
const factory = getCacheLoaderFactory(env.info, env.cacheSystem as any);
const locTypeLoader: any = factory.getLocTypeLoader();
const npcTypeLoader: any = factory.getNpcTypeLoader?.();
initRegionalFavourHints({
    cacheEnv: env,
    locTypeLoader,
    miningLocMap: buildMiningLocMap(locTypeLoader).map,
    woodcuttingLocMap: buildWoodcuttingLocMap(locTypeLoader).map,
    fishingSpotMap: buildFishingSpotMap(npcTypeLoader).map,
});

assert(
    collectFavourHintCoverageIssues(mistDefs).length === 0,
    "every Misthalin favour must have a hint destination after world derivation",
);
assert(
    collectFavourHintCoverageIssues(asgDefs).length === 0,
    "every Asgarnia favour must have a hint destination after world derivation",
);

const onionHint = getGatherHintForItem(ITEM_ONION, "misthalin");
assert(!!onionHint?.area, "onions have a derived gather hint area");
assert(
    (onionHint!.objectNames ?? []).some((n) => n.toLowerCase() === "onion"),
    "onion hint matches Onion locs",
);

const onionActive = {
    favourId: "mist_aggie_onions",
    region: "misthalin" as const,
    giverNpcId: NpcIds.Aggie,
    turnInNpcId: NpcIds.Aggie,
    requiredAmount: 5,
    progress: 0,
    objectiveComplete: false,
    rewardClaimed: false,
    assignmentTimestamp: 0,
    coinReward: 0,
    xpReward: 0,
    rewardKind: "skill_xp" as const,
    objectiveText: "",
    instructionText: "",
};
const onionTarget = resolveFavourHintTarget(onionActive, "misthalin", 3222, 3218, undefined, {
    getItemCount: () => 0,
});
assert(!!onionTarget, "Aggie onion favour resolves a resource hint");
assert(
    formatSeekContactObjective(getRegionalContact("misthalin")!) === "Speak to Hans",
    "seek objective text",
);

// Kill hints stay in the favour region (Asgarnia scorpions ≠ Wilderness scorpions).
{
    const scorpIds = AsgCombat.Scorpions;
    const asgKill = getKillHintForNpcIds("asgarnia", scorpIds);
    assert(!!asgKill?.area, "Asgarnia has in-region scorpion spawn cluster");
    const cx = (asgKill!.area.minX + asgKill!.area.maxX) >> 1;
    const cy = (asgKill!.area.minY + asgKill!.area.maxY) >> 1;
    assert(
        getRegionalFavourRegionForTile(cx, cy) === "asgarnia",
        "Asgarnia scorpion hint cluster is in Asgarnia",
    );
    assert(
        getRegionalFavourRegionForTile(3025, 3568) === "wilderness",
        "Edgeville wilderness scorpions are wilderness",
    );

    const scorpActive = {
        favourId: "asg_doric_scorpions",
        region: "asgarnia" as const,
        giverNpcId: NpcIds.Doric,
        turnInNpcId: NpcIds.Doric,
        requiredAmount: 5,
        progress: 0,
        objectiveComplete: false,
        rewardClaimed: false,
        assignmentTimestamp: 0,
        coinReward: 0,
        xpReward: 0,
        rewardKind: "skill_xp" as const,
        objectiveText: "",
        instructionText: "",
    };
    // Fake lookup that would prefer wilderness if region were ignored.
    const wildLookup = {
        findNearestNpcTile(
            typeIds: readonly number[],
            _nearX: number,
            _nearY: number,
            region?: string,
        ) {
            if (!typeIds.includes(3024)) return undefined;
            if (region === "asgarnia") {
                return { x: cx, y: cy };
            }
            return { x: 3025, y: 3568 };
        },
    };
    const killTarget = resolveFavourHintTarget(
        scorpActive,
        "asgarnia",
        2965,
        3378,
        wildLookup,
    );
    assert(!!killTarget, "scorpion kill favour resolves a hint");
    assert(
        getRegionalFavourRegionForTile(killTarget!.worldX, killTarget!.worldY) === "asgarnia",
        "scorpion hint arrow stays in Asgarnia, not Wilderness",
    );
}

// ——— Bonus loot on favour completion ———
{
    const combatDef = mistDefs.find((d) => isCombatFavour(d));
    assert(!!combatDef, "need a combat favour for bonus loot tests");
    assert(
        formatBonusLootPreviewHint(combatDef!).includes("armour"),
        "combat preview hints armour",
    );

    const miner = {
        getCombatLevel: () => 40,
        getSkillBaseLevel: (skillId: number) => {
            if (skillId === SkillId.Mining) return 60;
            if (skillId === SkillId.Defence) return 40;
            if (skillId === SkillId.Ranged) return 50;
            if (skillId === SkillId.Magic) return 45;
            return 30;
        },
    };

    // Forced hit: random() first call is chance gate (< 0.22 for very_easy … use 0).
    const forced = rollFavourBonusLoot(combatDef!, miner, () => 0);
    assert(!!forced, "combat favour bonus loot rolls when chance hits");
    assert(forced!.quantity === 1, "armour bonus is a single piece");
    assert(forced!.itemId > 0, "armour has item id");

    // Forced miss
    assert(
        rollFavourBonusLoot(combatDef!, miner, () => 0.99) === undefined,
        "bonus loot can miss",
    );

    const speakDef = mistDefs.find((d) => d.category === "SPEAK_TO_NPC");
    assert(!!speakDef, "need speak favour");
    assert(
        rollFavourBonusLoot(speakDef!, miner, () => 0) === undefined,
        "courier favours never roll bonus loot",
    );
    assert(formatBonusLootPreviewHint(speakDef!) === "", "no bonus hint on speak");

    const miningDef = mistDefs.find(
        (d) => !isCombatFavour(d) && d.recommendedSkillId === SkillId.Mining,
    );
    assert(!!miningDef, "need mining favour");
    const miningLoot = rollFavourBonusLoot(miningDef!, miner, () => 0);
    assert(!!miningLoot, "mining favour rolls material bonus");
    assert(miningLoot!.quantity >= 5, "mining materials come in quantity");
    // Noted ores use noteId linkage (e.g. iron ore 440 → 441).
    assert(toNotedItemId(440) === 441, "iron ore notes to 441");
    assert(toNotedItemId(ITEM_PURE_ESSENCE) === 7937, "pure essence notes");

    // Low-level players must never receive gear they cannot wear.
    const newbie = {
        getCombatLevel: () => 3,
        getSkillBaseLevel: () => 1,
    };
    for (let i = 0; i < 40; i++) {
        const loot = rollFavourBonusLoot(combatDef!, newbie, () => 0);
        if (!loot) continue;
        assert(
            playerMeetsItemRequirements(loot.itemId, newbie),
            `newbie must meet wear reqs for ${loot.displayName} (${loot.itemId})`,
        );
        // Rune / mystic / d'hide are gated by requirements arrays.
        assert(loot.itemId !== 1127, "CB1 must not receive rune platebody");
        assert(loot.itemId !== 4089, "lvl1 magic must not receive mystic hat");
    }

    // Mining: only ores at or below the player's mining level.
    const lowMiner = {
        getCombatLevel: () => 10,
        getSkillBaseLevel: (skillId: number) => (skillId === SkillId.Mining ? 14 : 1),
    };
    for (let i = 0; i < 30; i++) {
        const loot = rollFavourBonusLoot(miningDef!, lowMiner, () => 0);
        assert(!!loot, "low miner still gets some ore bonus");
        // Unnoted base of noted iron/mithril/etc must not appear below their mine level.
        const base =
            loot!.itemId === 441
                ? 440
                : loot!.itemId === 448
                  ? 447
                  : loot!.itemId === 450
                    ? 449
                    : loot!.itemId === 452
                      ? 451
                      : loot!.itemId === 437 || loot!.itemId === 439
                        ? loot!.itemId - 1
                        : loot!.itemId;
        assert(
            base === 436 || base === 438,
            `mining 14 must only get copper/tin (got ${loot!.displayName})`,
        );
    }

    const rcDef = mistDefs.find((d) => d.recommendedSkillId === SkillId.Runecraft);
    if (rcDef) {
        assert(
            formatBonusLootPreviewHint(rcDef).includes("essence"),
            "RC preview mentions essence/talisman",
        );
        // Force essence path: chance hit (0), then talisman roll fails (>= 0.35).
        let calls = 0;
        const rcLoot = rollFavourBonusLoot(rcDef, miner, () => {
            calls++;
            return calls === 1 ? 0 : 0.9;
        });
        assert(!!rcLoot, "RC favour rolls bonus");
        assert(
            rcLoot!.itemId === toNotedItemId(ITEM_PURE_ESSENCE) ||
                (REGION_TALISMANS.misthalin ?? []).includes(rcLoot!.itemId),
            "RC bonus is essence or Misthalin talisman",
        );
    }
}

console.log(
    JSON.stringify(
        {
            ok: true,
            favourCount: mistDefs.length,
            asgarniaFavourCount: asgDefs.length,
            hansFavours: hansTasks.length,
            squireFavours: getRegionalFavoursForGiver(NpcIds.Squire).length,
            excluded: MISTHALIN_EXCLUDED_NOTES.length,
            asgarniaExcluded: ASGARNIA_EXCLUDED_NOTES.length,
            hintCoverageOk: true,
            onionHintArea: onionHint?.area,
            bonusLootOk: true,
        },
        null,
        2,
    ),
);
