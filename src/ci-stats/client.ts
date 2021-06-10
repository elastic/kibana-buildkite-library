import axios, { AxiosInstance } from 'axios';

export type CiStatsClientConfig = {
  baseUrl?: string;
  token?: string;
};

export type CiStatsBuild = {
  id: string;
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

  createBuild = async () => {
    const resp = await this.http.post('/v1/build', {
      jenkinsJobName: process.env.BUILDKITE_PIPELINE_NAME,
      jenkinsJobId: process.env.BUILDKITE_BUILD_ID,
      jenkinsUrl: process.env.BUILDKITE_BUILD_URL,
      prId: process.env.GITHUB_PR_NUMBER || null,
    });

    return resp.data as CiStatsBuild;
  };

  addGitInfo = (buildId: string) => {
    return this.http.post(`/v1/git_info?buildId=${buildId}`, {
      branch: (process.env.BUILDKITE_BRANCH || '').replace(/^(refs\/heads\/|origin\/)/, ''),
      commit: process.env.BUILDKITE_COMMIT,
      targetBranch:
        process.env.GITHUB_PR_TARGET_BRANCH || process.env.BUILDKITE_PULL_REQUEST_BASE_BRANCH || null,
      mergeBase: process.env.GITHUB_PR_MERGE_BASE || null, // TODO confirm GITHUB_PR_MERGE_BASE or switch to final var
    });
  };

  completeBuild = (buildStatus: string, buildId = process.env.CI_STATS_BUILD_ID) => {
    return this.http.post(`/v1/build/_complete?id=${buildId}`, {
      result: buildStatus,
    });
  };
}
