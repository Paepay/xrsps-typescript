/**
 * Single-world Friends Chat (Chat-channel) registry.
 * Keys channels by owner username; settings persist on the owner's account.
 */
import type { PlayerState } from "../player";
import type { FriendsChatServerPayload } from "../../network/messages";

export const FRIENDS_CHAT_WORLD = 1;
export const FRIENDS_CHAT_RANK_ANYONE = -2;
export const FRIENDS_CHAT_RANK_FRIEND = -1;
export const FRIENDS_CHAT_RANK_OWNER = 7;
/** Incremental update sentinel: remove member. */
export const FRIENDS_CHAT_RANK_REMOVE = -128;

const MAX_CHANNEL_NAME_LENGTH = 12;
const MAX_MEMBERS = 100;

export type FriendsChatPersistentSettings = {
    channelName?: string;
    enterRank?: number;
    talkRank?: number;
    kickRank?: number;
    lastJoined?: string | null;
    channelRanks?: Record<string, number>;
};

export type FriendsChatMember = {
    playerId: number;
    name: string;
    rank: number;
    world: number;
};

type FriendsChatChannel = {
    ownerKey: string;
    ownerDisplayName: string;
    channelName: string;
    enterRank: number;
    talkRank: number;
    kickRank: number;
    members: Map<number, FriendsChatMember>;
    /** Rank map from owner settings (normalized name → rank). */
    channelRanks: Map<string, number>;
};

export type FriendsChatServiceOptions = {
    getPlayerById: (id: number) => PlayerState | undefined;
    getPlayerByName: (name: string) => PlayerState | undefined;
    /** Load owner settings from disk when the owner account is offline. */
    getOfflineOwnerSettings?: (
        ownerName: string,
    ) => FriendsChatPersistentSettings | undefined;
    sendUpdate: (playerId: number, payload: FriendsChatServerPayload) => void;
    sendGameMessage: (player: PlayerState, text: string) => void;
    queueChannelChat: (opts: {
        text: string;
        from: string;
        prefix: string;
        playerId: number;
        targetPlayerIds: number[];
    }) => void;
};

function normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function clampRank(value: number, fallback: number): number {
    if (!Number.isFinite(value)) return fallback;
    const n = value | 0;
    if (n < FRIENDS_CHAT_RANK_ANYONE || n > FRIENDS_CHAT_RANK_OWNER) return fallback;
    return n;
}

function clampChannelName(name: string, fallback: string): string {
    const trimmed = name.trim().replace(/\s+/g, " ");
    if (!trimmed) return fallback;
    return trimmed.slice(0, MAX_CHANNEL_NAME_LENGTH);
}

/** Empty string = disabled prefix; undefined falls back. */
function resolveChannelName(name: string | undefined, fallback: string): string {
    if (name === undefined) return fallback;
    const trimmed = name.trim().replace(/\s+/g, " ");
    if (!trimmed) return "";
    return trimmed.slice(0, MAX_CHANNEL_NAME_LENGTH);
}

export class FriendsChatService {
    private readonly channels = new Map<string, FriendsChatChannel>();
    private readonly playerChannel = new Map<number, string>();
    /** Players currently prompted for a channel-prefix name dialog. */
    private readonly pendingPrefixEdit = new Set<number>();

    constructor(private readonly options: FriendsChatServiceOptions) {}

    getSettings(player: PlayerState): FriendsChatPersistentSettings {
        return { ...this.ensureSettings(player) };
    }

    handleJoinLeave(player: PlayerState, channelNameRaw: string | undefined): void {
        const channelName = (channelNameRaw ?? "").trim();
        if (!channelName) {
            this.leave(player, { silent: false });
            return;
        }
        this.join(player, channelName);
    }

