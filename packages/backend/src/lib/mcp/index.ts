/**
 * MCP Module - Modular Model Context Protocol Implementation
 */

import { z } from "zod";
import { toolRegistry, defineTool } from "./tool-registry";
import { handleMCPRequest } from "./base-handler";
import { registerShoppingTools } from "./tools/shopping";
import { registerERC8004Tools } from "./tools/erc8004";
import { registerResourceTools } from "./tools/resources";
import { registerPaymentTools } from "./tools/payments";
import { ERC8004Client } from "@kite/x402-sdk";

// Core exports
export { toolRegistry, defineTool } from "./tool-registry";
export { handleMCPRequest, type MCPHandlerOptions } from "./base-handler";
export type { 
  MCPToolDefinition, 
  MCPToolMetadata, 
  MCPToolResult,
  MCPServerInfo,
  JsonRpcRequest,
  JsonRpcResponse,
} from "./types";

/**
 * Initialize all MCP tools
 */
let initialized = false;
export function initializeMCPTools(): void {
  if (initialized) return;
  
  registerShoppingTools();
  registerERC8004Tools();
  registerResourceTools();
  registerPaymentTools();

  // Register Passport specific tools
  toolRegistry.register(
    defineTool({
      name: "get_passport",
      description: "Get the full on-chain Agent Passport metadata.",
      inputSchema: z.object({
        agentId: z.string().describe("The Agent ID to query"),
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
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    }),
    "identity"
  );

  initialized = true;
  console.log("[MCP] All tools initialized including Agent Passport");
}

/**
 * Create pre-configured MCP handlers
 */
export function createMCPServer() {
  initializeMCPTools();

  return {
    handle: async (body: any, verbose = true) => {
      return await handleMCPRequest(body, {
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
