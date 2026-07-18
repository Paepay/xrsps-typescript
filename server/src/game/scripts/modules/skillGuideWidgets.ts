import {
    VARBIT_SKILL_GUIDE_SKILL,
    VARBIT_SKILL_GUIDE_SUBSECTION,
} from "../../../../../src/shared/vars";
import {
    MINING_ORE_TELEPORT_ANIM_ID,
    MINING_ORE_TELEPORT_ARRIVE_SOUND,
    MINING_ORE_TELEPORT_CAST_GFX,
    MINING_ORE_TELEPORT_CAST_GFX_HEIGHT,
    MINING_ORE_TELEPORT_CAST_SOUND,
    MINING_ORE_TELEPORT_DELAY_TICKS,
    MINING_SKILL_GUIDE_ROCKS_SUBSECTION,
    MINING_SKILL_GUIDE_VARBIT_VALUE,
    SKILL_GUIDE_ICONS_COMPONENT,
    getSavedMiningOreGuideLocation,
    isMiningOreGuideUnlocked,
    resolveMiningGuideRockIdByOreItem,
} from "../../skills/miningOreGuideLocations";
import {
    WOODCUTTING_SKILL_GUIDE_TREES_SUBSECTION,
    WOODCUTTING_SKILL_GUIDE_VARBIT_VALUE,
    WOODCUTTING_TREE_TELEPORT_ANIM_ID,
    WOODCUTTING_TREE_TELEPORT_ARRIVE_SOUND,
    WOODCUTTING_TREE_TELEPORT_CAST_GFX,
    WOODCUTTING_TREE_TELEPORT_CAST_GFX_HEIGHT,
    WOODCUTTING_TREE_TELEPORT_CAST_SOUND,
    WOODCUTTING_TREE_TELEPORT_DELAY_TICKS,
    getSavedWoodcuttingTreeGuideLocation,
    isWoodcuttingTreeGuideUnlocked,
    resolveWoodcuttingGuideTreeIdByLogItem,
} from "../../skills/woodcuttingTreeGuideLocations";
import {
    FISHING_CATCH_TELEPORT_ANIM_ID,
    FISHING_CATCH_TELEPORT_ARRIVE_SOUND,
    FISHING_CATCH_TELEPORT_CAST_GFX,
    FISHING_CATCH_TELEPORT_CAST_GFX_HEIGHT,
    FISHING_CATCH_TELEPORT_CAST_SOUND,
    FISHING_CATCH_TELEPORT_DELAY_TICKS,
    FISHING_SKILL_GUIDE_VARBIT_VALUE,
    getSavedFishingCatchGuideLocation,
    isFishingCatchGuideUnlocked,
    resolveFishingGuideCatchIdByFishItem,
} from "../../skills/fishingCatchGuideLocations";
import {
    HUNTER_CATCH_TELEPORT_ANIM_ID,
    HUNTER_CATCH_TELEPORT_ARRIVE_SOUND,
    HUNTER_CATCH_TELEPORT_CAST_GFX,
    HUNTER_CATCH_TELEPORT_CAST_GFX_HEIGHT,
    HUNTER_CATCH_TELEPORT_CAST_SOUND,
    HUNTER_CATCH_TELEPORT_DELAY_TICKS,
    HUNTER_SKILL_GUIDE_VARBIT_VALUE,
    getSavedHunterCatchGuideLocation,
    isHunterCatchGuideUnlocked,
    resolveHunterGuideCatchIdByItem,
} from "../../skills/hunterCatchGuideLocations";
import {
    THIEVING_SKILL_GUIDE_VARBIT_VALUE,
    THIEVING_TELEPORT_ANIM_ID,
    THIEVING_TELEPORT_ARRIVE_SOUND,
    THIEVING_TELEPORT_CAST_GFX,
    THIEVING_TELEPORT_CAST_GFX_HEIGHT,
    THIEVING_TELEPORT_CAST_SOUND,
    THIEVING_TELEPORT_DELAY_TICKS,
    getSavedThievingGuideLocation,
    isThievingGuideUnlocked,
    resolveThievingGuideActivityIdByIcon,
} from "../../skills/thievingGuideLocations";
import { getMainmodalUid } from "../../../widgets/viewport";
import { type ScriptModule, type ScriptServices } from "../types";

