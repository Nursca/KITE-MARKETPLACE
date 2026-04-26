import { NextResponse } from "next/server";
export declare const runtime = "nodejs";
/** GET /api/stats — live marketplace stats for the homepage counter */
export declare function GET(): Promise<NextResponse<{
    timestamp: string;
    totalListings: number;
    totalSales: number;
    totalVolumeUsdc: number;
    activeAgents: number;
    topSellers: {
        address: string;
        sales: number;
    }[];
}>>;
