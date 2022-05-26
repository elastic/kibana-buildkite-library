"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doAnyChangesMatch = exports.areChangesSkippable = exports.getPrChangesCached = exports.getPrChanges = void 0;
const rest_1 = require("@octokit/rest");
const github = new rest_1.Octokit({
    auth: process.env.GITHUB_TOKEN,
});
let prChangesCache = null;
exports.getPrChanges = async (owner = process.env.GITHUB_PR_BASE_OWNER, repo = process.env.GITHUB_PR_BASE_REPO, prNumber = process.env.GITHUB_PR_NUMBER) => {
    if (!owner || !repo || !prNumber) {
        throw "Couldn't retrieve Github PR info from environment variables in order to retrieve PR changes";
    }
    const files = await github.paginate(github.pulls.listFiles, {
        owner,
        repo,
        pull_number: typeof prNumber === 'number' ? prNumber : parseInt(prNumber),
        per_page: 100,
    });
    return files;
};
exports.getPrChangesCached = async () => {
    prChangesCache = prChangesCache || (await exports.getPrChanges());
    return prChangesCache;
};
exports.areChangesSkippable = async (skippablePaths, requiredPaths = [], changes = null) => {
    const prChanges = changes || (await exports.getPrChangesCached());
    if (prChanges.length >= 3000) {
        return false;
    }
    if (requiredPaths === null || requiredPaths === void 0 ? void 0 : requiredPaths.length) {
        const someFilesMatchRequired = requiredPaths.some((path) => prChanges.some((change) => { var _a; return change.filename.match(path) || ((_a = change.previous_filename) === null || _a === void 0 ? void 0 : _a.match(path)); }));
        if (someFilesMatchRequired) {
            return false;
        }
    }
    const someFilesNotSkippable = prChanges.some((change) => !skippablePaths.some((path) => change.filename.match(path) && (!change.previous_filename || change.previous_filename.match(path))));
    return !someFilesNotSkippable;
};
exports.doAnyChangesMatch = async (requiredPaths, changes = null) => {
    const prChanges = changes || (await exports.getPrChangesCached());
    if (prChanges.length >= 3000) {
        return true;
    }
    const anyFilesMatchRequired = requiredPaths.some((path) => prChanges.some((change) => { var _a; return change.filename.match(path) || ((_a = change.previous_filename) === null || _a === void 0 ? void 0 : _a.match(path)); }));
    return anyFilesMatchRequired;
};
