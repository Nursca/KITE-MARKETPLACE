import { NextRequest, NextResponse } from "next/server";
import { createMCPServer } from "@/lib/mcp";

export const runtime = 'nodejs';

const mcpServer = createMCPServer();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await mcpServer.handle(body);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[MCP API] Error:", error);
    return NextResponse.json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32603,
        message: "Internal server error",
        data: error.message
      }
    }, { status: 500 });
  }
}

/**
 * GET handler for discovery
 */
export async function GET() {
  return NextResponse.json({
    name: "Kite Marketplace MCP Server",
    version: "1.0.0",
    endpoints: {
      mcp: "/api/mcp"
    },
    capabilities: ["tools", "resources"]
  });
}
