import { AxiosInstance } from 'axios';
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
export declare class CiStatsClient {
    http: AxiosInstance;
    constructor(config?: CiStatsClientConfig);
    createBuild: () => Promise<CiStatsBuild>;
    addGitInfo: (buildId: string) => Promise<import("axios").AxiosResponse<any>>;
    completeBuild: (buildStatus: string, buildId?: string | undefined) => Promise<import("axios").AxiosResponse<any>>;
    getPrReport: (buildId?: string | undefined) => Promise<CiStatsPrReport>;
}
