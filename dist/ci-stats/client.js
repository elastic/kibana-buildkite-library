"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CiStatsClient = void 0;
const axios_1 = require("axios");
const MAX_ATTEMPTS = 5;
class CiStatsClient {
    constructor(config = {}) {
        var _a, _b, _c, _d;
        const CI_STATS_HOST = (_a = config.hostname) !== null && _a !== void 0 ? _a : process.env.CI_STATS_HOST;
        const CI_STATS_TOKEN = (_b = config.token) !== null && _b !== void 0 ? _b : process.env.CI_STATS_TOKEN;
        this.baseRetryMs = (_c = config.baseRetryMs) !== null && _c !== void 0 ? _c : 5000;
        this.console = (_d = config.console) !== null && _d !== void 0 ? _d : console;
        this.baseUrl = `https://${CI_STATS_HOST}`;
        this.http = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                Authorization: `token ${CI_STATS_TOKEN}`,
            },
        });
    }
    async createBuild() {
        return await this.req({
            url: '/v1/build',
            method: 'POST',
            data: {
                jenkinsJobName: process.env.BUILDKITE_PIPELINE_NAME,
                jenkinsJobId: process.env.BUILDKITE_BUILD_ID,
                jenkinsUrl: process.env.BUILDKITE_BUILD_URL,
                prId: process.env.GITHUB_PR_NUMBER || null,
            },
        });
    }
    async addGitInfo(buildId) {
        await this.req({
            url: `/v1/git_info?buildId=${buildId}`,
            method: 'POST',
            data: {
                branch: (process.env.BUILDKITE_BRANCH || '').replace(/^(refs\/heads\/|origin\/)/, ''),
                commit: process.env.BUILDKITE_COMMIT,
                targetBranch: process.env.GITHUB_PR_TARGET_BRANCH || process.env.BUILDKITE_PULL_REQUEST_BASE_BRANCH || null,
                mergeBase: process.env.GITHUB_PR_MERGE_BASE || null,
            },
        });
    }
    async completeBuild(buildStatus, buildId = process.env.CI_STATS_BUILD_ID) {
        await this.req({
            url: `/v1/build/_complete?id=${buildId}`,
            method: 'POST',
            data: {
                result: buildStatus,
            },
        });
    }
    async req(options) {
        var _a;
        let attempt = 0;
        // eslint-disable-next-line no-constant-condition
        attemptRequest: while (true) {
            attempt += 1;
            try {
                const resp = await this.http.request(options);
                return resp.data;
            }
            catch (error) {
                const status = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status;
                if (attempt < MAX_ATTEMPTS && (typeof status === 'undefined' || status >= 500)) {
                    const delay = attempt * this.baseRetryMs;
                    this.console.error(`${status} response from ${this.baseUrl}, retrying in`, delay / 1000, 'seconds:', 'toJSON' in error && typeof error.toJSON === 'function' ? error.toJSON() : error);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    continue attemptRequest;
                }
                throw error;
            }
        }
    }
}
exports.CiStatsClient = CiStatsClient;
//# sourceMappingURL=client.js.map