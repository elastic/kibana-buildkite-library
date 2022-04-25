import * as Fs from 'fs';

import * as globby from 'globby';

import { BuildkiteClient } from '../buildkite';
import { CiStatsClient, TestGroupRunOrderResponse } from './client';

type RunGroup = TestGroupRunOrderResponse['types'][0];

function getRunGroup(bk: BuildkiteClient, types: RunGroup[], typeName: string): RunGroup {
  const type = types.find((t) => t.type === typeName);
  if (!type) {
    throw new Error(`missing test group run order for group [${typeName}]`);
  }

  const misses = type.namesWithoutDurations.length;
  if (misses > 0) {
    bk.setAnnotation(
      `test-group-missing-durations:${typeName}`,
      'warning',
      [
        misses === 1
          ? `The following ${typeName} config doesn't have a recorded time in ci-stats so the Jest groups might be a little unbalanced.`
          : `The following ${typeName} configs don't have recorded times in ci-stats so the Jest groups might be a little unbalanced.`,
        misses === 1
          ? `If this is a new config then this warning can be ignored as times will be reported soon.`
          : `If these are new configs then this warning can be ignored as times will be reported soon.`,
        misses === 1
          ? `The other possibility is that there aren't any tests in this config, so times are never reported.`
          : `The other possibility is that there aren't any tests in these configs, so times are never reported.`,
        'Empty Jest config files should be removed',
        '',
        ...type.namesWithoutDurations.map((n) => ` - ${n}`),
      ].join('\n'),
    );
  }

  return type;
}

function getTrackedBranch(): string {
  let pkg;
  try {
    pkg = JSON.parse(Fs.readFileSync('package.json', 'utf8'));
  } catch (_) {
    const error = _ instanceof Error ? _ : new Error(`${_} thrown`);
    throw new Error(`unable to read kibana's package.json file: ${error.message}`);
  }

  const branch = pkg.branch;
  if (typeof branch !== 'string') {
    throw new Error('missing `branch` field from package.json file');
  }

  return branch;
}

export async function pickJestConfigRunOrder() {
  const bk = new BuildkiteClient();
  const ciStats = new CiStatsClient();

  // these keys are synchronized in a few placed by storing them in the env during builds
  const unitType = process.env.TEST_GROUP_TYPE_UNIT;
  const integrationType = process.env.TEST_GROUP_TYPE_INTEGRATION;
  if (!unitType || !integrationType) {
    throw new Error('missing jest test group type environment variables');
  }

  const configFiles = globby.sync(
    ['**/jest.config.js', '**/jest.integration.config.js', '!**/__fixtures__/**'],
    {
      cwd: process.cwd(),
      absolute: false,
    },
  );

  const { sourceBuild, types } = await ciStats.pickTestGroupRunOrder({
    sources: [
      // try to get times from a recent successful job on this PR
      ...(process.env.GITHUB_PR_NUMBER
        ? [
            {
              prId: process.env.GITHUB_PR_NUMBER,
              jobName: 'kibana-pull-request',
            },
          ]
        : []),
      // try to get times from the mergeBase commit
      ...(process.env.GITHUB_PR_MERGE_BASE
        ? [
            {
              commit: process.env.GITHUB_PR_MERGE_BASE,
              jobName: 'kibana-on-merge',
            },
          ]
        : []),
      // fallback to the latest times from the tracked branch
      {
        branch: getTrackedBranch(),
        jobName: 'kibana-on-merge',
      },
    ],
    targetDurationMin: 40,
    maxDurationMin: 45,
    groups: [
      {
        type: unitType,
        defaultDurationMin: 3,
        names: configFiles.filter((p) => p.endsWith('jest.config.js')),
      },
      {
        type: integrationType,
        defaultDurationMin: 10,
        names: configFiles.filter((p) => p.endsWith('jest.integration.config.js')),
      },
    ],
  });

  console.log('test run order is determined by build:');
  console.dir(sourceBuild, { depth: Infinity });

  const unit = getRunGroup(bk, types, unitType);
  const integration = getRunGroup(bk, types, integrationType);

  // write the config for each step to an artifact that can be used by the individual jest jobs
  Fs.writeFileSync('jest_run_order.json', JSON.stringify({ unit, integration }, null, 2));
  bk.uploadArtifacts('jest_run_order.json');

  // upload the step definitions to Buildkite
  bk.uploadSteps([
    {
      label: 'Jest Tests',
      command: '.buildkite/scripts/steps/test/jest.sh',
      parallelism: unit.count,
      timeout_in_minutes: 90,
      key: 'jest',
      agents: {
        queue: 'n2-4-spot',
      },
      retry: {
        automatic: [
          {
            exit_status: '-1',
            limit: 3,
          },
        ],
      },
    },
    {
      label: 'Jest Integration Tests',
      command: '.buildkite/scripts/steps/test/jest_integration.sh',
      parallelism: integration.count,
      timeout_in_minutes: 120,
      key: 'jest-integration',
      agents: {
        queue: 'n2-4-spot',
      },
      retry: {
        automatic: [
          {
            exit_status: '-1',
            limit: 3,
          },
        ],
      },
    },
  ]);
}
