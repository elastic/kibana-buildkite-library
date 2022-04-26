export declare type CiStatsClientConfig = {
    baseUrl?: string;
    token?: string;
};
export declare type CiStatsBuild = {
    id: string;
};
export declare type CiStatsPrReport = {
    md: string;
    success: boolean;
};
export interface CompleteSuccessBuildSource {
    jobName: string;
    jobRunner: string;
    completedAt: string;
    commit: string;
    startedAt: string;
    branch: string;
    result: 'SUCCESS';
    jobId: string;
    targetBranch: string | null;
    fromKibanaCiProduction: boolean;
    requiresValidMetrics: boolean | null;
    jobUrl: string;
    mergeBase: string | null;
}
export interface TestGroupRunOrderResponse {
    /** The Kibana branch to get stats for, eg "main" */
    sourceBuild: CompleteSuccessBuildSource;
    /** The CI job names to filter builds by, eg "kibana-hourly" */
    types: Array<{
        type: string;
        count: number;
        groups: Array<{
            durationMin: number;
            names: string[];
        }>;
        namesWithoutDurations: string[];
    }>;
}
export declare class CiStatsClient {
    private readonly baseUrl;
    private readonly defaultHeaders;
    constructor(config?: CiStatsClientConfig);
    createBuild: () => Promise<CiStatsBuild>;
    addGitInfo: (buildId: string) => Promise<void>;
    markBuildAsValidBaseline: (buildId: string) => Promise<void>;
    completeBuild: (buildStatus: string, buildId: string) => Promise<void>;
    getPrReport: (buildId: string) => Promise<CiStatsPrReport>;
    pickTestGroupRunOrder: (body: {
        sources: Array<{
            branch: string;
            jobName: string;
        } | {
            prId: string;
            jobName: string;
        } | {
            commit: string;
            jobName: string;
        }>;
        groups: Array<{
            type: string;
            defaultMin?: number;
            targetMin: number;
            maxMin: number;
            names: string[];
        }>;
    }) => Promise<TestGroupRunOrderResponse>;
    private request;
}
