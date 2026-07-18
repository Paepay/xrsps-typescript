/**
 * Shared gate for transportation destinations (ships, fairy rings, gliders, carts, etc.).
 * Call before performing any transport teleport.
 */
import {
    LEAGUE_TRANSPORT_BLOCK_MESSAGE,
    canAccessLeagueTile,
} from "./LeagueAreaAccess";

export { LEAGUE_TRANSPORT_BLOCK_MESSAGE };

type VarbitPlayer = {
    getVarbitValue?: (id: number) => number;
    id?: number;
};

export type LeagueTransportGateResult =
    | { ok: true }
    | { ok: false; reason: "league_area_locked"; message: string };

export function checkLeagueTransportDestination(
    player: VarbitPlayer,
    destX: number,
    destY: number,
): LeagueTransportGateResult {
    if (canAccessLeagueTile(player, destX | 0, destY | 0)) {
        return { ok: true };
    }
    return {
        ok: false,
        reason: "league_area_locked",
        message: LEAGUE_TRANSPORT_BLOCK_MESSAGE,
    };
}