    join(player: PlayerState, ownerNameRaw: string): void {
        const ownerKey = normalizeName(ownerNameRaw);
        if (!ownerKey) {
            this.options.sendGameMessage(player, "You must enter a name to join a channel.");
            return;
        }

        const currentKey = this.playerChannel.get(player.id);
        if (currentKey === ownerKey) {
            const channel = this.channels.get(ownerKey);
            if (channel) {
                this.sendFullUpdate(player.id, channel);
            }
            return;
        }
        if (currentKey) {
            this.leave(player, { silent: true });
        }

        let channel = this.channels.get(ownerKey);
        const isOwnerJoining = normalizeName(player.name ?? "") === ownerKey;
        const ownerPlayer = isOwnerJoining
            ? player
            : this.options.getPlayerByName(ownerNameRaw) ??
              this.options.getPlayerByName(ownerKey);

        if (!channel) {
            // Channel exists when someone joins; owner account settings seed it.
            // Prefer online owner runtime settings, then offline save data, then defaults.
            const settings =
                this.readSettings(ownerPlayer) ??
                this.options.getOfflineOwnerSettings?.(ownerKey) ??
                this.options.getOfflineOwnerSettings?.(ownerNameRaw) ??
                this.defaultSettings(ownerNameRaw);
            channel = this.createChannel(ownerKey, ownerNameRaw, settings, ownerPlayer);
            this.channels.set(ownerKey, channel);
        } else if (ownerPlayer) {
            this.applyOwnerSettings(channel, ownerPlayer);
        }

        const memberRank = this.resolveMemberRank(channel, player, isOwnerJoining);
        if (memberRank < channel.enterRank && !isOwnerJoining) {
            this.options.sendGameMessage(
                player,
                "You do not have a high enough rank to join this friends chat channel.",
            );
            if (channel.members.size === 0) {
                this.channels.delete(ownerKey);
            }
            return;
        }

        if (channel.members.size >= MAX_MEMBERS) {
            this.options.sendGameMessage(player, "The channel you tried to join is full.");
            return;
        }

        const member: FriendsChatMember = {
            playerId: player.id,
            name: player.name || "Player",
            rank: memberRank,
            world: FRIENDS_CHAT_WORLD,
        };
        channel.members.set(player.id, member);
        this.playerChannel.set(player.id, ownerKey);

        const settings = this.ensureSettings(player);
        settings.lastJoined = channel.ownerDisplayName;
        player.friendsChatSettings = settings;

        this.sendFullUpdate(player.id, channel);
        this.broadcastIncremental(channel, member, player.id);

        this.options.sendGameMessage(
            player,
            `Now talking in friends chat channel ${channel.channelName}.`,
        );
    }

    leave(player: PlayerState, opts?: { silent?: boolean; kicked?: boolean }): void {
        const ownerKey = this.playerChannel.get(player.id);
        if (!ownerKey) {
            if (!opts?.silent) {
                this.sendLeave(player.id);
            }
            return;
        }
        const channel = this.channels.get(ownerKey);
        this.playerChannel.delete(player.id);
        if (!channel) {
            this.sendLeave(player.id);
            return;
        }

        const member = channel.members.get(player.id);
        channel.members.delete(player.id);
        this.sendLeave(player.id);

        if (member) {
            this.broadcastIncremental(
                channel,
                {
                    ...member,
                    rank: FRIENDS_CHAT_RANK_REMOVE,
                },
                player.id,
            );
        }

        if (channel.members.size === 0) {
            this.channels.delete(ownerKey);
        }

        if (!opts?.silent) {
            // Explicit leave or kick: don't auto-rejoin this channel on next login.
            const settings = this.ensureSettings(player);
            settings.lastJoined = null;
            player.friendsChatSettings = settings;
            this.options.sendGameMessage(
                player,
                opts?.kicked
                    ? "You have been kicked from the channel."
                    : "You have left the channel.",
            );
        }
    }

    handlePlayerLogout(player: PlayerState): void {
        this.pendingPrefixEdit.delete(player.id);
        this.leave(player, { silent: true });
    }

    /** Rejoin last channel after login if the player had one saved. */
    tryAutoRejoin(player: PlayerState): void {
        const lastJoined = player.friendsChatSettings?.lastJoined;
        if (!lastJoined || !lastJoined.trim()) return;
        this.join(player, lastJoined);
    }

