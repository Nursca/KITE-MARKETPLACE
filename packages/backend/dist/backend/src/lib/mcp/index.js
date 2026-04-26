"use strict";
/**
 * MCP Module - Modular Model Context Protocol Implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMCPRequest = exports.defineTool = exports.toolRegistry = void 0;
exports.initializeMCPTools = initializeMCPTools;
exports.createMCPServer = createMCPServer;
const zod_1 = require("zod");
const tool_registry_1 = require("./tool-registry");
const base_handler_1 = require("./base-handler");
const shopping_1 = require("./tools/shopping");
const erc8004_1 = require("./tools/erc8004");
const resources_1 = require("./tools/resources");
const payments_1 = require("./tools/payments");
// Core exports
var tool_registry_2 = require("./tool-registry");
Object.defineProperty(exports, "toolRegistry", { enumerable: true, get: function () { return tool_registry_2.toolRegistry; } });
Object.defineProperty(exports, "defineTool", { enumerable: true, get: function () { return tool_registry_2.defineTool; } });
var base_handler_2 = require("./base-handler");
Object.defineProperty(exports, "handleMCPRequest", { enumerable: true, get: function () { return base_handler_2.handleMCPRequest; } });
/**
 * Initialize all MCP tools
 */
let initialized = false;
function initializeMCPTools() {
    if (initialized)
        return;
    (0, shopping_1.registerShoppingTools)();
    (0, erc8004_1.registerERC8004Tools)();
    (0, resources_1.registerResourceTools)();
    (0, payments_1.registerPaymentTools)();
    // Register Passport specific tools
    tool_registry_1.toolRegistry.register((0, tool_registry_1.defineTool)({
        name: "get_passport",
        description: "Get the full on-chain Agent Passport metadata.",
        inputSchema: zod_1.z.object({
            agentId: zod_1.z.string().describe("The Agent ID to query"),
        }),
        handler: async ({ agentId }) => {
            try {
                // Mock data for hackathon demo
                return {
                    success: true,
                    passport: {
                        agentId,
                        tier: 2, // Verified
                        totalVolume: 125.50,
                        reputation: 4.9,
                        did: `did:kite:agent:${agentId}`,
                        capabilities: ["x402", "MCP", "A2A", "AP2"],
                        lastUpdated: new Date().toISOString()
                    }
                };
            }
            catch (e) {
                return { success: false, error: e.message };
            }
        },
    }), "identity");
    initialized = true;
    console.log("[MCP] All tools initialized including Agent Passport");
}
/**
 * Create pre-configured MCP handlers
 */
function createMCPServer() {
    initializeMCPTools();
    return {
        handle: async (body, verbose = true) => {
            return await (0, base_handler_1.handleMCPRequest)(body, {
                serverInfo: {
                    name: "kite-marketplace-agent",
                    version: "1.0.0",
                    description: "Autonomous agent tools for Kite Marketplace shopping",
                },
                verbose
            }, (...args) => verbose && console.log("[MCP]", ...args));
        }
    };
}
