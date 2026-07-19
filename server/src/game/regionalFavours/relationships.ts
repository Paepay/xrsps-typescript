import { NpcIds } from "./constants";

/**
 * Weighted destination suggestions for NPC handoffs (not hard restrictions).
 */
export const MISTHALIN_NPC_RELATIONSHIPS: Readonly<Record<number, readonly number[]>> = {
    [NpcIds.Hans]: [
        NpcIds.Cook,
        NpcIds.Bob,
        NpcIds.Fred,
        NpcIds.DukeHoracio,
        NpcIds.FatherAereck,
        NpcIds.Aubury,
        NpcIds.Sedridor,
        NpcIds.LumbridgeGuide,
        NpcIds.Romeo,
    ],
    [NpcIds.Cook]: [NpcIds.Fred, NpcIds.DukeHoracio, NpcIds.FatherAereck, NpcIds.Hans],
    [NpcIds.Fred]: [NpcIds.Cook, NpcIds.Thessalia, NpcIds.Bob, NpcIds.Hans],
    [NpcIds.DukeHoracio]: [
        NpcIds.Hans,
        NpcIds.FatherAereck,
        NpcIds.Sedridor,
        NpcIds.KingRoald,
        NpcIds.Bob,
        NpcIds.Cook,
    ],
    [NpcIds.FatherAereck]: [
        NpcIds.FatherUrhney,
        NpcIds.FatherLawrence,
        NpcIds.DukeHoracio,
        NpcIds.Hans,
    ],
    [NpcIds.FatherUrhney]: [NpcIds.FatherAereck, NpcIds.Morgan],
    [NpcIds.Bob]: [NpcIds.DukeHoracio, NpcIds.Fred, NpcIds.Hans, NpcIds.Cook],
    [NpcIds.LumbridgeGuide]: [
        NpcIds.Bob,
        NpcIds.Cook,
        NpcIds.FatherAereck,
        NpcIds.Fred,
        NpcIds.Hans,
        NpcIds.Sedridor,
    ],
    [NpcIds.Morgan]: [NpcIds.FatherAereck, NpcIds.FatherLawrence, NpcIds.Ned],
    [NpcIds.Ned]: [NpcIds.Fred, NpcIds.Cook, NpcIds.Aggie],
    [NpcIds.Aggie]: [NpcIds.Apothecary, NpcIds.Thessalia, NpcIds.Ned],
    [NpcIds.WiseOldMan]: [
        NpcIds.Sedridor,
        NpcIds.Aubury,
        NpcIds.FatherUrhney,
        NpcIds.Reldo,
    ],
    [NpcIds.Sedridor]: [
        NpcIds.Aubury,
        NpcIds.DukeHoracio,
        NpcIds.GypsyAris,
        NpcIds.WiseOldMan,
    ],
    [NpcIds.Aubury]: [NpcIds.Sedridor, NpcIds.Hans, NpcIds.Reldo, NpcIds.GypsyAris],
    [NpcIds.Romeo]: [NpcIds.Juliet, NpcIds.FatherLawrence, NpcIds.Apothecary, NpcIds.Thessalia],
    [NpcIds.Juliet]: [NpcIds.Romeo, NpcIds.FatherLawrence, NpcIds.Apothecary, NpcIds.Thessalia],
    [NpcIds.FatherLawrence]: [
        NpcIds.FatherAereck,
        NpcIds.Romeo,
        NpcIds.Juliet,
        NpcIds.KingRoald,
    ],
    [NpcIds.Apothecary]: [NpcIds.Aggie, NpcIds.Romeo, NpcIds.Juliet, NpcIds.GypsyAris],
    [NpcIds.Thessalia]: [NpcIds.Fred, NpcIds.Aggie, NpcIds.Juliet, NpcIds.Romeo],
    [NpcIds.Reldo]: [
        NpcIds.KingRoald,
        NpcIds.WiseOldMan,
        NpcIds.Aubury,
        NpcIds.CuratorHaigHalen,
        NpcIds.HistorianMinas,
    ],
    [NpcIds.GypsyAris]: [
        NpcIds.Sedridor,
        NpcIds.Aubury,
        NpcIds.DukeHoracio,
        NpcIds.FatherLawrence,
    ],
    [NpcIds.KingRoald]: [NpcIds.DukeHoracio, NpcIds.Reldo, NpcIds.GypsyAris, NpcIds.Aubury],
    [NpcIds.CuratorHaigHalen]: [NpcIds.Reldo, NpcIds.HistorianMinas, NpcIds.KingRoald],
    [NpcIds.HistorianMinas]: [NpcIds.CuratorHaigHalen, NpcIds.Reldo],
};

export function getRelatedNpcs(npcId: number): readonly number[] {
    return MISTHALIN_NPC_RELATIONSHIPS[npcId] ?? [];
}
