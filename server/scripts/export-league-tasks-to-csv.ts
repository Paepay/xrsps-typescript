import path from "path";

import { DEFAULT_LEAGUE_TASKS_CSV_PATH, writeLeagueTaskRowsToCsv } from "../../src/shared/leagues/leagueTaskCsv";
import { LEAGUE_TASKS } from "../../src/shared/leagues/leagueTasks.data";
import { logger } from "../src/utils/logger";

const outPath = path.resolve(process.argv[2] ?? DEFAULT_LEAGUE_TASKS_CSV_PATH);
writeLeagueTaskRowsToCsv(outPath, LEAGUE_TASKS);
logger.info(`[leagues] wrote ${LEAGUE_TASKS.length} tasks to ${outPath}`);
