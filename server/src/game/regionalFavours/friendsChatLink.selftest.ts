/**
 * Friends Chat favour link resolution selftest.
 * Run: npx tsx server/src/game/regionalFavours/friendsChatLink.selftest.ts
 */
import {
    isLinkableRegionalFavour,
    resolveFriendsChatFavourLink,
} from "./friendsChatLink";
import type { ActiveRegionalFavour } from "./types";

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(msg);
}

function makeActive(
    favourId: string,
    overrides: Partial<ActiveRegionalFavour> = {},
): ActiveRegionalFavour {
    return {
        favourId,
        region: "misthalin",
        giverNpcId: 0,
        turnInNpcId: 0,
        requiredAmount: 10,
        progress: 3,
        objectiveComplete: false,
        rewardClaimed: false,
        assignmentTimestamp: 1,
        coinReward: 100,
        xpReward: 50,
        rewardKind: "skill_xp",
        objectiveText: favourId,
        instructionText: "",
        ...overrides,
    };
}

// Partner still on the favour you just turned in → do not adopt; exclude it.
{
    const result = resolveFriendsChatFavourLink(
        "misthalin",
        [{ playerId: 2, active: makeActive("kill_rats") }],
        { excludeFavourIds: ["kill_rats"] },
    );
    assert(!result.adopt, "must not re-adopt the favour just turned in");
    assert(result.excludeFavourIds.has("kill_rats"), "must exclude partner's held task");
}

// Partner has a different favour → adopt it (anti-loop handoff).
{
    const partner = makeActive("gather_onions", { progress: 7, requiredAmount: 12 });
    const result = resolveFriendsChatFavourLink(
        "misthalin",
        [{ playerId: 2, active: partner }],
        { excludeFavourIds: ["kill_rats"] },
    );
    assert(result.adopt?.favourId === "gather_onions", "adopt partner's different favour");
    assert(result.adopt?.progress === 7, "preserve partner progress");
}

// Seek-contact partners are ignored for adopt.
{
    const result = resolveFriendsChatFavourLink(
        "misthalin",
        [
            {
                playerId: 2,
                active: makeActive("seek_contact_misthalin"),
            },
        ],
    );
    assert(!result.adopt, "seek-contact is not linkable for adopt");
}

// Empty / no partners → nothing to adopt.
{
    const result = resolveFriendsChatFavourLink("misthalin", []);
    assert(!result.adopt, "no partners");
    assert(result.excludeFavourIds.size === 0, "no excludes");
}

assert(isLinkableRegionalFavour(makeActive("x")), "real favour is linkable");
assert(
    !isLinkableRegionalFavour(makeActive("seek_contact_misthalin")),
    "seek is not linkable",
);
assert(!isLinkableRegionalFavour(undefined), "undefined is not linkable");

console.log(JSON.stringify({ ok: true, friendsChatFavourLink: true }, null, 2));
