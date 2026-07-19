import type { ActiveRegionalFavour, RegionalFavourDefinition, RegionalFavourRegion } from "./types";
import { NpcIds } from "./constants";
import { getRegionalFavourRegionDisplayName } from "./regions";

/**
 * Each unlockable region has one **regional contact** — the NPC you seek when you
 * have no active favour there (new to the area, or after cancelling). Finding them
 * grants no reward; they are how you pick up a new favour.
 */
export type RegionalContact = {
    region: RegionalFavourRegion;
    /** Primary NPC type id used for HUD / status text. */
    npcId: number;
    displayName: string;
    /** Short location hint for instructions. */
    locationHint: string;
    /** Alternate type ids that should count as this contact (quest/diary variants). */
    aliasNpcIds?: readonly number[];
};

export const REGIONAL_CONTACTS: readonly RegionalContact[] = [
    {
        region: "misthalin",
        npcId: NpcIds.Hans,
        displayName: "Hans",
        locationHint: "Lumbridge Castle courtyard",
    },
    {
        region: "asgarnia",
        npcId: NpcIds.Squire,
        displayName: "Squire",
        locationHint: "White Knights' Castle courtyard in Falador",
    },
    {
        region: "morytania",
        npcId: NpcIds.Drezel,
        displayName: "Drezel",
        locationHint: "Paterdomus temple",
        aliasNpcIds: [NpcIds.DrezelUnderground],
    },
    {
        region: "desert",
        npcId: NpcIds.Hassan,
        displayName: "Hassan",
        locationHint: "Al Kharid palace",
    },
    {
        region: "karamja",
        npcId: NpcIds.PirateJackieTheFruit,
        displayName: "Pirate Jackie the Fruit",
        locationHint: "Brimhaven Agility Arena ticket office",
        aliasNpcIds: [NpcIds.PirateJackieTheFruitDiary, NpcIds.PirateJackieTheFruitDiaryAlt],
    },
    {
        region: "kandarin",
        npcId: NpcIds.KingLathas,
        displayName: "King Lathas",
        locationHint: "Ardougne Castle",
        aliasNpcIds: [NpcIds.KingLathasAlt, NpcIds.KingLathasAlt2],
    },
    {
        region: "fremennik",
        npcId: NpcIds.Brundt,
        displayName: "Brundt the Chieftain",
        locationHint: "Rellekka longhall",
        aliasNpcIds: [NpcIds.BrundtAlt, NpcIds.BrundtAlt2],
    },
    {
        region: "tirannwn",
        npcId: NpcIds.Arianwyn,
        displayName: "Arianwyn",
        locationHint: "Lletya",
        aliasNpcIds: [
            NpcIds.ArianwynAlt,
            NpcIds.ArianwynAlt2,
            NpcIds.ArianwynAlt3,
            NpcIds.ArianwynAlt4,
        ],
    },
    {
        region: "kourend",
        npcId: NpcIds.CommanderFullore,
        displayName: "Commander Fullore",
        locationHint: "Kourend Castle",
        aliasNpcIds: [
            NpcIds.CommanderFulloreAlt,
            NpcIds.CommanderFulloreAlt2,
            NpcIds.CommanderFulloreAlt3,
            NpcIds.CommanderFulloreAlt4,
            NpcIds.CommanderFulloreAlt5,
        ],
    },
    {
        region: "varlamore",
        npcId: NpcIds.PrinceItzlaArkan,
        displayName: "Prince Itzla Arkan",
        locationHint: "Varlamore",
        aliasNpcIds: [
            NpcIds.PrinceItzlaArkanAlt,
            NpcIds.PrinceItzlaArkanAlt2,
            NpcIds.PrinceItzlaArkanAlt3,
            NpcIds.PrinceItzlaArkanAlt4,
            NpcIds.PrinceItzlaArkanAlt5,
            NpcIds.PrinceItzlaArkanAlt6,
            NpcIds.PrinceItzlaArkanAlt7,
            NpcIds.PrinceItzlaArkanAlt8,
        ],
    },
    {
        region: "wilderness",
        npcId: NpcIds.Krystilia,
        displayName: "Krystilia",
        locationHint: "Edgeville, by the Wilderness ditch",
    },
];

