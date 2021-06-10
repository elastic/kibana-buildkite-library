"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const buildkite_1 = require("../buildkite");
const client_1 = require("./client");
const buildkite = new buildkite_1.BuildkiteClient();
const ciStats = new client_1.CiStatsClient();
exports.default = async () => {
    if (process.env.CI_STATS_BUILD_ID) {
        const result = buildkite.getBuildStatus(await buildkite.getCurrentBuild());
        const status = result.success ? 'SUCCESS' : 'FAILURE';
        await ciStats.completeBuild(status);
    }
};
//# sourceMappingURL=on_complete.js.map