/**
 * Skill guide widget handlers - opens skill guide interface when skill is clicked
 *
 * Based on RSMod's skill_guides.plugin.kts and OSRS CS2 scripts:
 * - Interface 320 is the skills tab
 * - Interface 214 is the skill guide display
 * - Varbit 4371 (SKILL_GUIDE_SKILL) controls which skill guide to show
 * - Varbit 4372 (SKILL_GUIDE_SUBSECTION) controls the sub-section within the guide
 *
 * Uses onButton registration since binary IF_BUTTON packets don't send option strings.
 *
 * Gathering extensions (unlocked by league relics; admins retain access for testing):
 * - Icons under 214:32 transmit clicks when IF_SETEVENTS is set
 * - Mining / Woodcutting / Fishing / Hunter / Thieving guide icons teleport to last saved location
 * - Power Miner → Mining, Lumberjack → Woodcutting, Animal Wrangler → Fishing + Hunter,
 *   Dodgy Deals → Thieving
 */

// Widget/Interface IDs
const SKILLS_TAB_GROUP_ID = 320;
const SKILL_GUIDE_GROUP_ID = 214;
const SCRIPT_SKILL_GUIDE_BUILD = 9340;

// IF_SETEVENTS: bit 1 = transmit op1
const IF_SETEVENTS_TRANSMIT_OP1 = 1 << 1;
/** Enough slots to cover Mining Rocks / Woodcutting Trees entries. */
const SKILL_GUIDE_ICON_SLOT_MAX = 48;

type SkillGuideEntry = {
    childId: number;
    skillVarbitValue: number;
    skillName: string;
};

/**
 * Skill guide buttons in interface 320 mapped to their guide varbit values.
 * Based on RSMod's SkillGuide.kt enum.
 */
const SKILL_GUIDE_ENTRIES: readonly SkillGuideEntry[] = [
    { childId: 1, skillVarbitValue: 1, skillName: "Attack" },
    { childId: 2, skillVarbitValue: 2, skillName: "Strength" },
    { childId: 3, skillVarbitValue: 5, skillName: "Defence" },
    { childId: 4, skillVarbitValue: 3, skillName: "Ranged" },
    { childId: 5, skillVarbitValue: 7, skillName: "Prayer" },
    { childId: 6, skillVarbitValue: 4, skillName: "Magic" },
    { childId: 7, skillVarbitValue: 12, skillName: "Runecrafting" },
    { childId: 8, skillVarbitValue: 22, skillName: "Construction" },
    { childId: 9, skillVarbitValue: 6, skillName: "Hitpoints" },
    { childId: 10, skillVarbitValue: 8, skillName: "Agility" },
    { childId: 11, skillVarbitValue: 9, skillName: "Herblore" },
    { childId: 12, skillVarbitValue: 10, skillName: "Thieving" },
    { childId: 13, skillVarbitValue: 11, skillName: "Crafting" },
    { childId: 14, skillVarbitValue: 19, skillName: "Fletching" },
    { childId: 15, skillVarbitValue: 20, skillName: "Slayer" },
    { childId: 16, skillVarbitValue: 23, skillName: "Hunter" },
    { childId: 17, skillVarbitValue: 13, skillName: "Mining" },
    { childId: 18, skillVarbitValue: 14, skillName: "Smithing" },
    { childId: 19, skillVarbitValue: 15, skillName: "Fishing" },
    { childId: 20, skillVarbitValue: 16, skillName: "Cooking" },
    { childId: 21, skillVarbitValue: 17, skillName: "Firemaking" },
    { childId: 22, skillVarbitValue: 18, skillName: "Woodcutting" },
    { childId: 23, skillVarbitValue: 21, skillName: "Farming" },
    { childId: 24, skillVarbitValue: 24, skillName: "Sailing" },
];

function queueWidgetFlagsRange(
    player: any,
    services: ScriptServices,
    uid: number,
    fromSlot: number,
    toSlot: number,
    flags: number,
): void {
    const interfaceService = services.getInterfaceService?.();
    if (interfaceService?.setWidgetFlags) {
        interfaceService.setWidgetFlags(player, uid, fromSlot, toSlot, flags);
        return;
    }
    services.queueWidgetEvent?.(player.id, {
        action: "set_flags_range",
        uid,
        fromSlot,
        toSlot,
        flags,
    });
}

function enableSkillGuideIconTransmit(player: any, services: ScriptServices): void {
    // Must run AFTER openSubInterface — open clears group flags.
    queueWidgetFlagsRange(
        player,
        services,
        (SKILL_GUIDE_GROUP_ID << 16) | SKILL_GUIDE_ICONS_COMPONENT,
        0,
        SKILL_GUIDE_ICON_SLOT_MAX,
        IF_SETEVENTS_TRANSMIT_OP1,
    );
}