    kick(kicker: PlayerState, targetNameRaw: string): void {
        const ownerKey = this.playerChannel.get(kicker.id);
        if (!ownerKey) {
            this.options.sendGameMessage(kicker, "You are not currently in a channel.");
            return;
        }
        const channel = this.channels.get(ownerKey);
        if (!channel) return;

        const kickerMember = channel.members.get(kicker.id);
        if (!kickerMember) return;
        if (kickerMember.rank < channel.kickRank) {
            this.options.sendGameMessage(
                kicker,
                "You do not have a high enough rank to kick from this channel.",
            );
            return;
        }

        const targetKey = normalizeName(targetNameRaw);
        let target: FriendsChatMember | undefined;
        for (const member of channel.members.values()) {
            if (normalizeName(member.name) === targetKey) {
                target = member;
                break;
            }
        }
        if (!target) {
            this.options.sendGameMessage(kicker, "Could not find that player in the channel.");
            return;
        }
        if (target.playerId === kicker.id) {
            this.options.sendGameMessage(kicker, "You cannot kick yourself.");
            return;
        }
        if (target.rank >= kickerMember.rank) {
            this.options.sendGameMessage(
                kicker,
                "You cannot kick a player of equal or higher rank.",
            );
            return;
        }

        const targetPlayer = this.options.getPlayerById(target.playerId);
        if (targetPlayer) {
            this.leave(targetPlayer, { kicked: true });
        } else {
            channel.members.delete(target.playerId);
            this.playerChannel.delete(target.playerId);
            this.broadcastIncremental(channel, {
                ...target,
                rank: FRIENDS_CHAT_RANK_REMOVE,
            });
            if (channel.members.size === 0) {
                this.channels.delete(ownerKey);
            }
        }
        this.options.sendGameMessage(kicker, `You have kicked ${target.name} from the channel.`);
    }

    setRank(owner: PlayerState, targetNameRaw: string, rankRaw: number): void {
        const ownerKey = normalizeName(owner.name ?? "");
        if (!ownerKey) return;

        const rank = clampRank(rankRaw, FRIENDS_CHAT_RANK_FRIEND);
        if (rank === FRIENDS_CHAT_RANK_OWNER) {
            this.options.sendGameMessage(owner, "You cannot assign the Owner rank.");
            return;
        }

        const settings = this.ensureSettings(owner);
        const targetKey = normalizeName(targetNameRaw);
        if (!targetKey) return;

        if (!settings.channelRanks) settings.channelRanks = {};
        if (rank <= FRIENDS_CHAT_RANK_FRIEND) {
            delete settings.channelRanks[targetKey];
        } else {
            settings.channelRanks[targetKey] = rank;
        }
        owner.friendsChatSettings = settings;

        const channel = this.channels.get(ownerKey);
        if (!channel) return;
        channel.channelRanks = this.mapFromRecord(settings.channelRanks);

        for (const member of channel.members.values()) {
            if (normalizeName(member.name) !== targetKey) continue;
            if (normalizeName(member.name) === ownerKey) continue;
            member.rank =
                settings.channelRanks[targetKey] !== undefined
                    ? settings.channelRanks[targetKey]!
                    : FRIENDS_CHAT_RANK_FRIEND;
            this.broadcastIncremental(channel, member);
            break;
        }
    }

    updateSettings(
        owner: PlayerState,
        opts: {
            channelName: string;
            enterRank: number;
            talkRank: number;
            kickRank: number;
        },
    ): void {
        const settings = this.ensureSettings(owner);
        const fallbackName = (owner.name || "Channel").slice(0, MAX_CHANNEL_NAME_LENGTH);
        // Empty channelName disables the prefix (OSRS "Disable").
        settings.channelName = resolveChannelName(opts.channelName, fallbackName);
        settings.enterRank = clampRank(opts.enterRank, FRIENDS_CHAT_RANK_ANYONE);
        settings.talkRank = clampRank(opts.talkRank, FRIENDS_CHAT_RANK_ANYONE);
        settings.kickRank = clampRank(opts.kickRank, FRIENDS_CHAT_RANK_OWNER);
        owner.friendsChatSettings = settings;
        this.syncLiveChannel(owner);
        this.options.sendGameMessage(owner, "Friends chat settings updated.");
    }

