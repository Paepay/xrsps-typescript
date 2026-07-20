import { SkillId, getSkillName } from "../../../../../src/rs/skill/skills";
import type { ScriptModule } from "../types";
import {
    COMBAT_LAMP_SKILLS,
    ITEM_COMBAT_LAMP,
    NPC_DISPLAY_NAMES,
    getAllRegionalContactNpcIds,
    getAllRegionalFavourNpcTypeIdsForScripts,
    getBoundRegionalFavourService,
    getRegionalContact,
    getRegionalContactByNpcId,
    getRegionalFavourDefinition,
    getRegionalFavourRegionDisplayName,
    getRegionalFavourRegionForNpc,
    getRegionalFavourRegionForTile,
    isSeekContactFavourId,
    resolveRegionalNpcId,
} from "../../regionalFavours";

type RegionalFavourScriptApi = {
    sendStatus(player: any): void;
    assignFavour(
        player: any,
        opts?: {
            preferredGiverNpcId?: number;
            forceGiverNpcId?: number;
            region?: string;
        },
    ): unknown;
    assignFavourWithReason?(
        player: any,
        opts?: {
            preferredGiverNpcId?: number;
            forceGiverNpcId?: number;
            region?: string;
            replaceExisting?: boolean;
            skipHudSync?: boolean;
            excludeFavourIds?: readonly string[];
            skipFriendsChatLink?: boolean;
        },
    ): { active?: any; reason?: string };
    abandonFavour(player: any, regionOverride?: string): boolean;
    skipFavour(player: any, regionOverride?: string): boolean;
    reclaimDeliveryItem(player: any): boolean;
    reclaimDeliveryItemForNpc?(player: any, npcId: number): boolean;
    tryCompleteSpeakOrDeliver(player: any, npcTypeId: number): "progressed" | "none";
    tryTurnIn(player: any, npcTypeId: number): boolean;
    getActive(
        player: any,
        region?: string,
    ):
        | {
              favourId?: string;
              region?: string;
              giverNpcId: number;
              turnInNpcId: number;
              objectiveComplete: boolean;
              rewardClaimed: boolean;
              deliveryItemId?: number;
              objectiveText?: string;
          }
        | undefined;
    getActiveInvolvingNpc?(
        player: any,
        npcId: number,
    ):
        | {
              favourId?: string;
              region?: string;
              giverNpcId: number;
              turnInNpcId: number;
              objectiveComplete: boolean;
              rewardClaimed: boolean;
              deliveryItemId?: number;
              objectiveText?: string;
          }
        | undefined;
    getActiveDefinition(player: any): { assignmentDialog: string[]; completionDialog: string[] } | undefined;
    tryRedeemCombatLamp(
        player: any,
        skillId: SkillId,
    ): { ok: true; xp: number } | { ok: false; reason: string };
    getPendingCombatLampXp(player: any): number | undefined;
    ensureSeekContactFavour?(player: any, region: string): unknown;
    assignSeekContactFavour?(player: any, region: string): unknown;
};

function normalizeRegionalNpcId(npcId: number): number {
    return resolveRegionalNpcId(npcId);
}

function npcName(id: number): string {
    return NPC_DISPLAY_NAMES[normalizeRegionalNpcId(id)] ?? `NPC ${id}`;
}

/**
 * Favours (Misthalin) — NPC talk + combat lamp rub handlers.
 * Service instance is injected via ScriptServices.regionalFavourService.
 */
