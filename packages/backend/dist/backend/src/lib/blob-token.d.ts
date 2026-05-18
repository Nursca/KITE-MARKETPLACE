export declare function signDownloadToken(pathname: string, ttlSeconds?: number): {
    pathname: string;
    expiresAt: number;
    signature: string;
};
