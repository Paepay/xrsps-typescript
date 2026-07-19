import { ScriptVarTypeId } from "../../../../../src/rs/config/db/ScriptVarType";
import { BaseComponentUids } from "../../../widgets/viewport/ViewportEnumService";
import {
    findQuestCompletionByDisplayName,
    isQuestCompleteForPlayer,
} from "../../quests/questCompletions";
import type { PlayerState } from "../../player";
import type { ScriptModule, ScriptServices } from "../types";

// ============================================================================
// Constants
// ============================================================================

/** Quest list interface group (side journal quest tab content) */
const QUEST_LIST_GROUP_ID = 399;
/** Dynamic list component inside quest list interface */
const QUEST_LIST_COMPONENT = 7;

/** Quest journal overlay interface */
const QUEST_JOURNAL_GROUP_ID = 119;
/** Title component: questjournal:title */
const QJ_TITLE_CHILD = 5;
/** Close button component: questjournal:close */
const QJ_CLOSE_CHILD = 8;
/** Switch View button component: questjournal:switch */
const QJ_SWITCH_VIEW_CHILD = 9;
/** First journal line component: questjournal:qj1 */
const QJ_FIRST_LINE_CHILD = 11;

/** Varp: currently viewed quest (stores dbrow ID) */
const VARP_LATEST_QUEST_JOURNAL = 3679;
/** Varp: number of journal text lines */
const VARP_QJ_LINES = 4398;

/** CS2 script that clears all quest journal text fields */
const SCRIPT_QUEST_JOURNAL_RESET = 5240;
/** CS2 script that sets up quest journal scrollbar */
const SCRIPT_QUEST_JOURNAL_SCROLL = 2523;

/** OP ID for "Read journal:" right-click option */
const OP_READ_JOURNAL = 2;

// Quest DB table ID in the cache
const QUEST_DB_TABLE_ID = 0;

// ============================================================================
// Quest data structures
// ============================================================================

interface QuestEntry {
    questId: number;
    dbrowId: number;
    displayName: string;
}

// ============================================================================
// Quest map builder
// ============================================================================

/**
 * Build a mapping from quest ID (used as dynamic child index in the quest list)
 * to quest data (dbrow ID, display name) by reading the cache DB table 0.
 *
 * The CS2 questlist_draw script iterates quest IDs 1..N and calls
 * db_find(quest:id, N) to get the dbrow for each quest. The dynamic child
 * index in the quest list equals the quest ID.
 */
function buildQuestMap(services: ScriptServices): Map<number, QuestEntry> {
    const map = new Map<number, QuestEntry>();
    const dbRepo = services.getDbRepository?.();
    if (!dbRepo) return map;

    const rows = dbRepo.getRows(QUEST_DB_TABLE_ID);
    if (rows.length === 0) return map;

    const tableDef = dbRepo.getTables().get(QUEST_DB_TABLE_ID);
    if (!tableDef) return map;

    // Discover quest:id column (first single-value INTEGER column)
    // and quest:displayname column (first single-value STRING column)
    let idColumnId = -1;
    let nameColumnId = -1;

    for (const [colId, colDef] of tableDef.columns) {
        if (colDef.types.length !== 1) continue;
        if (colDef.types[0] === ScriptVarTypeId.INTEGER && idColumnId === -1) {
            idColumnId = colId;
        }
        if (colDef.types[0] === ScriptVarTypeId.STRING && nameColumnId === -1) {
            nameColumnId = colId;
        }
    }

    if (idColumnId === -1 || nameColumnId === -1) {
        services.logger?.warn?.(
            `[quest-journal] Could not discover quest DB columns: id=${idColumnId} name=${nameColumnId}`,
        );
        return map;
    }

    for (const row of rows) {
        const idCol = row.getColumn(idColumnId);
        const nameCol = row.getColumn(nameColumnId);

        const questId = idCol?.values?.[0];
        const displayName = nameCol?.values?.[0];

        if (typeof questId === "number" && questId > 0 && typeof displayName === "string") {
            map.set(questId, {
                questId,
                dbrowId: row.id,
                displayName,
            });
        }
    }

    services.logger?.info?.(
        `[quest-journal] Loaded ${map.size} quests from cache DB table ${QUEST_DB_TABLE_ID}`,
    );
    return map;
}

