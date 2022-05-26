"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onComplete = void 0;
const buildkite_1 = require("../buildkite");
const client_1 = require("./client");
const buildkite = new buildkite_1.BuildkiteClient();
const ciStats = new client_1.CiStatsClient();
async function onComplete() {
    if (!process.env.CI_STATS_BUILD_ID) {
        return;
    }
    const result = buildkite.getBuildStatus(await buildkite.getCurrentBuild());
    const status = result.success ? 'SUCCESS' : 'FAILURE';
    console.log('Job Status:', result);
    await ciStats.completeBuild(status, process.env.CI_STATS_BUILD_ID);
    if (!process.env.GITHUB_PR_NUMBER) {
        return;
    }
    const report = await ciStats.getPrReport(process.env.CI_STATS_BUILD_ID);
    if (report === null || report === void 0 ? void 0 : report.md) {
        buildkite.setMetadata('pr_comment:ci_stats_report:body', report.md);
        const annotationType = (report === null || report === void 0 ? void 0 : report.success) ? 'info' : 'error';
        buildkite.setAnnotation('ci-stats-report', annotationType, report.md);
    }
    if (report && !report.success) {
        console.log('+++ CI Stats Report');
        console.error('Failing build due to CI Stats report. See annotation at top of build.');
        process.exit(1);
    }
}
exports.onComplete = onComplete;
