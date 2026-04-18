/**
 * ERC-8004 MCP Tools for Kite Marketplace
 */

import { z } from "zod";
import { toolRegistry, defineTool } from "../tool-registry";
import { ERC8004Client } from "../../erc8004/client";

// Private key for the agent - using the funded wallet from .env
const rawKey = process.env.WALLET_PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const AGENT_PRIVATE_KEY = (rawKey.trim().startsWith('0x') ? rawKey.trim() : `0x${rawKey.trim()}`) as `0x${string}`;
const erc8004 = new ERC8004Client(AGENT_PRIVATE_KEY);

// ============================================================
// Tool Definitions
// ============================================================

const registerIdentityTool = defineTool({
  name: "register_identity",
  description: "Register this agent on the ERC-8004 Identity Registry. This creates an on-chain identity (NFT) for the agent.",
  inputSchema: z.object({
    agentURI: z.string().optional().describe("Optional URI pointing to the agent's registration file")
  }),
  handler: async ({ agentURI }) => {
    console.log(`[register_identity] 🆔 Registering agent identity...`);
    try {
      const { agentId, txHash } = await erc8004.registerAgent(agentURI);
      return {
        success: true,
        agentId: agentId.toString(),
        txHash,
        message: `Successfully registered on-chain. Agent ID: ${agentId.toString()}`
      };
    } catch (error: any) {
      console.error(`[register_identity] Registration failed:`, error.message);
      return { success: false, error: `Registration failed: ${error.message}` };
    }
  },
});

const checkReputationTool = defineTool({
  name: "check_reputation",
  description: "Check an agent's on-chain reputation. Returns feedback count and average rating.",
  inputSchema: z.object({
    agentId: z.string().describe("The Agent ID to check reputation for")
  }),
  handler: async ({ agentId }) => {
    console.log(`[check_reputation] ⭐ Checking reputation for: ${agentId}`);
    try {
      const id = BigInt(agentId);
      const summary = await erc8004.getReputationSummary(id);
      return {
        success: true,
        agentId,
        feedbackCount: summary.count,
        averageScore: summary.count > 0 ? (Number(summary.summaryValue) / 10**summary.summaryValueDecimals / summary.count).toFixed(1) : "N/A"
      };
    } catch (error: any) {
      return { success: false, error: `Reputation check failed: ${error.message}` };
    }
  },
});

const lookupIdentityByOwnerTool = defineTool({
  name: "lookup_identity_by_owner",
  description: "Look up an agent's on-chain ID by their owner wallet address.",
  inputSchema: z.object({
    ownerAddress: z.string().describe("The wallet address of the agent owner")
  }),
  handler: async ({ ownerAddress }) => {
    console.log(`[lookup_identity] 🔍 Searching for agent owned by: ${ownerAddress}`);
    try {
      const agentId = await erc8004.findAgentId(ownerAddress as `0x${string}`);
      return {
        success: true,
        agentId: agentId ? agentId.toString() : null,
        found: !!agentId
      };
    } catch (error: any) {
      return { success: false, error: `Lookup failed: ${error.message}` };
    }
  },
});

// ============================================================
// Register all ERC-8004 tools
// ============================================================

export function registerERC8004Tools(): void {
  toolRegistry.register(registerIdentityTool, "erc8004");
  toolRegistry.register(checkReputationTool, "erc8004");
  toolRegistry.register(lookupIdentityByOwnerTool, "erc8004");
  
  console.log("[ERC-8004 Tools] ✅ Registered 3 tools");
}
