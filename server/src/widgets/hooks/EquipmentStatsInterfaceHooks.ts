/**
 * EquipmentStatsInterfaceHooks - Equipment stats interface lifecycle hooks
 *
 * Based on RSMod's equipment_stats.plugin.kts pattern.
 * Registers on_interface_open / on_interface_close hooks for the equipment stats interface.
 *
 * Flow:
 * 1. Equipment stats opens (84) -> Equipment inventory (85) opens in sidemodal
 * 2. IF_SETEVENTS enable Remove on worn slots and Equip on inventory slots
 * 3. Equipment stats closes (84) -> Equipment inventory (85) closes
 *
 * Usage:
 * ```ts
 * const interfaceService = new InterfaceService(dispatcher);
 * registerEquipmentStatsInterfaceHooks(interfaceService);
 * interfaceService.openModal(player, EQUIPMENT_STATS_INTERFACE_ID);
 * ```
 */
import {
    INVENTORY_FLAGS,
    PLAYER_INV_ID,
    SCRIPT_INTERFACE_INV_INIT,
    type InterfaceService,
} from "../InterfaceService";

// Equipment stats interface (main screen showing bonuses)
const EQUIPMENT_STATS_INTERFACE_ID = 84;

// Equipment inventory interface (sidemodal with inventory for equipping)
const EQUIPMENT_INVENTORY_INTERFACE_ID = 85;

// Equipment inventory container component (85:0)
const EQUIPMENT_INVENTORY_COMPONENT = 0;

// Worn slot components on the stats view (84:10-20)
const EQUIPMENT_STATS_SLOT_START = 10;
const EQUIPMENT_STATS_SLOT_END = 20;

// Flags: 62 = transmit ops 1-5 (Remove, etc.) — same as worn equipment tab (387)
const EQUIPMENT_SLOT_FLAGS = 62;

// Script 151 - extended interface inv init (9 op strings)
const SCRIPT_INTERFACE_INV_INIT_EXT = 151;

// Varbit for equipment stats open state
const VARBIT_EQUIPMENT_STATS_OPEN = 12393;

const EQUIPMENT_INVENTORY_WIDGET_UID =
    (EQUIPMENT_INVENTORY_INTERFACE_ID << 16) | EQUIPMENT_INVENTORY_COMPONENT;

/**
 * Register equipment stats interface hooks with the InterfaceService.
 * Should be called once at server startup.
 *
 * @param interfaceService The InterfaceService to register hooks with
 */
export function registerEquipmentStatsInterfaceHooks(interfaceService: InterfaceService): void {
    // =============== ON EQUIPMENT STATS OPEN ===============
    interfaceService.onInterfaceOpen(EQUIPMENT_STATS_INTERFACE_ID, (player, ctx) => {
        // 1. Mark equipment stats open for CS2
        ctx.service.setVarbit(player, VARBIT_EQUIPMENT_STATS_OPEN, 1);

        // 2. IF_SETEVENTS for worn slots on the stats view (static widgets, childIndex=-1)
        for (let comp = EQUIPMENT_STATS_SLOT_START; comp <= EQUIPMENT_STATS_SLOT_END; comp++) {
            const uid = (EQUIPMENT_STATS_INTERFACE_ID << 16) | comp;
            ctx.service.setWidgetFlags(player, uid, -1, -1, EQUIPMENT_SLOT_FLAGS);
        }

        // 3. Open equipment inventory sidemodal (85) with Equip ops + transmit flags
        ctx.service.openSidemodal(player, {
            interfaceId: EQUIPMENT_INVENTORY_INTERFACE_ID,
            setFlags: {
                uid: EQUIPMENT_INVENTORY_WIDGET_UID,
                fromSlot: 0,
                toSlot: 27,
                flags: INVENTORY_FLAGS,
            },
        });

        // 4. Initialize inventory ops (script 149 / 151) — Equip as op1
        ctx.service.runScript(player, SCRIPT_INTERFACE_INV_INIT, [
            EQUIPMENT_INVENTORY_WIDGET_UID,
            PLAYER_INV_ID,
            4,
            7,
            1,
            -1,
            "Equip",
            "",
            "",
            "",
            "",
        ]);
        ctx.service.runScript(player, SCRIPT_INTERFACE_INV_INIT_EXT, [
            EQUIPMENT_INVENTORY_WIDGET_UID,
            PLAYER_INV_ID,
            4,
            7,
            1,
            -1,
            "Equip",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
        ]);
    });

    // =============== ON EQUIPMENT STATS CLOSE ===============
    // When the main equipment stats interface (84) closes, also close the
    // equipment inventory sidemodal (85) and clear the open-state varbit.
    interfaceService.onInterfaceClose(EQUIPMENT_STATS_INTERFACE_ID, (player, ctx) => {
        ctx.service.setVarbit(player, VARBIT_EQUIPMENT_STATS_OPEN, 0);

        if (ctx.service.getCurrentSidemodal(player) === EQUIPMENT_INVENTORY_INTERFACE_ID) {
            ctx.service.closeSidemodal(player);
        }
    });
}
