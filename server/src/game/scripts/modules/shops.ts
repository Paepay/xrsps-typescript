import { getAllShopDefinitions } from "../../shops/definitions";
import { type NpcInteractionHandler, type ScriptModule } from "../types";

const openShopForNpc: NpcInteractionHandler = ({ player, services, npc }) => {
    if (!services.openShop) {
        services.sendGameMessage(player, "Nothing interesting happens.");
        services.logger?.warn?.(
            `[script:shops] openShop service missing for player=${player.id}`,
        );
        return;
    }
    services.openShop(player, { npcTypeId: npc?.typeId });
};

export const shopInteractionsModule: ScriptModule = {
    id: "content.shops",
    register(registry) {
        // Global Trade / Trade-with (any shopkeeper whose option string resolves).
        registry.registerNpcAction("trade", openShopForNpc);
        registry.registerNpcAction("trade-with", openShopForNpc);

        // Per-NPC Trade so shop wins over favour Talk-to on the same NPC type id.
        for (const shop of getAllShopDefinitions()) {
            for (const npcId of shop.npcIds ?? []) {
                if (!(npcId > 0)) continue;
                registry.registerNpcScript({
                    npcId,
                    option: "trade",
                    handler: openShopForNpc,
                });
                registry.registerNpcScript({
                    npcId,
                    option: "trade-with",
                    handler: openShopForNpc,
                });
            }
        }
    },
};