function castStandardTeleport(
    player: any,
    services: ScriptServices,
    destination: { x: number; y: number; level: number },
    opts: {
        delayTicks: number;
        animId: number;
        castGfx: number;
        castGfxHeight: number;
        castSound: number;
        arriveSound: number;
        abortLabel: string;
    },
): void {
    if (!player.canTeleport?.()) {
        return;
    }

    const requestTeleportAction = services.requestTeleportAction;
    if (!requestTeleportAction) {
        services.logger?.warn?.(
            `[skill-guide] requestTeleportAction unavailable; ${opts.abortLabel} aborted`,
        );
        return;
    }

    services.closeInterruptibleInterfaces?.(player);

    const teleportResult = requestTeleportAction(player, {
        x: destination.x,
        y: destination.y,
        level: destination.level,
        delayTicks: opts.delayTicks,
        cooldownTicks: opts.delayTicks,
        resetAnimation: true,
        arriveSoundId: opts.arriveSound,
        arriveSoundRadius: 1,
        arriveSoundVolume: 1,
        requireCanTeleport: true,
        rejectIfPending: true,
        replacePending: false,
    });

    if (!teleportResult.ok) {
        if (teleportResult.reason === "cooldown") {
            services.sendGameMessage?.(player, "You're already teleporting.");
        } else if (teleportResult.reason === "league_area_locked") {
            // Message already queued by requestTeleportAction.
        }
        return;
    }

    if (services.playPlayerSeqImmediate) {
        services.playPlayerSeqImmediate(player, opts.animId);
    } else {
        services.playPlayerSeq?.(player, opts.animId);
    }
    services.broadcastPlayerSpot?.(player, opts.castGfx, opts.castGfxHeight, 0);
    services.playAreaSound?.({
        soundId: opts.castSound,
        tile: { x: player.tileX, y: player.tileY },
        level: player.level,
        radius: 5,
        volume: 255,
    });
}

function tryTeleportToMiningOreLocation(player: any, services: ScriptServices, itemId: number): boolean {
    if (!isMiningOreGuideUnlocked(player, services)) {
        return false;
    }

    const skill = player.getVarbitValue?.(VARBIT_SKILL_GUIDE_SKILL) ?? 0;
    const subsection = player.getVarbitValue?.(VARBIT_SKILL_GUIDE_SUBSECTION) ?? 0;
    if (skill !== MINING_SKILL_GUIDE_VARBIT_VALUE || subsection !== MINING_SKILL_GUIDE_ROCKS_SUBSECTION) {
        return false;
    }

    const rockId = resolveMiningGuideRockIdByOreItem(itemId);
    if (!rockId) {
        return false;
    }

    const destination = getSavedMiningOreGuideLocation(player, rockId);
    if (!destination) {
        services.sendGameMessage?.(player, "You haven't saved a location for that ore yet.");
        return true;
    }

    castStandardTeleport(player, services, destination, {
        delayTicks: MINING_ORE_TELEPORT_DELAY_TICKS,
        animId: MINING_ORE_TELEPORT_ANIM_ID,
        castGfx: MINING_ORE_TELEPORT_CAST_GFX,
        castGfxHeight: MINING_ORE_TELEPORT_CAST_GFX_HEIGHT,
        castSound: MINING_ORE_TELEPORT_CAST_SOUND,
        arriveSound: MINING_ORE_TELEPORT_ARRIVE_SOUND,
        abortLabel: "mining ore teleport",
    });
    return true;
}

function tryTeleportToWoodcuttingTreeLocation(
    player: any,
    services: ScriptServices,
    itemId: number,
): boolean {
    if (!isWoodcuttingTreeGuideUnlocked(player, services)) {
        return false;
    }

    const skill = player.getVarbitValue?.(VARBIT_SKILL_GUIDE_SKILL) ?? 0;
    const subsection = player.getVarbitValue?.(VARBIT_SKILL_GUIDE_SUBSECTION) ?? 0;
    if (
        skill !== WOODCUTTING_SKILL_GUIDE_VARBIT_VALUE ||
        subsection !== WOODCUTTING_SKILL_GUIDE_TREES_SUBSECTION
    ) {
        return false;
    }

    const treeId = resolveWoodcuttingGuideTreeIdByLogItem(itemId);
    if (!treeId) {
        return false;
    }

    const destination = getSavedWoodcuttingTreeGuideLocation(player, treeId);
    if (!destination) {
        services.sendGameMessage?.(player, "You haven't saved a location for that tree yet.");
        return true;
    }

    castStandardTeleport(player, services, destination, {
        delayTicks: WOODCUTTING_TREE_TELEPORT_DELAY_TICKS,
        animId: WOODCUTTING_TREE_TELEPORT_ANIM_ID,
        castGfx: WOODCUTTING_TREE_TELEPORT_CAST_GFX,
        castGfxHeight: WOODCUTTING_TREE_TELEPORT_CAST_GFX_HEIGHT,
        castSound: WOODCUTTING_TREE_TELEPORT_CAST_SOUND,
        arriveSound: WOODCUTTING_TREE_TELEPORT_ARRIVE_SOUND,
        abortLabel: "woodcutting tree teleport",
    });
    return true;
}

