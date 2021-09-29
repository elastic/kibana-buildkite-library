import { Artifact } from '../buildkite/types/artifact';
export declare type TestFailure = {
    name: string;
    classname: string;
    time: string;
    'metadata-json'?: string | undefined;
    failure: string;
    likelyIrrelevant: boolean;
    'system-out'?: string | undefined;
    hash: string;
    buildId: string;
    jobId: string;
    url: string;
    jobName: string;
};
export declare const getAnnotation: (failures: TestFailure[], failureHtmlArtifacts: Record<string, Artifact>) => string;
export declare const getPrComment: (failures: TestFailure[], failureHtmlArtifacts: Record<string, Artifact>) => string;
export declare const getSlackMessage: (failures: TestFailure[], failureHtmlArtifacts: Record<string, Artifact>) => string;
export declare const annotateTestFailures: () => Promise<void>;