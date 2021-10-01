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
        buildkite.setMetadata('pr_comment:ci_stats_report:body', report.md);

        const annotationType = report?.success ? 'info' : 'error';
        buildkite.setAnnotation('ci-stats-report', annotationType, report.md);
      }

      if (report && !report.success) {
        console.log('+++ CI Stats Report');
        console.error('Failing build due to CI Stats report. See annotation at top of build.');
        process.exit(1);
      }
    }
  }
}
