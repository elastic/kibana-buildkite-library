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
const child_process_1 = require("child_process");
const js_yaml_1 = require("js-yaml");
const parse_link_header_1 = require("./parse_link_header");
class BuildkiteClient {
    constructor(config = {}) {
        var _a, _b, _c, _d, _e;
        this.getBuild = async (pipelineSlug, buildNumber, includeRetriedJobs = false) => {
            // TODO properly assemble URL
            const link = `v2/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}?include_retried_jobs=${includeRetriedJobs.toString()}`;
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
            let success;
            // "Manual" steps are for input, when they are skipped, they have state: broken in the API
            // So let's always mark them as successful, they can't really fail
            // `broken` used to be in this list, but has been removed, it's essentially another type of skip status
            // https://buildkite.com/docs/pipelines/defining-steps#job-states - See "Differentiating between broken, skipped and canceled states:"
            success =
                job.type === 'manual' ||
                    !['failed', 'timed_out', 'timing_out', 'waiting_failed', 'unblocked_failed', 'blocked_failed'].includes(job.state);
            return {
                success,
                state: job.state,
            };
        };
        this.getBuildStatus = (build) => {
            var _a, _b;
            let hasRetries = false;
            let hasNonPreemptionRetries = false;
            let success = build.state !== 'failed';
            for (const job of build.jobs) {
                if (job.retried) {
                    hasRetries = true;
                    const isPreemptionFailure = job.state === 'failed' && ((_b = (_a = job.agent) === null || _a === void 0 ? void 0 : _a.meta_data) === null || _b === void 0 ? void 0 : _b.includes('spot=true')) && job.exit_status === -1;
                    if (!isPreemptionFailure) {
                        hasNonPreemptionRetries = true;
                    }
                }
                const state = this.getJobStatus(build, job);
                success = success && state.success;
            }
            return {
                state: build.state,
                success,
                hasRetries,
                hasNonPreemptionRetries,
            };
        };
        this.getCurrentBuildStatus = async (includeRetriedJobs = false) => {
            return this.getBuildStatus(await this.getCurrentBuild(includeRetriedJobs));
        };
        this.getArtifacts = async (pipelineSlug, buildNumber) => {
            let link = `v2/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}/artifacts?per_page=100`;
            const artifacts = [];
            // Don't get stuck in an infinite loop or follow more than 50 pages
            for (let i = 0; i < 50; i++) {
                if (!link) {
                    break;
                }
                const resp = await this.http.get(link);
                link = '';
                artifacts.push(await resp.data);
                if (resp.headers.link) {
                    const result = parse_link_header_1.default(resp.headers.link);
                    if (result === null || result === void 0 ? void 0 : result.next) {
                        link = result.next;
                    }
                }
            }
            return artifacts.flat();
        };
        this.getArtifactsForCurrentBuild = () => {
            if (!process.env.BUILDKITE_PIPELINE_SLUG || !process.env.BUILDKITE_BUILD_NUMBER) {
                throw new Error('BUILDKITE_PIPELINE_SLUG and BUILDKITE_BUILD_NUMBER must be set to get current build');
            }
            return this.getArtifacts(process.env.BUILDKITE_PIPELINE_SLUG, process.env.BUILDKITE_BUILD_NUMBER);
        };
        // https://buildkite.com/docs/apis/rest-api/builds#create-a-build
        this.triggerBuild = async (pipelineSlug, options) => {
            const url = `v2/organizations/${this.org}/pipelines/${pipelineSlug}/builds`;
            return (await this.http.post(url, options)).data;
        };
        this.setMetadata = (key, value) => {
            child_process_1.execSync(`buildkite-agent meta-data set '${key}'`, {
                input: value,
                stdio: ['pipe', 'inherit', 'inherit'],
            });
        };
        this.setAnnotation = (context, style, value) => {
            child_process_1.execSync(`buildkite-agent annotate --context '${context}' --style '${style}'`, {
                input: value,
                stdio: ['pipe', 'inherit', 'inherit'],
            });
        };
        this.uploadArtifacts = (pattern) => {
            child_process_1.execSync(`buildkite-agent artifact upload '${pattern}'`, {
                stdio: ['ignore', 'inherit', 'inherit'],
            });
        };
        this.uploadSteps = (steps) => {
            child_process_1.execSync(`buildkite-agent pipeline upload`, {
                input: js_yaml_1.dump({ steps }),
                stdio: ['pipe', 'inherit', 'inherit'],
            });
        };
        const BUILDKITE_BASE_URL = (_b = (_a = config.baseUrl) !== null && _a !== void 0 ? _a : process.env.BUILDKITE_BASE_URL) !== null && _b !== void 0 ? _b : 'https://api.buildkite.com';
        const BUILDKITE_TOKEN = (_c = config.token) !== null && _c !== void 0 ? _c : process.env.BUILDKITE_TOKEN;
        this.org = (_e = (_d = config.org) !== null && _d !== void 0 ? _d : process.env.BUILDKITE_ORG) !== null && _e !== void 0 ? _e : 'elastic';
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
