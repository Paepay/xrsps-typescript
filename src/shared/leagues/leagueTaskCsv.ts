import fs from "fs";

import type { LeagueTaskRow } from "./leagueTypes";
import {
    areaIdFromLeagueTaskRegion,
    LEAGUE_TASK_AREA_ID_TO_REGION,
    parseLeagueTaskAreaLabel,
    type LeagueTaskRegion,
} from "./leagueTaskRegion";

/** Synthetic struct ids for CSV-imported tasks (param overrides, not in cache). */
export const LEAGUE_TASK_CSV_STRUCT_ID_BASE = 90000;

/** Raging Echoes league struct used by L5 task list UI. */
export const LEAGUE_TASK_CSV_LEAGUE_STRUCT_ID = 6211;

const DIFFICULTY_TO_TIER: Record<string, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
    elite: 4,
    master: 5,
};

const TIER_TO_DIFFICULTY: Record<number, string> = {
    1: "Easy",
    2: "Medium",
    3: "Hard",
    4: "Elite",
    5: "Master",
};

function escapeCsvField(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/** Default path for the custom task list CSV (`Task ID, Area, Task, ...`). */
export const DEFAULT_LEAGUE_TASKS_CSV_PATH = "tasks.csv";

export type LeagueTaskCsvRow = {
    taskId: number;
    area: string;
    name: string;
    requirements: string;
    difficulty: string;
    points: number;
    combatMastery: string;
};

/**
 * RFC-style CSV parser (handles quoted fields and embedded commas).
 */
export function parseCsvText(text: string): string[][] {
    const rows: string[][] = [];
    let i = 0;
    let field = "";
    let row: string[] = [];
    let inQuotes = false;

    while (i < text.length) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"' && text[i + 1] === '"') {
                field += '"';
                i += 2;
                continue;
            }
            if (c === '"') {
                inQuotes = false;
                i++;
                continue;
            }
            field += c;
            i++;
            continue;
        }
        if (c === '"') {
            inQuotes = true;
            i++;
            continue;
        }
        if (c === ",") {
            row.push(field);
            field = "";
            i++;
            continue;
        }
        if (c === "\n" || c === "\r") {
            if (c === "\r" && text[i + 1] === "\n") {
                i++;
            }
            row.push(field);
            if (row.some((cell, index) => index > 0 || cell !== "")) {
                rows.push(row);
            }
            field = "";
            row = [];
            i++;
            continue;
        }
        field += c;
        i++;
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        if (row.some((cell, index) => index > 0 || cell !== "")) {
            rows.push(row);
        }
    }

    return rows;
}

export function parseLeagueTasksCsv(text: string): LeagueTaskCsvRow[] {
    const rows = parseCsvText(text);
    if (rows.length < 2) return [];

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idIdx = header.findIndex((h) => h === "task id" || h === "id" || h === "taskid");
    const areaIdx = header.findIndex((h) => h === "area" || h === "region");
    const taskIdx = header.findIndex((h) => h === "task" || h === "name");
    const reqIdx = header.findIndex((h) => h === "requirements" || h === "requirement");
    const diffIdx = header.findIndex((h) => h === "difficulty" || h === "tier");
    const pointsIdx = header.findIndex((h) => h === "points");
    const cmIdx = header.findIndex((h) => h === "combat mastery");

    if (idIdx < 0 || areaIdx < 0 || taskIdx < 0) {
        throw new Error("CSV must include Task ID, Area, and Task columns");
    }

    const parsed: LeagueTaskCsvRow[] = [];
    for (let r = 1; r < rows.length; r++) {
        const cells = rows[r];
        const taskId = Number.parseInt(cells[idIdx] ?? "", 10);
        if (!(taskId >= 0)) continue;
        parsed.push({
            taskId,
            area: (cells[areaIdx] ?? "").trim(),
            name: (cells[taskIdx] ?? "").trim(),
            requirements: reqIdx >= 0 ? (cells[reqIdx] ?? "").trim() : "",
            difficulty: diffIdx >= 0 ? (cells[diffIdx] ?? "").trim() : "",
            points: pointsIdx >= 0 ? Number.parseInt(cells[pointsIdx] ?? "0", 10) || 0 : 0,
            combatMastery: cmIdx >= 0 ? (cells[cmIdx] ?? "").trim() : "",
        });
    }
    return parsed;
}

