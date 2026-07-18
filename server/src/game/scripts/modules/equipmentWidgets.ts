import type { ScriptModule, ScriptServices } from "../types";

/**
 * Equipment widget handlers for equipment interfaces.
 *
 * Uses onButton registration since binary IF_BUTTON packets don't send option strings.
 * Component IDs from OSRS cache:
 * - 387:1 = "View equipment stats" button
 * - 387:7 = "Call follower" button
 *
 * The equipment stats interface (84) opens alongside equipment inventory (85).
 * Opening is owned by InterfaceService + EquipmentStatsInterfaceHooks (IF_SETEVENTS,
 * sidemodal 85, inv init scripts). This module:
 * 1. Opens equipment stats via InterfaceService.openModal
 * 2. Handles Remove on worn equipment tab (387) and stats view (84)
 * 3. Handles Equip clicks from equipment inventory (85)
 */

// Equipment tab interface
const EQUIPMENT_TAB_GROUP_ID = 387;

// Equipment stats interface (main screen showing bonuses)
const EQUIPMENT_STATS_INTERFACE_ID = 84;

// Equipment inventory interface (sidemodal with inventory for equipping)
const EQUIPMENT_INVENTORY_INTERFACE_ID = 85;

// Component IDs
const VIEW_EQUIPMENT_STATS_COMPONENT = 1;
const CALL_FOLLOWER_COMPONENT = 7;
const EQUIPMENT_INVENTORY_COMPONENT = 0;

// Equipment slot component IDs (387:15-25) -> EquipmentSlot index
// EquipmentSlot: HEAD=0, CAPE=1, AMULET=2, WEAPON=3, BODY=4, SHIELD=5, LEGS=6, GLOVES=7, BOOTS=8, RING=9, AMMO=10
const EQUIP_SLOT_HEAD = { component: 15, slot: 0 };
const EQUIP_SLOT_CAPE = { component: 16, slot: 1 };
const EQUIP_SLOT_AMULET = { component: 17, slot: 2 };
const EQUIP_SLOT_WEAPON = { component: 18, slot: 3 };
const EQUIP_SLOT_BODY = { component: 19, slot: 4 };
const EQUIP_SLOT_SHIELD = { component: 20, slot: 5 };
const EQUIP_SLOT_LEGS = { component: 21, slot: 6 };
const EQUIP_SLOT_HANDS = { component: 22, slot: 7 };
const EQUIP_SLOT_FEET = { component: 23, slot: 8 };
const EQUIP_SLOT_RING = { component: 24, slot: 9 };
const EQUIP_SLOT_AMMO = { component: 25, slot: 10 };

const EQUIPMENT_SLOTS = [
    EQUIP_SLOT_HEAD,
    EQUIP_SLOT_CAPE,
    EQUIP_SLOT_AMULET,
    EQUIP_SLOT_WEAPON,
    EQUIP_SLOT_BODY,
    EQUIP_SLOT_SHIELD,
    EQUIP_SLOT_LEGS,
    EQUIP_SLOT_HANDS,
    EQUIP_SLOT_FEET,
    EQUIP_SLOT_RING,
    EQUIP_SLOT_AMMO,
];

// Equipment stats view slot components (84:10-20) -> EquipmentSlot index
// Cache parity: enum 2776 maps worn slots to interface components for wear_initslots.
// Worn slot indices differ from our internal EquipmentSlot enum, so we remap here.
const EQUIPMENT_STATS_SLOTS = [
    { component: 10, slot: 0 }, // worn 0 (head)
    { component: 11, slot: 1 }, // worn 1 (cape)
    { component: 12, slot: 2 }, // worn 2 (amulet)
    { component: 13, slot: 3 }, // worn 3 (weapon)
    { component: 14, slot: 4 }, // worn 4 (body)
    { component: 15, slot: 5 }, // worn 5 (shield)
    { component: 16, slot: 6 }, // worn 7 (legs)
    { component: 17, slot: 7 }, // worn 9 (hands)
    { component: 18, slot: 8 }, // worn 10 (feet)
    { component: 19, slot: 9 }, // worn 12 (ring)
    { component: 20, slot: 10 }, // worn 13 (ammo)
];

