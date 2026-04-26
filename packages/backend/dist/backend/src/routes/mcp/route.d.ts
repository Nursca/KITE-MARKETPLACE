import { NextRequest, NextResponse } from "next/server";
export declare const runtime = "nodejs";
export declare function POST(req: NextRequest): Promise<NextResponse<import("@/lib/mcp").JsonRpcResponse> | NextResponse<{
    jsonrpc: string;
    id: null;
    error: {
        code: number;
        message: string;
        data: any;
    };
}>>;
/**
 * GET handler for discovery
 */
export declare function GET(): Promise<NextResponse<{
    name: string;
    version: string;
    endpoints: {
        mcp: string;
    };
    capabilities: string[];
}>>;