    beginPrefixEdit(player: PlayerState): void {
        this.pendingPrefixEdit.add(player.id);
    }

    /**
     * Consumes a resume_namedialog when the player was prompted for a channel prefix.
     * @returns true if the dialog was handled as a prefix edit
     */
    handlePrefixNameDialog(player: PlayerState, value: string): boolean {
        if (!this.pendingPrefixEdit.has(player.id)) return false;
        this.pendingPrefixEdit.delete(player.id);
        const settings = this.ensureSettings(player);
        const name = String(value ?? "").trim();
        settings.channelName = name
            ? clampChannelName(name, "")
            : "";
        player.friendsChatSettings = settings;
        this.syncLiveChannel(player);
        this.options.sendGameMessage(
            player,
            settings.channelName
                ? `Your channel prefix has been set to: ${settings.channelName}`
                : "Your channel prefix has been disabled.",
        );
        return true;
    }

    clearPendingPrefixEdit(playerId: number): void {
        this.pendingPrefixEdit.delete(playerId);
    }

    private syncLiveChannel(owner: PlayerState): void {
        const ownerKey = normalizeName(owner.name ?? "");
        const channel = this.channels.get(ownerKey);
        if (!channel) return;
        this.applyOwnerSettings(channel, owner);
        for (const memberId of channel.members.keys()) {
            this.sendFullUpdate(memberId, channel);
        }
    }

    handleChannelMessage(player: PlayerState, text: string): boolean {
        const ownerKey = this.playerChannel.get(player.id);
        if (!ownerKey) {
            this.options.sendGameMessage(
                player,
                "You are not currently in a friends chat channel.",
            );
            return true;
        }
        const channel = this.channels.get(ownerKey);
        if (!channel) {
            this.playerChannel.delete(player.id);
            this.options.sendGameMessage(
                player,
                "You are not currently in a friends chat channel.",
            );
            return true;
        }
        const member = channel.members.get(player.id);
        if (!member) return true;
        if (member.rank < channel.talkRank) {
            this.options.sendGameMessage(
                player,
                "You do not have a high enough rank to talk in this channel.",
            );
            return true;
        }

        const targets = Array.from(channel.members.keys());
        this.options.queueChannelChat({
            text,
            from: member.name,
            prefix: channel.channelName,
            playerId: player.id,
            targetPlayerIds: targets,
        });
        return true;
    }

    getChannelMemberIds(playerId: number): number[] | undefined {
        const ownerKey = this.playerChannel.get(playerId);
        if (!ownerKey) return undefined;
        const channel = this.channels.get(ownerKey);
        if (!channel) return undefined;
        return Array.from(channel.members.keys());
    }

    private createChannel(
        ownerKey: string,
        ownerDisplayName: string,
        settings: FriendsChatPersistentSettings,
        ownerPlayer?: PlayerState,
    ): FriendsChatChannel {
        const display =
            ownerPlayer?.name ||
            ownerDisplayName.trim() ||
            ownerKey;
        return {
            ownerKey,
            ownerDisplayName: display,
            channelName: resolveChannelName(
                settings.channelName,
                display.slice(0, MAX_CHANNEL_NAME_LENGTH),
            ),
            enterRank: clampRank(settings.enterRank ?? FRIENDS_CHAT_RANK_ANYONE, FRIENDS_CHAT_RANK_ANYONE),
            talkRank: clampRank(settings.talkRank ?? FRIENDS_CHAT_RANK_ANYONE, FRIENDS_CHAT_RANK_ANYONE),
            kickRank: clampRank(settings.kickRank ?? FRIENDS_CHAT_RANK_OWNER, FRIENDS_CHAT_RANK_OWNER),
            members: new Map(),
            channelRanks: this.mapFromRecord(settings.channelRanks),
        };
    }

