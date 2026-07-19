import {
    LeagueAreaId,
    LEAGUE_AREA_ID_TO_NAME,
} from "../../../../src/shared/leagues/leagueAreas";
import { getLeagueAreaIdForTile } from "../leagues/LeagueAreaAccess";
import type { RegionalFavourRegion } from "./types";

/** Unlockable league areas that can host favours (content filled per region). */
export const REGIONAL_FAVOUR_REGION_BY_AREA_ID: Readonly<Record<number, RegionalFavourRegion>> = {
    [LeagueAreaId.Misthalin]: "misthalin",
    [LeagueAreaId.Karamja]: "karamja",
    [LeagueAreaId.Asgarnia]: "asgarnia",
    [LeagueAreaId.Kandarin]: "kandarin",
    [LeagueAreaId.Morytania]: "morytania",
    [LeagueAreaId.Desert]: "desert",
    [LeagueAreaId.Tirannwn]: "tirannwn",
    [LeagueAreaId.Fremennik]: "fremennik",
    [LeagueAreaId.Wilderness]: "wilderness",
    [LeagueAreaId.Kourend]: "kourend",
    [LeagueAreaId.Varlamore]: "varlamore",
};

export const REGIONAL_FAVOUR_REGION_DISPLAY_NAME: Readonly<Record<RegionalFavourRegion, string>> = {
    misthalin: "Misthalin",
    karamja: "Karamja",
    asgarnia: "Asgarnia",
    kandarin: "Kandarin",
    morytania: "Morytania",
    desert: "Desert",
    tirannwn: "Tirannwn",
    fremennik: "Fremennik",
    wilderness: "Wilderness",
    kourend: "Kourend",
    varlamore: "Varlamore",
};

/** League area id used for unlock checks when generating tasks for a region. */
export const REGIONAL_FAVOUR_REGION_TO_AREA_ID: Readonly<Record<RegionalFavourRegion, number>> = {
    misthalin: LeagueAreaId.Misthalin,
    karamja: LeagueAreaId.Karamja,
    asgarnia: LeagueAreaId.Asgarnia,
    kandarin: LeagueAreaId.Kandarin,
    morytania: LeagueAreaId.Morytania,
    desert: LeagueAreaId.Desert,
    tirannwn: LeagueAreaId.Tirannwn,
    fremennik: LeagueAreaId.Fremennik,
    wilderness: LeagueAreaId.Wilderness,
    kourend: LeagueAreaId.Kourend,
    varlamore: LeagueAreaId.Varlamore,
};

export function leagueAreaIdToRegionalFavourRegion(areaId: number | null): RegionalFavourRegion | undefined {
    if (areaId === null || areaId === undefined) return undefined;
    return REGIONAL_FAVOUR_REGION_BY_AREA_ID[areaId];
}

export function getRegionalFavourRegionForTile(
    tileX: number,
    tileY: number,
): RegionalFavourRegion | undefined {
    return leagueAreaIdToRegionalFavourRegion(getLeagueAreaIdForTile(tileX, tileY));
}

export function getRegionalFavourRegionDisplayName(region: RegionalFavourRegion): string {
    return REGIONAL_FAVOUR_REGION_DISPLAY_NAME[region] ?? region;
}

export function getLeagueAreaDisplayName(areaId: number): string {
    return LEAGUE_AREA_ID_TO_NAME[areaId] ?? `Area ${areaId}`;
}
