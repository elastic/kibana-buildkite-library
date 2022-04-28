"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickTestGroupRunOrder = void 0;
const Fs = require("fs");
const globby = require("globby");
const js_yaml_1 = require("js-yaml");
const buildkite_1 = require("../buildkite");
const client_1 = require("./client");
function getRunGroup(bk, types, typeName) {
    const type = types.find((t) => t.type === typeName);
    if (!type) {
        throw new Error(`missing test group run order for group [${typeName}]`);
    }
    const misses = type.namesWithoutDurations.length;
    if (misses > 0) {
        bk.setAnnotation(`test-group-missing-durations:${typeName}`, 'warning', [
            misses === 1
                ? `The following "${typeName}" config doesn't have a recorded time in ci-stats so the automatically-determined test groups might be a little unbalanced.`
                : `The following "${typeName}" configs don't have recorded times in ci-stats so the automatically-determined test groups might be a little unbalanced.`,
            misses === 1
                ? `If this is a new config then this warning can be ignored as times will be reported soon.`
                : `If these are new configs then this warning can be ignored as times will be reported soon.`,
            misses === 1
                ? `The other possibility is that there aren't any tests in this config, so times are never reported.`
                : `The other possibility is that there aren't any tests in these configs, so times are never reported.`,
            'Empty test configs should be removed',
            '',
            ...type.namesWithoutDurations.map((n) => ` - ${n}`),
        ].join('\n'));
    }
    return type;
}
function getTrackedBranch() {
    let pkg;
    try {
        pkg = JSON.parse(Fs.readFileSync('package.json', 'utf8'));
    }
    catch (_) {
        const error = _ instanceof Error ? _ : new Error(`${_} thrown`);
        throw new Error(`unable to read kibana's package.json file: ${error.message}`);
    }
    const branch = pkg.branch;
    if (typeof branch !== 'string') {
        throw new Error('missing `branch` field from package.json file');
    }
    return branch;
}
function isObj(x) {
    return typeof x === 'object' && x !== null;
}
function getEnabledFtrConfigs() {
    try {
        const configs = js_yaml_1.load(Fs.readFileSync('.buildkite/ftr_configs.yml', 'utf8'));
        if (!isObj(configs)) {
            throw new Error('expected yaml file to parse to an object');
        }
        if (!configs.enabled) {
            throw new Error('expected yaml file to have an "enabled" key');
        }
        if (!Array.isArray(configs.enabled) ||
            !configs.enabled.every((p) => typeof p === 'string')) {
            throw new Error('expected "enabled" value to be an array of strings');
        }
        return configs.enabled;
    }
    catch (_) {
        const error = _ instanceof Error ? _ : new Error(`${_} thrown`);
        throw new Error(`unable to parse ftr_configs.yml file: ${error.message}`);
    }
}
function filterJestConfigByType(type) {
    return (path) => {
        if (type === 'integration') {
            return path.endsWith('jest.integration.config.js');
        }
        if (type === 'unit') {
            return path.endsWith('jest.config.js');
        }
        return false;
    };
}
async function pickTestGroupRunOrder() {
    const bk = new buildkite_1.BuildkiteClient();
    const ciStats = new client_1.CiStatsClient();
    // these keys are synchronized in a few placed by storing them in the env during builds
    const UNIT_TYPE = process.env.TEST_GROUP_TYPE_UNIT;
    const INTEGRATION_TYPE = process.env.TEST_GROUP_TYPE_INTEGRATION;
    const FUNCTIONAL_TYPE = process.env.TEST_GROUP_TYPE_FUNCTIONAL;
    if (!UNIT_TYPE || !INTEGRATION_TYPE || !FUNCTIONAL_TYPE) {
        throw new Error('missing jest/functional test group type environment variables');
    }
    const ftrConfigs = getEnabledFtrConfigs();
    const jestFiles = globby
        .sync(['**/jest.config.js', '**/jest.integration.config.js', '!**/__fixtures__/**'], {
        cwd: process.cwd(),
        absolute: false,
    })
        .filter(process.env.FILTER_JEST_CONFIG_TYPE
        ? filterJestConfigByType(process.env.FILTER_JEST_CONFIG_TYPE)
        : () => true);
    const unitConfigs = jestFiles.filter(filterJestConfigByType('unit'));
    const integrationConfigs = jestFiles.filter(filterJestConfigByType('integration'));
    if (!unitConfigs.length && !integrationConfigs.length) {
        throw new Error('unable to find any unit or integration configs');
    }
    const { sources, types } = await ciStats.pickTestGroupRunOrder({
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
        groups: [
            {
                type: UNIT_TYPE,
                defaultMin: 3,
                maxMin: 50,
                names: unitConfigs,
            },
            {
                type: INTEGRATION_TYPE,
                defaultMin: 10,
                maxMin: 50,
                names: integrationConfigs,
            },
            {
                type: FUNCTIONAL_TYPE,
                defaultMin: 60,
                maxMin: 40,
                overheadMin: 2.5,
                names: ftrConfigs,
            },
        ],
    });
    console.log('test run order is determined by builds:');
    console.dir(sources, { depth: Infinity, maxArrayLength: Infinity });
    const unit = getRunGroup(bk, types, UNIT_TYPE);
    const integration = getRunGroup(bk, types, INTEGRATION_TYPE);
    const functional = getRunGroup(bk, types, FUNCTIONAL_TYPE);
    // write the config for each step to an artifact that can be used by the individual jest jobs
    Fs.writeFileSync('jest_run_order.json', JSON.stringify({ unit, integration }, null, 2));
    bk.uploadArtifacts('jest_run_order.json');
    // write the config for functional steps to an artifact that can be used by the individual functional jobs
    Fs.writeFileSync('ftr_run_order.json', JSON.stringify(functional, null, 2));
    bk.uploadArtifacts('ftr_run_order.json');
    // upload the step definitions to Buildkite
    bk.uploadSteps([
        // unit.count > 0
        //   ? {
        //       label: 'Jest Tests',
        //       command: '.buildkite/scripts/steps/test/jest.sh',
        //       parallelism: unit.count,
        //       timeout_in_minutes: 90,
        //       key: 'jest',
        //       agents: {
        //         queue: 'n2-4-spot',
        //       },
        //       retry: {
        //         automatic: [
        //           {
        //             exit_status: '-1',
        //             limit: 3,
        //           },
        //         ],
        //       },
        //     }
        //   : [],
        // integration.count > 0
        //   ? {
        //       label: 'Jest Integration Tests',
        //       command: '.buildkite/scripts/steps/test/jest_integration.sh',
        //       parallelism: integration.count,
        //       timeout_in_minutes: 120,
        //       key: 'jest-integration',
        //       agents: {
        //         queue: 'n2-4-spot',
        //       },
        //       retry: {
        //         automatic: [
        //           {
        //             exit_status: '-1',
        //             limit: 3,
        //           },
        //         ],
        //       },
        //     }
        //   : [],
        functional.count > 0
            ? {
                command: '.buildkite/scripts/steps/test/ftr_configs.sh',
                label: 'FTR Configs',
                parallelism: functional.count,
                agents: {
                    queue: 'n2-4-spot-2',
                },
                depends_on: 'build',
                timeout_in_minutes: 150,
                key: 'ftr-configs',
                retry: {
                    automatic: [
                        { exit_status: '-1', limit: 3 },
                    ],
                },
            }
            : [],
    ].flat());
}
exports.pickTestGroupRunOrder = pickTestGroupRunOrder;
//# sourceMappingURL=pick_test_group_run_order.js.map