    private applyOwnerSettings(channel: FriendsChatChannel, owner: PlayerState): void {
        const settings = this.ensureSettings(owner);
        channel.ownerDisplayName = owner.name || channel.ownerDisplayName;
        channel.channelName = resolveChannelName(
            settings.channelName,
            channel.ownerDisplayName.slice(0, MAX_CHANNEL_NAME_LENGTH),
        );
        channel.enterRank = clampRank(
            settings.enterRank ?? FRIENDS_CHAT_RANK_ANYONE,
            FRIENDS_CHAT_RANK_ANYONE,
        );
        channel.talkRank = clampRank(
            settings.talkRank ?? FRIENDS_CHAT_RANK_ANYONE,
            FRIENDS_CHAT_RANK_ANYONE,
        );
        channel.kickRank = clampRank(
            settings.kickRank ?? FRIENDS_CHAT_RANK_OWNER,
            FRIENDS_CHAT_RANK_OWNER,
        );
        channel.channelRanks = this.mapFromRecord(settings.channelRanks);
    }

    private resolveMemberRank(
        channel: FriendsChatChannel,
        player: PlayerState,
        isOwner: boolean,
    ): number {
        if (isOwner) return FRIENDS_CHAT_RANK_OWNER;
        const key = normalizeName(player.name ?? "");
        const ranked = channel.channelRanks.get(key);
        if (ranked !== undefined) return ranked;
        return FRIENDS_CHAT_RANK_FRIEND;
    }

    private defaultSettings(ownerName: string): FriendsChatPersistentSettings {
        return {
            channelName: ownerName.trim().slice(0, MAX_CHANNEL_NAME_LENGTH),
            enterRank: FRIENDS_CHAT_RANK_ANYONE,
            talkRank: FRIENDS_CHAT_RANK_ANYONE,
            kickRank: FRIENDS_CHAT_RANK_OWNER,
            channelRanks: {},
        };
    }

    private readSettings(player: PlayerState | undefined): FriendsChatPersistentSettings | undefined {
        if (!player) return undefined;
        return this.ensureSettings(player);
    }

    private ensureSettings(player: PlayerState): FriendsChatPersistentSettings {
        if (!player.friendsChatSettings) {
            player.friendsChatSettings = this.defaultSettings(player.name || "Channel");
        }
        if (!player.friendsChatSettings.channelRanks) {
            player.friendsChatSettings.channelRanks = {};
        }
        return player.friendsChatSettings;
    }

    private mapFromRecord(record?: Record<string, number>): Map<string, number> {
        const map = new Map<string, number>();
        if (!record) return map;
        for (const [key, value] of Object.entries(record)) {
            const nKey = normalizeName(key);
            if (!nKey) continue;
            map.set(nKey, clampRank(value, FRIENDS_CHAT_RANK_FRIEND));
        }
        return map;
    }

    private buildFullPayload(channel: FriendsChatChannel): FriendsChatServerPayload {
        return {
            kind: "full",
            owner: channel.ownerDisplayName,
            channelName: channel.channelName,
            minKick: channel.kickRank,
            members: Array.from(channel.members.values()).map((m) => ({
                name: m.name,
                world: m.world,
                rank: m.rank,
            })),
        };
    }

    private sendFullUpdate(playerId: number, channel: FriendsChatChannel): void {
        this.options.sendUpdate(playerId, this.buildFullPayload(channel));
    }

    private sendLeave(playerId: number): void {
        this.options.sendUpdate(playerId, { kind: "leave" });
    }

    private broadcastIncremental(
        channel: FriendsChatChannel,
        member: FriendsChatMember,
        exceptPlayerId?: number,
    ): void {
        const payload: FriendsChatServerPayload = {
            kind: "incremental",
            name: member.name,
            world: member.world,
            rank: member.rank,
        };
        for (const id of channel.members.keys()) {
            if (exceptPlayerId !== undefined && id === exceptPlayerId) continue;
            this.options.sendUpdate(id, payload);
        }
    }
}
