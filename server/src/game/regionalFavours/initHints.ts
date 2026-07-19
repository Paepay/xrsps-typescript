/**
 * Bootstrap favour hint derivation from cache locs + npc spawns + skill maps.
 */
import type { CacheEnv } from "../../world/CacheEnv";
import { assertFavourHintCoverage } from "./hintCoverage";
import { initGatherHintsFromWorld, isGatherHintsInitialized } from "./gatherHints";
import { MISTHALIN_FAVOUR_DEFINITIONS } from "./definitions/misthalin";
import { ResourceHintIndex } from "./resourceHintIndex";
import type { FishingSpotMap } from "../skills/fishing";
import type { MiningLocMapping } from "../skills/mining";

export type InitRegionalFavourHintsDeps = {
    cacheEnv: CacheEnv;
    locTypeLoader?: { load?: (id: number) => { name?: string } | undefined };
    miningLocMap?: Map<number, MiningLocMapping>;
    woodcuttingLocMap?: Map<number, string>;
    fishingSpotMap?: FishingSpotMap["map"] | Map<number, string>;
};

export function initRegionalFavourHints(deps: InitRegionalFavourHintsDeps): void {
    const resolveLocName = deps.locTypeLoader?.load
        ? (locId: number) => {
              try {
                  const loc = deps.locTypeLoader!.load!(locId);
                  const name = loc?.name;
                  return typeof name === "string" ? name : undefined;
              } catch {
                  return undefined;
              }
          }
        : undefined;

    const index = ResourceHintIndex.buildForRegion("misthalin", deps.cacheEnv, {
        resolveLocName,
    });

    initGatherHintsFromWorld({
        index,
        miningLocMap: deps.miningLocMap,
        woodcuttingLocMap: deps.woodcuttingLocMap,
        fishingSpotMap: deps.fishingSpotMap,
    });

    assertFavourHintCoverage(MISTHALIN_FAVOUR_DEFINITIONS);
}

export function ensureRegionalFavourHintsReady(): void {
    if (!isGatherHintsInitialized()) {
        throw new Error(
            "[regionalFavours] gather hints not initialized — call initRegionalFavourHints after cache load",
        );
    }
}
