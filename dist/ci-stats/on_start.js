"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onStart = void 0;
const child_process_1 = require("child_process");
const client_1 = require("./client");
const ciStats = new client_1.CiStatsClient();
async function onStart() {
    const build = await ciStats.createBuild();
    child_process_1.execSync(`buildkite-agent meta-data set ci_stats_build_id "${build.id}"`);
    // TODO Will need to set MERGE_BASE for PRs
    await ciStats.addGitInfo(build.id);
}
exports.onStart = onStart;
//# sourceMappingURL=on_start.js.map