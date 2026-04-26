"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mcp_1 = require("../lib/mcp");
const router = (0, express_1.Router)();
const mcpServer = (0, mcp_1.createMCPServer)();
/**
 * POST /api/mcp
 */
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        const response = await mcpServer.handle(body);
        res.json(response);
    }
    catch (error) {
        console.error("[MCP API] Error:", error);
        res.status(500).json({
            jsonrpc: "2.0",
            id: null,
            error: {
                code: -32603,
                message: "Internal server error",
                data: error.message
            }
        });
    }
});
/**
 * GET /api/mcp for discovery
 */
router.get('/', (req, res) => {
    res.json({
        name: "Kite Marketplace MCP Server",
        version: "1.0.0",
        endpoints: {
            mcp: "/api/mcp"
        },
        capabilities: ["tools", "resources"]
    });
});
exports.default = router;
