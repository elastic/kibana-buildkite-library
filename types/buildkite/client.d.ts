import { AxiosInstance } from 'axios';
import { Artifact } from './types/artifact';
import { Build, BuildStatus } from './types/build';
import { Job, JobState } from './types/job';
export declare type BuildkiteClientConfig = {
    baseUrl?: string;
    token?: string;
    org?: string;
};
export declare type BuildkiteGroup = {
    group: string;
    steps: BuildkiteStep[];
};
export declare type BuildkiteStep = {
    command: string;
    label: string;
    parallelism?: number;
    agents: {
        queue: string;
    };
    timeout_in_minutes?: number;
    key?: string;
    depends_on?: string | string[];
    retry?: {
        automatic: Array<{
            exit_status: string;
            limit: number;
        }>;
    };
    env?: {
        [key: string]: string;
    };
};
export declare type BuildkiteTriggerBuildParams = {
    commit: string;
    branch: string;
    env?: Record<string, string>;
    author?: {
        name: string;
        email: string;
    };
    ignore_pipeline_branch_filters?: boolean;
    message?: string;
    meta_data?: Record<string, string>;
    pull_request_base_branch?: string;
    pull_request_id?: string | number;
    pull_request_repository?: string;
};
export declare class BuildkiteClient {
    http: AxiosInstance;
    org: string;
    constructor(config?: BuildkiteClientConfig);
    getBuild: (pipelineSlug: string, buildNumber: string | number, includeRetriedJobs?: boolean) => Promise<Build>;
    getCurrentBuild: (includeRetriedJobs?: boolean) => Promise<Build>;
    getJobStatus: (build: Build, job: Job) => {
        success: boolean;
        state: JobState;
    };
    getBuildStatus: (build: Build) => BuildStatus;
    getCurrentBuildStatus: (includeRetriedJobs?: boolean) => Promise<BuildStatus>;
    getArtifacts: (pipelineSlug: string, buildNumber: string | number) => Promise<Artifact[]>;
    getArtifactsForCurrentBuild: () => Promise<Artifact[]>;
    triggerBuild: (pipelineSlug: string, options: BuildkiteTriggerBuildParams) => Promise<Build>;
    setMetadata: (key: string, value: string) => void;
    setAnnotation: (context: string, style: 'info' | 'success' | 'warning' | 'error', value: string) => void;
    uploadArtifacts: (pattern: string) => void;
    uploadSteps: (steps: Array<BuildkiteStep | BuildkiteGroup>) => void;
}
