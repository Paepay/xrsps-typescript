import { SkillId, getSkillName } from "../../../../src/rs/skill/skills";
import {
    COMBAT_LAMP_SKILLS,
    ITEM_COINS,
    ITEM_COMBAT_LAMP,
    NPC_DISPLAY_NAMES,
    resolveRegionalNpcId,
} from "./constants";
import {
    createSeekContactActive,
    formatSeekContactInstruction,
    formatSeekContactObjective,
    getRegionalContact,
    getRegionalContactByNpcId,
    isSeekContactFavourId,
} from "./contacts";
import {
    createActiveFromDefinition,
    formatActiveFavourStatus,
    formatRewardPreview,
    generateRegionalFavour,
    getRegionHistory,
    isPlayerInArea,
    recordFavourInHistory,
} from "./generator";
import { getRegionalFavourDefinition, getRegionalFavoursForGiver, getRegionalFavoursForRegion } from "./registry";
import {
    getRegionalFavourRegionDisplayName,
    getRegionalFavourRegionForTile,
} from "./regions";
import type {
    ActiveRegionalFavour,
    RegionalFavourDefinition,
    RegionalFavourHistory,
    RegionalFavourHudPayload,
    RegionalFavourPlayerState,
    RegionalFavourRegion,
} from "./types";
import { emptyRegionalFavourPlayerState } from "./types";

export type RegionalFavourBridge = {
    getPlayer(playerId: number): RegionalFavourHostPlayer | undefined;
    queueChat(playerId: number, text: string): void;
    queueHud(playerId: number, payload: RegionalFavourHudPayload): void;
    addItem(player: RegionalFavourHostPlayer, itemId: number, qty: number): { added: number };
    removeItem(player: RegionalFavourHostPlayer, itemId: number, qty: number): number;
    hasItem(player: RegionalFavourHostPlayer, itemId: number, qty?: number): boolean;
    getItemCount(player: RegionalFavourHostPlayer, itemId: number): number;
    snapshotInventory(player: RegionalFavourHostPlayer): void;
    addSkillXp(player: RegionalFavourHostPlayer, skillId: SkillId, xp: number): void;
};

export type RegionalFavourHostPlayer = {
    id: number;
    name?: string;
    tileX: number;
    tileY: number;
    getCombatLevel(): number;
    getSkill(skillId: SkillId): { baseLevel: number };
    getRegionalFavourState(): RegionalFavourPlayerState;
    setRegionalFavourState(state: RegionalFavourPlayerState): void;
    getVarbitValue?(id: number): number;
};

function playerView(player: RegionalFavourHostPlayer) {
    return {
        getCombatLevel: () => {
            try {
                return player.getCombatLevel();
            } catch {
                return 3;
            }
        },
        getSkillBaseLevel: (skillId: number) => {
            try {
                return player.getSkill(skillId as SkillId)?.baseLevel ?? 1;
            } catch {
                return 1;
            }
        },
        getVarbitValue: player.getVarbitValue?.bind(player),
        tileX: player.tileX,
        tileY: player.tileY,
    };
}

function npcName(id: number): string {
    return NPC_DISPLAY_NAMES[id] ?? `NPC ${id}`;
}

function mutateState(
    player: RegionalFavourHostPlayer,
    fn: (state: RegionalFavourPlayerState) => void,
): RegionalFavourPlayerState {
    const state = player.getRegionalFavourState();
    fn(state);
    player.setRegionalFavourState(state);
    return state;
}

function ensureActiveMap(state: RegionalFavourPlayerState): void {
    if (!state.activeByRegion) state.activeByRegion = {};
    // Migrate legacy single-active saves that never went through cloneRegionalFavourState.
    if (state.active?.region && !state.activeByRegion[state.active.region]) {
        state.activeByRegion[state.active.region] = state.active;
    }
    if (state.active) delete state.active;
}

function regionForNpc(npcId: number): RegionalFavourRegion {
    const contact = getRegionalContactByNpcId(npcId);
    if (contact) return contact.region;
    const tasks = getRegionalFavoursForGiver(npcId);
    return tasks[0]?.region ?? "misthalin";
}

function buildSeekContactHud(
    region: RegionalFavourRegion,
    regionName: string,
): RegionalFavourHudPayload {
    const contact = getRegionalContact(region);
    if (!contact) {
        return {
            visible: true,
            regionName,
            objective: `No active ${regionName} favour`,
            progress: 0,
            required: 0,
            turnInName: "",
            instruction: `Speak to a ${regionName} favour NPC to get a favour.`,
            complete: false,
            hasActiveFavour: false,
            rewardPreview: "",
        };
    }
    return {
        visible: true,
        regionName,
        objective: formatSeekContactObjective(contact),
        progress: 0,
        required: 1,
        turnInName: contact.displayName,
        instruction: formatSeekContactInstruction(contact, regionName),
        complete: false,
        hasActiveFavour: false,
        rewardPreview: "",
    };
}

export class RegionalFavourService {
    constructor(private readonly bridge: RegionalFavourBridge) {}

