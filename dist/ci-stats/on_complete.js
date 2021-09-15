"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onComplete = void 0;
const child_process_1 = require("child_process");
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
        if (process.env.GITHUB_PR_NUMBER) {
            const report = await ciStats.getPrReport(process.env.CI_STATS_BUILD_ID);
            if (report === null || report === void 0 ? void 0 : report.md) {
                process.env.CI_STATS_REPORT = report.md;
                child_process_1.execSync('buildkite-agent meta-data set pr_comment:ci_stats_report:body "$CI_STATS_REPORT"', {
                    stdio: 'inherit',
                });
            }
        }
    }
}
exports.onComplete = onComplete;
//# sourceMappingURL=on_complete.js.map