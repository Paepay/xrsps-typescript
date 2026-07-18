export const LEAGUE_TASK_REGIONS = [
    "General",
    "Misthalin",
    "Karamja",
    "Asgarnia",
    "Fremennik",
    "Kandarin",
    "Desert",
    "Morytania",
    "Tirannwn",
    "Wilderness",
    "Kourend",
    "Varlamore",
] as const;

export type LeagueTaskRegion = (typeof LEAGUE_TASK_REGIONS)[number];

/** Cache param 1017 / CSV Area column id → region name. */
export const LEAGUE_TASK_AREA_ID_TO_REGION: Readonly<Record<number, LeagueTaskRegion>> = {
    0: "General",
    1: "Misthalin",
    2: "Karamja",
    3: "Asgarnia",
    4: "Kandarin",
    5: "Morytania",
    6: "Desert",
    7: "Tirannwn",
    8: "Fremennik",
    9: "Kourend",
    10: "Kourend",
    11: "Wilderness",
    21: "Varlamore",
};

export const LEAGUE_TASK_REGION_TO_AREA_ID: Readonly<Record<LeagueTaskRegion, number>> = {
    General: 0,
    Misthalin: 1,
    Karamja: 2,
    Asgarnia: 3,
    Kandarin: 4,
    Morytania: 5,
    Desert: 6,
    Tirannwn: 7,
    Fremennik: 8,
    Wilderness: 11,
    Kourend: 10,
    Varlamore: 21,
};

export function parseLeagueTaskAreaLabel(label: string): LeagueTaskRegion | undefined {
    const trimmed = label.trim();
    if ((LEAGUE_TASK_REGIONS as readonly string[]).includes(trimmed)) {
        return trimmed as LeagueTaskRegion;
    }
    return undefined;
}

export function areaIdFromLeagueTaskRegion(region: LeagueTaskRegion): number {
    return LEAGUE_TASK_REGION_TO_AREA_ID[region] ?? 0;
}