export function loadLeagueTaskRegionsFromCsv(filePath: string): Map<number, LeagueTaskRegion> {
    const map = new Map<number, LeagueTaskRegion>();
    if (!fs.existsSync(filePath)) {
        return map;
    }

    const text = fs.readFileSync(filePath, "utf8");
    const rows = parseLeagueTasksCsv(text);
    const unknownAreas = new Set<string>();

    for (const row of rows) {
        const region = parseLeagueTaskAreaLabel(row.area);
        if (!region) {
            unknownAreas.add(row.area);
            continue;
        }
        map.set(row.taskId, region);
    }

    if (unknownAreas.size > 0) {
        console.log(
            `[leagues] CSV area labels not mapped to a region: ${[...unknownAreas].sort().join(", ")}`,
        );
    }

    return map;
}

/** Infer cache task category (param 1016) from task title wording. */
export function inferLeagueTaskCategoryFromName(name: string): number {
    const title = name.trim();
    if (/^Complete\b/i.test(title) && /diary/i.test(title)) return 4;
    if (/^Complete\b/i.test(title)) return 3;
    if (/^(Defeat|Kill|Slay)\b/i.test(title)) return 2;
    if (
        /^(Catch|Mine|Chop|Cook|Smith|Craft|Fletch|Burn|Pick|Fish|Cut|Smelt|Bake|Mix|Clean|Make|Create)\b/i.test(
            title,
        )
    ) {
        return 1;
    }
    return 5;
}

export type CsvImportWarning = {
    taskId: number;
    kind: "unknown_area" | "unknown_difficulty";
    value: string;
};

/**
 * Builds a league task row using only tasks.csv columns (no OSRS cache data).
 */
export function csvRowToLeagueTaskRow(row: LeagueTaskCsvRow, warnings?: CsvImportWarning[]): LeagueTaskRow {
    const region = parseLeagueTaskAreaLabel(row.area);
    if (!region) {
        warnings?.push({ taskId: row.taskId, kind: "unknown_area", value: row.area });
    }
    const resolvedRegion = region ?? "General";

    const diffKey = row.difficulty.trim().toLowerCase();
    const tier = DIFFICULTY_TO_TIER[diffKey];
    if (row.difficulty.trim() && tier === undefined) {
        warnings?.push({ taskId: row.taskId, kind: "unknown_difficulty", value: row.difficulty });
    }

    const requirements = row.requirements.trim();
    const combatMastery = row.combatMastery.trim();

    return {
        taskId: row.taskId,
        name: row.name,
        description: requirements || undefined,
        region: resolvedRegion,
        tier: tier ?? 1,
        points: row.points,
        category: inferLeagueTaskCategoryFromName(row.name),
        area: areaIdFromLeagueTaskRegion(resolvedRegion),
        skill: 0,
        structId: LEAGUE_TASK_CSV_STRUCT_ID_BASE + row.taskId,
        leagueStructId: LEAGUE_TASK_CSV_LEAGUE_STRUCT_ID,
        combatMastery: combatMastery || undefined,
    };
}

export function leagueTaskRowsFromCsvText(text: string): {
    rows: LeagueTaskRow[];
    warnings: CsvImportWarning[];
} {
    const csvRows = parseLeagueTasksCsv(text);
    const warnings: CsvImportWarning[] = [];
    const rows = csvRows.map((row) => csvRowToLeagueTaskRow(row, warnings));
    rows.sort((a, b) => a.taskId - b.taskId);
    return { rows, warnings };
}

export function loadLeagueTaskRowsFromCsv(filePath: string): {
    rows: LeagueTaskRow[];
    warnings: CsvImportWarning[];
} {
    if (!fs.existsSync(filePath)) {
        throw new Error(`tasks CSV not found: ${filePath}`);
    }
    return leagueTaskRowsFromCsvText(fs.readFileSync(filePath, "utf8"));
}

function regionLabelForRow(row: LeagueTaskRow): LeagueTaskRegion {
    if (row.region) return row.region;
    const areaId = (row.area ?? 0) | 0;
    return LEAGUE_TASK_AREA_ID_TO_REGION[areaId] ?? "General";
}

export function leagueTaskRowsToCsvText(rows: readonly LeagueTaskRow[]): string {
    const lines = ["Task ID,Area,Task,Requirements,Difficulty,Points,Combat Mastery"];
    for (const row of rows) {
        const area = regionLabelForRow(row);
        const difficulty = TIER_TO_DIFFICULTY[row.tier | 0] ?? "Easy";
        lines.push(
            [
                String(row.taskId | 0),
                escapeCsvField(area),
                escapeCsvField(row.name),
                escapeCsvField(row.description ?? ""),
                escapeCsvField(difficulty),
                String(row.points | 0),
                escapeCsvField(row.combatMastery ?? ""),
            ].join(","),
        );
    }
    return lines.join("\n") + "\n";
}

export function writeLeagueTaskRowsToCsv(filePath: string, rows: readonly LeagueTaskRow[]): void {
    fs.writeFileSync(filePath, leagueTaskRowsToCsvText(rows), "utf8");
}
