/**
 * MCP Module - Modular Model Context Protocol Implementation
 */

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

// Tool registration exports
import { registerShoppingTools } from "./tools/shopping";
import { registerERC8004Tools } from "./tools/erc8004";
import { registerResourceTools } from "./tools/resources";
import { registerPaymentTools } from "./tools/payments";
import { handleMCPRequest } from "./base-handler";

/**
 * Initialize all MCP tools
 * Call this once at server startup
 */
let initialized = false;
export function initializeMCPTools(): void {
  if (initialized) return;
  
  registerShoppingTools();
  registerERC8004Tools();
  registerResourceTools();
  registerPaymentTools();
  // We can add more tool registrations here (e.g., a2a)

  initialized = true;
  console.log("[MCP] All tools initialized");
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
