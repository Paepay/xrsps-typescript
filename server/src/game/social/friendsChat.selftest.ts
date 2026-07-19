/**
 * Friends chat service selftest (join / leave / kick / channel message / persistence).
 * Run: npx tsx server/src/game/social/friendsChat.selftest.ts
 */
import fs from "fs";
import os from "os";
import path from "path";

import type { FriendsChatServerPayload } from "../../network/messages";
import type { PlayerState } from "../player";
import { PlayerPersistence } from "../state/PlayerPersistence";
import {
    FRIENDS_CHAT_RANK_OWNER,
    FRIENDS_CHAT_RANK_REMOVE,
    FriendsChatService,
} from "./FriendsChatService";

function mockPlayer(id: number, name: string): PlayerState {
    return {
        id,
        name,
        friendsChatSettings: undefined,
        exportPersistentVars() {
            const snapshot: Record<string, unknown> = {};
            if (this.friendsChatSettings) {
                const fc = { ...this.friendsChatSettings };
                if (this.friendsChatSettings.channelRanks) {
                    fc.channelRanks = { ...this.friendsChatSettings.channelRanks };
                }
                snapshot.friendsChat = fc;
            }
            return snapshot;
        },
        applyPersistentVars(state?: { friendsChat?: PlayerState["friendsChatSettings"] }) {
            if (state?.friendsChat) {
                this.friendsChatSettings = {
                    ...state.friendsChat,
                    channelRanks: state.friendsChat.channelRanks
                        ? { ...state.friendsChat.channelRanks }
                        : {},
                };
            } else {
                this.friendsChatSettings = undefined;
            }
        },
    } as unknown as PlayerState;
}

function assert(cond: unknown, msg: string): void {
    if (!cond) throw new Error(msg);
}

function main(): void {
    const updates: Array<{ playerId: number; payload: FriendsChatServerPayload }> = [];
    const gameMessages: Array<{ playerId: number; text: string }> = [];
    const channelChats: Array<{ text: string; targets: number[] }> = [];

    const alice = mockPlayer(1, "Alice");
    const bob = mockPlayer(2, "Bob");
    const byId = new Map<number, PlayerState>([
        [1, alice],
        [2, bob],
    ]);
    const byName = new Map<string, PlayerState>([
        ["alice", alice],
        ["bob", bob],
    ]);

    const service = new FriendsChatService({
        getPlayerById: (id) => byId.get(id),
        getPlayerByName: (name) => byName.get(name.trim().toLowerCase()),
        sendUpdate: (playerId, payload) => updates.push({ playerId, payload }),
        sendGameMessage: (player, text) => gameMessages.push({ playerId: player.id, text }),
        queueChannelChat: (opts) =>
            channelChats.push({ text: opts.text, targets: opts.targetPlayerIds }),
    });

    service.handleJoinLeave(alice, "Alice");
    assert(
        updates.some((u) => u.playerId === 1 && u.payload.kind === "full"),
        "Alice should receive full update",
    );
    const aliceFull = updates.find((u) => u.playerId === 1 && u.payload.kind === "full");
    assert(aliceFull && aliceFull.payload.kind === "full", "full payload");
    if (aliceFull && aliceFull.payload.kind === "full") {
        assert(aliceFull.payload.members.length === 1, "Alice alone in channel");
        assert(aliceFull.payload.members[0]!.rank === FRIENDS_CHAT_RANK_OWNER, "Alice is owner");
    }

    updates.length = 0;
    service.handleJoinLeave(bob, "alice");
    assert(
        updates.some((u) => u.playerId === 2 && u.payload.kind === "full"),
        "Bob receives full update",
    );
    assert(
        updates.some(
            (u) =>
                u.playerId === 1 &&
                u.payload.kind === "incremental" &&
                u.payload.name === "Bob",
        ),
        "Alice gets Bob incremental join",
    );

    service.handleChannelMessage(bob, "hello channel");
    assert(channelChats.length === 1, "one channel chat");
    assert(channelChats[0]!.text === "hello channel", "chat text");
    assert(
        channelChats[0]!.targets.includes(1) && channelChats[0]!.targets.includes(2),
        "both members targeted",
    );

    updates.length = 0;
    gameMessages.length = 0;
    service.kick(alice, "Bob");
    assert(
        updates.some((u) => u.playerId === 2 && u.payload.kind === "leave"),
        "Bob receives leave",
    );
    assert(
        updates.some(
            (u) =>
                u.playerId === 1 &&
                u.payload.kind === "incremental" &&
                u.payload.rank === FRIENDS_CHAT_RANK_REMOVE,
        ),
        "Alice sees Bob removed",
    );
    assert(
        gameMessages.some((m) => m.playerId === 2 && m.text.includes("kicked")),
        "Bob kicked game message",
    );

    updates.length = 0;
    service.handleJoinLeave(alice, "");
    assert(
        updates.some((u) => u.playerId === 1 && u.payload.kind === "leave"),
        "Alice leave update",
    );

    // Persistence round-trip: logout save → restart load via mergeStates
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "friends-chat-persist-"));
    const storePath = path.join(tmpDir, "player-state.json");
    try {
        const persistence = new PlayerPersistence({ dataDir: tmpDir, storePath });
        const owner = mockPlayer(10, "Owner");
        owner.friendsChatSettings = {
            channelName: "MyClan",
            enterRank: -2,
            talkRank: -1,
            kickRank: 7,
            lastJoined: "Owner",
            channelRanks: { bob: 1 },
        };
        persistence.saveSnapshot("owner", owner);

        const reloaded = new PlayerPersistence({ dataDir: tmpDir, storePath });
        const restored = mockPlayer(11, "Owner");
        reloaded.applyToPlayer(restored, "owner");
        assert(restored.friendsChatSettings?.channelName === "MyClan", "channel name restored");
        assert(restored.friendsChatSettings?.talkRank === -1, "talk rank restored");
        assert(restored.friendsChatSettings?.kickRank === 7, "kick rank restored");
        assert(restored.friendsChatSettings?.lastJoined === "Owner", "lastJoined restored");
        assert(restored.friendsChatSettings?.channelRanks?.bob === 1, "member rank restored");

        const offline = reloaded.getFriendsChatSettings("Owner");
        assert(offline?.channelName === "MyClan", "offline owner settings readable");

        const guest = mockPlayer(12, "Guest");
        const offlineUpdates: FriendsChatServerPayload[] = [];
        const verifyService = new FriendsChatService({
            getPlayerById: (id) => (id === 12 ? guest : undefined),
            getPlayerByName: () => undefined,
            getOfflineOwnerSettings: (name) => reloaded.getFriendsChatSettings(name),
            sendUpdate: (_id, payload) => offlineUpdates.push(payload),
            sendGameMessage: () => {},
            queueChannelChat: () => {},
        });
        verifyService.handleJoinLeave(guest, "Owner");
        const full = offlineUpdates.find((p) => p.kind === "full");
        assert(
            full && full.kind === "full" && full.channelName === "MyClan",
            "offline settings apply to new channel",
        );
        assert(full && full.kind === "full" && full.minKick === 7, "offline kick rank applies");
    } finally {
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            /* ignore */
        }
    }

    console.log("[friendsChat.selftest] ok");
}

main();
