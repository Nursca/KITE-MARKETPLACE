import { put } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
// Allow uploads up to ~25MB through the function. Larger files should
// switch to client-side direct uploads (@vercel/blob/client) — left as a
// future enhancement once judges hit the limit.
export const maxDuration = 60

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

/**
 * POST /api/upload
 *
 * Accepts multipart FormData with a `file` field, uploads to private Vercel
 * Blob storage, and returns the metadata the listing form needs to embed in
 * the listing's hidden `content` payload.
 *
 * The seller (creator of the listing) is the only one who hits this — buyers
 * never call /api/upload. Buyer downloads go through /api/listings/[id]/download
 * which verifies an HMAC token minted only after on-chain payment.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
          size: file.size,
        },
        { status: 413 },
      )
    }

    // Random suffix prevents pathname collisions when two sellers upload
    // files with the same name. Storing under listings/ keeps the bucket tidy.
    // Access is "private" — the blob URL is NOT publicly fetchable. Buyers
    // download through /api/listings/[id]/download, which enforces the paywall
    // and streams via get() with a server-only token.
    const blob = await put(`listings/${file.name}`, file, {
      access: "private",
      addRandomSuffix: true,
    })

    return NextResponse.json({
      success: true,
      pathname: blob.pathname,
      filename: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    })
  } catch (error) {
    console.error("[upload] error:", error)
    const message = error instanceof Error ? error.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
