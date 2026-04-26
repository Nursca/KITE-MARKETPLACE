/**
 * MCP Module - Modular Model Context Protocol Implementation
 */
export { toolRegistry, defineTool } from "./tool-registry";
export { handleMCPRequest, type MCPHandlerOptions } from "./base-handler";
export type { MCPToolDefinition, MCPToolMetadata, MCPToolResult, MCPServerInfo, JsonRpcRequest, JsonRpcResponse, } from "./types";
export declare function initializeMCPTools(): void;
/**
 * Create pre-configured MCP handlers
 */
export declare function createMCPServer(): {
    handle: (body: any, verbose?: boolean) => Promise<import("./types").JsonRpcResponse>;
};
