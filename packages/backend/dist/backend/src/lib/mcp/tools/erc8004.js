"use strict";
/**
 * ERC-8004 MCP Tools for Kite Marketplace
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerERC8004Tools = registerERC8004Tools;
const zod_1 = require("zod");
const tool_registry_1 = require("../tool-registry");
const x402_sdk_1 = require("@kite/x402-sdk");
let _erc8004 = null;
function getERC8004Client() {
    if (!_erc8004) {
        const rawKey = process.env.WALLET_PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
        const AGENT_PRIVATE_KEY = (rawKey.trim().startsWith('0x') ? rawKey.trim() : `0x${rawKey.trim()}`);
        _erc8004 = new x402_sdk_1.ERC8004Client(AGENT_PRIVATE_KEY);
        console.log(`[ERC-8004] Client initialized with address: ${_erc8004.address}`);
    }
    return _erc8004;
}
// ============================================================
// Tool Definitions
// ============================================================
const registerIdentityTool = (0, tool_registry_1.defineTool)({
    name: "register_identity",
    description: "Register this agent on the ERC-8004 Identity Registry. This creates an on-chain identity (NFT) for the agent.",
    inputSchema: zod_1.z.object({
        agentURI: zod_1.z.string().optional().describe("Optional URI pointing to the agent's registration file")
    }),
    handler: async ({ agentURI }) => {
        console.log(`[register_identity] 🆔 Registering agent identity...`);
        try {
            const client = getERC8004Client();
            const { agentId, txHash } = await client.registerAgent(agentURI);
            return {
                success: true,
                agentId: agentId.toString(),
                txHash,
                message: `Successfully registered on-chain. Agent ID: ${agentId.toString()}`
            };
        }
        catch (error) {
            console.error(`[register_identity] Registration failed:`, error.message);
            return { success: false, error: `Registration failed: ${error.message}` };
        }
    },
});
const checkReputationTool = (0, tool_registry_1.defineTool)({
    name: "check_reputation",
    description: "Check an agent's on-chain reputation. Returns feedback count and average rating.",
    inputSchema: zod_1.z.object({
        agentId: zod_1.z.string().describe("The Agent ID to check reputation for")
    }),
    handler: async ({ agentId }) => {
        console.log(`[check_reputation] ⭐ Checking reputation for: ${agentId}`);
        try {
            const client = getERC8004Client();
            const id = BigInt(agentId);
            const summary = await client.getReputationSummary(id);
            return {
                success: true,
                agentId,
                feedbackCount: summary.count,
                averageScore: summary.count > 0 ? (Number(summary.summaryValue) / 10 ** summary.summaryValueDecimals / summary.count).toFixed(1) : "N/A"
            };
        }
        catch (error) {
            return { success: false, error: `Reputation check failed: ${error.message}` };
        }
    },
});
const lookupIdentityByOwnerTool = (0, tool_registry_1.defineTool)({
    name: "lookup_identity_by_owner",
    description: "Look up an agent's on-chain ID by their owner wallet address.",
    inputSchema: zod_1.z.object({
        ownerAddress: zod_1.z.string().describe("The wallet address of the agent owner")
    }),
    handler: async ({ ownerAddress }) => {
        console.log(`[lookup_identity] 🔍 Searching for agent owned by: ${ownerAddress}`);
        try {
            const client = getERC8004Client();
            const agentId = await client.findAgentId(ownerAddress);
            return {
                success: true,
                agentId: agentId ? agentId.toString() : null,
                found: !!agentId
            };
        }
        catch (error) {
            return { success: false, error: `Lookup failed: ${error.message}` };
        }
    },
});
// ============================================================
// Register all ERC-8004 tools
// ============================================================
function registerERC8004Tools() {
    tool_registry_1.toolRegistry.register(registerIdentityTool, "erc8004");
    tool_registry_1.toolRegistry.register(checkReputationTool, "erc8004");
    tool_registry_1.toolRegistry.register(lookupIdentityByOwnerTool, "erc8004");
    console.log("[ERC-8004 Tools] ✅ Registered 3 tools");
}
