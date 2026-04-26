"use strict";
/**
 * MCP Tool Registry
 *
 * Centralized registry for all MCP tools.
 * Tools can be registered and composed into different MCP servers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = void 0;
exports.defineTool = defineTool;
const types_1 = require("./types");
/**
 * Global tool registry
 */
class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.categories = new Map();
    }
    /**
     * Register a tool
     */
    register(tool, category) {
        this.tools.set(tool.name, tool);
        if (category) {
            if (!this.categories.has(category)) {
                this.categories.set(category, new Set());
            }
            this.categories.get(category).add(tool.name);
        }
        console.log(`[ToolRegistry] Registered tool: ${tool.name}${category ? ` (${category})` : ""}`);
    }
    /**
     * Get a tool by name
     */
    get(name) {
        return this.tools.get(name);
    }
    /**
     * Check if a tool exists
     */
    has(name) {
        return this.tools.has(name);
    }
    /**
     * Get all tools
     */
    getAll() {
        return Array.from(this.tools.values());
    }
    /**
     * Get tools by category
     */
    getByCategory(category) {
        const toolNames = this.categories.get(category);
        if (!toolNames)
            return [];
        return Array.from(toolNames)
            .map(name => this.tools.get(name))
            .filter((t) => t !== undefined);
    }
    /**
     * Get tool names by category
     */
    getNamesByCategory(category) {
        const toolNames = this.categories.get(category);
        return toolNames ? Array.from(toolNames) : [];
    }
    /**
     * Get all categories
     */
    getCategories() {
        return Array.from(this.categories.keys());
    }
    /**
     * Execute a tool by name
     */
    async execute(name, args) {
        const tool = this.tools.get(name);
        if (!tool) {
            return { success: false, error: `Unknown tool: ${name}` };
        }
        try {
            // Validate input
            const validatedArgs = tool.inputSchema.parse(args);
            // Execute handler
            const result = await tool.handler(validatedArgs);
            return result;
        }
        catch (error) {
            if (error.name === "ZodError") {
                const issues = error.issues || error.errors || [];
                return {
                    success: false,
                    error: `Validation error: ${issues.map((e) => e.message).join(", ")}`
                };
            }
            return { success: false, error: error.message };
        }
    }
    /**
     * Get tool metadata for JSON-RPC tools/list response
     */
    getMetadata(toolNames) {
        const tools = toolNames
            ? toolNames.map(name => this.tools.get(name)).filter((t) => t !== undefined)
            : this.getAll();
        return tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: (0, types_1.zodToJsonSchema)(tool.inputSchema),
        }));
    }
    /**
     * Clear all tools (useful for testing)
     */
    clear() {
        this.tools.clear();
        this.categories.clear();
    }
}
// Singleton instance
exports.toolRegistry = new ToolRegistry();
/**
 * Helper to create a tool definition
 */
function defineTool(definition) {
    return definition;
}
