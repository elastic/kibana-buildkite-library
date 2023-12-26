"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CiStatsClient = void 0;
const axios_1 = require("axios");
class CiStatsClient {
    constructor(config = {}) {
        var _a, _b;
        this.createBuild = async () => {
            const resp = await this.request({
                method: 'POST',
                path: '/v1/build',
                body: {
                    jenkinsJobName: process.env.BUILDKITE_PIPELINE_SLUG,
                    jenkinsJobId: process.env.BUILDKITE_BUILD_NUMBER,
                    jenkinsUrl: process.env.BUILDKITE_BUILD_URL,
                    prId: process.env.GITHUB_PR_NUMBER || null,
                },
            });
            return resp.data;
        };
        this.addGitInfo = async (buildId) => {
            await this.request({
                method: 'POST',
                path: '/v1/git_info',
                params: {
                    buildId,
                },
                body: {
                    branch: (process.env.BUILDKITE_BRANCH || '').replace(/^(refs\/heads\/|origin\/)/, ''),
                    commit: process.env.BUILDKITE_COMMIT,
                    targetBranch: process.env.GITHUB_PR_TARGET_BRANCH || process.env.BUILDKITE_PULL_REQUEST_BASE_BRANCH || null,
                    mergeBase: process.env.GITHUB_PR_MERGE_BASE || null,
                },
            });
        };
        this.markBuildAsValidBaseline = async (buildId) => {
            await this.request({
                method: 'POST',
                path: `/v1/build/_is_valid_baseline`,
                params: {
                    id: buildId,
                },
            });
        };
        this.completeBuild = async (buildStatus, buildId) => {
            await this.request({
                method: 'POST',
                path: `/v1/build/_complete`,
                params: {
                    id: buildId,
                },
                body: {
                    result: buildStatus,
                },
            });
        };
        this.getPrReport = async (buildId) => {
            const resp = await this.request({
                path: `v2/pr_report`,
                params: {
                    buildId,
                },
            });
            return resp.data;
        };
        this.pickTestGroupRunOrder = async (body) => {
            console.log('requesting test group run order from ci-stats:');
            console.log(JSON.stringify(body, null, 2));
            const resp = await axios_1.default.request({
                method: 'POST',
                baseURL: this.baseUrl,
                headers: this.defaultHeaders,
                url: '/v2/_pick_test_group_run_order',
                data: body,
            });
            return resp.data;
        };
        const CI_STATS_HOST = (_a = config.baseUrl) !== null && _a !== void 0 ? _a : process.env.CI_STATS_HOST;
        const CI_STATS_TOKEN = (_b = config.token) !== null && _b !== void 0 ? _b : process.env.CI_STATS_TOKEN;
        this.baseUrl = `https://${CI_STATS_HOST}`;
        this.defaultHeaders = {
            Authorization: `token ${CI_STATS_TOKEN}`,
        };
    }
    async request({ method, path, params, body, maxAttempts = 3 }) {
        var _a, _b;
        let attempt = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            attempt += 1;
            try {
                return await axios_1.default.request({
                    method,
                    baseURL: this.baseUrl,
                    url: path,
                    params,
                    data: body,
                    headers: this.defaultHeaders,
                });
            }
            catch (error) {
                console.error('CI Stats request error:', (_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message);
                if (attempt < maxAttempts) {
                    const sec = attempt * 3;
                    console.log('waiting', sec, 'seconds before retrying');
                    await new Promise((resolve) => setTimeout(resolve, sec * 1000));
                    continue;
                }
                throw new Error('Failed to connect to CI Stats.');
            }
        }
    }
}
exports.CiStatsClient = CiStatsClient;