function tryTeleportToFishingCatchLocation(
    player: any,
    services: ScriptServices,
    itemId: number,
): boolean {
    if (!isFishingCatchGuideUnlocked(player, services)) {
        return false;
    }

    const skill = player.getVarbitValue?.(VARBIT_SKILL_GUIDE_SKILL) ?? 0;
    if (skill !== FISHING_SKILL_GUIDE_VARBIT_VALUE) {
        return false;
    }
    // Client may change catch-method tabs without syncing subsection to the server.
    // Item-id mapping already excludes equipment/other entries.

    const catchId = resolveFishingGuideCatchIdByFishItem(itemId);
    if (!catchId) {
        return false;
    }

    const destination = getSavedFishingCatchGuideLocation(player, catchId);
    if (!destination) {
        services.sendGameMessage?.(player, "You haven't saved a location for that fish yet.");
        return true;
    }

    castStandardTeleport(player, services, destination, {
        delayTicks: FISHING_CATCH_TELEPORT_DELAY_TICKS,
        animId: FISHING_CATCH_TELEPORT_ANIM_ID,
        castGfx: FISHING_CATCH_TELEPORT_CAST_GFX,
        castGfxHeight: FISHING_CATCH_TELEPORT_CAST_GFX_HEIGHT,
        castSound: FISHING_CATCH_TELEPORT_CAST_SOUND,
        arriveSound: FISHING_CATCH_TELEPORT_ARRIVE_SOUND,
        abortLabel: "fishing catch teleport",
    });
    return true;
}

function tryTeleportToHunterCatchLocation(
    player: any,
    services: ScriptServices,
    itemId: number,
): boolean {
    if (!isHunterCatchGuideUnlocked(player, services)) {
        return false;
    }

    const skill = player.getVarbitValue?.(VARBIT_SKILL_GUIDE_SKILL) ?? 0;
    if (skill !== HUNTER_SKILL_GUIDE_VARBIT_VALUE) {
        return false;
    }

    const catchId = resolveHunterGuideCatchIdByItem(itemId);
    if (!catchId) {
        return false;
    }

    const destination = getSavedHunterCatchGuideLocation(player, catchId);
    if (!destination) {
        services.sendGameMessage?.(player, "You haven't saved a location for that creature yet.");
        return true;
    }

    castStandardTeleport(player, services, destination, {
        delayTicks: HUNTER_CATCH_TELEPORT_DELAY_TICKS,
        animId: HUNTER_CATCH_TELEPORT_ANIM_ID,
        castGfx: HUNTER_CATCH_TELEPORT_CAST_GFX,
        castGfxHeight: HUNTER_CATCH_TELEPORT_CAST_GFX_HEIGHT,
        castSound: HUNTER_CATCH_TELEPORT_CAST_SOUND,
        arriveSound: HUNTER_CATCH_TELEPORT_ARRIVE_SOUND,
        abortLabel: "hunter catch teleport",
    });
    return true;
}

function tryTeleportToThievingLocation(
    player: any,
    services: ScriptServices,
    itemId: number,
    slot?: number,
): boolean {
    if (!isThievingGuideUnlocked(player, services)) {
        return false;
    }

    const skill = player.getVarbitValue?.(VARBIT_SKILL_GUIDE_SKILL) ?? 0;
    if (skill !== THIEVING_SKILL_GUIDE_VARBIT_VALUE) {
        return false;
    }

    // Client may change Pickpocket/Stalls/Chests tabs without syncing subsection
    // (varbit 4372) to the server. Resolver falls back to itemId + slot.
    const subsection = player.getVarbitValue?.(VARBIT_SKILL_GUIDE_SUBSECTION) ?? 0;
    const activityId = resolveThievingGuideActivityIdByIcon(itemId, subsection, slot);
    if (!activityId) {
        return false;
    }

    const destination = getSavedThievingGuideLocation(player, activityId);
    if (!destination) {
        services.sendGameMessage?.(player, "You haven't saved a location for that yet.");
        return true;
    }

    castStandardTeleport(player, services, destination, {
        delayTicks: THIEVING_TELEPORT_DELAY_TICKS,
        animId: THIEVING_TELEPORT_ANIM_ID,
        castGfx: THIEVING_TELEPORT_CAST_GFX,
        castGfxHeight: THIEVING_TELEPORT_CAST_GFX_HEIGHT,
        castSound: THIEVING_TELEPORT_CAST_SOUND,
        arriveSound: THIEVING_TELEPORT_ARRIVE_SOUND,
        abortLabel: "thieving teleport",
    });
    return true;
}