const byRegion = new Map<RegionalFavourRegion, RegionalContact>();
const byNpcId = new Map<number, RegionalContact>();

for (const contact of REGIONAL_CONTACTS) {
    byRegion.set(contact.region, contact);
    byNpcId.set(contact.npcId, contact);
    for (const alias of contact.aliasNpcIds ?? []) {
        byNpcId.set(alias, contact);
    }
}

export function getRegionalContact(
    region: RegionalFavourRegion,
): RegionalContact | undefined {
    return byRegion.get(region);
}

export function getRegionalContactByNpcId(npcId: number): RegionalContact | undefined {
    return byNpcId.get(npcId);
}

export function isRegionalContactNpc(npcId: number): boolean {
    return byNpcId.has(npcId);
}

export function getAllRegionalContactNpcIds(): number[] {
    return [...byNpcId.keys()];
}

export function formatSeekContactObjective(contact: RegionalContact): string {
    return `Speak to ${contact.displayName}`;
}

export function formatSeekContactInstruction(
    contact: RegionalContact,
    regionDisplayName: string,
): string {
    return `${contact.displayName} (${contact.locationHint}) can give you a ${regionDisplayName} favour. No reward for finding them.`;
}

/** Stable task id for the per-region "speak to contact" favour. */
export function seekContactFavourId(region: RegionalFavourRegion): string {
    return `seek_contact_${region}`;
}

export function isSeekContactFavourId(favourId: string | undefined): boolean {
    return !!favourId && favourId.startsWith("seek_contact_");
}

/**
 * Lightweight SPEAK_TO_NPC definitions for each regional contact.
 * Indexed in the registry by id only (not in the random favour pool).
 */
export function buildSeekContactDefinitions(): RegionalFavourDefinition[] {
    return REGIONAL_CONTACTS.map((contact) => {
        const aliases = contact.aliasNpcIds ?? [];
        return {
            id: seekContactFavourId(contact.region),
            region: contact.region,
            giverNpcId: contact.npcId,
            turnInNpcId: contact.npcId,
            category: "SPEAK_TO_NPC" as const,
            reward: { kind: "skill_xp" as const, difficulty: "very_easy" as const, travelDistance: 0 },
            targetNpcIds: [contact.npcId, ...aliases],
            minAmount: 1,
            maxAmount: 1,
            baseWeight: 0,
            acceptsExistingItems: false,
            requiresPostAssignmentProgress: true,
            objectiveText: formatSeekContactObjective(contact),
            instructionText: formatSeekContactInstruction(
                contact,
                getRegionalFavourRegionDisplayName(contact.region),
            ),
            assignmentDialog: [
                `Find ${contact.displayName}.`,
                "They'll have a favour for you.",
            ],
            completionDialog: [
                `Welcome — good to see you.`,
                "I've got a favour that needs doing.",
            ],
            noReward: true,
        };
    });
}

export function createSeekContactActive(contact: RegionalContact): ActiveRegionalFavour {
    const regionName = getRegionalFavourRegionDisplayName(contact.region);
    return {
        favourId: seekContactFavourId(contact.region),
        region: contact.region,
        giverNpcId: contact.npcId,
        turnInNpcId: contact.npcId,
        requiredAmount: 1,
        progress: 0,
        objectiveComplete: false,
        rewardClaimed: false,
        assignmentTimestamp: Date.now(),
        coinReward: 0,
        xpReward: 0,
        rewardKind: "skill_xp",
        objectiveText: formatSeekContactObjective(contact),
        instructionText: formatSeekContactInstruction(contact, regionName),
    };
}
