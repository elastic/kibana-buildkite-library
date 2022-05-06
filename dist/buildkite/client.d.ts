import { AxiosInstance } from 'axios';
import { Artifact } from './types/artifact';
import { Build, BuildStatus } from './types/build';
import { Job, JobState } from './types/job';
export declare type BuildkiteClientConfig = {
    baseUrl?: string;
    token?: string;
};
export declare type BuildkiteStep = {
    command: string;
    label: string;
    parallelism?: number;
    agents: {
        queue: string;
    };
    timeout_in_minutes?: number;
    key: string;
    depends_on?: string | string[];
    retry?: {
        automatic: Array<{
            exit_status: string;
            limit: number;
        }>;
    };
};
export declare class BuildkiteClient {
    http: AxiosInstance;
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
    setMetadata: (key: string, value: string) => void;
    setAnnotation: (context: string, style: 'info' | 'success' | 'warning' | 'error', value: string) => void;
    uploadArtifacts: (pattern: string) => void;
    uploadSteps: (steps: BuildkiteStep[]) => void;
}
