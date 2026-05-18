"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signDownloadToken = signDownloadToken;
const node_crypto_1 = require("node:crypto");
/**
 * HMAC-signed download tokens for paywalled blobs.
 *
 * Mirrors packages/frontend/src/lib/blob-token.ts so the backend content
 * endpoint can mint tokens that the Next.js download route verifies. They
 * MUST share the same secret. We use BLOB_DOWNLOAD_SECRET, falling back to
 * BLOB_READ_WRITE_TOKEN (always server-only and present when Blob is wired).
 */
const DEFAULT_TTL_SECONDS = 15 * 60;
function getSecret() {
    const secret = process.env.BLOB_DOWNLOAD_SECRET || process.env.BLOB_READ_WRITE_TOKEN;
    if (!secret) {
        throw new Error("BLOB_DOWNLOAD_SECRET or BLOB_READ_WRITE_TOKEN must be set to sign download tokens");
    }
    return secret;
}
function hmac(payload) {
    return (0, node_crypto_1.createHmac)("sha256", getSecret()).update(payload).digest("base64url");
}
function signDownloadToken(pathname, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const signature = hmac(`${pathname}|${expiresAt}`);
    return { pathname, expiresAt, signature };
}
