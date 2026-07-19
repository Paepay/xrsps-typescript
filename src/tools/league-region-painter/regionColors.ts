import {
    LEAGUE_AREA_ID_TO_NAME,
    LeagueAreaId,
} from "../../shared/leagues/leagueAreas";

/** Unlockable league areas available as paint brushes (plus eraser = 0). */
export const PAINTABLE_AREA_IDS: readonly number[] = [
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
];

/** Distinct overlay colors for each unlockable area. */
export const REGION_PAINT_COLORS: Readonly<Record<number, string>> = Object.freeze({
    [LeagueAreaId.Misthalin]: "#2ecc71",
    [LeagueAreaId.Karamja]: "#e67e22",
    [LeagueAreaId.Asgarnia]: "#3498db",
    [LeagueAreaId.Kandarin]: "#9b59b6",
    [LeagueAreaId.Morytania]: "#1abc9c",
    [LeagueAreaId.Desert]: "#f1c40f",
    [LeagueAreaId.Tirannwn]: "#27ae60",
    [LeagueAreaId.Fremennik]: "#5dade2",
    [LeagueAreaId.Wilderness]: "#e74c3c",
    [LeagueAreaId.Kourend]: "#af7ac5",
    [LeagueAreaId.Varlamore]: "#f39c12",
});

export function regionName(areaId: number): string {
    if (areaId === 0) return "Neutral / erase";
    return LEAGUE_AREA_ID_TO_NAME[areaId] ?? `Area ${areaId}`;
}

export function regionColor(areaId: number): string {
    return REGION_PAINT_COLORS[areaId] ?? "#ffffff";
}
