"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.annotateTestFailures = exports.getSlackMessage = exports.getPrComment = exports.getAnnotation = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const __1 = require("..");
const buildkite = new __1.BuildkiteClient();
const recursiveReadDir = (dirPath, allFiles = []) => {
    const files = (0, fs_1.readdirSync)(dirPath);
    for (const file of files) {
        if ((0, fs_1.statSync)((0, path_1.join)(dirPath, file)).isDirectory()) {
            allFiles = recursiveReadDir((0, path_1.join)(dirPath, file), allFiles);
        }
        else {
            allFiles.push((0, path_1.join)(dirPath, file));
        }
    }
    return allFiles;
};
const getAnnotation = (failures, failureHtmlArtifacts) => {
    return (`**Test Failures**<br />\n` +
        failures
            .map((failure) => {
            const lookup = failure.jobId + failure.hash;
            const jobUrl = `${failure.url}#${failure.jobId}`;
            const artifactUrl = lookup in failureHtmlArtifacts
                ? `${failure.url.replace('https://buildkite.com/elastic', 'https://buildkite.com/organizations/elastic/pipelines')}/jobs/${failure.jobId}/artifacts/${failureHtmlArtifacts[lookup].id}`
                : '';
            const logsLink = artifactUrl ? ` [[logs]](${artifactUrl})` : '';
            return `[[job]](${jobUrl})${logsLink} ${failure.jobName} / ${failure.name}`;
        })
            .join('<br />\n'));
};
exports.getAnnotation = getAnnotation;
const getPrComment = (failures, failureHtmlArtifacts) => {
    return (`### Test Failures\n` +
        failures
            .map((failure) => {
            const lookup = failure.jobId + failure.hash;
            const jobUrl = `${failure.url}#${failure.jobId}`;
            const artifactUrl = lookup in failureHtmlArtifacts
                ? `${failure.url.replace('https://buildkite.com/elastic', 'https://buildkite.com/organizations/elastic/pipelines')}/jobs/${failure.jobId}/artifacts/${failureHtmlArtifacts[lookup].id}`
                : '';
            const logsLink = artifactUrl ? ` [[logs]](${artifactUrl})` : '';
            // failure name could have #<number>, which Github will link to an issue or @<string>,
            // which will send a notification so we need to "escape" it with spans
            const failureString = `${failure.jobName} / ${failure.name}`
                .replaceAll('#', '#<span></span>')
                .replaceAll('@', '@<span></span>');
            return `* [[job]](${jobUrl})${logsLink} ${failureString}`;
        })
            .join('\n'));
};
exports.getPrComment = getPrComment;
const getSlackMessage = (failures, failureHtmlArtifacts) => {
    return (`*Test Failures*\n` +
        failures
            .map((failure) => {
            const lookup = failure.jobId + failure.hash;
            const jobUrl = `${failure.url}#${failure.jobId}`;
            const artifactUrl = lookup in failureHtmlArtifacts
                ? `${failure.url.replace('https://buildkite.com/elastic', 'https://buildkite.com/organizations/elastic/pipelines')}/jobs/${failure.jobId}/artifacts/${failureHtmlArtifacts[lookup].id}`
                : '';
            const logsLink = artifactUrl ? ` <${artifactUrl}|[logs]>` : '';
            const failuresCount = failure.failureCount && failure.githubIssue
                ? ` <${failure.githubIssue}|[${failure.failureCount} failure${failure.failureCount > 1 ? 's' : ''}]>`
                : '';
            return `<${jobUrl}|[job]>${logsLink}${failuresCount} ${failure.jobName} / ${failure.name}`;
        })
            .join('\n'));
};
exports.getSlackMessage = getSlackMessage;
const annotateTestFailures = async () => {
    const exec = (cmd) => (0, child_process_1.execSync)(cmd, { stdio: 'inherit' });
    const failureDir = 'target/process-test-failures';
    (0, fs_1.mkdirSync)(failureDir, { recursive: true });
    const artifacts = await buildkite.getArtifactsForCurrentBuild();
    const failureHtmlArtifacts = {};
    for (const artifact of artifacts) {
        if (artifact.path.match(/test_failures\/.*?\.html$/)) {
            const [jobId, hash] = artifact.filename.split(/_|\./);
            failureHtmlArtifacts[jobId + hash] = artifact;
        }
    }
    exec(`buildkite-agent artifact download --include-retried-jobs "target/test_failures/*.json" "${failureDir}"`);
    const failures = recursiveReadDir(failureDir)
        .map((file) => {
        try {
            if (file.endsWith('.json')) {
                return JSON.parse((0, fs_1.readFileSync)(file).toString());
            }
        }
        catch (ex) {
            console.error(ex.message);
        }
        return null;
    })
        .filter((f) => f)
        .sort((a, b) => a.name.localeCompare(b.name));
    buildkite.setAnnotation('test_failures', 'error', (0, exports.getAnnotation)(failures, failureHtmlArtifacts));
    if (process.env.ELASTIC_PR_COMMENTS_ENABLED === 'true') {
        buildkite.setMetadata('pr_comment:test_failures:body', (0, exports.getPrComment)(failures, failureHtmlArtifacts));
    }
    if (process.env.ELASTIC_SLACK_NOTIFICATIONS_ENABLED === 'true') {
        buildkite.setMetadata('slack:test_failures:body', (0, exports.getSlackMessage)(failures, failureHtmlArtifacts));
    }
};
exports.annotateTestFailures = annotateTestFailures;
