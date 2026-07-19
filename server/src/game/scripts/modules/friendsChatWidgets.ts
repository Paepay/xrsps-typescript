import {
    FRIENDS_CHAT_RANK_ANYONE,
    FRIENDS_CHAT_RANK_FRIEND,
    FRIENDS_CHAT_RANK_OWNER,
    type FriendsChatPersistentSettings,
} from "../../social/FriendsChatService";
import type { ScriptModule, ScriptServices, WidgetActionEvent } from "../types";

/**
 * Friends Chat (Chat-channel) widget handlers.
 *
 * OSRS parity:
 * - Tab 7 Setup (child 20) is IF_BUTTON-only (CS2 only plays opsound) → server opens 94
 * - Interface 94 settings (prefix / enter / talk / kick) are IF_BUTTON → FriendsChatService
 * - Per-friend ranks use CS2 friend_setrank → packet 198 (already wired)
 */

const CHATCHANNEL_CURRENT_GROUP_ID = 7;
const CHATCHANNEL_SETUP_GROUP_ID = 94;

const COMP_SETUP = 20;
const COMP_OPT_PREFIX = 10;
const COMP_OPT_ENTER = 13;
const COMP_OPT_TALK = 16;
const COMP_OPT_KICK = 19;

/** meslayer_mode8 — name input that resumes via resume_namedialog */
const SCRIPT_MESLAYER_MODE8 = 109;

/** Op index (1-based) → friends-chat rank for enter/talk (and kick ops 4–9). */
const ENTER_TALK_RANK_BY_OP: Record<number, number> = {
    1: FRIENDS_CHAT_RANK_ANYONE, // Anyone
    2: FRIENDS_CHAT_RANK_FRIEND, // Any friends
    3: 0, // Recruit+
    4: 1, // Corporal+
    5: 2, // Sergeant+
    6: 3, // Lieutenant+
    7: 4, // Captain+
    8: 5, // General+
    9: FRIENDS_CHAT_RANK_OWNER, // Only me
};

const RANK_LABEL: Record<number, string> = {
    [FRIENDS_CHAT_RANK_ANYONE]: "Anyone",
    [FRIENDS_CHAT_RANK_FRIEND]: "Any friends",
    0: "Recruit+",
    1: "Corporal+",
    2: "Sergeant+",
    3: "Lieutenant+",
    4: "Captain+",
    5: "General+",
    [FRIENDS_CHAT_RANK_OWNER]: "Only me",
};

function setComponentText(
    services: Pick<ScriptServices, "queueWidgetEvent">,
    playerId: number,
    groupId: number,
    componentId: number,
    text: string,
): void {
    services.queueWidgetEvent?.(playerId, {
        action: "set_text",
        uid: (groupId << 16) | (componentId & 0xffff),
        text,
    });
}

export function refreshFriendsChatSetupLabels(
    queueWidgetEvent: (playerId: number, event: { action: "set_text"; uid: number; text: string }) => void,
    playerId: number,
    settings: FriendsChatPersistentSettings,
): void {
    refreshSetupLabels(
        { queueWidgetEvent: queueWidgetEvent as ScriptServices["queueWidgetEvent"] },
        playerId,
        settings,
    );
}

function refreshSetupLabels(
    services: Pick<ScriptServices, "queueWidgetEvent">,
    playerId: number,
    settings: FriendsChatPersistentSettings,
): void {
    const prefix = (settings.channelName ?? "").trim();
    setComponentText(
        services,
        playerId,
        CHATCHANNEL_SETUP_GROUP_ID,
        COMP_OPT_PREFIX,
        prefix || "Chat disabled",
    );
    setComponentText(
        services,
        playerId,
        CHATCHANNEL_SETUP_GROUP_ID,
        COMP_OPT_ENTER,
        RANK_LABEL[settings.enterRank ?? FRIENDS_CHAT_RANK_ANYONE] ?? "Anyone",
    );
    setComponentText(
        services,
        playerId,
        CHATCHANNEL_SETUP_GROUP_ID,
        COMP_OPT_TALK,
        RANK_LABEL[settings.talkRank ?? FRIENDS_CHAT_RANK_ANYONE] ?? "Anyone",
    );
    setComponentText(
        services,
        playerId,
        CHATCHANNEL_SETUP_GROUP_ID,
        COMP_OPT_KICK,
        RANK_LABEL[settings.kickRank ?? FRIENDS_CHAT_RANK_OWNER] ?? "Only me",
    );
}

function openSetup(player: WidgetActionEvent["player"], services: ScriptServices): void {
    services.openModal?.(player, CHATCHANNEL_SETUP_GROUP_ID);
    const settings = services.friendsChatGetSettings?.(player);
    if (settings) {
        refreshSetupLabels(services, player.id, settings);
    }
    services.logger?.info?.(`[friends-chat] Opened setup for player=${player.id}`);
}

function applySettingsPatch(
    event: WidgetActionEvent,
    patch: Partial<{
        channelName: string;
        enterRank: number;
        talkRank: number;
        kickRank: number;
    }>,
): void {
    const { player, services } = event;
    const current = services.friendsChatGetSettings?.(player);
    if (!current || !services.friendsChatUpdateSettings) return;

    const next = {
        channelName: current.channelName ?? "",
        enterRank: current.enterRank ?? FRIENDS_CHAT_RANK_ANYONE,
        talkRank: current.talkRank ?? FRIENDS_CHAT_RANK_ANYONE,
        kickRank: current.kickRank ?? FRIENDS_CHAT_RANK_OWNER,
        ...patch,
    };
    services.friendsChatUpdateSettings(player, next);
    refreshSetupLabels(services, player.id, next);
}

function handleRankOption(
    event: WidgetActionEvent,
    field: "enterRank" | "talkRank" | "kickRank",
): void {
    const opId = event.opId ?? 1;
    const rank = ENTER_TALK_RANK_BY_OP[opId];
    if (rank === undefined) return;
    // Kick widget has empty actions for ops 1–3 (flags 0x3f0).
    if (field === "kickRank" && opId < 4) return;
    applySettingsPatch(event, { [field]: rank });
}

function handlePrefixOption(event: WidgetActionEvent): void {
    const { player, services } = event;
    const opId = event.opId ?? 1;
    if (opId === 2) {
        // Disable
        applySettingsPatch(event, { channelName: "" });
        return;
    }
    if (opId !== 1) return;

    // Set prefix → meslayer name dialog (resume_namedialog)
    services.friendsChatBeginPrefixEdit?.(player);
    services.queueClientScript?.(
        player.id,
        SCRIPT_MESLAYER_MODE8,
        "Enter chat prefix:",
    );
}

export const friendsChatWidgetsModule: ScriptModule = {
    id: "content.friends-chat-widgets",
    register(registry, _services) {
        registry.onButton(CHATCHANNEL_CURRENT_GROUP_ID, COMP_SETUP, ({ player, services }) => {
            openSetup(player, services);
        });

        registry.onButton(CHATCHANNEL_SETUP_GROUP_ID, COMP_OPT_PREFIX, (event) => {
            handlePrefixOption(event);
        });

        registry.onButton(CHATCHANNEL_SETUP_GROUP_ID, COMP_OPT_ENTER, (event) => {
            handleRankOption(event, "enterRank");
        });

        registry.onButton(CHATCHANNEL_SETUP_GROUP_ID, COMP_OPT_TALK, (event) => {
            handleRankOption(event, "talkRank");
        });

        registry.onButton(CHATCHANNEL_SETUP_GROUP_ID, COMP_OPT_KICK, (event) => {
            handleRankOption(event, "kickRank");
        });
    },
};
