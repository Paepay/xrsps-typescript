/**
 * League relic selection helpers.
 *
 * Relic unlocks are stored as per-tier selection varbits (relicKey within that
 * tier's enum). Resolve key -> relic struct via the same cache enums CS2 uses.
 */
import {
    VARBIT_LEAGUE_RELIC_1,
    VARBIT_LEAGUE_RELIC_2,
    VARBIT_LEAGUE_RELIC_3,
    VARBIT_LEAGUE_RELIC_4,
    VARBIT_LEAGUE_RELIC_5,
    VARBIT_LEAGUE_RELIC_6,
    VARBIT_LEAGUE_RELIC_7,
    VARBIT_LEAGUE_RELIC_8,
    VARBIT_LEAGUE_TYPE,
} from "../../../../src/shared/vars";
import type { PlayerState } from "../player";

/** Raging Echoes / League 5 relic struct IDs (from leagueMasteries.data.ts). */
export const LEAGUE_RELIC_STRUCT_IDS = {
    POWER_MINER: 1117,
    ANIMAL_WRANGLER: 1118,
    LUMBERJACK: 1119,
    DODGY_DEALS: 1125,
} as const;

const LEAGUE_RELIC_SELECTION_VARBITS = [
    VARBIT_LEAGUE_RELIC_1,
    VARBIT_LEAGUE_RELIC_2,
    VARBIT_LEAGUE_RELIC_3,
    VARBIT_LEAGUE_RELIC_4,
    VARBIT_LEAGUE_RELIC_5,
    VARBIT_LEAGUE_RELIC_6,
    VARBIT_LEAGUE_RELIC_7,
    VARBIT_LEAGUE_RELIC_8,
] as const;

const ENUM_LEAGUE_TYPE_STRUCT = 2670;
const PARAM_LEAGUE_RELIC_TIER_ENUM = 870;
const PARAM_LEAGUE_RELICS_ENUM = 878;

export type LeagueRelicLoaderServices = {
    getEnumTypeLoader?: () => any;
    getStructTypeLoader?: () => any;
    enumTypeLoader?: any;
    structTypeLoader?: any;
};

type LeagueRelicIndexEntry = {
    tierIndex: number;
    relicKey: number;
    relicStructId: number;
};

const leagueRelicIndexCache = new Map<number, LeagueRelicIndexEntry[]>();

function findEnumIntValue(enumType: any, key: number): number | null {
    const keys: number[] | undefined = enumType?.keys;
    const values: number[] | undefined = enumType?.intValues;
    if (!Array.isArray(keys) || !Array.isArray(values)) return null;
    for (let i = 0; i < keys.length; i++) {
        if (keys[i] === key) return values[i] as number;
    }
    return null;
}

function getEnumOutputCount(enumType: any): number {
    const keys: number[] | undefined = enumType?.keys;
    return Array.isArray(keys) ? keys.length : 0;
}

function getLeagueRelicIndexMap(
    services: LeagueRelicLoaderServices | undefined,
    leagueType: number,
): LeagueRelicIndexEntry[] | null {
    const lt = leagueType | 0;
    if (!(lt > 0)) return null;
    const cached = leagueRelicIndexCache.get(lt);
    if (cached) return cached;

    const enumLoader = services?.getEnumTypeLoader?.() ?? services?.enumTypeLoader;
    const structLoader = services?.getStructTypeLoader?.() ?? services?.structTypeLoader;
    if (!enumLoader?.load || !structLoader?.load) return null;

    const leagueEnum = enumLoader.load(ENUM_LEAGUE_TYPE_STRUCT);
    if (!leagueEnum) return null;
    const leagueStructId = findEnumIntValue(leagueEnum, lt);
    if (!(leagueStructId && leagueStructId > 0)) return null;

    const leagueStruct = structLoader.load(leagueStructId);
    const tierEnumId = leagueStruct?.params?.get?.(PARAM_LEAGUE_RELIC_TIER_ENUM) as
        | number
        | undefined;
    if (typeof tierEnumId !== "number" || tierEnumId <= 0) return null;

    const tierEnum = enumLoader.load(tierEnumId);
    if (!tierEnum) return null;
    const tierCount = getEnumOutputCount(tierEnum);
    if (!(tierCount > 0)) return null;

    const out: LeagueRelicIndexEntry[] = [];
    for (
        let tierIndex = 0;
        tierIndex < tierCount && tierIndex < LEAGUE_RELIC_SELECTION_VARBITS.length;
        tierIndex++
    ) {
        const tierStructId = findEnumIntValue(tierEnum, tierIndex);
        if (!(tierStructId && tierStructId > 0)) return null;
        const tierStruct = structLoader.load(tierStructId);
        const relicEnumId = tierStruct?.params?.get?.(PARAM_LEAGUE_RELICS_ENUM) as
            | number
            | undefined;
        if (typeof relicEnumId !== "number" || relicEnumId <= 0) return null;
        const relicEnum = enumLoader.load(relicEnumId);
        if (!relicEnum) return null;

        const relicCount = getEnumOutputCount(relicEnum);
        for (let relicKey = 1; relicKey <= relicCount; relicKey++) {
            const relicStructId = findEnumIntValue(relicEnum, relicKey);
            if (!(relicStructId && relicStructId > 0)) return null;
            out.push({
                tierIndex,
                relicKey,
                relicStructId,
            });
        }
    }

    leagueRelicIndexCache.set(lt, out);
    return out;
}

/**
 * True when the player has selected the given relic struct on any tier.
 */
export function playerHasLeagueRelic(
    player: PlayerState,
    relicStructId: number,
    services?: LeagueRelicLoaderServices,
): boolean {
    if (!(relicStructId > 0)) return false;
    const leagueType = player.getVarbitValue?.(VARBIT_LEAGUE_TYPE) ?? 0;
    if (!(leagueType > 0)) return false;

    const indexMap = getLeagueRelicIndexMap(services, leagueType);
    if (!indexMap || indexMap.length === 0) return false;

    for (const entry of indexMap) {
        if (entry.relicStructId !== relicStructId) continue;
        const varbitId = LEAGUE_RELIC_SELECTION_VARBITS[entry.tierIndex];
        if (varbitId === undefined) continue;
        const selectedKey = player.getVarbitValue?.(varbitId) ?? 0;
        if (selectedKey === entry.relicKey) return true;
    }
    return false;
}

export type SkillGuideUnlockServices = LeagueRelicLoaderServices & {
    /** Admins retain skill-guide teleport access for testing. */
    canUseAdminTeleport?: (player: PlayerState) => boolean;
};

/**
 * Skill-guide gather teleports unlock via a specific league relic.
 * Admins always retain access for testing.
 */
export function isSkillGuideTeleportUnlocked(
    player: PlayerState,
    relicStructId: number,
    services?: SkillGuideUnlockServices,
): boolean {
    if (services?.canUseAdminTeleport?.(player)) return true;
    return playerHasLeagueRelic(player, relicStructId, services);
}
