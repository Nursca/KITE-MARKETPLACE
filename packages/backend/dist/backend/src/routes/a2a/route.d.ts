import { NextRequest, NextResponse } from "next/server";
export declare const runtime = "nodejs";
export declare function POST(req: NextRequest): Promise<NextResponse<{
    jsonrpc: string;
    id: any;
    error: {
        code: number;
        message: string;
    };
}> | NextResponse<{
    jsonrpc: string;
    id: any;
    result: any;
}>>;
export declare function GET(): Promise<NextResponse<{
    name: string;
    version: string;
    protocols: string[];
    endpoints: {
        a2a: string;
    };
}>>;
