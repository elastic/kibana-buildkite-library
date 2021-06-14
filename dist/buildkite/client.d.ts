import { AxiosInstance } from 'axios';
import { Build } from './types/build';
import { Job, JobState } from './types/job';
export declare type BuildkiteClientConfig = {
    baseUrl?: string;
    token?: string;
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
    getBuildStatus: (build: Build) => {
        state: import("./types/build").BuildState;
        success: boolean;
        hasRetries: boolean;
    };
    getCurrentBuildStatus: (includeRetriedJobs?: boolean) => Promise<{
        state: import("./types/build").BuildState;
        success: boolean;
        hasRetries: boolean;
    }>;
}