/**
 * Open the equipment stats interface via InterfaceService.
 * Hooks set IF_SETEVENTS, open sidemodal 85, and run inv-init scripts.
 */
function openEquipmentStats(player: any, services: ScriptServices): void {
    if (!player) return;
    services.openModal?.(player, EQUIPMENT_STATS_INTERFACE_ID);
    services.logger?.info?.(`[equipment-widgets] Opened equipment stats for player=${player.id}`);
}

function equipFromInventorySlot(
    player: any,
    services: ScriptServices,
    slot: number,
    itemId: number,
): void {
    if (!player || !(itemId > 0)) return;
    const tick = services.getCurrentTick?.() ?? 0;
    const res = services.requestAction(
        player,
        {
            kind: "inventory.equip",
            data: {
                slotIndex: slot,
                itemId,
                option: "Equip",
            },
            delayTicks: 0,
            groups: ["inventory"],
            cooldownTicks: 0,
        },
        tick,
    );
    if (!res.ok) {
        services.logger?.info?.(
            `[equipment-widgets] Equip rejected player=${player.id} slot=${slot} item=${itemId} reason=${
                res.reason ?? "unknown"
            }`,
        );
    }
}

export const equipmentWidgetModule: ScriptModule = {
    id: "content.equipment-widgets",
    register(registry, services) {
        // ============ VIEW EQUIPMENT STATS BUTTON (387:1) ============
        // Opens the equipment stats interface (84) with equipment inventory sidemodal (85)
        registry.onButton(EQUIPMENT_TAB_GROUP_ID, VIEW_EQUIPMENT_STATS_COMPONENT, (event) => {
            openEquipmentStats(event.player, services);
        });

        registry.onButton(EQUIPMENT_TAB_GROUP_ID, CALL_FOLLOWER_COMPONENT, (event) => {
            const player = event.player;
            if (!player) {
                return;
            }

            const result = services.callFollower?.(player);
            if (!result?.ok) {
                services.sendGameMessage(
                    player,
                    result?.reason === "missing"
                        ? "You do not have a follower."
                        : "Nothing interesting happens.",
                );
            }
        });

        const registerRemoveButtons = (
            interfaceId: number,
            slots: ReadonlyArray<{ component: number; slot: number }>,
        ) => {
            for (const { component, slot } of slots) {
                registry.onButton(interfaceId, component, (event) => {
                    const player = event.player;
                    if (!player) return;

                    services.logger?.info?.(
                        `[equipment-widgets] Remove clicked: interface=${interfaceId} component=${component} slot=${slot} player=${player.id}`,
                    );

                    const success = services.unequipItem?.(player, slot);
                    if (success) {
                        services.logger?.info?.(
                            `[equipment-widgets] Unequipped slot=${slot} for player=${player.id}`,
                        );
                    } else {
                        services.logger?.info?.(
                            `[equipment-widgets] Failed to unequip slot=${slot} for player=${player.id}`,
                        );
                    }
                });
            }
        };

        // ============ EQUIPMENT SLOT REMOVE BUTTONS (387:15-25) ============
        registerRemoveButtons(EQUIPMENT_TAB_GROUP_ID, EQUIPMENT_SLOTS);

        // ============ EQUIPMENT STATS REMOVE BUTTONS (84:10-20) ============
        registerRemoveButtons(EQUIPMENT_STATS_INTERFACE_ID, EQUIPMENT_STATS_SLOTS);

        // ============ EQUIPMENT INVENTORY EQUIP (85:0) ============
        // OSRS parity: op1 on the equipment inventory always means Equip (interface-overridden ops),
        // not the item's native inventoryActions entry.
        registry.onButton(EQUIPMENT_INVENTORY_INTERFACE_ID, EQUIPMENT_INVENTORY_COMPONENT, (event) => {
            const player = event.player;
            if (!player) return;
            const slot = event.slot ?? event.childId ?? -1;
            const itemId = event.itemId ?? -1;
            if (slot < 0 || !(itemId > 0)) return;
            equipFromInventorySlot(player, services, slot, itemId);
        });
    },
};
