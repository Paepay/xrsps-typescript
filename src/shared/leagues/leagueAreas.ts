/**
 * League area region ids from cache region_data (DB table 82).
 * Unlockable areas match Areas UI / area-selection varbits.
 */
export const LeagueAreaId = {
    Misthalin: 1,
    Karamja: 2,
    Asgarnia: 3,
    Kandarin: 4,
    Morytania: 5,
    Desert: 6,
    Tirannwn: 7,
    Fremennik: 8,
    /** Legacy Kebos Lowlands — normalize to Kourend (20). */
    KebosLowlandsLegacy: 9,
    /** Legacy Great Kourend — normalize to Kourend (20). */
    GreatKourendLegacy: 10,
    Wilderness: 11,
    TutorialIsland: 12,
    RandomEventArea: 13,
    PlayerOwnedHouse: 14,
    LeagueVoid: 15,
    DeathsOffice: 16,
    RuneEssenceMine: 17,
    DorgeshuunTrainStation: 18,
    AshsBoatTravelInstance: 19,
    Kourend: 20,
    Varlamore: 21,
    Oceans: 22,
    IgnoreRegion: 23,
} as const;

export type LeagueAreaIdValue = (typeof LeagueAreaId)[keyof typeof LeagueAreaId];

/** Areas that can be unlocked via the Areas UI / area-selection varbits. */
export const LEAGUE_UNLOCKABLE_AREA_IDS: ReadonlySet<number> = new Set([
    LeagueAreaId.Misthalin,
    LeagueAreaId.Karamja,
    LeagueAreaId.Asgarnia,
    LeagueAreaId.Kandarin,
    LeagueAreaId.Morytania,
    LeagueAreaId.Desert,
    LeagueAreaId.Tirannwn,
    LeagueAreaId.Fremennik,
    LeagueAreaId.Wilderness,
    LeagueAreaId.Kourend,
    LeagueAreaId.Varlamore,
]);

/**
 * Always reachable regardless of unlocks (wiki: Death's Office, POH,
 * random events, essence mine; plus other region_data specials).
 */
export const LEAGUE_ALWAYS_ACCESSIBLE_AREA_IDS: ReadonlySet<number> = new Set([
    LeagueAreaId.TutorialIsland,
    LeagueAreaId.RandomEventArea,
    LeagueAreaId.PlayerOwnedHouse,
    LeagueAreaId.LeagueVoid,
    LeagueAreaId.DeathsOffice,
    LeagueAreaId.RuneEssenceMine,
    LeagueAreaId.DorgeshuunTrainStation,
    LeagueAreaId.AshsBoatTravelInstance,
    LeagueAreaId.Oceans,
    LeagueAreaId.IgnoreRegion,
]);

/** OSRS parity: script3681 normalizes legacy region ids 9/10 -> 20 (Kourend). */
export function normalizeLeagueAreaId(regionId: number): number {
    if (regionId === LeagueAreaId.KebosLowlandsLegacy || regionId === LeagueAreaId.GreatKourendLegacy) {
        return LeagueAreaId.Kourend;
    }
    return regionId;
}

export function isLeagueUnlockableAreaId(regionId: number): boolean {
    return LEAGUE_UNLOCKABLE_AREA_IDS.has(normalizeLeagueAreaId(regionId));
}

export function isLeagueAlwaysAccessibleAreaId(regionId: number): boolean {
    return LEAGUE_ALWAYS_ACCESSIBLE_AREA_IDS.has(normalizeLeagueAreaId(regionId));
}

export const LEAGUE_AREA_ID_TO_NAME: Readonly<Record<number, string>> = Object.freeze({
    [LeagueAreaId.Misthalin]: "Misthalin",
    [LeagueAreaId.Karamja]: "Karamja",
    [LeagueAreaId.Asgarnia]: "Asgarnia",
    [LeagueAreaId.Kandarin]: "Kandarin",
    [LeagueAreaId.Morytania]: "Morytania",
    [LeagueAreaId.Desert]: "Desert",
    [LeagueAreaId.Tirannwn]: "Tirannwn",
    [LeagueAreaId.Fremennik]: "Fremennik",
    [LeagueAreaId.Wilderness]: "Wilderness",
    [LeagueAreaId.Kourend]: "Kourend",
    [LeagueAreaId.Varlamore]: "Varlamore",
    [LeagueAreaId.TutorialIsland]: "Tutorial Island",
    [LeagueAreaId.RandomEventArea]: "Random Event Area",
    [LeagueAreaId.PlayerOwnedHouse]: "Player Owned House",
    [LeagueAreaId.LeagueVoid]: "League Void",
    [LeagueAreaId.DeathsOffice]: "Death's Office",
    [LeagueAreaId.RuneEssenceMine]: "Rune Essence Mine",
    [LeagueAreaId.DorgeshuunTrainStation]: "Dorgeshuun Train Station",
    [LeagueAreaId.AshsBoatTravelInstance]: "Ash's Boat Travel Instance",
    [LeagueAreaId.Oceans]: "Oceans",
    [LeagueAreaId.IgnoreRegion]: "Ignore region",
});
