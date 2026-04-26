import { NextRequest, NextResponse } from "next/server";
export declare const runtime = "nodejs";
/**
 * GET /api/listings/[id]/content
 *
 * x402 paywall — returns listing content after USDC payment on Kite Testnet.
 *
 * Flow:
 *  1. First request → returns 402 with payment requirements
 *  2. Agent/client pays on Kite Testnet, includes X-PAYMENT header
 *  3. Second request with valid payment → returns content + receipt
 */
export declare function GET(req: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}): Promise<NextResponse>;
