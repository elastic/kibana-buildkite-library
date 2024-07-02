export type CiStatsClientConfig = {
    baseUrl?: string;
    token?: string;
};
export type CiStatsBuild = {
    id: string;
};
export type CiStatsPrReport = {
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
    sources: unknown;
    types: Array<{
        type: string;
        count: number;
        groups: Array<{
            durationMin: number;
            names: string[];
        }>;
        tooLong?: Array<{
            config: string;
            durationMin: number;
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
            maxMin: number;
            minimumIsolationMin?: number;
            overheadMin?: number;
            names: string[];
        }>;
    }) => Promise<TestGroupRunOrderResponse>;
    private request;
}
