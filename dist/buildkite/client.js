"use strict";
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildkiteClient = void 0;
const axios_1 = require("axios");
class BuildkiteClient {
    constructor(config = {}) {
        var _a, _b, _c;
        this.getBuild = async (pipelineSlug, buildNumber, includeRetriedJobs = false) => {
            // TODO properly assemble URL
            const link = `v2/organizations/elastic/pipelines/${pipelineSlug}/builds/${buildNumber}?include_retried_jobs=${includeRetriedJobs.toString()}`;
            const resp = await this.http.get(link);
            return resp.data;
        };
        this.getCurrentBuild = (includeRetriedJobs = false) => {
            if (!process.env.BUILDKITE_PIPELINE_SLUG || !process.env.BUILDKITE_BUILD_NUMBER) {
                throw new Error('BUILDKITE_PIPELINE_SLUG and BUILDKITE_BUILD_NUMBER must be set to get current build');
            }
            return this.getBuild(process.env.BUILDKITE_PIPELINE_SLUG, process.env.BUILDKITE_BUILD_NUMBER, includeRetriedJobs);
        };
        this.getJobStatus = (build, job) => {
            if (job.retried) {
                const retriedJob = build.jobs.find((j) => j.id === job.retried_in_job_id);
                if (!retriedJob) {
                    throw Error(`Couldn't find retried job ID ${job.retried_in_job_id} for job ${job.id}`);
                }
                return this.getJobStatus(build, retriedJob);
            }
            const success = ![
                'waiting_failed',
                'blocked_failed',
                'unblocked_failed',
                'timing_out',
                'timed_out',
                'broken',
                'canceling',
                'canceled',
                'failed',
            ].includes(job.state);
            return {
                success,
                state: job.state,
            };
        };
        this.getBuildStatus = (build) => {
            let hasRetries = false;
            let success = true;
            for (const job of build.jobs) {
                if (job.retried) {
                    hasRetries = true;
                }
                const state = this.getJobStatus(build, job);
                success = success && state.success;
            }
            return {
                state: build.state,
                success,
                hasRetries,
            };
        };
        const BUILDKITE_BASE_URL = (_b = (_a = config.baseUrl) !== null && _a !== void 0 ? _a : process.env.BUILDKITE_BASE_URL) !== null && _b !== void 0 ? _b : 'https://api.buildkite.com';
        const BUILDKITE_TOKEN = (_c = config.token) !== null && _c !== void 0 ? _c : process.env.BUILDKITE_TOKEN;
        // const BUILDKITE_AGENT_BASE_URL =
        //   process.env.BUILDKITE_AGENT_BASE_URL || 'https://agent.buildkite.com/v3';
        // const BUILDKITE_AGENT_TOKEN = process.env.BUILDKITE_AGENT_TOKEN;
        this.http = axios_1.default.create({
            baseURL: BUILDKITE_BASE_URL,
            headers: {
                Authorization: `Bearer ${BUILDKITE_TOKEN}`,
            },
        });
        // this.agentHttp = axios.create({
        //   baseURL: BUILDKITE_AGENT_BASE_URL,
        //   headers: {
        //     Authorization: `Token ${BUILDKITE_AGENT_TOKEN}`,
        //   },
        // });
    }
}
exports.BuildkiteClient = BuildkiteClient;
//# sourceMappingURL=client.js.map