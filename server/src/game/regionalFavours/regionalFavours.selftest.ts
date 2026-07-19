/**
 * Derive Misthalin favour hints from cache + spawns, then run coverage selftest checks.
 * Run: npx tsx server/src/game/regionalFavours/regionalFavours.selftest.ts
 */
import path from "path";

import { SkillId } from "../../../../src/rs/skill/skills";
import { getCacheLoaderFactory } from "../../../../src/rs/cache/loader/CacheLoaderFactory";
import { initCacheEnv } from "../../world/CacheEnv";
import { computeRegionalReward } from "./rewards";
import { generateRegionalFavour, isCombatFavour } from "./generator";
import {
    getAllRegionalFavourDefinitions,
    getAllRegionalFavourNpcTypeIdsForScripts,
    getRegionalFavourDefinition,
    getRegionalFavoursForGiver,
    getRegionalFavoursForRegion,
} from "./registry";
import { emptyRegionalFavourPlayerState } from "./types";
import { ITEM_ONION, NpcIds, resolveRegionalNpcId } from "./constants";
import { pickWeighted, rollAmount } from "./weightedRandom";
import { MISTHALIN_EXCLUDED_NOTES } from "./definitions/misthalin";
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
import { resolveFavourHintTarget } from "./hintTarget";
import { initRegionalFavourHints } from "./initHints";
import { buildMiningLocMap } from "../skills/mining";
import { buildWoodcuttingLocMap } from "../skills/woodcutting";
import { buildFishingSpotMap } from "../skills/fishing";

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(msg);
}

const mistDefs = getRegionalFavoursForRegion("misthalin");
const defs = getAllRegionalFavourDefinitions();
assert(mistDefs.length > 50, "expected a large Misthalin pool");
assert(new Set(mistDefs.map((d) => d.id)).size === mistDefs.length, "duplicate task ids");

for (const def of mistDefs) {
    assert(def.region === "misthalin", `non-misthalin task ${def.id}`);
    assert(def.minAmount >= 1 && def.maxAmount >= def.minAmount, `bad amounts ${def.id}`);
}

const player = {
    getCombatLevel: () => 50,
    getSkillBaseLevel: (skillId: number) => (skillId === SkillId.Mining ? 55 : 40),
    tileX: 3222,
    tileY: 3218,
};

assert(getRegionalFavourRegionForTile(3222, 3218) === "misthalin", "Lumbridge is Misthalin");

const state = emptyRegionalFavourPlayerState();
const generated = generateRegionalFavour(player, state, {
    forceGiverNpcId: NpcIds.Hans,
});
assert(!!generated, "Hans should generate a task");
assert(generated!.def.giverNpcId === NpcIds.Hans, "forced giver Hans");
assert(generated!.active.region === "misthalin", "Hans task is Misthalin");

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

assert(isSeekContactFavourId(seekContactFavourId("misthalin")), "seek id prefix");
assert(
    getRegionalFavourDefinition(seekContactFavourId("misthalin"))?.noReward === true,
    "seek def registered with noReward",
);
assert(
    !getRegionalFavoursForRegion("misthalin").some((d) => isSeekContactFavourId(d.id)),
    "seek defs excluded from random pool",
);
const seekActive = createSeekContactActive(getRegionalContact("misthalin")!);
assert(seekActive.objectiveText === "Speak to Hans", "seek active objective");
assert(seekActive.coinReward === 0 && seekActive.xpReward === 0, "seek has no reward");
assert(defs.length === mistDefs.length + REGIONAL_CONTACTS.length, "seek defs in byId only");

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

const onionHint = getGatherHintForItem(ITEM_ONION);
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

console.log(
    JSON.stringify(
        {
            ok: true,
            favourCount: mistDefs.length,
            hansFavours: hansTasks.length,
            excluded: MISTHALIN_EXCLUDED_NOTES.length,
            hintCoverageOk: true,
            onionHintArea: onionHint?.area,
        },
        null,
        2,
    ),
);
