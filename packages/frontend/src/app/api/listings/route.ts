/**
 * GET  /api/listings
 *   Returns the public catalogue (omits the secret `content` field).
 *   Optional filters: ?type=, ?maxPrice=, ?creatorAddress=
 *
 * POST /api/listings
 *   Creates a new listing. Required: type, name, priceUsdc, content, creatorAddress.
 *
 * These run inside Next.js so create + list work on Vercel without the
 * separate Express backend at localhost:3001 being reachable. They share
 * Supabase tables with `packages/backend/src/lib/listing-store.ts`, so
 * either entry point sees the same data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createListing, listListings, type Listing } from '@/lib/listings-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || undefined
    const maxPriceParam = searchParams.get('maxPrice')
    const creatorAddress = searchParams.get('creatorAddress') || undefined

    const listings = await listListings({
      type,
      maxPrice: maxPriceParam ? Number(maxPriceParam) : undefined,
      creatorAddress,
    })

    // Strip secret `content` field — only revealed after x402 payment.
    const publicListings = listings.map(({ content: _content, ...rest }) => rest)

    return NextResponse.json({
      success: true,
      count: publicListings.length,
      listings: publicListings,
    })
  } catch (err) {
    console.error('[GET /api/listings] failed:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to load listings' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, name, description, priceUsdc, content, preview, creatorAddress } = body ?? {}

    if (!type || !name || priceUsdc === undefined || !content || !creatorAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: type, name, priceUsdc, content, creatorAddress',
        },
        { status: 400 },
      )
    }

    const validTypes: Listing['type'][] = ['api', 'file', 'article', 'dataset', 'code', 'shopify']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      )
    }

    const listing = await createListing({
      type,
      name,
      description,
      priceUsdc: Number(priceUsdc),
      content,
      preview,
      creatorAddress,
    })

    const baseUrl =
      process.env.KITE_MARKETPLACE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      `https://${req.headers.get('host') ?? 'kite-marketplace.vercel.app'}`

    return NextResponse.json(
      {
        success: true,
        listingId: listing.id,
        x402Url: `${baseUrl.replace(/\/$/, '')}/api/listings/${listing.id}/content`,
        message: `Listing "${listing.name}" is now live! Buyers pay ${listing.priceUsdc} USDC to access content.`,
        listing: {
          id: listing.id,
          name: listing.name,
          type: listing.type,
          priceUsdc: listing.priceUsdc,
          preview: listing.preview,
        },
      },
      { status: 201 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[POST /api/listings] failed:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to create listing', message },
      { status: 500 },
    )
  }
}
