"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CiStatsClient = void 0;
const axios_1 = require("axios");
class CiStatsClient {
    constructor(config = {}) {
        var _a, _b;
        this.createBuild = async () => {
            const resp = await this.http.post('/v1/build', {
                jenkinsJobName: process.env.BUILDKITE_PIPELINE_NAME,
                jenkinsJobId: process.env.BUILDKITE_BUILD_ID,
                jenkinsUrl: process.env.BUILDKITE_BUILD_URL,
                prId: process.env.GITHUB_PR_NUMBER || null,
            });
            return resp.data;
        };
        this.addGitInfo = (buildId) => {
            return this.http.post(`/v1/git_info?buildId=${buildId}`, {
                branch: (process.env.BUILDKITE_BRANCH || '').replace(/^(refs\/heads\/|origin\/)/, ''),
                commit: process.env.BUILDKITE_COMMIT,
                targetBranch: process.env.GITHUB_PR_TARGET_BRANCH || process.env.BUILDKITE_PULL_REQUEST_BASE_BRANCH || null,
                mergeBase: process.env.GITHUB_PR_MERGE_BASE || null,
            });
        };
        this.completeBuild = (buildStatus, buildId = process.env.CI_STATS_BUILD_ID) => {
            return this.http.post(`/v1/build/_complete?id=${buildId}`, {
                result: buildStatus,
            });
        };
        this.getPrReport = async (buildId = process.env.CI_STATS_BUILD_ID) => {
            const resp = await this.http.get(`v2/pr_report?buildId=${buildId}`);
            return resp.data;
        };
        const CI_STATS_HOST = (_a = config.baseUrl) !== null && _a !== void 0 ? _a : process.env.CI_STATS_HOST;
        const CI_STATS_TOKEN = (_b = config.token) !== null && _b !== void 0 ? _b : process.env.CI_STATS_TOKEN;
        this.http = axios_1.default.create({
            baseURL: `https://${CI_STATS_HOST}`,
            headers: {
                Authorization: `token ${CI_STATS_TOKEN}`,
            },
        });
    }
}
exports.CiStatsClient = CiStatsClient;
//# sourceMappingURL=client.js.map