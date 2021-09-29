"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.annotateTestFailures = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const __1 = require("..");
const buildkite = new __1.BuildkiteClient();
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
        .filter((f) => f);
    const failuresMarkdown = `**Test Failures**\n` +
        failures
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((failure) => {
            const jobUrl = `${failure.url}#${failure.jobId}`;
            const artifactUrl = failure.hash in failureHtmlArtifacts
                ? `${jobUrl}/artifacts/${failureHtmlArtifacts[failure.hash].id}`
                : '';
            const logsLink = artifactUrl ? ` [[logs]](${artifactUrl})` : '';
            return `[[job]](${jobUrl})${logsLink} ${failure.jobName} / ${failure.name}`;
        })
            .join('<br />\n');
    buildkite.setAnnotation('test_failures', 'error', failuresMarkdown);
    buildkite.setMetadata('pr_comment:test_failures:body', failuresMarkdown);
    buildkite.setMetadata('slack:test_failures:body', failuresMarkdown); // TODO links are a different format
    console.log(failuresMarkdown);
};
//# sourceMappingURL=annotate.js.map