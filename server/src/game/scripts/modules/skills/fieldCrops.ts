import {
    ALL_FIELD_CROP_LOC_IDS,
    FIELD_CROP_PICK_DELAY_TICKS,
    getFieldCropActions,
    isFieldCropLocId,
} from "../../../skills/fieldCrops";
import { type ScriptModule } from "../../types";

const PICK_PLANT_GROUP = "skill.pick_plant";

export const fieldCropsModule: ScriptModule = {
    id: "skills.field-crops",
    register(registry, services) {
        const requestAction = services.requestAction;
        const registerLoc = (locId: number, action: string) => {
            registry.registerLocInteraction(
                locId,
                (event) => {
                    if (!isFieldCropLocId(event.locId)) {
                        return;
                    }
                    const result = requestAction(
                        event.player,
                        {
                            kind: "skill.pick_plant",
                            data: {
                                locId: event.locId,
                                tile: { x: event.tile.x, y: event.tile.y },
                                level: event.level,
                            },
                            delayTicks: 0,
                            cooldownTicks: FIELD_CROP_PICK_DELAY_TICKS,
                            groups: [PICK_PLANT_GROUP],
                        },
                        event.tick,
                    );
                    if (!result.ok) {
                        services.sendGameMessage(
                            event.player,
                            "You're too busy to pick that right now.",
                        );
                    }
                },
                action,
            );
        };

        for (const locId of ALL_FIELD_CROP_LOC_IDS) {
            for (const action of getFieldCropActions(locId)) {
                registerLoc(locId, action);
            }
        }
    },
};
