import { get } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { verifyDownloadToken } from "@/lib/blob-token"

export const runtime = "nodejs"

/**
 * GET /api/listings/[id]/download?p=<pathname>&e=<expiresAt>&s=<signature>&n=<filename>
 *
 * Streams a private blob to a buyer who has just completed an x402 payment.
 * The required token (p, e, s) is minted by the backend content endpoint
 * (packages/backend/src/routes/listings/[id]/content/route.ts) immediately
 * after on-chain payment verification. Tokens are HMAC-SHA256 signed with
 * BLOB_DOWNLOAD_SECRET (or BLOB_READ_WRITE_TOKEN) and expire after 15 minutes.
 *
 * The download route never reads on-chain state itself — it only verifies the
 * server-issued token. This keeps the download path fast and avoids double
 * RPC traffic for buyers who want to retry the download.
 */
export async function GET(
  request: NextRequest,
  _context: { params: Promise<{ id: string }> },
): Promise<NextResponse | Response> {
  const params = request.nextUrl.searchParams
  const pathname = params.get("p")
  const expiresAtStr = params.get("e")
  const signature = params.get("s")
  const filename = params.get("n") || "download"

  if (!pathname || !expiresAtStr || !signature) {
    return NextResponse.json(
      { error: "Missing token parameters" },
      { status: 400 },
    )
  }

  const expiresAt = Number(expiresAtStr)
  if (!Number.isFinite(expiresAt)) {
    return NextResponse.json({ error: "Malformed expiry" }, { status: 400 })
  }

  const ok = verifyDownloadToken(pathname, expiresAt, signature)
  if (!ok) {
    return NextResponse.json(
      {
        error: "Invalid or expired download token",
        hint: "Re-trigger the purchase to mint a fresh download URL.",
      },
      { status: 401 },
    )
  }

  try {
    const result = await get(pathname, { access: "private" })

    if (!result) {
      return NextResponse.json(
        { error: "File not found in storage" },
        { status: 404 },
      )
    }

    // Force browser download with the original filename instead of
    // displaying inline. This works for PDFs, zips, models, etc.
    const safeFilename = filename.replace(/[^\w.\-]/g, "_")

    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "private, no-store",
        ETag: result.blob.etag,
      },
    })
  } catch (error) {
    console.error("[download] stream error:", error)
    return NextResponse.json(
      { error: "Failed to retrieve file" },
      { status: 500 },
    )
  }
}