// ============================================================================
// Journal text generation
// ============================================================================

/**
 * Build journal lines for a quest based on its completion status.
 *
 * In OSRS, each quest has unique server-side scripts that generate journal
 * text per progress stage. For our implementation, we check the quest's
 * progress varp against its completion value to determine basic status.
 */
function buildJournalLines(player: PlayerState, quest: QuestEntry): string[] {
    const completionEntry = findQuestCompletionByDisplayName(quest.displayName);
    if (completionEntry && isQuestCompleteForPlayer(player, completionEntry)) {
        return [
            "<str>I have completed this quest.",
            "",
            "<col=ff0000>QUEST COMPLETE!",
        ];
    }

    // Not started (default state)
    return [
        "I should read the quest overview for",
        "more information on how to start",
        "this quest.",
    ];
}

// ============================================================================
// Module
// ============================================================================

export const questJournalWidgetsModule: ScriptModule = {
    id: "content.quest-journal-widgets",
    register(registry, services) {
        // Lazy-loaded quest map: the DbRepository is not available at module registration
        // time (scripts bootstrap before cache DB is initialized). Build on first click.
        let questMap: Map<number, QuestEntry> | undefined;

        const getQuestMap = (): Map<number, QuestEntry> => {
            if (!questMap) {
                questMap = buildQuestMap(services);
            }
            return questMap;
        };

        // Handle quest list clicks (399:7)
        // Dynamic children use the quest ID as their child index.
        // The slot value in the widget action corresponds to this quest ID.
        registry.onButton(QUEST_LIST_GROUP_ID, QUEST_LIST_COMPONENT, (event) => {
            const { player, slot, opId } = event;

            if (opId !== OP_READ_JOURNAL) return;

            const questId = slot;
            if (questId === undefined || questId <= 0) return;

            const quest = getQuestMap().get(questId);
            if (!quest) {
                services.logger?.info?.(
                    `[quest-journal] No quest found for slot=${questId}`,
                );
                return;
            }

            openQuestJournal(player, quest, services);
        });

        // Handle quest journal Close button (119:8)
        registry.onButton(QUEST_JOURNAL_GROUP_ID, QJ_CLOSE_CHILD, (event) => {
            const floaterUid = BaseComponentUids.MAINMODAL_BACKGROUNDS;
            services.closeSubInterface?.(event.player, floaterUid, QUEST_JOURNAL_GROUP_ID);
        });

        // Handle quest journal Switch View button (119:9)
        // Toggles between journal text and quest overview
        registry.onButton(QUEST_JOURNAL_GROUP_ID, QJ_SWITCH_VIEW_CHILD, (event) => {
            const { player } = event;
            const dbrowId = player.getVarpValue(VARP_LATEST_QUEST_JOURNAL);
            if (dbrowId <= 0) return;

            // Look up quest name from the map for the overview title
            const map = getQuestMap();
            let questName = "Quest";
            for (const entry of map.values()) {
                if (entry.dbrowId === dbrowId) {
                    questName = entry.displayName;
                    break;
                }
            }

            // Re-open journal with overview text
            const floaterUid = BaseComponentUids.MAINMODAL_BACKGROUNDS;
            services.openSubInterface?.(player, floaterUid, QUEST_JOURNAL_GROUP_ID, 0);

            services.queueWidgetEvent?.(player.id, {
                action: "run_script",
                scriptId: SCRIPT_QUEST_JOURNAL_RESET,
                args: [],
            });

            const titleUid = (QUEST_JOURNAL_GROUP_ID << 16) | QJ_TITLE_CHILD;
            services.queueWidgetEvent?.(player.id, {
                action: "set_text",
                uid: titleUid,
                text: `<col=7f0000>${questName}</col>`,
            });

            const lineUid = (QUEST_JOURNAL_GROUP_ID << 16) | QJ_FIRST_LINE_CHILD;
            services.queueWidgetEvent?.(player.id, {
                action: "set_text",
                uid: lineUid,
                text: "Quest overview not yet available.",
            });

            services.queueWidgetEvent?.(player.id, {
                action: "run_script",
                scriptId: SCRIPT_QUEST_JOURNAL_SCROLL,
                args: [0, 1],
            });
        });
    },
};

