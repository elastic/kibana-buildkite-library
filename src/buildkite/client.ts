/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import axios, { AxiosInstance } from 'axios';
import { execSync } from 'child_process';
import parseLinkHeader from './parse_link_header';
import { Artifact } from './types/artifact';
import { Build, BuildStatus } from './types/build';
import { Job, JobState } from './types/job';

export type BuildkiteClientConfig = {
  baseUrl?: string;
  token?: string;
};

export class BuildkiteClient {
  http: AxiosInstance;

  constructor(config: BuildkiteClientConfig = {}) {
    const BUILDKITE_BASE_URL =
      config.baseUrl ?? process.env.BUILDKITE_BASE_URL ?? 'https://api.buildkite.com';
    const BUILDKITE_TOKEN = config.token ?? process.env.BUILDKITE_TOKEN;

    // const BUILDKITE_AGENT_BASE_URL =
    //   process.env.BUILDKITE_AGENT_BASE_URL || 'https://agent.buildkite.com/v3';
    // const BUILDKITE_AGENT_TOKEN = process.env.BUILDKITE_AGENT_TOKEN;

    this.http = axios.create({
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

  getBuild = async (
    pipelineSlug: string,
    buildNumber: string | number,
    includeRetriedJobs = false,
  ): Promise<Build> => {
    // TODO properly assemble URL
    const link = `v2/organizations/elastic/pipelines/${pipelineSlug}/builds/${buildNumber}?include_retried_jobs=${includeRetriedJobs.toString()}`;
    const resp = await this.http.get(link);
    return resp.data as Build;
  };

  getCurrentBuild = (includeRetriedJobs = false) => {
    if (!process.env.BUILDKITE_PIPELINE_SLUG || !process.env.BUILDKITE_BUILD_NUMBER) {
      throw new Error('BUILDKITE_PIPELINE_SLUG and BUILDKITE_BUILD_NUMBER must be set to get current build');
    }

    return this.getBuild(
      process.env.BUILDKITE_PIPELINE_SLUG,
      process.env.BUILDKITE_BUILD_NUMBER,
      includeRetriedJobs,
    );
  };

  getJobStatus = (build: Build, job: Job): { success: boolean; state: JobState } => {
    if (job.retried) {
      const retriedJob = build.jobs.find((j) => j.id === job.retried_in_job_id);
      if (!retriedJob) {
        throw Error(`Couldn't find retried job ID ${job.retried_in_job_id} for job ${job.id}`);
      }

      return this.getJobStatus(build, retriedJob);
    }

    let success: boolean;

    // Skipped jobs are "broken" via the API, but they're not really failures
    if (job.type === 'script' && job.state === 'broken' && job.exit_status === null) {
      success = true;
    } else {
      // "Manual" steps are for input, when they are skipped, they have state: broken in the API
      // So let's always mark them as successful, they can't really fail
      success = job.type === 'manual' || !['failed', 'timed_out', 'timing_out', 'broken'].includes(job.state);
    }

    return {
      success,
      state: job.state,
    };
  };

  getBuildStatus = (build: Build): BuildStatus => {
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

  getCurrentBuildStatus = async (includeRetriedJobs = false) => {
    return this.getBuildStatus(await this.getCurrentBuild(includeRetriedJobs));
  };

  getArtifacts = async (pipelineSlug: string, buildNumber: string | number): Promise<Artifact[]> => {
    let link = `v2/organizations/elastic/pipelines/${pipelineSlug}/builds/${buildNumber}/artifacts?per_page=100`;
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
        const result = parseLinkHeader(resp.headers.link as string);
        if (result?.next) {
          link = result.next;
        }
      }
    }

    return artifacts.flat();
  };

  getArtifactsForCurrentBuild = (): Promise<Artifact[]> => {
    if (!process.env.BUILDKITE_PIPELINE_SLUG || !process.env.BUILDKITE_BUILD_NUMBER) {
      throw new Error('BUILDKITE_PIPELINE_SLUG and BUILDKITE_BUILD_NUMBER must be set to get current build');
    }

    return this.getArtifacts(process.env.BUILDKITE_PIPELINE_SLUG, process.env.BUILDKITE_BUILD_NUMBER);
  };

  setMetadata = (key: string, value: string) => {
    execSync(`buildkite-agent meta-data set '${key}'`, {
      input: value,
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  };

  setAnnotation = (context: string, style: 'info' | 'success' | 'warning' | 'error', value: string) => {
    execSync(`buildkite-agent annotate --context '${context}' --style '${style}'`, {
      input: value,
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  };
}