    getState(player: RegionalFavourHostPlayer): RegionalFavourPlayerState {
        return player.getRegionalFavourState();
    }

    getPlayerRegion(player: RegionalFavourHostPlayer): RegionalFavourRegion | undefined {
        return getRegionalFavourRegionForTile(player.tileX, player.tileY);
    }

    getActive(
        player: RegionalFavourHostPlayer,
        region?: RegionalFavourRegion,
    ): ActiveRegionalFavour | undefined {
        const state = player.getRegionalFavourState();
        ensureActiveMap(state);
        const key = region ?? this.getPlayerRegion(player);
        if (!key) return undefined;
        return state.activeByRegion[key];
    }

    /** Active task that involves this NPC as giver, turn-in, or speak/deliver target (any region). */
    getActiveInvolvingNpc(
        player: RegionalFavourHostPlayer,
        npcId: number,
    ): ActiveRegionalFavour | undefined {
        const resolved = resolveRegionalNpcId(npcId);
        const state = player.getRegionalFavourState();
        ensureActiveMap(state);
        for (const active of Object.values(state.activeByRegion)) {
            if (!active || active.rewardClaimed) continue;
            if (
                resolveRegionalNpcId(active.giverNpcId) === resolved ||
                resolveRegionalNpcId(active.turnInNpcId) === resolved
            ) {
                return active;
            }
            const def = getRegionalFavourDefinition(active.favourId);
            if (def?.targetNpcIds?.some((id) => resolveRegionalNpcId(id) === resolved)) {
                return active;
            }
        }
        return undefined;
    }

    getActiveDefinition(
        player: RegionalFavourHostPlayer,
        region?: RegionalFavourRegion,
    ): RegionalFavourDefinition | undefined {
        const active = this.getActive(player, region);
        if (!active) return undefined;
        return getRegionalFavourDefinition(active.favourId);
    }

    private setActiveForRegion(
        player: RegionalFavourHostPlayer,
        region: RegionalFavourRegion,
        active: ActiveRegionalFavour | undefined,
    ): void {
        mutateState(player, (s) => {
            ensureActiveMap(s);
            if (active) s.activeByRegion[region] = active;
            else delete s.activeByRegion[region];
        });
    }

    sendStatus(player: RegionalFavourHostPlayer): void {
        const region = this.getPlayerRegion(player);
        const active = this.getActive(player, region);
        if (!region) {
            this.bridge.queueChat(
                player.id,
                "You are not in a region that supports favours.",
            );
            this.syncHudIfVisible(player);
            return;
        }
        if (!active) {
            const contact = getRegionalContact(region);
            const regionName = getRegionalFavourRegionDisplayName(region);
            this.ensureSeekContactFavour(player, region);
            const seek = this.getActive(player, region);
            if (seek) {
                const def = getRegionalFavourDefinition(seek.favourId);
                for (const line of formatActiveFavourStatus(seek, def)) {
                    this.bridge.queueChat(player.id, line);
                }
                this.syncHudIfVisible(player);
                return;
            }
            if (contact) {
                this.bridge.queueChat(
                    player.id,
                    `No active ${regionName} favour.`,
                );
                this.bridge.queueChat(
                    player.id,
                    formatSeekContactObjective(contact) +
                        ` (${contact.locationHint}) to take on a favour.`,
                );
            } else {
                this.bridge.queueChat(
                    player.id,
                    `You do not have an active ${regionName} favour.`,
                );
                this.bridge.queueChat(
                    player.id,
                    "Speak to a favour NPC in this area to get one.",
                );
            }
            this.syncHudIfVisible(player);
            return;
        }
        const def = getRegionalFavourDefinition(active.favourId);
        this.bridge.queueChat(player.id, `Given by: ${npcName(active.giverNpcId)}`);
        this.bridge.queueChat(player.id, `Turn in: ${npcName(active.turnInNpcId)}`);
        for (const line of formatActiveFavourStatus(active, def)) {
            this.bridge.queueChat(player.id, line);
        }
        this.syncHudIfVisible(player);
    }

    toggleHud(player: RegionalFavourHostPlayer): boolean {
        const state = player.getRegionalFavourState();
        const nextVisible = !state.hudVisible;
        if (nextVisible) {
            this.showHud(player);
        } else {
            this.hideHud(player);
        }
        this.bridge.queueChat(
            player.id,
            nextVisible ? "Favour HUD enabled." : "Favour HUD hidden.",
        );
        if (nextVisible) {
            const active = this.getActive(player);
            if (active) {
                const def = getRegionalFavourDefinition(active.favourId);
                for (const line of formatActiveFavourStatus(active, def)) {
                    this.bridge.queueChat(player.id, line);
                }
            } else {
                const region = this.getPlayerRegion(player);
                if (region) {
                    const contact = getRegionalContact(region);
                    if (contact) {
                        this.bridge.queueChat(
                            player.id,
                            formatSeekContactObjective(contact) +
                                ` to get a ${getRegionalFavourRegionDisplayName(region)} favour.`,
                        );
                    }
                }
            }
        }
        return nextVisible;
    }

