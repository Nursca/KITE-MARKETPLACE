/**
 * GET /api/listings/[id]
 *   Returns the public view of a single listing (no secret `content`).
 *   Used by the demo page, telegram bot, and other tools that need to
 *   display listing metadata without unlocking the paywalled payload.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getListing } from '@/lib/listings-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params

    const listing = await getListing(id)
    if (!listing) {
      return NextResponse.json(
        { success: false, error: `Listing ${id} not found` },
        { status: 404 },
      )
    }

    const { content: _content, ...publicListing } = listing
    return NextResponse.json({ success: true, listing: publicListing })
  } catch (err) {
    console.error('[GET /api/listings/[id]] failed:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to load listing' },
      { status: 500 },
    )
  }
}
