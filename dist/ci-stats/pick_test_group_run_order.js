"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickTestGroupRunOrder = void 0;
const Fs = require("fs");
const globby = require("globby");
const js_yaml_1 = require("js-yaml");
const buildkite_1 = require("../buildkite");
const client_1 = require("./client");
const getRequiredEnv = (name) => {
    const value = process.env[name];
    if (typeof value !== 'string' || !value) {
        throw new Error(`Missing required environment variable "${name}"`);
    }
    return value;
};
function getRunGroup(bk, types, typeName) {
    var _a, _b, _c;
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
    const tooLongs = (_b = (_a = type.tooLong) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    if (tooLongs > 0) {
        bk.setAnnotation(`test-group-too-long:${typeName}`, 'error', [
            tooLongs === 1
                ? `The following "${typeName}" config has a duration that exceeds the maximum amount of time desired for a single CI job. Please split it up.`
                : `The following "${typeName}" configs have durations that exceed the maximum amount of time desired for a single CI job. Please split them up.`,
            '',
            ...((_c = type.tooLong) !== null && _c !== void 0 ? _c : []).map(({ config, durationMin }) => ` - ${config}: ${durationMin} minutes`),
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
async function pickTestGroupRunOrder() {
    const bk = new buildkite_1.BuildkiteClient();
    const ciStats = new client_1.CiStatsClient();
    // these keys are synchronized in a few placed by storing them in the env during builds
    const UNIT_TYPE = getRequiredEnv('TEST_GROUP_TYPE_UNIT');
    const INTEGRATION_TYPE = getRequiredEnv('TEST_GROUP_TYPE_INTEGRATION');
    const FUNCTIONAL_TYPE = getRequiredEnv('TEST_GROUP_TYPE_FUNCTIONAL');
    const JEST_UNIT_SCRIPT = getRequiredEnv('JEST_UNIT_SCRIPT');
    const JEST_INTEGRATION_SCRIPT = getRequiredEnv('JEST_INTEGRATION_SCRIPT');
    const FTR_CONFIGS_SCRIPT = getRequiredEnv('FTR_CONFIGS_SCRIPT');
    const TYPE_FILTERS = process.env.LIMIT_CONFIG_TYPE
        ? process.env.LIMIT_CONFIG_TYPE.split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;
    const ftrConfigs = !TYPE_FILTERS || TYPE_FILTERS.includes('functional') ? getEnabledFtrConfigs() : [];
    const jestUnitConfigs = !TYPE_FILTERS || TYPE_FILTERS.includes('unit')
        ? globby.sync(['**/jest.config.js', '!**/__fixtures__/**'], {
            cwd: process.cwd(),
            absolute: false,
        })
        : [];
    const jestIntegrationConfigs = !TYPE_FILTERS || TYPE_FILTERS.includes('integration')
        ? globby.sync(['**/jest.integration.config.js', '!**/__fixtures__/**'], {
            cwd: process.cwd(),
            absolute: false,
        })
        : [];
    if (!ftrConfigs.length && !jestUnitConfigs.length && !jestIntegrationConfigs.length) {
        throw new Error('unable to find any unit, integration, or FTR configs');
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
                overheadMin: 0.2,
                names: jestUnitConfigs,
            },
            {
                type: INTEGRATION_TYPE,
                defaultMin: 10,
                maxMin: 50,
                overheadMin: 0.2,
                names: jestIntegrationConfigs,
            },
            {
                type: FUNCTIONAL_TYPE,
                defaultMin: 60,
                maxMin: 37,
                overheadMin: 1.5,
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
        unit.count > 0
            ? {
                label: 'Jest Tests',
                command: JEST_UNIT_SCRIPT,
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
            }
            : [],
        integration.count > 0
            ? {
                label: 'Jest Integration Tests',
                command: JEST_INTEGRATION_SCRIPT,
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
            }
            : [],
        functional.count > 0
            ? {
                label: 'FTR Configs',
                command: FTR_CONFIGS_SCRIPT,
                parallelism: functional.count,
                timeout_in_minutes: 150,
                key: 'ftr-configs',
                depends_on: 'build',
                agents: {
                    queue: 'n2-4-spot-2',
                },
                retry: {
                    automatic: [
                        { exit_status: '-1', limit: 3 },
                        { exit_status: '*', limit: 1 },
                    ],
                },
            }
            : [],
    ].flat());
}
exports.pickTestGroupRunOrder = pickTestGroupRunOrder;
//# sourceMappingURL=pick_test_group_run_order.js.map