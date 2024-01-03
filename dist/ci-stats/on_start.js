"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onStart = void 0;
const child_process_1 = require("child_process");
const client_1 = require("./client");
const ciStats = new client_1.CiStatsClient();
async function onStart() {
    const build = await ciStats.createBuild();
    (0, child_process_1.execSync)(`buildkite-agent meta-data set ci_stats_build_id "${build.id}"`);
    await ciStats.addGitInfo(build.id);
}
exports.onStart = onStart;
