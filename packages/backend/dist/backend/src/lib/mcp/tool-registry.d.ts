/**
 * MCP Tool Registry
 *
 * Centralized registry for all MCP tools.
 * Tools can be registered and composed into different MCP servers.
 */
import { MCPToolDefinition, MCPToolMetadata } from "./types";
/**
 * Global tool registry
 */
declare class ToolRegistry {
    private tools;
    private categories;
    /**
     * Register a tool
     */
    register<TInput, TOutput>(tool: MCPToolDefinition<TInput, TOutput>, category?: string): void;
    /**
     * Get a tool by name
     */
    get(name: string): MCPToolDefinition | undefined;
    /**
     * Check if a tool exists
     */
    has(name: string): boolean;
    /**
     * Get all tools
     */
    getAll(): MCPToolDefinition[];
    /**
     * Get tools by category
     */
    getByCategory(category: string): MCPToolDefinition[];
    /**
     * Get tool names by category
     */
    getNamesByCategory(category: string): string[];
    /**
     * Get all categories
     */
    getCategories(): string[];
    /**
     * Execute a tool by name
     */
    execute(name: string, args: any): Promise<any>;
    /**
     * Get tool metadata for JSON-RPC tools/list response
     */
    getMetadata(toolNames?: string[]): MCPToolMetadata[];
    /**
     * Clear all tools (useful for testing)
     */
    clear(): void;
}
export declare const toolRegistry: ToolRegistry;
/**
 * Helper to create a tool definition
 */
export declare function defineTool<TInput, TOutput>(definition: MCPToolDefinition<TInput, TOutput>): MCPToolDefinition<TInput, TOutput>;
export {};
