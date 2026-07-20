import { isSeekContactFavourId } from "./contacts";
import type { ActiveRegionalFavour, RegionalFavourRegion } from "./types";

/**
 * Friends Chat favour linking — resolve which partner task to adopt (if any)
 * and which favour ids must be excluded when rolling a fresh task.
 *
 * Rules (OSRS Leagues-style co-op via legacy Friends Chat / "clan chat"):
 * - On assign/turn-in only: if a partner has a different real favour, adopt it.
 * - After turn-in: if a partner still has the favour you just completed, roll a new one
 *   (do not re-adopt that same task — prevents infinite loops).
 * - Never overwrite seek-contact or empty slots from another player's assign.
 * - Kill progress syncs only when both players already share the same favour
 *   and are within 50 tiles of each other.
 */
export type FriendsChatFavourSnapshot = {
    playerId: number;
    active: ActiveRegionalFavour | undefined;
};

export type FriendsChatFavourLinkResult = {
    /** Partner active favour to clone onto the assignee (same amounts/progress). */
    adopt?: ActiveRegionalFavour;
    /** Favour ids that partners still hold which must not be re-rolled for the assignee. */
    excludeFavourIds: Set<string>;
};

export function resolveFriendsChatFavourLink(
    region: RegionalFavourRegion,
    partners: readonly FriendsChatFavourSnapshot[],
    opts: { excludeFavourIds?: Iterable<string> } = {},
): FriendsChatFavourLinkResult {
    const excludeFavourIds = new Set<string>(opts.excludeFavourIds ?? []);
    const partnerExcludes = new Set<string>();

    for (const partner of partners) {
        const active = partner.active;
        if (!active || active.rewardClaimed) continue;
        if (active.region !== region) continue;
        if (isSeekContactFavourId(active.favourId)) continue;

        if (excludeFavourIds.has(active.favourId)) {
            partnerExcludes.add(active.favourId);
            continue;
        }

        // First eligible different (or non-excluded) partner task wins.
        return {
            adopt: active,
            excludeFavourIds: new Set([...excludeFavourIds, ...partnerExcludes]),
        };
    }

    return {
        excludeFavourIds: new Set([...excludeFavourIds, ...partnerExcludes]),
    };
}

/** True when a region favour is a real assigned task (not seek-contact / empty). */
export function isLinkableRegionalFavour(
    active: ActiveRegionalFavour | undefined,
): active is ActiveRegionalFavour {
    return !!active && !active.rewardClaimed && !isSeekContactFavourId(active.favourId);
}