export const skillGuideWidgetModule: ScriptModule = {
    id: "content.skill-guide-widgets",
    register(registry, services) {
        // Register a handler for each skill in the skills tab (interface 320)
        // Uses onButton since binary IF_BUTTON packets don't send option strings
        for (const { childId, skillVarbitValue, skillName } of SKILL_GUIDE_ENTRIES) {
            registry.onButton(SKILLS_TAB_GROUP_ID, childId, (event) => {
                const player = event.player;

                // Update player's varbit state
                player.setVarbitValue(VARBIT_SKILL_GUIDE_SUBSECTION, 0);
                player.setVarbitValue(VARBIT_SKILL_GUIDE_SKILL, skillVarbitValue);

                // Send varbits to client
                services.queueVarbit?.(player.id, VARBIT_SKILL_GUIDE_SUBSECTION, 0);
                services.queueVarbit?.(player.id, VARBIT_SKILL_GUIDE_SKILL, skillVarbitValue);

                // Open the skill guide interface (214) in the mainmodal container
                const mainmodalUid = getMainmodalUid(player.displayMode);

                services.logger?.info?.(
                    `[skill-guide] Opening ${skillName} guide: targetUid=${mainmodalUid} (0x${mainmodalUid.toString(
                        16,
                    )}), ` +
                        `groupId=${SKILL_GUIDE_GROUP_ID}, varbits={${VARBIT_SKILL_GUIDE_SKILL}:${skillVarbitValue}, ${VARBIT_SKILL_GUIDE_SUBSECTION}:0}`,
                );

                services.openSubInterface?.(player, mainmodalUid, SKILL_GUIDE_GROUP_ID, 0, {
                    varbits: {
                        [VARBIT_SKILL_GUIDE_SUBSECTION]: 0,
                        [VARBIT_SKILL_GUIDE_SKILL]: skillVarbitValue,
                    },
                    // OSRS parity: opening 214 alone only mounts the shell. The client then runs
                    // script9340(skill, subsection, startLevel, endLevel) to populate titles,
                    // categories, and the detail list for the current skill.
                    postScripts: [
                        {
                            scriptId: SCRIPT_SKILL_GUIDE_BUILD,
                            args: [skillVarbitValue, 0, 0, 0],
                        },
                    ],
                });

                const unlockMining =
                    skillVarbitValue === MINING_SKILL_GUIDE_VARBIT_VALUE &&
                    isMiningOreGuideUnlocked(player, services);
                const unlockWoodcutting =
                    skillVarbitValue === WOODCUTTING_SKILL_GUIDE_VARBIT_VALUE &&
                    isWoodcuttingTreeGuideUnlocked(player, services);
                const unlockFishing =
                    skillVarbitValue === FISHING_SKILL_GUIDE_VARBIT_VALUE &&
                    isFishingCatchGuideUnlocked(player, services);
                const unlockHunter =
                    skillVarbitValue === HUNTER_SKILL_GUIDE_VARBIT_VALUE &&
                    isHunterCatchGuideUnlocked(player, services);
                const unlockThieving =
                    skillVarbitValue === THIEVING_SKILL_GUIDE_VARBIT_VALUE &&
                    isThievingGuideUnlocked(player, services);
                if (
                    unlockMining ||
                    unlockWoodcutting ||
                    unlockFishing ||
                    unlockHunter ||
                    unlockThieving
                ) {
                    enableSkillGuideIconTransmit(player, services);
                }
            });
        }

        // Dynamic icons under 214:32 (CC_CREATE children; slot = entry index).
        registry.onButton(SKILL_GUIDE_GROUP_ID, SKILL_GUIDE_ICONS_COMPONENT, (event) => {
            const itemId = event.itemId ?? 0;
            if (!(itemId > 0)) return;
            if (tryTeleportToMiningOreLocation(event.player, services, itemId)) return;
            if (tryTeleportToWoodcuttingTreeLocation(event.player, services, itemId)) return;
            if (tryTeleportToFishingCatchLocation(event.player, services, itemId)) return;
            if (tryTeleportToHunterCatchLocation(event.player, services, itemId)) return;
            tryTeleportToThievingLocation(event.player, services, itemId, event.slot);
        });

        // Sub-section button clicks (interface 214, children 11-24) are handled purely
        // by CS2 scripts on the client - no server handler needed.
    },
};