    /** Enable the sticky HUD without chat spam (used by the client + button). */
    showHud(player: RegionalFavourHostPlayer): void {
        const state = player.getRegionalFavourState();
        if (!state.hudVisible) {
            mutateState(player, (s) => {
                s.hudVisible = true;
            });
        }
        const region = this.getPlayerRegion(player);
        if (region) this.ensureSeekContactFavour(player, region);
        this.syncHud(player);
    }

    /** Hide the sticky HUD without chat spam (used by the client - button). */
    hideHud(player: RegionalFavourHostPlayer): void {
        const state = player.getRegionalFavourState();
        if (state.hudVisible) {
            mutateState(player, (s) => {
                s.hudVisible = false;
            });
        }
        this.syncHud(player);
    }

    syncHud(player: RegionalFavourHostPlayer): void {
        const region = this.getPlayerRegion(player);
        // Do NOT ensureSeek here — clearing a seek to assign a real favour would race
        // (grantRewards/sync would re-fill Speak-to-contact before assign runs).
        mutateState(player, (s) => {
            s.lastHudRegion = region;
        });
        this.bridge.queueHud(player.id, this.buildHudPayload(player));
    }

    /**
     * Ensure the region has the "Speak to [contact]" favour when empty.
     * This is a real active task (not a HUD-only placeholder).
     */
    ensureSeekContactFavour(
        player: RegionalFavourHostPlayer,
        region: RegionalFavourRegion,
    ): ActiveRegionalFavour | undefined {
        const existing = this.getActive(player, region);
        if (existing && !existing.rewardClaimed) {
            // Completed seek stuck mid-chain (turn-in cleared assign, then assign failed).
            if (isSeekContactFavourId(existing.favourId) && existing.objectiveComplete) {
                this.setActiveForRegion(player, region, undefined);
            } else {
                return existing;
            }
        }
        return this.assignSeekContactFavour(player, region, { quiet: true, skipHudSync: true });
    }

    /** Assign the regional-contact seek favour for a region. */
    assignSeekContactFavour(
        player: RegionalFavourHostPlayer,
        region: RegionalFavourRegion,
        opts: { quiet?: boolean; skipHudSync?: boolean } = {},
    ): ActiveRegionalFavour | undefined {
        const contact = getRegionalContact(region);
        if (!contact) return undefined;
        const active = createSeekContactActive(contact);
        this.setActiveForRegion(player, region, active);
        if (!opts.quiet) {
            this.bridge.queueChat(
                player.id,
                `Favour: ${active.objectiveText}`,
            );
            this.bridge.queueChat(player.id, active.instructionText);
        }
        if (!opts.skipHudSync) {
            this.syncHudIfVisible(player);
        }
        return active;
    }

    buildHudPayload(player: RegionalFavourHostPlayer): RegionalFavourHudPayload {
        const state = player.getRegionalFavourState();
        if (!state.hudVisible) {
            return {
                visible: false,
                regionName: "",
                objective: "",
                progress: 0,
                required: 0,
                turnInName: "",
                instruction: "",
                complete: false,
                hasActiveFavour: false,
                rewardPreview: "",
            };
        }
        const region = this.getPlayerRegion(player);
        if (!region) {
            return {
                visible: true,
                regionName: "Unknown",
                objective: "No favour here",
                progress: 0,
                required: 0,
                turnInName: "",
                instruction: "Enter an unlocked region to track its favour.",
                complete: false,
                hasActiveFavour: false,
                rewardPreview: "",
            };
        }
        const regionName = getRegionalFavourRegionDisplayName(region);
        const active = this.getActive(player, region);
        if (!active) {
            // Fallback if ensure couldn't run (no contact defined).
            return buildSeekContactHud(region, regionName);
        }
        const def = getRegionalFavourDefinition(active.favourId);
        const seek = isSeekContactFavourId(active.favourId);
        return {
            visible: true,
            regionName,
            objective: active.objectiveText,
            progress: Math.min(active.progress, active.requiredAmount),
            required: active.requiredAmount,
            turnInName: npcName(active.turnInNpcId),
            instruction: def?.instructionText ?? active.instructionText,
            complete: !!active.objectiveComplete,
            hasActiveFavour: true,
            rewardPreview: seek
                ? "Speak to them for a favour (no reward for finding them)"
                : formatRewardPreview(active),
        };
    }

    assignFavour(
        player: RegionalFavourHostPlayer,
        opts: {
            preferredGiverNpcId?: number;
            forceGiverNpcId?: number;
            region?: RegionalFavourRegion;
        } = {},
    ): ActiveRegionalFavour | undefined {
        const result = this.assignFavourWithReason(player, opts);
        if (result.reason) return undefined;
        return result.active;
    }

