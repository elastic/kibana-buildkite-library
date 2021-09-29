import { execSync } from 'child_process';
import { mkdirSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { BuildkiteClient } from '..';
import { Artifact } from '../buildkite/types/artifact';

const buildkite = new BuildkiteClient();

type TestFailure = {
  name: string;
  classname: string;
  time: string;
  'metadata-json'?: string | undefined;
  failure: string;
  likelyIrrelevant: boolean;
  'system-out'?: string | undefined;
  hash: string;
  buildId: string;
  jobId: string;
  url: string;
  jobName: string;
};

export const annotateTestFailures = async () => {
  const exec = (cmd: string) => execSync(cmd, { stdio: 'inherit' });

  const failureDir = 'target/process-test-failures';
  mkdirSync(failureDir, { recursive: true });
  exec(`buildkite-agent artifact download "test_failures/*/*.json" "${failureDir}"`);

  const artifacts = await buildkite.getArtifactsForCurrentBuild();
  const failureHtmlArtifacts: Record<string, Artifact> = {};
  for (const artifact of artifacts) {
    if (artifact.path.match(/test_failures\/.*?\.html$/)) {
      const [_, hash] = artifact.filename.split('_');
      failureHtmlArtifacts[hash] = artifact;
    }
  }

  const failures: TestFailure[] = readdirSync(failureDir)
    .map((file) => {
      try {
        if (file.endsWith('.json')) {
          return JSON.parse(readFileSync(join(failureDir, file)).toString());
        }
      } catch (ex) {
        console.error((ex as Error).message);
      }
      return null;
    })
    .filter((f) => f);

  const failuresMarkdown =
    `**Test Failures**\n` +
    failures
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((failure) => {
        const jobUrl = `${failure.url}#${failure.jobId}`;
        const artifactUrl =
          failure.hash in failureHtmlArtifacts
            ? `${jobUrl}/artifacts/${failureHtmlArtifacts[failure.hash].id}`
            : '';

        const logsLink = artifactUrl ? ` [[logs]](${artifactUrl})` : '';

        return `[[job]](${jobUrl})${logsLink} ${failure.jobName} / ${failure.name}`;
      })
      .join('<br />\n');

  buildkite.setAnnotation('test_failures', 'error', failuresMarkdown);
  buildkite.setMetadata('pr_comment:test_failures:body', failuresMarkdown);
  buildkite.setMetadata('slack:test_failures:body', failuresMarkdown); // TODO links are a different format

  console.log(failuresMarkdown);
};
