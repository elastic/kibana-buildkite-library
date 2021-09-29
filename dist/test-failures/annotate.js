"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.annotateTestFailures = exports.getSlackMessage = exports.getPrComment = exports.getAnnotation = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const __1 = require("..");
const buildkite = new __1.BuildkiteClient();
exports.getAnnotation = (failures, failureHtmlArtifacts) => {
    return (`**Test Failures**\n` +
        failures
            .map((failure) => {
            const jobUrl = `${failure.url}#${failure.jobId}`;
            const artifactUrl = failure.hash in failureHtmlArtifacts
                ? `${jobUrl}/artifacts/${failureHtmlArtifacts[failure.hash].id}`
                : '';
            const logsLink = artifactUrl ? ` [[logs]](${artifactUrl})` : '';
            return `[[job]](${jobUrl})${logsLink} ${failure.jobName} / ${failure.name}`;
        })
            .join('<br />\n'));
};
exports.getPrComment = (failures, failureHtmlArtifacts) => {
    return (`**Test Failures**\n` +
        failures
            .map((failure) => {
            const jobUrl = `${failure.url}#${failure.jobId}`;
            const artifactUrl = failure.hash in failureHtmlArtifacts
                ? `${jobUrl}/artifacts/${failureHtmlArtifacts[failure.hash].id}`
                : '';
            const logsLink = artifactUrl ? ` [[logs]](${artifactUrl})` : '';
            return `[[job]](${jobUrl})${logsLink} ${failure.jobName} / ${failure.name}`;
        })
            .join('<br />\n'));
};
exports.getSlackMessage = (failures, failureHtmlArtifacts) => {
    return (`**Test Failures**\n` +
        failures
            .map((failure) => {
            const jobUrl = `${failure.url}#${failure.jobId}`;
            const artifactUrl = failure.hash in failureHtmlArtifacts
                ? `${jobUrl}/artifacts/${failureHtmlArtifacts[failure.hash].id}`
                : '';
            const logsLink = artifactUrl ? ` [[logs]](${artifactUrl})` : '';
            return `[[job]](${jobUrl})${logsLink} ${failure.jobName} / ${failure.name}`;
        })
            .join('<br />\n'));
};
exports.annotateTestFailures = async () => {
    const exec = (cmd) => child_process_1.execSync(cmd, { stdio: 'inherit' });
    const failureDir = 'target/process-test-failures';
    fs_1.mkdirSync(failureDir, { recursive: true });
    exec(`buildkite-agent artifact download "test_failures/*/*.json" "${failureDir}"`);
    const artifacts = await buildkite.getArtifactsForCurrentBuild();
    const failureHtmlArtifacts = {};
    for (const artifact of artifacts) {
        if (artifact.path.match(/test_failures\/.*?\.html$/)) {
            const [_, hash] = artifact.filename.split('_');
            failureHtmlArtifacts[hash] = artifact;
        }
    }
    const failures = fs_1.readdirSync(failureDir)
        .map((file) => {
        try {
            if (file.endsWith('.json')) {
                return JSON.parse(fs_1.readFileSync(path_1.join(failureDir, file)).toString());
            }
        }
        catch (ex) {
            console.error(ex.message);
        }
        return null;
    })
        .filter((f) => f)
        .sort((a, b) => a.name.localeCompare(b.name));
    buildkite.setAnnotation('test_failures', 'error', exports.getAnnotation(failures, failureHtmlArtifacts));
    buildkite.setMetadata('pr_comment:test_failures:body', exports.getPrComment(failures, failureHtmlArtifacts));
    buildkite.setMetadata('slack:test_failures:body', exports.getSlackMessage(failures, failureHtmlArtifacts));
};
//# sourceMappingURL=annotate.js.map