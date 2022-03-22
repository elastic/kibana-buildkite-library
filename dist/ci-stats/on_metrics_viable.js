"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMetricsViable = void 0;
const client_1 = require("./client");
const ciStats = new client_1.CiStatsClient();
async function onMetricsViable() {
    if (!process.env.CI_STATS_BUILD_ID) {
        return;
    }
    console.log('Marking build as a "valid baseline" so that it can be used to power PR reports');
    await ciStats.markBuildAsValidBaseline(process.env.CI_STATS_BUILD_ID);
}
exports.onMetricsViable = onMetricsViable;
//# sourceMappingURL=on_metrics_viable.js.map