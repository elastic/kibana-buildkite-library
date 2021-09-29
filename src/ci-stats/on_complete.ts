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
  }
}
