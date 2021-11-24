import { setTimeout } from 'timers/promises';
import axios, { AxiosInstance, Method, AxiosRequestConfig } from 'axios';

export type CiStatsClientConfig = {
  baseUrl?: string;
  token?: string;
};

export type CiStatsBuild = {
  id: string;
};

export type CiStatsPrReport = {
  md: string;
  success: boolean;
};

interface RequestOptions {
  path: string;
  method?: Method;
  params?: AxiosRequestConfig['params'];
  body?: AxiosRequestConfig['data'];
  maxAttempts?: number;
}

export class CiStatsClient {
  http: AxiosInstance;

  constructor(config: CiStatsClientConfig = {}) {
    const CI_STATS_HOST = config.baseUrl ?? process.env.CI_STATS_HOST;
    const CI_STATS_TOKEN = config.token ?? process.env.CI_STATS_TOKEN;

    this.http = axios.create({
      baseURL: `https://${CI_STATS_HOST}`,
      headers: {
        Authorization: `token ${CI_STATS_TOKEN}`,
      },
    });
  }

  createBuild = async () => {
    const resp = await this.request<CiStatsBuild>({
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

  addGitInfo = async (buildId: string) => {
    await this.request({
      method: 'POST',
      path: '/v1/git_info',
      params: {
        buildId,
      },
      body: {
        branch: (process.env.BUILDKITE_BRANCH || '').replace(/^(refs\/heads\/|origin\/)/, ''),
        commit: process.env.BUILDKITE_COMMIT,
        targetBranch:
          process.env.GITHUB_PR_TARGET_BRANCH || process.env.BUILDKITE_PULL_REQUEST_BASE_BRANCH || null,
        mergeBase: process.env.GITHUB_PR_MERGE_BASE || null,
      },
    });
  };

  completeBuild = async (buildStatus: string, buildId = process.env.CI_STATS_BUILD_ID) => {
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

  getPrReport = async (buildId = process.env.CI_STATS_BUILD_ID) => {
    const resp = await this.request<CiStatsPrReport>({
      path: `v2/pr_report`,
      params: {
        buildId,
      },
    });

    return resp.data;
  };

  private async request<T>({ method, path, params, body, maxAttempts = 3 }: RequestOptions) {
    let attempt = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt += 1;
      try {
        return await this.http.request<T>({
          method,
          url: path,
          params,
          data: body,
        });
      } catch (error) {
        console.error('CI Stats request error:', error);

        if (attempt < maxAttempts) {
          const sec = attempt * 3;
          console.log('waiting', sec, 'seconds before retrying');
          await setTimeout(sec * 1000);
          continue;
        }

        throw error;
      }
    }
  }
}
