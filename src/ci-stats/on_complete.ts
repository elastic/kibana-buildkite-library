import { execSync } from 'child_process';
import { BuildkiteClient } from '../buildkite';
import { CiStatsClient } from './client';

const buildkite = new BuildkiteClient();
const ciStats = new CiStatsClient();

export async function onComplete() {
  if (process.env.CI_STATS_BUILD_ID) {
    const result = buildkite.getBuildStatus(await buildkite.getCurrentBuild());
    const status = result.success ? 'SUCCESS' : 'FAILURE';
    console.log('Job Status:', result);
    await ciStats.completeBuild(status);

    if (process.env.GITHUB_PR_NUMBER) {
      const report = await ciStats.getPrReport(process.env.CI_STATS_BUILD_ID);
      if (report?.md) {
        process.env.CI_STATS_REPORT = report.md;

        execSync('buildkite-agent meta-data set pr_comment:ci_stats_report:body "$CI_STATS_REPORT"', {
          stdio: 'inherit',
        });
      }
    }
  }
}
