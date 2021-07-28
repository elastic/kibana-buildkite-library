import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export type CiStatsClientConfig = {
  hostname?: string;
  token?: string;
  baseRetryMs?: number;
  console?: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
};

export type CiStatsBuild = {
  id: string;
};

const MAX_ATTEMPTS = 5;

export class CiStatsClient {
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;
  private readonly baseRetryMs: number;
  private readonly console: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };

  constructor(config: CiStatsClientConfig = {}) {
    const CI_STATS_HOST = config.hostname ?? process.env.CI_STATS_HOST;
    const CI_STATS_TOKEN = config.token ?? process.env.CI_STATS_TOKEN;
    this.baseRetryMs = config.baseRetryMs ?? 5000;
    this.console = config.console ?? console;

    this.baseUrl = `https://${CI_STATS_HOST}`;
    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `token ${CI_STATS_TOKEN}`,
      },
    });
  }

  async createBuild() {
    return await this.req<CiStatsBuild>({
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

  async addGitInfo(buildId: string) {
    await this.req({
      url: `/v1/git_info?buildId=${buildId}`,
      method: 'POST',
      data: {
        branch: (process.env.BUILDKITE_BRANCH || '').replace(/^(refs\/heads\/|origin\/)/, ''),
        commit: process.env.BUILDKITE_COMMIT,
        targetBranch:
          process.env.GITHUB_PR_TARGET_BRANCH || process.env.BUILDKITE_PULL_REQUEST_BASE_BRANCH || null,
        mergeBase: process.env.GITHUB_PR_MERGE_BASE || null, // TODO confirm GITHUB_PR_MERGE_BASE or switch to final var
      },
    });
  }

  async completeBuild(buildStatus: string, buildId = process.env.CI_STATS_BUILD_ID) {
    await this.req({
      url: `/v1/build/_complete?id=${buildId}`,
      method: 'POST',
      data: {
        result: buildStatus,
      },
    });
  }

  private async req<R>(options: AxiosRequestConfig) {
    let attempt = 0;

    // eslint-disable-next-line no-constant-condition
    attemptRequest: while (true) {
      attempt += 1;

      try {
        const resp = await this.http.request<R>(options);
        return resp.data;
      } catch (error) {
        const status: number | undefined = error?.response?.status;

        if (attempt < MAX_ATTEMPTS && (typeof status === 'undefined' || status >= 500)) {
          const delay = attempt * this.baseRetryMs;
          this.console.error(
            `${status} response from ${this.baseUrl}, retrying in`,
            delay / 1000,
            'seconds:',
            'toJSON' in error && typeof error.toJSON === 'function' ? error.toJSON() : error,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue attemptRequest;
        }

        throw error;
      }
    }
  }
}
