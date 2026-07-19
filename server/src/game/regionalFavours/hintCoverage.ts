/**
 * Favour hint coverage — every active favour must resolve a destination arrow.
 *
 * Resource-phase (gather/produce/process): targetArea, targetObjectNames, or gatherHints entry.
 * Kill: targetNpcIds. Visit / use-object: targetArea. Speak/deliver/seek: turn-in NPC.
 */
import { isSeekContactFavourId } from "./contacts";
import { getGatherHintForItem } from "./gatherHints";
import type { RegionalFavourDefinition } from "./types";

const RESOURCE_CATEGORIES = new Set([
    "GATHER_ITEM",
    "PRODUCE_ITEM",
    "PROCESS_ITEM",
    "RETURN_ITEM",
    "MULTI_STEP",
]);

export type FavourHintCoverageIssue = {
    favourId: string;
    category: string;
    targetItemId?: number;
    reason: string;
};

export function favourNeedsResourceHint(def: RegionalFavourDefinition): boolean {
    if (isSeekContactFavourId(def.id)) return false;
    if (!RESOURCE_CATEGORIES.has(def.category)) return false;
    return !!(def.targetItemId && def.targetItemId > 0);
}

export function favourHasResourceHint(def: RegionalFavourDefinition): boolean {
    if (def.targetArea) return true;
    if (def.targetObjectNames && def.targetObjectNames.length > 0) return true;
    if (def.targetItemId && getGatherHintForItem(def.targetItemId)) return true;
    return false;
}

export function collectFavourHintCoverageIssues(
    defs: readonly RegionalFavourDefinition[],
): FavourHintCoverageIssue[] {
    const issues: FavourHintCoverageIssue[] = [];

    for (const def of defs) {
        if (isSeekContactFavourId(def.id)) {
            continue;
        }

        switch (def.category) {
            case "VISIT_LOCATION":
            case "USE_OBJECT":
            case "PERFORM_SKILL_ACTION":
                if (!def.targetArea) {
                    issues.push({
                        favourId: def.id,
                        category: def.category,
                        reason: "missing targetArea",
                    });
                }
                break;
            case "KILL_NPC":
                if (!def.targetNpcIds || def.targetNpcIds.length === 0) {
                    issues.push({
                        favourId: def.id,
                        category: def.category,
                        reason: "missing targetNpcIds",
                    });
                }
                break;
            case "GATHER_ITEM":
            case "PRODUCE_ITEM":
            case "PROCESS_ITEM":
            case "RETURN_ITEM":
            case "MULTI_STEP":
                if (favourNeedsResourceHint(def) && !favourHasResourceHint(def)) {
                    issues.push({
                        favourId: def.id,
                        category: def.category,
                        targetItemId: def.targetItemId,
                        reason:
                            "resource phase has no targetArea / targetObjectNames / gatherHints entry",
                    });
                }
                break;
            default:
                // SPEAK_TO_NPC / DELIVER_ITEM / CAST_SPELL / etc. fall back to turn-in NPC.
                break;
        }
    }

    return issues;
}

/** Throws if any favour cannot resolve a hint destination for its active objective phase. */
export function assertFavourHintCoverage(defs: readonly RegionalFavourDefinition[]): void {
    const issues = collectFavourHintCoverageIssues(defs);
    if (issues.length === 0) return;

    const byItem = new Map<number, string[]>();
    const other: string[] = [];
    for (const issue of issues) {
        if (issue.targetItemId) {
            const list = byItem.get(issue.targetItemId) ?? [];
            list.push(issue.favourId);
            byItem.set(issue.targetItemId, list);
        } else {
            other.push(`${issue.favourId} (${issue.category}: ${issue.reason})`);
        }
    }

    const lines: string[] = [
        `[regionalFavours] ${issues.length} favour(s) missing hint destinations.`,
        "Add gatherHints.ts entries (preferred for shared items) or per-favour targetArea / targetObjectNames.",
    ];
    for (const [itemId, favourIds] of [...byItem.entries()].sort((a, b) => a[0] - b[0])) {
        lines.push(`  item ${itemId}: ${favourIds.join(", ")}`);
    }
    for (const line of other) {
        lines.push(`  ${line}`);
    }
    throw new Error(lines.join("\n"));
}
