import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * HMAC-signed download tokens for paywalled blobs.
 *
 * Flow:
 *  1. Buyer pays via x402 -> backend content endpoint verifies tx on-chain
 *  2. Content endpoint calls signDownloadToken(pathname) and returns the URL
 *  3. Buyer hits /api/listings/[id]/download which calls verifyDownloadToken
 *  4. If valid + not expired, the download route streams the private blob
 *
 * The shared secret is BLOB_DOWNLOAD_SECRET, falling back to
 * BLOB_READ_WRITE_TOKEN (always server-only and present when Blob is wired).
 */

const DEFAULT_TTL_SECONDS = 15 * 60 // 15 minutes is plenty to start the download

function getSecret(): string {
  const secret = process.env.BLOB_DOWNLOAD_SECRET || process.env.BLOB_READ_WRITE_TOKEN
  if (!secret) {
    throw new Error("BLOB_DOWNLOAD_SECRET or BLOB_READ_WRITE_TOKEN must be set to sign download tokens")
  }
  return secret
}

function hmac(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url")
}

export interface DownloadTokenPayload {
  pathname: string
  expiresAt: number
  signature: string
}

export function signDownloadToken(pathname: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): DownloadTokenPayload {
  const expiresAt = Date.now() + ttlSeconds * 1000
  const signature = hmac(`${pathname}|${expiresAt}`)
  return { pathname, expiresAt, signature }
}

export function verifyDownloadToken(pathname: string, expiresAt: number, signature: string): boolean {
  if (!pathname || !expiresAt || !signature) return false
  if (Date.now() > expiresAt) return false

  const expected = hmac(`${pathname}|${expiresAt}`)
  // Length-safe constant-time compare — both buffers must match in length first.
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
