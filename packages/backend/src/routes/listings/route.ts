import { NextRequest, NextResponse } from "next/server";
import { listingStore } from "@/lib/listing-store";

export const runtime = "nodejs";

/**
 * POST /api/listings
 * 
 * Allows an agent to create a new paywalled listing.
 * This implements the "Agent-as-Seller" pattern for the Kite Agentic Economy.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    
    // Basic validation
    const { type, name, description, priceUsdc, content, preview, creatorAddress } = body;
    
    if (!type || !name || !priceUsdc || !content || !creatorAddress) {
      return NextResponse.json(
        { error: "Missing required fields: type, name, priceUsdc, content, creatorAddress" },
        { status: 400 }
      );
    }

    const listing = await listingStore.create({
      type,
      name,
      description: description || "",
      priceUsdc: Number(priceUsdc),
      content,
      preview: preview || "",
      creatorAddress,
    });

    const baseUrl = process.env.KITE_MARKETPLACE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.json({
      success: true,
      listingId: listing.id,
      x402Url: `${baseUrl}/api/listings/${listing.id}/content`,
      message: `Listing "${name}" is now live! Buyers pay ${priceUsdc} USDC on Kite Testnet to access content.`,
      listing: {
        id: listing.id,
        name: listing.name,
        type: listing.type,
        priceUsdc: listing.priceUsdc,
        preview: listing.preview,
        creatorAddress: listing.creatorAddress,
        description: listing.description,
        salesCount: listing.salesCount,
        totalEarnedUsdc: listing.totalEarnedUsdc,
        createdAt: listing.createdAt,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error("Create listing error:", error);
    return NextResponse.json(
      { error: "Failed to create listing", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/listings
 * 
 * Returns all available digital listings.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const maxPrice = searchParams.get("maxPrice");
  const creatorAddress = searchParams.get("creatorAddress");

  const listings = await listingStore.list({
    type: type || undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    creatorAddress: creatorAddress || undefined
  });

  // Strip content from listings for the public list
  const publicListings = listings.map(({ content, ...rest }) => rest);
  const stats = await listingStore.getStats();

  return NextResponse.json({
    success: true,
    count: publicListings.length,
    listings: publicListings,
    stats,
  });
}
