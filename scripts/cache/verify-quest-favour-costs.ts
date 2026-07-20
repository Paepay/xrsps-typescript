import { QUEST_FAVOUR_COSTS } from "../../server/src/game/quests/questFavourCosts.data";
import { findQuestFavourCost } from "../../server/src/game/quests/questFavourCosts";

const samples = [
    "Cook's Assistant",
    "Dragon Slayer I",
    "While Guthix Sleeps",
    "Sheep Shearer",
    "Desert Treasure I",
    "Recipe for Disaster Culinaromancer",
    "Imp Catcher",
];

console.log("total costs", QUEST_FAVOUR_COSTS.length);
for (const s of samples) {
    const d = findQuestFavourCost(s);
    console.log(
        s,
        d
            ? `${d.favourCost} (${d.difficulty} x ${d.length}) cache=${d.cacheName}`
            : "MISSING",
    );
}
