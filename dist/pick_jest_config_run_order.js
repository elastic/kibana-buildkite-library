"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickJestConfigRunOrder = void 0;
const globby = require("globby");
const Fs = require("fs");
const ci_stats_1 = require("./ci-stats");
const ciStats = new ci_stats_1.CiStatsClient();
async function pickJestConfigRunOrder() {
    let pkg;
    try {
        pkg = JSON.parse(Fs.readFileSync('package.json', 'utf8'));
    }
    catch (_) {
        const error = _ instanceof Error ? _ : new Error(`${_} thrown`);
        throw new Error(`unable to read kibana's package.json file: ${error.message}`);
    }
    const configFiles = globby.sync(['**/jest.config.js', '**/jest.integration.config.js', '!**/__fixtures__/**'], {
        cwd: process.cwd(),
        absolute: false,
    });
    return await ciStats.pickJestConfigRunOrder(pkg.branch, configFiles.filter((p) => p.endsWith('jest.config.js')), configFiles.filter((p) => p.endsWith('jest.integration.config.js')));
}
exports.pickJestConfigRunOrder = pickJestConfigRunOrder;
//# sourceMappingURL=pick_jest_config_run_order.js.map