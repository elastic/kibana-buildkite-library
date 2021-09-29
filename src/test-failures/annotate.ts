import { execSync } from 'child_process';
import { mkdirSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { BuildkiteClient } from '..';
import { Artifact } from '../buildkite/types/artifact';

const buildkite = new BuildkiteClient();

export type TestFailure = {
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

const recursiveReadDir = (dirPath: string, allFiles: string[] = []) => {
  const files = readdirSync(dirPath);

  for (const file of files) {
    if (statSync(join(dirPath, file)).isDirectory()) {
      allFiles = recursiveReadDir(join(dirPath, file), allFiles);
    } else {
      allFiles.push(join(dirPath, file));
    }
  }

  return allFiles;
};

export const getAnnotation = (
  failures: TestFailure[],
  failureHtmlArtifacts: Record<string, Artifact>,
): string => {
  return (
    `**Test Failures**\n` +
    failures
      .map((failure) => {
        const jobUrl = `${failure.url}#${failure.jobId}`;
        const artifactUrl =
          failure.hash in failureHtmlArtifacts
            ? `${jobUrl}/artifacts/${failureHtmlArtifacts[failure.hash].id}`
            : '';

        const logsLink = artifactUrl ? ` [[logs]](${artifactUrl})` : '';

        return `[[job]](${jobUrl})${logsLink} ${failure.jobName} / ${failure.name}`;
      })
      .join('<br />\n')
  );
};

export const getPrComment = (
  failures: TestFailure[],
  failureHtmlArtifacts: Record<string, Artifact>,
): string => {
  return (
    `### Test Failures\n` +
    failures
      .map((failure) => {
        const jobUrl = `${failure.url}#${failure.jobId}`;
        const artifactUrl =
          failure.hash in failureHtmlArtifacts
            ? `${jobUrl}/artifacts/${failureHtmlArtifacts[failure.hash].id}`
            : '';

        const logsLink = artifactUrl ? ` [[logs]](${artifactUrl})` : '';

        return `[[job]](${jobUrl})${logsLink} ${failure.jobName} / ${failure.name}`;
      })
      .join('<br />\n')
  );
};

export const getSlackMessage = (
  failures: TestFailure[],
  failureHtmlArtifacts: Record<string, Artifact>,
): string => {
  return (
    `*Test Failures*\n` +
    failures
      .map((failure) => {
        const jobUrl = `${failure.url}#${failure.jobId}`;
        const artifactUrl =
          failure.hash in failureHtmlArtifacts
            ? `${jobUrl}/artifacts/${failureHtmlArtifacts[failure.hash].id}`
            : '';

        const logsLink = artifactUrl ? ` <${artifactUrl}|[logs]>` : '';

        return `<${jobUrl}|[job]>${logsLink} ${failure.jobName} / ${failure.name}`;
      })
      .join('<br />\n')
  );
};

export const annotateTestFailures = async () => {
  const exec = (cmd: string) => execSync(cmd, { stdio: 'inherit' });

  const failureDir = 'target/process-test-failures';
  mkdirSync(failureDir, { recursive: true });
  exec(`buildkite-agent artifact download "target/test_failures/*/*.json" "${failureDir}"`);

  const artifacts = await buildkite.getArtifactsForCurrentBuild();
  const failureHtmlArtifacts: Record<string, Artifact> = {};
  for (const artifact of artifacts) {
    if (artifact.path.match(/test_failures\/.*?\.html$/)) {
      const [_, hash] = artifact.filename.split('_');
      failureHtmlArtifacts[hash] = artifact;
    }
  }

  const failures: TestFailure[] = recursiveReadDir(failureDir)
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
    .filter((f) => f)
    .sort((a, b) => a.name.localeCompare(b.name));

  buildkite.setAnnotation('test_failures', 'error', getAnnotation(failures, failureHtmlArtifacts));
  buildkite.setMetadata('pr_comment:test_failures:body', getPrComment(failures, failureHtmlArtifacts));
  buildkite.setMetadata('slack:test_failures:body', getSlackMessage(failures, failureHtmlArtifacts));
};