    /** Assign with a machine-readable failure reason for NPC dialog. */
    assignFavourWithReason(
        player: RegionalFavourHostPlayer,
        opts: {
            preferredGiverNpcId?: number;
            forceGiverNpcId?: number;
            region?: RegionalFavourRegion;
            /** Clear any existing favour in the region before assigning (no seek re-fill). */
            replaceExisting?: boolean;
            /** Skip HUD push — used when a dialog will open immediately after. */
            skipHudSync?: boolean;
        } = {},
    ): { active?: ActiveRegionalFavour; reason?: string } {
        try {
            return this.assignFavourInner(player, opts);
        } catch (err) {
            console.log("[regional-favours] assignFavour unexpected error", err);
            try {
                this.bridge.queueChat(
                    player.id,
                    "Favour assignment failed — try again or ::favour abandon.",
                );
            } catch {}
            return {
                reason: err instanceof Error ? err.message : "unexpected_error",
            };
        }
    }

    private assignFavourInner(
        player: RegionalFavourHostPlayer,
        opts: {
            preferredGiverNpcId?: number;
            forceGiverNpcId?: number;
            region?: RegionalFavourRegion;
            replaceExisting?: boolean;
            skipHudSync?: boolean;
        },
    ): { active?: ActiveRegionalFavour; reason?: string } {
        // Regional contacts (and their aliases) may only broker favours for their own region.
        const contactNpcId = opts.forceGiverNpcId ?? opts.preferredGiverNpcId;
        const contact = contactNpcId !== undefined
            ? getRegionalContactByNpcId(contactNpcId)
            : undefined;

        const region =
            contact?.region ??
            opts.region ??
            (opts.forceGiverNpcId ? regionForNpc(opts.forceGiverNpcId) : undefined) ??
            (opts.preferredGiverNpcId
                ? regionForNpc(opts.preferredGiverNpcId)
                : undefined) ??
            this.getPlayerRegion(player) ??
            "misthalin";

        // Never let an explicit region disagree with a contact's home region.
        if (contact && opts.region && opts.region !== contact.region) {
            this.bridge.queueChat(player.id, "That contact cannot assign favours for that region.");
            return { reason: "region_mismatch" };
        }

        // Repair history before any mutate/clone — corrupt recent* fields used to throw in
        // cloneHistory and surface as "Something went wrong handing out that favour."
        {
            const state = player.getRegionalFavourState();
            getRegionHistory(state, region);
            player.setRegionalFavourState(state);
        }

        const existing = this.getActive(player, region);
        if (existing && !existing.rewardClaimed) {
            const seekDone =
                isSeekContactFavourId(existing.favourId) && existing.objectiveComplete;
            if (
                opts.replaceExisting ||
                seekDone ||
                (isSeekContactFavourId(existing.favourId) && !!contact) ||
                !existing.favourId ||
                !getRegionalFavourDefinition(existing.favourId)
            ) {
                this.setActiveForRegion(player, region, undefined);
            } else {
                this.bridge.queueChat(
                    player.id,
                    `You already have a ${getRegionalFavourRegionDisplayName(region)} favour.`,
                );
                return { reason: "already_active", active: existing };
            }
        }

        const state = player.getRegionalFavourState();
        getRegionHistory(state, region);
        const excludeFavourIds = new Set<string>();
        const maxAttempts = 12;
        const poolSize = getRegionalFavoursForRegion(region).length;
        if (poolSize <= 0) {
            this.bridge.queueChat(
                player.id,
                `No ${getRegionalFavourRegionDisplayName(region)} favours are available right now.`,
            );
            return { reason: "empty_pool" };
        }

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let generated: ReturnType<typeof generateRegionalFavour>;
            try {
                generated = generateRegionalFavour(playerView(player), state, {
                    region,
                    preferredGiverNpcId: opts.preferredGiverNpcId,
                    // Contacts broker the whole regional pool; other NPCs stay forced to themselves.
                    forceGiverNpcId: contact ? undefined : opts.forceGiverNpcId,
                    // In-person assignment: talking to the NPC is the access check.
                    skipAreaUnlockCheck: true,
                    excludeFavourIds,
                });
            } catch (err) {
                console.log("[regional-favours] generateRegionalFavour failed", err);
                return { reason: "generate_threw" };
            }
            if (!generated) {
                break;
            }
            if (generated.def.region !== region || generated.active.region !== region) {
                excludeFavourIds.add(generated.def.id);
                continue;
            }

            const { def, active } = generated;
            if (def.acceptsExistingItems && def.targetItemId && def.category === "GATHER_ITEM") {
                try {
                    const have = this.bridge.getItemCount(player, def.targetItemId);
                    active.progress = Math.min(have, active.requiredAmount);
                    if (active.progress >= active.requiredAmount) {
                        active.objectiveComplete = true;
                    }
                } catch {}
            }

            if (def.category === "DELIVER_ITEM" && def.deliveryItemId) {
                // Best-effort courier item — never block assignment if add fails or throws.
                try {
                    const added = this.bridge.addItem(player, def.deliveryItemId, 1);
                    if (added.added > 0) {
                        this.bridge.snapshotInventory(player);
                    }
                } catch (err) {
                    console.log("[regional-favours] delivery item add failed", err);
                }
            }

            this.setActiveForRegion(player, region, active);

            try {
                // skipHudSync: mid-dialog chain — caller opens the next chatbox line first.
                // Chat + HUD here would race the continue/"Please wait..." client state.
                if (!opts.skipHudSync) {
                    this.bridge.queueChat(
                        player.id,
                        `New favour from ${npcName(def.giverNpcId)}:`,
                    );
                    for (const line of formatActiveFavourStatus(active, def)) {
                        this.bridge.queueChat(player.id, line);
                    }
                    this.syncHudIfVisible(player);
                }
            } catch (err) {
                console.log("[regional-favours] post-assign notify failed", err);
            }
            return { active };
        }

