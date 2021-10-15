import axios, { AxiosInstance } from 'axios';

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

  createBuild = async (): Promise<CiStatsBuild> => {
    const resp = await this.http.post('/v1/build', {
      jenkinsJobName: process.env.BUILDKITE_PIPELINE_SLUG,
      jenkinsJobId: process.env.BUILDKITE_BUILD_NUMBER,
      jenkinsUrl: process.env.BUILDKITE_BUILD_URL,
      prId: process.env.GITHUB_PR_NUMBER || null,
    });

    return resp.data;
  };

  addGitInfo = (buildId: string) => {
    return this.http.post(`/v1/git_info?buildId=${buildId}`, {
      branch: (process.env.BUILDKITE_BRANCH || '').replace(/^(refs\/heads\/|origin\/)/, ''),
      commit: process.env.BUILDKITE_COMMIT,
      targetBranch:
        process.env.GITHUB_PR_TARGET_BRANCH || process.env.BUILDKITE_PULL_REQUEST_BASE_BRANCH || null,
      mergeBase: process.env.GITHUB_PR_MERGE_BASE || null,
    });
  };

  completeBuild = (buildStatus: string, buildId = process.env.CI_STATS_BUILD_ID) => {
    return this.http.post(`/v1/build/_complete?id=${buildId}`, {
      result: buildStatus,
    });
  };

  getPrReport = async (buildId = process.env.CI_STATS_BUILD_ID): Promise<CiStatsPrReport> => {
    const resp = await this.http.get(`v2/pr_report?buildId=${buildId}`);

    return resp.data;
  };
}
