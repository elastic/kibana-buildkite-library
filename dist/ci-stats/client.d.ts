export declare type CiStatsClientConfig = {
    hostname?: string;
    token?: string;
    baseRetryMs?: number;
    console?: {
        log: (...args: any[]) => void;
        error: (...args: any[]) => void;
    };
};
export declare type CiStatsBuild = {
    id: string;
};
export declare class CiStatsClient {
    private readonly http;
    private readonly baseUrl;
    private readonly baseRetryMs;
    private readonly console;
    constructor(config?: CiStatsClientConfig);
    createBuild(): Promise<CiStatsBuild>;
    addGitInfo(buildId: string): Promise<void>;
    completeBuild(buildStatus: string, buildId?: string | undefined): Promise<void>;
    private req;
}
