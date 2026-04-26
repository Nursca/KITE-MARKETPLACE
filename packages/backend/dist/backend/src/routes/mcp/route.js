"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const mcp_1 = require("@/lib/mcp");
exports.runtime = 'nodejs';
const mcpServer = (0, mcp_1.createMCPServer)();
async function POST(req) {
    try {
        const body = await req.json();
        const response = await mcpServer.handle(body);
        return server_1.NextResponse.json(response);
    }
    catch (error) {
        console.error("[MCP API] Error:", error);
        return server_1.NextResponse.json({
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
async function GET() {
    return server_1.NextResponse.json({
        name: "Kite Marketplace MCP Server",
        version: "1.0.0",
        endpoints: {
            mcp: "/api/mcp"
        },
        capabilities: ["tools", "resources"]
    });
}
