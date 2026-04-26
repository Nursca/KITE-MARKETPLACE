/**
 * MCP Types - Shared types for the modular MCP system
 */
import { ZodSchema } from "zod";
/**
 * Tool definition for MCP
 */
export interface MCPToolDefinition<TInput = any, TOutput = any> {
    name: string;
    description: string;
    inputSchema: ZodSchema<TInput>;
    handler: (args: TInput) => Promise<TOutput>;
}
/**
 * Tool metadata for JSON-RPC tools/list response
 */
export interface MCPToolMetadata {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: Record<string, any>;
        required: string[];
    };
}
/**
 * JSON-RPC 2.0 Request
 */
export interface JsonRpcRequest {
    jsonrpc: "2.0";
    id: string | number | null;
    method: string;
    params?: Record<string, any>;
}
/**
 * JSON-RPC 2.0 Response
 */
export interface JsonRpcResponse {
    jsonrpc: "2.0";
    id: string | number | null;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}
/**
 * MCP Server Info
 */
export interface MCPServerInfo {
    name: string;
    version: string;
    description?: string;
}
/**
 * MCP Tool Result
 */
export interface MCPToolResult {
    success: boolean;
    error?: string;
    [key: string]: any;
}
/**
 * Convert Zod schema to JSON Schema for MCP tools/list
 */
export declare function zodToJsonSchema(schema: ZodSchema): {
    type: "object";
    properties: Record<string, any>;
    required: string[];
};
