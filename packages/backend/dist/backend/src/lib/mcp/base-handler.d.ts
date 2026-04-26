/**
 * Base MCP Handler
 *
 * Shared JSON-RPC 2.0 handler that can be used by any MCP server.
 * Handles protocol methods (initialize, tools/list, tools/call).
 */
import { JsonRpcRequest, JsonRpcResponse, MCPServerInfo } from "./types";
export interface MCPHandlerOptions {
    /** Server info for initialize response */
    serverInfo: MCPServerInfo;
    /** Tool names to expose (if undefined, exposes all tools) */
    tools?: string[];
    /** Tool category to expose */
    category?: string;
    /** Enable verbose logging */
    verbose?: boolean;
}
/**
 * Handle an MCP request
 */
export declare function handleMCPRequest(body: JsonRpcRequest, options: MCPHandlerOptions, log?: (...args: any[]) => void): Promise<JsonRpcResponse>;
