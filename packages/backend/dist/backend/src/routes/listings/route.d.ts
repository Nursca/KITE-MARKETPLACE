import { NextRequest, NextResponse } from "next/server";
export declare const runtime = "nodejs";
/**
 * POST /api/listings
 *
 * Allows an agent to create a new paywalled listing.
 * This implements the "Agent-as-Seller" pattern for the Kite Agentic Economy.
 */
export declare function POST(req: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    listingId: string;
    x402Url: string;
    message: string;
    listing: {
        id: string;
        name: string;
        type: "api" | "file" | "article" | "dataset" | "code" | "shopify";
        priceUsdc: number;
        preview: string;
        creatorAddress: string;
        description: string;
        salesCount: number;
        totalEarnedUsdc: number;
        createdAt: string;
    };
}>>;
/**
 * GET /api/listings
 *
 * Returns all available digital listings.
 */
export declare function GET(req: NextRequest): Promise<NextResponse<{
    success: boolean;
    count: number;
    listings: {
        id: string;
        type: "api" | "file" | "article" | "dataset" | "code" | "shopify";
        name: string;
        description: string;
        priceUsdc: number;
        preview: string;
        creatorAddress: string;
        createdAt: string;
        salesCount: number;
        totalEarnedUsdc: number;
    }[];
    stats: {
        totalListings: number;
        totalSales: number;
        totalVolumeUsdc: number;
        activeAgents: number;
        topSellers: {
            address: string;
            sales: number;
        }[];
    };
}>>;