        this.bridge.queueChat(
            player.id,
            `No ${getRegionalFavourRegionDisplayName(region)} favours are available right now.`,
        );
        return { reason: "no_eligible" };
    }

    abandonFavour(
        player: RegionalFavourHostPlayer,
        regionOverride?: RegionalFavourRegion,
    ): boolean {
        const region = regionOverride ?? this.getPlayerRegion(player);
        const active = this.getActive(player, region);
        if (!region || !active || active.rewardClaimed) return false;
        const def = getRegionalFavourDefinition(active.favourId);
        const wasSeek = isSeekContactFavourId(active.favourId);
        if (active.deliveryItemId) {
            this.bridge.removeItem(player, active.deliveryItemId, 1);
            this.bridge.snapshotInventory(player);
        }
        mutateState(player, (s) => {
            if (def && !wasSeek) recordFavourInHistory(s, def);
            ensureActiveMap(s);
            delete s.activeByRegion[region];
        });
        this.bridge.queueChat(player.id, "Favour abandoned. No reward granted.");
        // Always fall back to the regional contact seek favour.
        this.assignSeekContactFavour(player, region);
        return true;
    }

    skipFavour(
        player: RegionalFavourHostPlayer,
        regionOverride?: RegionalFavourRegion,
    ): boolean {
        const state = player.getRegionalFavourState();
        if (!(state.skipsAvailable > 0)) {
            this.bridge.queueChat(
                player.id,
                "No free skips available. Complete 5 more favours to earn one, or abandon without reward.",
            );
            return false;
        }
        const region = regionOverride ?? this.getPlayerRegion(player);
        const active = this.getActive(player, region);
        if (!region || !active) return false;
        const def = getRegionalFavourDefinition(active.favourId);
        const wasSeek = isSeekContactFavourId(active.favourId);
        if (wasSeek) {
            this.bridge.queueChat(
                player.id,
                "Speak to the regional contact to get a favour — nothing to skip yet.",
            );
            return false;
        }
        if (active.deliveryItemId) {
            this.bridge.removeItem(player, active.deliveryItemId, 1);
        }
        mutateState(player, (s) => {
            if (def) recordFavourInHistory(s, def);
            s.skipsAvailable -= 1;
            ensureActiveMap(s);
            delete s.activeByRegion[region];
        });
        this.bridge.snapshotInventory(player);
        this.bridge.queueChat(player.id, "Favour skipped.");
        this.assignSeekContactFavour(player, region);
        return true;
    }

    reclaimDeliveryItem(player: RegionalFavourHostPlayer): boolean {
        const active = this.getActive(player);
        if (!active?.deliveryItemId || active.objectiveComplete || active.rewardClaimed) {
            this.bridge.queueChat(player.id, "You have nothing to reclaim.");
            return false;
        }
        if (this.bridge.hasItem(player, active.deliveryItemId, 1)) {
            this.bridge.queueChat(player.id, "You already have the delivery item.");
            return false;
        }
        const added = this.bridge.addItem(player, active.deliveryItemId, 1);
        if (added.added <= 0) {
            this.bridge.queueChat(player.id, "You need inventory space to reclaim the item.");
            return false;
        }
        this.bridge.snapshotInventory(player);
        this.bridge.queueChat(player.id, "You reclaim the delivery item.");
        return true;
    }

    reclaimDeliveryItemForNpc(player: RegionalFavourHostPlayer, npcId: number): boolean {
        const active = this.getActiveInvolvingNpc(player, npcId);
        if (
            !active ||
            active.giverNpcId !== npcId ||
            !active.deliveryItemId ||
            active.objectiveComplete ||
            active.rewardClaimed
        ) {
            this.bridge.queueChat(player.id, "You have nothing to reclaim.");
            return false;
        }
        if (this.bridge.hasItem(player, active.deliveryItemId, 1)) {
            this.bridge.queueChat(player.id, "You already have the delivery item.");
            return false;
        }
        const added = this.bridge.addItem(player, active.deliveryItemId, 1);
        if (added.added <= 0) {
            this.bridge.queueChat(player.id, "You need inventory space to reclaim the item.");
            return false;
        }
        this.bridge.snapshotInventory(player);
        this.bridge.queueChat(player.id, "You reclaim the delivery item.");
        return true;
    }

    private markProgressOn(
        player: RegionalFavourHostPlayer,
        active: ActiveRegionalFavour,
        amount = 1,
    ): void {
        mutateState(player, (s) => {
            ensureActiveMap(s);
            const current = s.activeByRegion[active.region];
            if (!current || current.favourId !== active.favourId) return;
            if (current.rewardClaimed || current.objectiveComplete) return;
            current.progress = Math.min(current.requiredAmount, current.progress + amount);
            if (current.progress >= current.requiredAmount) {
                current.objectiveComplete = true;
                // Same-NPC turn-in (incl. seek-contact) is claimed in this conversation — no "return to" spam.
                if (
                    !isSeekContactFavourId(current.favourId) &&
                    current.giverNpcId !== current.turnInNpcId
                ) {
                    this.bridge.queueChat(
                        player.id,
                        `Favour complete — return to ${npcName(current.turnInNpcId)} to claim your reward.`,
                    );
                }
            } else {
                this.bridge.queueChat(
                    player.id,
                    `Favour progress: ${current.progress}/${current.requiredAmount}`,
                );
            }
        });
        this.syncHudIfVisible(player);
    }

    private syncHudIfVisible(player: RegionalFavourHostPlayer): void {
        if (player.getRegionalFavourState().hudVisible) {
            this.syncHud(player);
        }
    }

    private findActive(
        player: RegionalFavourHostPlayer,
        pred: (active: ActiveRegionalFavour, def: RegionalFavourDefinition) => boolean,
    ): { active: ActiveRegionalFavour; def: RegionalFavourDefinition } | undefined {
        const state = player.getRegionalFavourState();
        ensureActiveMap(state);
        for (const active of Object.values(state.activeByRegion)) {
            if (!active || active.rewardClaimed || active.objectiveComplete) continue;
            const def = getRegionalFavourDefinition(active.favourId);
            if (!def) continue;
            if (pred(active, def)) return { active, def };
        }
        return undefined;
    }

    onNpcKill(playerId: number, npcId: number): void {
        const player = this.bridge.getPlayer(playerId);
        if (!player) return;
        const match = this.findActive(
            player,
            (_a, def) =>
                def.category === "KILL_NPC" &&
                !!def.requiresPostAssignmentProgress &&
                !!def.targetNpcIds?.includes(npcId),
        );
        if (!match) return;
        this.markProgressOn(player, match.active, 1);
    }

    onItemObtained(playerId: number, itemId: number, count: number): void {
        const player = this.bridge.getPlayer(playerId);
        if (!player) return;
        const match = this.findActive(player, (_a, def) => {
            if (def.targetItemId !== itemId) return false;
            if (
                def.category !== "GATHER_ITEM" &&
                def.category !== "PRODUCE_ITEM" &&
                def.category !== "PROCESS_ITEM" &&
                def.category !== "MULTI_STEP" &&
                def.category !== "RETURN_ITEM"
            ) {
                return false;
            }
            return !!def.requiresPostAssignmentProgress;
        });
        if (!match) return;
        this.markProgressOn(player, match.active, Math.max(1, count));
    }

    onBoneBury(playerId: number, itemId: number): void {
        const player = this.bridge.getPlayer(playerId);
        if (!player) return;
        const match = this.findActive(
            player,
            (_a, def) =>
                def.category === "BURY_OR_OFFER_BONES" && def.targetItemId === itemId,
        );
        if (!match) return;
        this.markProgressOn(player, match.active, 1);
    }

    onPlayerLocation(playerId: number): void {
        const player = this.bridge.getPlayer(playerId);
        if (!player) return;

        const match = this.findActive(
            player,
            (_a, def) => def.category === "VISIT_LOCATION" && !!def.targetArea,
        );
        if (
            match?.def.targetArea &&
            isPlayerInArea(player.tileX, player.tileY, match.def.targetArea)
        ) {
            this.markProgressOn(player, match.active, match.active.requiredAmount);
        }

        const state = player.getRegionalFavourState();
        if (!state.hudVisible) return;
        const region = this.getPlayerRegion(player);
        if (region !== state.lastHudRegion) {
            this.syncHud(player);
        }
    }

    tryCompleteSpeakOrDeliver(
        player: RegionalFavourHostPlayer,
        npcTypeId: number,
    ): "progressed" | "none" {
        const resolvedNpcId = resolveRegionalNpcId(npcTypeId);
        const active = this.getActiveInvolvingNpc(player, resolvedNpcId);
        if (!active || active.rewardClaimed || active.objectiveComplete) return "none";
        const def = getRegionalFavourDefinition(active.favourId);
        if (!def) return "none";

        if (def.category === "SPEAK_TO_NPC") {
            const isTarget =
                !!def.targetNpcIds?.some((id) => resolveRegionalNpcId(id) === resolvedNpcId) ||
                resolveRegionalNpcId(active.turnInNpcId) === resolvedNpcId;
            if (!isTarget) return "none";
            this.markProgressOn(player, active, active.requiredAmount);
            return "progressed";
        }

        if (def.category === "DELIVER_ITEM") {
            if (resolveRegionalNpcId(active.turnInNpcId) !== resolvedNpcId) return "none";
            const itemId = active.deliveryItemId ?? def.deliveryItemId;
            // Consume the courier item when present; still complete if it was never received.
            if (itemId && this.bridge.hasItem(player, itemId, 1)) {
                this.bridge.removeItem(player, itemId, 1);
                this.bridge.snapshotInventory(player);
            }
            this.markProgressOn(player, active, active.requiredAmount);
            return "progressed";
        }

        return "none";
    }

    tryTurnIn(player: RegionalFavourHostPlayer, npcTypeId: number): boolean {
        const resolvedNpcId = resolveRegionalNpcId(npcTypeId);
        const active = this.getActiveInvolvingNpc(player, resolvedNpcId);
        const def = active ? getRegionalFavourDefinition(active.favourId) : undefined;
        if (!active || !def || active.rewardClaimed) return false;
        if (resolveRegionalNpcId(active.turnInNpcId) !== resolvedNpcId) return false;

        if (
            !active.objectiveComplete &&
            def.acceptsExistingItems &&
            def.targetItemId &&
            (def.category === "GATHER_ITEM" || def.category === "RETURN_ITEM")
        ) {
            const have = this.bridge.getItemCount(player, def.targetItemId);
            if (have >= active.requiredAmount) {
                mutateState(player, (s) => {
                    ensureActiveMap(s);
                    const cur = s.activeByRegion[active.region];
                    if (!cur) return;
                    cur.progress = active.requiredAmount;
                    cur.objectiveComplete = true;
                });
            }
        }

        const refreshed = this.getActive(player, active.region);
        if (!refreshed?.objectiveComplete) return false;

        if (
            def.targetItemId &&
            (def.category === "GATHER_ITEM" ||
                def.category === "PRODUCE_ITEM" ||
                def.category === "PROCESS_ITEM" ||
                def.category === "MULTI_STEP" ||
                def.category === "RETURN_ITEM")
        ) {
            const removed = this.bridge.removeItem(
                player,
                def.targetItemId,
                refreshed.requiredAmount,
            );
            if (removed < refreshed.requiredAmount && def.category !== "BURY_OR_OFFER_BONES") {
                if (
                    def.category === "GATHER_ITEM" ||
                    def.category === "PRODUCE_ITEM" ||
                    def.category === "MULTI_STEP"
                ) {
                    this.bridge.queueChat(
                        player.id,
                        "You need the required items in your inventory to turn this in.",
                    );
                    return false;
                }
            }
            this.bridge.snapshotInventory(player);
        }

        return this.grantRewards(player, refreshed, def);
    }

    /** @returns false if rewards could not be granted (inventory full, etc.). */
    private grantRewards(
        player: RegionalFavourHostPlayer,
        active: ActiveRegionalFavour,
        def: RegionalFavourDefinition,
    ): boolean {
        const region = active.region;
        const seek = isSeekContactFavourId(active.favourId) || !!def.noReward;
        if (seek) {
            mutateState(player, (s) => {
                ensureActiveMap(s);
                delete s.activeByRegion[region];
            });
            // No HUD sync here — caller assigns the next favour first; syncing would
            // re-fill Speak-to-contact and block that assign (already_active).
            return true;
        }

        const coinsAdded = this.bridge.addItem(player, ITEM_COINS, active.coinReward);
        if (coinsAdded.added < active.coinReward) {
            this.bridge.queueChat(
                player.id,
                "Your inventory is full — make space for coin rewards and talk again.",
            );
            return false;
        }

        if (active.rewardKind === "combat_lamp") {
            const lamp = this.bridge.addItem(player, ITEM_COMBAT_LAMP, 1);
            if (lamp.added <= 0) {
                this.bridge.removeItem(player, ITEM_COINS, active.coinReward);
                this.bridge.queueChat(
                    player.id,
                    "Your inventory is full — make space for the combat lamp and talk again.",
                );
                return false;
            }
            mutateState(player, (s) => {
                s.pendingCombatLampXp = [...s.pendingCombatLampXp, active.xpReward];
            });
            this.bridge.queueChat(
                player.id,
                `Reward: ${active.coinReward} coins and a combat XP lamp (${active.xpReward} XP). Rub the lamp to choose a combat skill.`,
            );
        } else if (active.rewardKind === "split_xp" && active.splitSkills?.length) {
            const share = Math.floor(active.xpReward / active.splitSkills.length);
            for (const skillId of active.splitSkills) {
                this.bridge.addSkillXp(player, skillId, share);
            }
            this.bridge.queueChat(
                player.id,
                `Reward: ${active.coinReward} coins and ${share} XP in ${active.splitSkills
                    .map((s) => getSkillName(s))
                    .join(", ")}.`,
            );
        } else if (active.rewardSkillId !== undefined && active.xpReward > 0) {
            this.bridge.addSkillXp(player, active.rewardSkillId, active.xpReward);
            this.bridge.queueChat(
                player.id,
                `Reward: ${active.coinReward} coins and ${active.xpReward} ${getSkillName(active.rewardSkillId)} XP.`,
            );
        } else {
            this.bridge.queueChat(player.id, `Reward: ${active.coinReward} coins.`);
        }

        this.bridge.snapshotInventory(player);

        mutateState(player, (s) => {
            recordFavourInHistory(s, def);
            s.completedCount += 1;
            s.completedSinceLastSkip += 1;
            if (s.completedSinceLastSkip >= 5) {
                s.skipsAvailable += 1;
                s.completedSinceLastSkip = 0;
                this.bridge.queueChat(player.id, "You earned a free favour skip.");
            }
            ensureActiveMap(s);
            delete s.activeByRegion[region];
        });
        // Do NOT assign Speak-to-contact here — the talk handler chains the next real favour.
        // Seek is only for abandon/skip / empty region (ensureSeekContactFavour).
        // Do NOT sync HUD here either — mid-chain HUD pushes can leave the client on "Please wait...".
        return true;
    }

    tryRedeemCombatLamp(
        player: RegionalFavourHostPlayer,
        skillId: SkillId,
    ): { ok: true; xp: number } | { ok: false; reason: string } {
        if (!COMBAT_LAMP_SKILLS.includes(skillId)) {
            return { ok: false, reason: "That skill cannot be chosen for this lamp." };
        }
        const state = player.getRegionalFavourState();
        if (state.pendingCombatLampXp.length === 0) {
            return { ok: false, reason: "You have no regional combat lamp XP to claim." };
        }
        if (!this.bridge.hasItem(player, ITEM_COMBAT_LAMP, 1)) {
            return { ok: false, reason: "You need a combat lamp in your inventory." };
        }
        const xp = state.pendingCombatLampXp[0];
        this.bridge.removeItem(player, ITEM_COMBAT_LAMP, 1);
        mutateState(player, (s) => {
            s.pendingCombatLampXp = s.pendingCombatLampXp.slice(1);
        });
        this.bridge.addSkillXp(player, skillId, xp);
        this.bridge.snapshotInventory(player);
        this.bridge.queueChat(
            player.id,
            `The lamp grants ${xp} ${getSkillName(skillId)} XP.`,
        );
        return { ok: true, xp };
    }

    getPendingCombatLampXp(player: RegionalFavourHostPlayer): number | undefined {
        return player.getRegionalFavourState().pendingCombatLampXp[0];
    }
}

