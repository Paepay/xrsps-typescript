/**
 * Dump widget group children: actions, flags, onOp script ids.
 * Usage: npx tsx scripts/cache/dump-widget-group.ts [groupId]
 */
import { CacheSystem } from "../../src/rs/cache/CacheSystem";
import { loadCache, loadCacheInfos, loadCacheList } from "./load-util";
import { WidgetLoader } from "../../src/ui/widgets/WidgetLoader";

function summarizeListener(listener: any[] | null | undefined): string {
    if (!listener || !Array.isArray(listener) || listener.length === 0) return "";
    const scriptId = listener[0];
    return `script=${scriptId} args=${JSON.stringify(listener.slice(1)).slice(0, 160)}`;
}

const groupId = parseInt(process.argv[2] || "7", 10);
const caches = loadCacheInfos();
const cacheInfo = loadCacheList(caches).latest;
const loaded = loadCache(cacheInfo);
const cacheSystem = CacheSystem.fromFiles("dat2", loaded.files);
const widgetLoader = new WidgetLoader(cacheSystem);

const group = widgetLoader.loadWidgetGroup(groupId);
if (!group) {
    console.error(`Failed to load widget group ${groupId}`);
    process.exit(1);
}

const widgets = [...group.widgets.entries()].sort((a, b) => a[0] - b[0]);
console.log(`Widget group ${groupId} (${widgets.length} children) cache=${cacheInfo.name}`);
for (const [i, w] of widgets) {
    if (!w) continue;
    const actions = (w as any).actions ?? (w as any).ops ?? null;
    const flags = (w as any).clickMask ?? (w as any).flags ?? (w as any).events ?? "?";
    const onLoad = summarizeListener((w as any).onLoad);
    const onOp = summarizeListener((w as any).onOp);
    const text = (w as any).text ? ` text="${String((w as any).text).slice(0, 60)}"` : "";
    console.log(
        `  child=${i} type=${(w as any).type} flags=${typeof flags === "number" ? "0x" + flags.toString(16) : flags}` +
            ` actions=${JSON.stringify(actions)}${text}` +
            (onLoad ? ` onLoad=${onLoad}` : "") +
            (onOp ? ` onOp=${onOp}` : ""),
    );
}
