/**
 * Lightweight unit checks for favour generation (run with: npx tsx server/src/game/regionalFavours/regionalFavours.selftest.ts)
 */
import { SkillId } from "../../../../src/rs/skill/skills";
import { computeRegionalReward } from "./rewards";
import { generateRegionalFavour } from "./generator";
import {
    getAllRegionalFavourDefinitions,
    getAllRegionalFavourNpcTypeIdsForScripts,
    getRegionalFavourDefinition,
    getRegionalFavoursForGiver,
    getRegionalFavoursForRegion,
} from "./registry";
import { emptyRegionalFavourPlayerState } from "./types";
import { NpcIds, resolveRegionalNpcId } from "./constants";
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

// Per-region actives: migrate legacy + store independently
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
assert(getRegionalContact("asgarnia")?.displayName === "Squire", "Asgarnia contact");
assert(getRegionalContact("varlamore")?.displayName === "Prince Itzla Arkan", "Varlamore contact");
assert(getRegionalContact("wilderness")?.npcId === NpcIds.Krystilia, "Wilderness contact Krystilia");
assert(
    formatSeekContactObjective(getRegionalContact("misthalin")!) === "Speak to Hans",
    "seek objective text",
);

// Contacts / generators never leave their region pool
const asgarniaGen = generateRegionalFavour(player, emptyRegionalFavourPlayerState(), {
    region: "asgarnia",
    preferredGiverNpcId: NpcIds.Squire,
    skipAreaUnlockCheck: true,
});
assert(!asgarniaGen, "Asgarnia has no task pool yet");
const mistFromHans = generateRegionalFavour(player, emptyRegionalFavourPlayerState(), {
    region: "misthalin",
    preferredGiverNpcId: NpcIds.Hans,
    skipAreaUnlockCheck: true,
});
assert(!!mistFromHans && mistFromHans.def.region === "misthalin", "Hans only yields Misthalin");
const mistForcedWrong = generateRegionalFavour(player, emptyRegionalFavourPlayerState(), {
    region: "wilderness",
    forceGiverNpcId: NpcIds.Hans,
    skipAreaUnlockCheck: true,
});
assert(!mistForcedWrong, "Hans cannot force-assign Wilderness tasks");

// Locked area varbits must not block a player already standing in Misthalin
const lockedPlayer = {
    ...player,
    getVarbitValue: () => 0,
};
assert(
    !!generateRegionalFavour(lockedPlayer, emptyRegionalFavourPlayerState(), {
        region: "misthalin",
        preferredGiverNpcId: NpcIds.Hans,
    }),
    "standing in Misthalin bypasses locked area varbits",
);

assert(
    !!generateRegionalFavour(lockedPlayer, emptyRegionalFavourPlayerState(), {
        region: "misthalin",
        preferredGiverNpcId: NpcIds.Hans,
        skipAreaUnlockCheck: true,
    }),
    "skipAreaUnlockCheck always allows generation",
);

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
assert(getAllRegionalFavourNpcTypeIdsForScripts().includes(10477), "Thessalia wiki id also wired");

// Corrupt history must not blow up clone-on-set (Player.setRegionalFavourState).
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

console.log(
    JSON.stringify(
        {
            ok: true,
            favourCount: mistDefs.length,
            hansFavours: hansTasks.length,
            excluded: MISTHALIN_EXCLUDED_NOTES.length,
            perRegionActive: true,
            regionalContacts: REGIONAL_CONTACTS.map((c) => c.region),
            seekContactFavours: true,
        },
        null,
        2,
    ),
);