// ============================================================================
// Quest journal opening
// ============================================================================

/**
 * Open the quest journal overlay for a specific quest.
 *
 * Client parity note: Unlike OSRS where widget state persists across open/close,
 * this client only resolves set_text for widgets that are currently loaded.
 * Therefore we must open the interface FIRST, then set text and run scripts.
 *
 * Flow:
 * 1. Set varps (latest_quest_journal, qj_lines)
 * 2. Open interface 119 as overlay (loads widgets)
 * 3. Run quest_journal_reset to clear stale text
 * 4. Set title and journal line text
 * 5. Run scroll configuration script
 */
function openQuestJournal(
    player: PlayerState,
    quest: QuestEntry,
    services: ScriptServices,
): void {
    const lines = buildJournalLines(player, quest);
    const lineCount = lines.length;
    const playerId = player.id;

    // 1. Set varps (sent before widget events in broadcast order)
    player.setVarpValue(VARP_LATEST_QUEST_JOURNAL, quest.dbrowId);
    services.sendVarp?.(player, VARP_LATEST_QUEST_JOURNAL, quest.dbrowId);
    player.setVarpValue(VARP_QJ_LINES, lineCount);
    services.sendVarp?.(player, VARP_QJ_LINES, lineCount);

    // 2. Open quest journal interface on the floater container.
    // Use type=0 (modal) so PlayerWidgetManager tracks it and closeInterruptibleInterfaces
    // closes it on walk/interaction, matching OSRS behavior where the journal dismisses on move.
    const floaterUid = BaseComponentUids.MAINMODAL_BACKGROUNDS;
    services.openSubInterface?.(player, floaterUid, QUEST_JOURNAL_GROUP_ID, 0);

    // 2b. Enable transmit flags on Close (119:8) and Switch View (119:9) buttons.
    // Static widgets use fromSlot=-1, toSlot=-1.
    const OP1_TRANSMIT = 1 << 1; // transmit op1
    for (const childId of [QJ_CLOSE_CHILD, QJ_SWITCH_VIEW_CHILD]) {
        services.queueWidgetEvent?.(playerId, {
            action: "set_flags_range",
            uid: (QUEST_JOURNAL_GROUP_ID << 16) | childId,
            fromSlot: -1,
            toSlot: -1,
            flags: OP1_TRANSMIT,
        });
    }

    // 3. Clear stale journal line text
    services.queueWidgetEvent?.(playerId, {
        action: "run_script",
        scriptId: SCRIPT_QUEST_JOURNAL_RESET,
        args: [],
    });

    // 4. Set title text
    const titleUid = (QUEST_JOURNAL_GROUP_ID << 16) | QJ_TITLE_CHILD;
    services.queueWidgetEvent?.(playerId, {
        action: "set_text",
        uid: titleUid,
        text: `<col=7f0000>${quest.displayName}</col>`,
    });

    // 5. Set journal line text
    for (let i = 0; i < lineCount; i++) {
        const lineUid = (QUEST_JOURNAL_GROUP_ID << 16) | (QJ_FIRST_LINE_CHILD + i);
        services.queueWidgetEvent?.(playerId, {
            action: "set_text",
            uid: lineUid,
            text: lines[i],
        });
    }

    // 6. Run scroll configuration script
    services.queueWidgetEvent?.(playerId, {
        action: "run_script",
        scriptId: SCRIPT_QUEST_JOURNAL_SCROLL,
        args: [0, lineCount],
    });

    services.logger?.info?.(
        `[quest-journal] Opened journal for player=${playerId} quest="${quest.displayName}" (id=${quest.questId}, dbrow=${quest.dbrowId}) lines=${lineCount}`,
    );
}