function cloneActive(active: ActiveRegionalFavour): ActiveRegionalFavour {
    const anyActive = active as ActiveRegionalFavour & { taskId?: string };
    return {
        ...active,
        favourId: anyActive.favourId ?? anyActive.taskId ?? "",
        splitSkills: active.splitSkills?.slice(),
    };
}

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? [...value] : [];
}

function cloneHistory(h: RegionalFavourHistory | null | undefined): RegionalFavourHistory {
    const legacy = h as (RegionalFavourHistory & { recentTaskIds?: unknown }) | null | undefined;
    // Corrupt / partially migrated saves may store non-arrays; never throw on clone.
    const recentFavourIds = asArray<string>(
        legacy?.recentFavourIds ?? legacy?.recentTaskIds,
    );
    return {
        recentFavourIds,
        recentGiverNpcIds: asArray<number>(h?.recentGiverNpcIds),
        recentRewardSkills: asArray<number>(h?.recentRewardSkills),
        recentCategories: asArray(h?.recentCategories),
    };
}

export function cloneRegionalFavourState(
    state?: RegionalFavourPlayerState | null,
): RegionalFavourPlayerState {
    if (!state) return emptyRegionalFavourPlayerState();

    const activeByRegion: Partial<Record<RegionalFavourRegion, ActiveRegionalFavour>> = {};
    const sourceActives = state.activeByRegion ?? {};
    for (const [key, active] of Object.entries(sourceActives)) {
        if (active) activeByRegion[key as RegionalFavourRegion] = cloneActive(active);
    }
    if (state.active && !activeByRegion[state.active.region]) {
        activeByRegion[state.active.region] = cloneActive(state.active);
    }

    const historyByRegion: Partial<Record<RegionalFavourRegion, RegionalFavourHistory>> = {};
    const sourceHistory = state.historyByRegion ?? {};
    for (const [key, hist] of Object.entries(sourceHistory)) {
        if (hist) historyByRegion[key as RegionalFavourRegion] = cloneHistory(hist);
    }
    if (state.history && !historyByRegion.misthalin) {
        historyByRegion.misthalin = cloneHistory(state.history);
    }

    return {
        activeByRegion,
        historyByRegion,
        completedCount: state.completedCount ?? 0,
        skipsAvailable: state.skipsAvailable ?? 1,
        completedSinceLastSkip: state.completedSinceLastSkip ?? 0,
        pendingCombatLampXp: [...(state.pendingCombatLampXp ?? [])],
        hudVisible: !!state.hudVisible,
        lastHudRegion: state.lastHudRegion,
    };
}

export { createActiveFromDefinition };

let boundRegionalFavourService: RegionalFavourService | undefined;

export function bindRegionalFavourService(service: RegionalFavourService): void {
    boundRegionalFavourService = service;
}

export function getBoundRegionalFavourService(): RegionalFavourService | undefined {
    return boundRegionalFavourService;
}
