import { RestEndpointMethodTypes } from '@octokit/rest';
export declare const getPrChanges: (owner?: string | undefined, repo?: string | undefined, prNumber?: undefined | string | number) => Promise<{
    sha: string;
    filename: string;
    status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
    additions: number;
    deletions: number;
    changes: number;
    blob_url: string;
    raw_url: string;
    contents_url: string;
    patch?: string | undefined;
    previous_filename?: string | undefined;
}[]>;
export declare const getPrChangesCached: () => Promise<{
    sha: string;
    filename: string;
    status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
    additions: number;
    deletions: number;
    changes: number;
    blob_url: string;
    raw_url: string;
    contents_url: string;
    patch?: string | undefined;
    previous_filename?: string | undefined;
}[]>;
export declare const areChangesSkippable: (skippablePaths: RegExp[], requiredPaths?: RegExp[], changes?: null | RestEndpointMethodTypes['pulls']['listFiles']['response']['data']) => Promise<boolean>;
export declare const doAnyChangesMatch: (requiredPaths: RegExp[], changes?: null | RestEndpointMethodTypes['pulls']['listFiles']['response']['data']) => Promise<boolean>;
