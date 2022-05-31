"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.annotateTestFailures = exports.getSlackMessage = exports.getPrComment = exports.getAnnotation = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const __1 = require("..");
const buildkite = new __1.BuildkiteClient();
const recursiveReadDir = (dirPath, allFiles = []) => {
    const files = fs_1.readdirSync(dirPath);
    for (const file of files) {
        if (fs_1.statSync(path_1.join(dirPath, file)).isDirectory()) {
            allFiles = recursiveReadDir(path_1.join(dirPath, file), allFiles);
        }
        else {
            allFiles.push(path_1.join(dirPath, file));
        }
    }
    return allFiles;
};
exports.getAnnotation = (failures, failureHtmlArtifacts) => {
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
exports.getPrComment = (failures, failureHtmlArtifacts) => {
    return (`### Test Failures\n` +
        failures
            .map((failure) => {
            const lookup = failure.jobId + failure.hash;
            const jobUrl = `${failure.url}#${failure.jobId}`;
            const artifactUrl = lookup in failureHtmlArtifacts
                ? `${failure.url.replace('https://buildkite.com/elastic', 'https://buildkite.com/organizations/elastic/pipelines')}/jobs/${failure.jobId}/artifacts/${failureHtmlArtifacts[lookup].id}`
                : '';
            const logsLink = artifactUrl ? ` [[logs]](${artifactUrl})` : '';
            // job name could have #<number> in it, which Github will link to an issue, so we need to "escape" it with spans
            return `* [[job]](${jobUrl})${logsLink} ${failure.jobName.replace('#', '#<span></span>')} / ${failure.name}`;
        })
            .join('\n'));
};
exports.getSlackMessage = (failures, failureHtmlArtifacts) => {
    console.log('\n### Peek into the test failures while "getting" the slack msg.');
    console.log(`\n### failures.length: \n\t${failures.length}`);
    return (`*Test Failures*\n` +
        failures
            .map((x) => {
            console.log(`\n### x: \n${JSON.stringify(x, null, 2)}`);
            return x;
        })
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
exports.annotateTestFailures = async () => {
    const exec = (cmd) => child_process_1.execSync(cmd, { stdio: 'inherit' });
    const failureDir = 'target/process-test-failures';
    fs_1.mkdirSync(failureDir, { recursive: true });
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
                return JSON.parse(fs_1.readFileSync(file).toString());
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
    if (process.env.PR_COMMENTS_ENABLED === 'true') {
        buildkite.setMetadata('pr_comment:test_failures:body', exports.getPrComment(failures, failureHtmlArtifacts));
    }
    if (process.env.SLACK_NOTIFICATIONS_ENABLED === 'true') {
        buildkite.setMetadata('slack:test_failures:body', exports.getSlackMessage(failures, failureHtmlArtifacts));
    }
};
//# sourceMappingURL=annotate.js.map