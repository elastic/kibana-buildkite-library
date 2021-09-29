"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onComplete = void 0;
const buildkite_1 = require("../buildkite");
const client_1 = require("./client");
const buildkite = new buildkite_1.BuildkiteClient();
const ciStats = new client_1.CiStatsClient();
async function onComplete() {
    if (process.env.CI_STATS_BUILD_ID) {
        const result = buildkite.getBuildStatus(await buildkite.getCurrentBuild());
        const status = result.success ? 'SUCCESS' : 'FAILURE';
        console.log('Job Status:', result);
        await ciStats.completeBuild(status);
    }
}
exports.onComplete = onComplete;
//# sourceMappingURL=on_complete.js.map