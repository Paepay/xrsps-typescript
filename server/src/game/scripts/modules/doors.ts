import { type ScriptModule, type ScriptServices } from "../types";

const DOOR_ACTIONS = ["open", "close", "unlock", "lock"];

// Door/gate sound effects (OSRS sound IDs)
const DOOR_SOUND = 60; // Standard wooden door open/close
const GATE_SOUND = 71; // Metal gate open/close

function playDoorSound(
    services: ScriptServices,
    locId: number,
    tile: { x: number; y: number },
    level: number,
): void {
    const locDef = services.getLocDefinition?.(locId);
    const locName = (locDef?.name ?? "").toLowerCase();
    const isGate = locName.includes("gate");
    services.playAreaSound?.({
        soundId: isGate ? GATE_SOUND : DOOR_SOUND,
        tile,
        level,
        radius: 5,
        volume: 255,
    });
}

export const doorInteractionsModule: ScriptModule = {
    id: "content.doors",
    register(registry, services) {
        const { doorManager, emitLocChange } = services;
        if (!doorManager) return;

        for (const action of DOOR_ACTIONS) {
            registry.registerLocAction(action, (event) => {
                const result = doorManager.toggleDoor({
                    x: event.tile.x,
                    y: event.tile.y,
                    level: event.level,
                    currentId: event.locId,
                    action: event.action,
                    currentTick: event.tick,
                });
                if (!result?.success || result.newLocId === undefined) {
                    return;
                }

                emitLocChange?.(event.locId, result.newLocId, event.tile, event.level, {
                    oldTile: event.tile,
                    newTile: result.newTile ?? event.tile,
                    oldRotation: result.oldRotation,
                    newRotation: result.newRotation,
                });

                if (result.partnerResult) {
                    emitLocChange?.(
                        result.partnerResult.oldLocId,
                        result.partnerResult.newLocId,
                        result.partnerResult.oldTile,
                        event.level,
                        {
                            oldTile: result.partnerResult.oldTile,
                            newTile: result.partnerResult.newTile,
                            oldRotation: result.partnerResult.oldRotation,
                            newRotation: result.partnerResult.newRotation,
                        },
                    );
                }

                playDoorSound(services, event.locId, event.tile, event.level);
            });
        }

        // OSRS parity: open doors auto-close after 500 ticks (~5 minutes).
        registry.registerTickHandler(({ tick }) => {
            const closedDoors = doorManager.tick(tick);
            for (const closed of closedDoors) {
                emitLocChange?.(
                    closed.oldLocId,
                    closed.newLocId,
                    { x: closed.x, y: closed.y },
                    closed.level,
                    {
                        oldTile: { x: closed.x, y: closed.y },
                        newTile: closed.newTile,
                        oldRotation: closed.oldRotation,
                        newRotation: closed.newRotation,
                    },
                );
            }
        });
    },
};