export const regionalFavoursModule: ScriptModule = {
    id: "content.regional-favours",
    register(registry, services) {
        const getApi = (): RegionalFavourScriptApi | undefined => {
            const fromServices = services.regionalFavourService as RegionalFavourScriptApi | undefined;
            if (fromServices && typeof fromServices.assignFavour === "function") {
                return fromServices;
            }
            const bound = getBoundRegionalFavourService() as RegionalFavourScriptApi | undefined;
            if (bound && typeof bound.assignFavour === "function") {
                return bound;
            }
            return undefined;
        };

        const activeConvos = new Set<number>();
        const convoStartedAt = new Map<number, number>();
        // Short window: blocks same-click double-fire / mid-dialog re-entry.
        // Refresh on each dialog step so long favour chains stay locked; recover quickly if
        // click-to-continue skips onClose (previously 20s of silent ignored Talk-to clicks).
        const CONVO_STALE_MS = 3_000;

        const handleTalk = (event: any) => {
            const opt = String(event?.option ?? "")
                .trim()
                .toLowerCase();
            // Defence: Trade must never open favour dialogue (shopkeepers share these NPCs).
            if (opt === "trade" || opt === "trade-with") {
                if (services.openShop) {
                    services.openShop(event.player, { npcTypeId: event.npc?.typeId });
                } else {
                    services.sendGameMessage?.(event.player, "Nothing interesting happens.");
                }
                return;
            }

            const api = getApi();
            if (!api) return;

            const player = event.player;
            const pid = player.id;
            const rawNpcId = event.npc.typeId as number;
            const npcId = normalizeRegionalNpcId(rawNpcId);
            const name = npcName(npcId);

            const touchConvo = () => {
                activeConvos.add(pid);
                convoStartedAt.set(pid, Date.now());
            };

            // Prevent double-firing (talk-to + default option) and mid-dialog re-entry.
            // Recover if a prior dialog never cleared the lock (click-to-continue skips onClose).
            if (activeConvos.has(pid)) {
                const started = convoStartedAt.get(pid) ?? 0;
                if (Date.now() - started < CONVO_STALE_MS) return;
                activeConvos.delete(pid);
            }
            touchConvo();

            const releaseConvo = () => {
                activeConvos.delete(pid);
                convoStartedAt.delete(pid);
            };

            const openNpc = (id: string, lines: string[], onContinue?: () => void) => {
                if (!services.openDialog) {
                    releaseConvo();
                    return;
                }
                touchConvo();
                // Romeo parity: when chaining, do NOT close on continue — the next openDialog
                // replaces the chatbox. Closing first leaves the client on "Please wait...".
                services.openDialog(player, {
                    kind: "npc",
                    id,
                    npcId: rawNpcId,
                    npcName: name,
                    lines,
                    clickToContinue: true,
                    closeOnContinue: !onContinue,
                    onContinue: onContinue
                        ? () => {
                              try {
                                  touchConvo();
                                  onContinue();
                              } catch (err) {
                                  console.log("[regional-favours] dialog continue failed", err);
                                  services.closeDialog?.(player, id);
                                  releaseConvo();
                              }
                          }
                        : undefined,
                    onClose: releaseConvo,
                });
            };

            const openOptions = (
                id: string,
                title: string,
                options: string[],
                onSelect: (choice: number) => void,
            ) => {
                if (!services.openDialogOptions) {
                    releaseConvo();
                    return;
                }
                services.openDialogOptions(player, {
                    id,
                    title,
                    options,
                    onClose: releaseConvo,
                    onSelect: (choice) => {
                        // Keep Romeo parity: clear lock, then open a player dialog first.
                        releaseConvo();
                        onSelect(choice);
                    },
                });
            };

            const convoId = `rfavour_${pid}_${npcId}`;
            // Only the favour that involves THIS npc (giver/turn-in), not any favour.
            const active = api.getActiveInvolvingNpc?.(player, npcId);
            const def = active
                ? getRegionalFavourDefinition((active as any).favourId) ?? api.getActiveDefinition(player)
                : undefined;

            const showAssignedFavour = (assigned: any, dialogSuffix = "assign") => {
                touchConvo();
                const newDef = getRegionalFavourDefinition(assigned.favourId);
                const assignLines =
                    newDef?.assignmentDialog?.length
                        ? newDef.assignmentDialog
                        : [
                              "Here's what I need.",
                              String(assigned.objectiveText ?? "Get it done."),
                          ];
                // In-place chatbox replace clears "Please wait..."; HUD is tick-queued after widgets.
                openNpc(`${convoId}_${dialogSuffix}`, assignLines);
                try {
                    getBoundRegionalFavourService()?.syncHud(player);
                } catch {
                    /* HUD refresh is best-effort after dialog is up */
                }
            };

            const tryAssignNextFavour = (optsExtra?: {
                replaceExisting?: boolean;
                /**
                 * After turn-in: pull from the whole regional pool (contact as preferred giver).
                 * Without this, non-contact NPCs force themselves as giver and often fail → Seek Hans.
                 */
                wholeRegion?: boolean;
                /** Skip HUD sync during assign — caller opens dialog first, then syncs. */
                skipHudSync?: boolean;
                /**
                 * Favour just turned in — Friends Chat mates still holding this task
                 * force a fresh roll instead of looping the same favour.
                 */
                excludeFavourIds?: readonly string[];
                /** Prefer this region when the NPC has no favour defs of their own. */
                regionHint?: string;
            }): {
                assigned?: any;
                reason?: string;
                blocking?: any;
            } => {
                const contact = getRegionalContactByNpcId(npcId);
                const fromNpc = getRegionalFavourRegionForNpc(npcId);
                const fromTile = getRegionalFavourRegionForTile(
                    player.tileX | 0,
                    player.tileY | 0,
                );
                const region =
                    contact?.region ??
                    fromNpc ??
                    (optsExtra?.regionHint as any) ??
                    fromTile ??
                    "misthalin";
                const broker = contact ?? getRegionalContact(region);
                const useRegionPool = !!contact || !!optsExtra?.wholeRegion;
                const opts = useRegionPool
                    ? {
                          preferredGiverNpcId: broker?.npcId,
                          region,
                          replaceExisting: optsExtra?.replaceExisting,
                          skipHudSync: optsExtra?.skipHudSync,
                          excludeFavourIds: optsExtra?.excludeFavourIds,
                      }
                    : {
                          forceGiverNpcId: npcId,
                          preferredGiverNpcId: npcId,
                          region,
                          replaceExisting: optsExtra?.replaceExisting,
                          skipHudSync: optsExtra?.skipHudSync,
                          excludeFavourIds: optsExtra?.excludeFavourIds,
                      };
                try {
                    if (typeof api.assignFavourWithReason === "function") {
                        const result = api.assignFavourWithReason(player, opts);
                        if (result.reason === "already_active") {
                            return { reason: result.reason, blocking: result.active };
                        }
                        if (result.active) return { assigned: result.active };
                        return { reason: result.reason ?? "no_eligible" };
                    }
                    if (typeof api.assignFavour !== "function") {
                        return { reason: "service_not_ready" };
                    }
                    const assigned = api.assignFavour(player, opts);
                    if (assigned) return { assigned };
                    return { reason: "no_eligible" };
                } catch (err) {
                    console.log("[regional-favours] assignFavour failed", err);
                    return { reason: err instanceof Error ? err.message : String(err) };
                }
            };

            const assignFailLines = (reason?: string, blocking?: any): string[] => {
                if (reason === "already_active" && blocking?.objectiveText) {
                    return [
                        "You're already on a favour in this region.",
                        String(blocking.objectiveText),
                        "Finish it, or ::favour abandon, then talk to me again.",
                    ];
                }
                if (reason === "already_active") {
                    return [
                        "You're already on a favour in this region.",
                        "Finish it, or ::favour abandon, then talk to me again.",
                    ];
                }
                if (reason === "empty_pool") {
                    return ["I don't have any favours for this region yet."];
                }
                if (reason === "generate_threw" || reason === "unexpected_error") {
                    return [
                        "Something went wrong handing out that favour.",
                        "Try talking to me again.",
                    ];
                }
                return [
                    "I couldn't hand you a favour just now.",
                    reason ? `(${reason}) Try ::favour abandon, then talk to me again.` : "Try ::favour abandon, then talk to me again.",
                ];
            };

            /** Turn-in: reward lines → continue → next real favour (any turn-in NPC). */
            const completeThenChainNext = (completionLines: string[], dialogId: string) => {
                openNpc(dialogId, completionLines, () => {
                    const prior = api.getActiveInvolvingNpc?.(player, npcId);
                    const priorFavourId =
                        typeof (prior as any)?.favourId === "string"
                            ? String((prior as any).favourId)
                            : undefined;
                    const region =
                        (prior as any)?.region ??
                        getRegionalContactByNpcId(npcId)?.region ??
                        getRegionalFavourRegionForNpc(npcId) ??
                        getRegionalFavourRegionForTile(player.tileX | 0, player.tileY | 0) ??
                        "misthalin";

                    let turnedIn = false;
                    try {
                        turnedIn = api.tryTurnIn(player, npcId);
                    } catch (err) {
                        console.log("[regional-favours] tryTurnIn threw", err);
                    }

                    if (!turnedIn) {
                        const stuck = api.getActive?.(player, region);
                        const canForce =
                            !!stuck &&
                            !stuck.rewardClaimed &&
                            stuck.objectiveComplete &&
                            isSeekContactFavourId((stuck as any).favourId);
                        if (!canForce) {
                            openNpc(`${convoId}_reward_blocked`, [
                                "I still owe you that reward.",
                                "Make some inventory space, then talk to me again.",
                            ]);
                            return;
                        }
                    }

                    // Always hand out the next regional favour here (not Speak-to-contact).
                    // Friends Chat: exclude the favour just completed so channel mates still
                    // holding it force a new roll; if they hold a different task, adopt that.
                    const { assigned, reason, blocking } = tryAssignNextFavour({
                        replaceExisting: true,
                        wholeRegion: true,
                        skipHudSync: true,
                        excludeFavourIds: priorFavourId ? [priorFavourId] : undefined,
                        regionHint: region,
                    });
                    if (!assigned) {
                        console.log("[regional-favours] chain assign failed", reason, blocking);
                        try {
                            api.assignSeekContactFavour?.(player, region);
                        } catch (err) {
                            console.log("[regional-favours] seek refill after chain fail", err);
                        }
                        openNpc(`${convoId}_chain_fail`, assignFailLines(reason, blocking));
                        return;
                    }
                    showAssignedFavour(assigned, "chain_assign");
                });
            };

            /** Regional contact with no active favour: assign first, then welcome + briefing. */
            const welcomeAndAssign = (welcomeLines: string[]) => {
                try {
                    const { assigned, reason, blocking } = tryAssignNextFavour({
                        replaceExisting: true,
                        skipHudSync: true,
                    });
                    if (!assigned) {
                        openNpc(`${convoId}_fail`, assignFailLines(reason, blocking));
                        return;
                    }
                    const newDef = getRegionalFavourDefinition(assigned.favourId);
                    const assignLines =
                        newDef?.assignmentDialog?.length
                            ? newDef.assignmentDialog
                            : [
                                  "Here's what I need.",
                                  String(assigned.objectiveText ?? "Get it done."),
                              ];
                    openNpc(`${convoId}_welcome_assign`, [...welcomeLines, ...assignLines]);
                    try {
                        getBoundRegionalFavourService()?.syncHud(player);
                    } catch {
                        /* best-effort */
                    }
                } catch (err) {
                    console.log("[regional-favours] welcomeAndAssign failed", err);
                    releaseConvo();
                }
            };

            // 1) Turn-in when objective complete
            if (
                active &&
                resolveRegionalNpcId(active.turnInNpcId) === npcId &&
                active.objectiveComplete &&
                !active.rewardClaimed
            ) {
                const lines = def?.completionDialog?.length
                    ? def.completionDialog
                    : ["You've done well.", "Here's your reward."];
                completeThenChainNext(lines, `${convoId}_complete`);
                return;
            }

            // 2) Progress speak/deliver at target NPC (e.g. active "Speak to Hans")
            if (active && !active.objectiveComplete) {
                const progressed = api.tryCompleteSpeakOrDeliver(player, npcId);
                if (progressed === "progressed") {
                    const refreshed = api.getActiveInvolvingNpc?.(player, npcId);
                    if (
                        refreshed?.objectiveComplete &&
                        resolveRegionalNpcId(refreshed.turnInNpcId) === npcId
                    ) {
                        completeThenChainNext(
                            def?.completionDialog?.length
                                ? def.completionDialog
                                : ["Well done.", "Here's your reward."],
                            `${convoId}_instant`,
                        );
                        return;
                    }
                    openNpc(`${convoId}_progress`, [
                        "That helps — thank you.",
                        refreshed?.objectiveComplete
                            ? `Return to ${npcName(refreshed.turnInNpcId)} for your reward.`
                            : "Keep at it.",
                    ]);
                    return;
                }
            }

            // 3) Reclaim delivery from giver
            if (
                active &&
                resolveRegionalNpcId(active.giverNpcId) === npcId &&
                active.deliveryItemId &&
                !active.objectiveComplete
            ) {
                openOptions(`${convoId}_giver`, name, [
                    "I've lost the letter.",
                    "Remind me what I'm doing.",
                    "Never mind.",
                ], (choice) => {
                    const playerLine =
                        choice === 0
                            ? "I've lost the letter."
                            : choice === 1
                              ? "Remind me what I'm doing."
                              : "Never mind.";
                    services.openDialog?.(player, {
                        kind: "player",
                        id: `${convoId}_giver_p`,
                        playerName: player.name ?? "You",
                        lines: [playerLine],
                        clickToContinue: true,
                        closeOnContinue: false,
                        onClose: releaseConvo,
                        onContinue: () => {
                            touchConvo();
                            if (choice === 0) {
                                if (api.reclaimDeliveryItemForNpc) {
                                    api.reclaimDeliveryItemForNpc(player, npcId);
                                } else {
                                    api.reclaimDeliveryItem(player);
                                }
                                openNpc(`${convoId}_reclaim`, ["Be more careful with this one."]);
                            } else if (choice === 1) {
                                api.sendStatus(player);
                                openNpc(`${convoId}_remind`, ["Don't forget what I asked."]);
                            } else {
                                openNpc(`${convoId}_bye`, ["Safe travels."]);
                            }
                        },
                    });
                });
                return;
            }

            // 4) Giver of your current incomplete favour — status / skip
            // Do NOT treat speak/deliver targets as busy-giver; those complete in step 2.
            if (
                active &&
                resolveRegionalNpcId(active.giverNpcId) === npcId &&
                !active.rewardClaimed
            ) {
                openOptions(`${convoId}_busy`, name, [
                    "Remind me of my favour.",
                    "I want to skip this favour.",
                    "I want to abandon this favour.",
                    "Never mind.",
                ], (choice) => {
                    const playerLines = [
                        "Remind me of my favour.",
                        "I want to skip this favour.",
                        "I want to abandon this favour.",
                        "Never mind.",
                    ];
                    services.openDialog?.(player, {
                        kind: "player",
                        id: `${convoId}_busy_p`,
                        playerName: player.name ?? "You",
                        lines: [playerLines[choice] ?? "Never mind."],
                        clickToContinue: true,
                        closeOnContinue: false,
                        onClose: releaseConvo,
                        onContinue: () => {
                            touchConvo();
                            if (choice === 0) {
                                api.sendStatus(player);
                                openNpc(`${convoId}_status`, ["Off you go then."]);
                            } else if (choice === 1) {
                                api.skipFavour(player, (active as any).region);
                                openNpc(`${convoId}_skip`, ["Very well — here's something else."]);
                            } else if (choice === 2) {
                                api.abandonFavour(player, (active as any).region);
                                openNpc(`${convoId}_abandon`, [
                                    "So be it. Come back when you're ready.",
                                ]);
                            } else {
                                openNpc(`${convoId}_nm`, ["Alright."]);
                            }
                        },
                    });
                });
                return;
            }

            // 5) Region already has a real favour (seek-contact is completed via steps 1–2)
            const contactForBusy = getRegionalContactByNpcId(npcId);
            const npcRegion =
                contactForBusy?.region ??
                getRegionalFavourRegionForNpc(npcId) ??
                getRegionalFavourRegionForTile(player.tileX | 0, player.tileY | 0);
            const regionBusy =
                npcRegion !== undefined ? api.getActive(player, npcRegion) : undefined;
            if (
                regionBusy &&
                !regionBusy.rewardClaimed &&
                !isSeekContactFavourId((regionBusy as any).favourId)
            ) {
                openNpc(`${convoId}_region_busy`, [
                    "You're already helping someone else around here.",
                    String(regionBusy.objectiveText ?? "Finish that favour first."),
                    "Or ::favour abandon if you want something else.",
                ]);
                return;
            }

            // 6) Seek-contact / no real favour — contacts auto-assign; other NPCs ask first
            const contact = contactForBusy;
            const regionLabel = contact
                ? getRegionalFavourRegionDisplayName(contact.region)
                : "this area";
            if (contact) {
                welcomeAndAssign([
                    `Welcome — good to see you around ${regionLabel}.`,
                    "I've got a favour that needs doing.",
                ]);
                return;
            }

            openNpc(
                `${convoId}_intro`,
                [
                    `Looking for something to do around ${regionLabel}?`,
                    "I could use a hand with a small favour.",
                ],
                () => {
                    openOptions(`${convoId}_offer`, name, ["I'll help.", "Not right now."], (choice) => {
                        if (choice !== 0) {
                            services.openDialog?.(player, {
                                kind: "player",
                                id: `${convoId}_decline_p`,
                                playerName: player.name ?? "You",
                                lines: ["Not right now."],
                                clickToContinue: true,
                                closeOnContinue: false,
                                onClose: releaseConvo,
                                onContinue: () => {
                                    touchConvo();
                                    openNpc(`${convoId}_decline`, ["Another time, then."]);
                                },
                            });
                            return;
                        }

                        const { assigned, reason, blocking } = tryAssignNextFavour();

                        services.openDialog?.(player, {
                            kind: "player",
                            id: `${convoId}_accept_p`,
                            playerName: player.name ?? "You",
                            lines: ["I'll help."],
                            clickToContinue: true,
                            closeOnContinue: false,
                            onClose: releaseConvo,
                            onContinue: () => {
                                touchConvo();
                                if (!assigned) {
                                    openNpc(`${convoId}_fail`, assignFailLines(reason, blocking));
                                    return;
                                }
                                showAssignedFavour(assigned);
                            },
                        });
                    });
                },
            );
        };

        const npcIds = new Set(getAllRegionalFavourNpcTypeIdsForScripts());
        for (const contactNpcId of getAllRegionalContactNpcIds()) {
            npcIds.add(contactNpcId);
        }

        for (const npcId of npcIds) {
            // Only Talk-to — never register a bare/empty option. Empty option handlers steal
            // Trade/Teleport when opNum resolution fails or a second packet arrives without a label.
            // ScriptRuntime already maps empty left-clicks to talk-to.
            registry.registerNpcScript({ npcId, option: "talk-to", handler: handleTalk });
        }

        // Combat lamp rub
        const rubLamp = (event: any) => {
            const api = getApi();
            const player = event.player;
            const pid = player.id;
            if (!api) {
                services.sendGameMessage?.(
                    player,
                    "The lamp flickers, but nothing happens right now.",
                );
                return;
            }

            // Favour talk locks can stick when click-to-continue skips onClose.
            // Recover the same way talk-to does — never silently ignore Rub forever.
            if (activeConvos.has(pid)) {
                const started = convoStartedAt.get(pid) ?? 0;
                if (Date.now() - started < CONVO_STALE_MS) {
                    services.sendGameMessage?.(
                        player,
                        "Finish your conversation before rubbing the lamp.",
                    );
                    return;
                }
                activeConvos.delete(pid);
                convoStartedAt.delete(pid);
            }

            const pending = api.getPendingCombatLampXp(player);
            if (pending === undefined) {
                services.openDialog?.(player, {
                    kind: "player",
                    id: `rfavour_lamp_empty_${pid}`,
                    playerName: player.name ?? "You",
                    lines: ["This lamp has no regional combat XP stored."],
                    clickToContinue: true,
                    closeOnContinue: true,
                });
                return;
            }

            if (!services.openDialogOptions) {
                services.sendGameMessage?.(player, "You rub the lamp, but nothing happens.");
                return;
            }

            activeConvos.add(pid);
            convoStartedAt.set(pid, Date.now());
            const release = () => {
                activeConvos.delete(pid);
                convoStartedAt.delete(pid);
            };

            /** Chat options only support 5 choices — page combat skills. */
            const openSkillPage = (page: 0 | 1) => {
                convoStartedAt.set(pid, Date.now());
                const pageSkills =
                    page === 0
                        ? COMBAT_LAMP_SKILLS.slice(0, 3)
                        : COMBAT_LAMP_SKILLS.slice(3);
                const options = pageSkills.map((id) => `${getSkillName(id)} (${pending} XP)`);
                if (page === 0) {
                    options.push("Other combat skills...");
                    options.push("Cancel");
                } else {
                    options.push("Back...");
                    options.push("Cancel");
                }

                services.openDialogOptions!(player, {
                    id: `rfavour_lamp_${pid}_p${page}`,
                    title: "Combat XP Lamp",
                    options,
                    onClose: release,
                    onSelect: (choice) => {
                        if (page === 0) {
                            if (choice === 3) {
                                // Keep lock while paging.
                                activeConvos.add(pid);
                                convoStartedAt.set(pid, Date.now());
                                openSkillPage(1);
                                return;
                            }
                            if (choice < 0 || choice >= pageSkills.length) {
                                release();
                                return;
                            }
                        } else {
                            if (choice === pageSkills.length) {
                                activeConvos.add(pid);
                                convoStartedAt.set(pid, Date.now());
                                openSkillPage(0);
                                return;
                            }
                            if (choice < 0 || choice >= pageSkills.length) {
                                release();
                                return;
                            }
                        }

                        const skillId = pageSkills[choice];
                        activeConvos.add(pid);
                        convoStartedAt.set(pid, Date.now());
                        services.openDialogOptions!(player, {
                            id: `rfavour_lamp_confirm_${pid}`,
                            title: "Confirm",
                            options: [
                                `Yes — ${pending} ${getSkillName(skillId)} XP`,
                                "No",
                            ],
                            onClose: release,
                            onSelect: (confirm) => {
                                release();
                                if (confirm !== 0) return;
                                const result = api.tryRedeemCombatLamp(player, skillId);
                                if (!result.ok) {
                                    services.openDialog?.(player, {
                                        kind: "player",
                                        id: `rfavour_lamp_fail_${pid}`,
                                        playerName: player.name ?? "You",
                                        lines: [result.reason],
                                        clickToContinue: true,
                                        closeOnContinue: true,
                                    });
                                }
                            },
                        });
                    },
                });
            };

            openSkillPage(0);
        };

        for (const opt of ["rub", "Rub", undefined]) {
            registry.registerItemAction(ITEM_COMBAT_LAMP, rubLamp, opt);
        }
    },
};
