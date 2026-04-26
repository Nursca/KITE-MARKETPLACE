"use strict";
/**
 * Base MCP Handler
 *
 * Shared JSON-RPC 2.0 handler that can be used by any MCP server.
 * Handles protocol methods (initialize, tools/list, tools/call).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMCPRequest = handleMCPRequest;
const tool_registry_1 = require("./tool-registry");
/**
 * Handle initialize request
 */
function handleInitialize(id, serverInfo) {
    return {
        jsonrpc: "2.0",
        id,
        result: {
            protocolVersion: "2025-06-18",
            capabilities: {
                tools: {},
                resources: { subscribe: false },
                prompts: {},
            },
            serverInfo: {
                name: serverInfo.name,
                version: serverInfo.version,
            },
        },
    };
}
/**
 * Handle tools/list request
 */
function handleToolsList(id, toolNames, category) {
    // Get tool names to include
    let names = toolNames;
    if (!names && category) {
        names = tool_registry_1.toolRegistry.getNamesByCategory(category);
    }
    const tools = tool_registry_1.toolRegistry.getMetadata(names);
    return {
        jsonrpc: "2.0",
        id,
        result: { tools },
    };
}
/**
 * Handle tools/call request
 */
async function handleToolsCall(id, params, allowedTools, category, log = () => { }) {
    const { name: toolName, arguments: toolArgs = {} } = params;
    // Check if tool is allowed
    if (allowedTools && !allowedTools.includes(toolName)) {
        return {
            jsonrpc: "2.0",
            id,
            error: {
                code: -32601,
                message: `Tool not available: ${toolName}`,
            },
        };
    }
    if (category) {
        const categoryTools = tool_registry_1.toolRegistry.getNamesByCategory(category);
        if (!categoryTools.includes(toolName)) {
            return {
                jsonrpc: "2.0",
                id,
                error: {
                    code: -32601,
                    message: `Tool not available in this server: ${toolName}`,
                },
            };
        }
    }
    log(`🔨 Executing tool: ${toolName}`);
    const result = await tool_registry_1.toolRegistry.execute(toolName, toolArgs);
    log(`✅ Tool result:`, JSON.stringify(result, null, 2).substring(0, 500));
    return {
        jsonrpc: "2.0",
        id,
        result: {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        },
    };
}
/**
 * Handle resources/list (empty for now)
 */
function handleResourcesList(id) {
    return {
        jsonrpc: "2.0",
        id,
        result: { resources: [] },
    };
}
/**
 * Handle prompts/list (empty for now)
 */
function handlePromptsList(id) {
    return {
        jsonrpc: "2.0",
        id,
        result: { prompts: [] },
    };
}
/**
 * Handle an MCP request
 */
async function handleMCPRequest(body, options, log = () => { }) {
    const { serverInfo, tools, category } = options;
    const { method, params = {}, id } = body;
    log(`📨 Method: ${method}`);
    switch (method) {
        case "initialize":
            return handleInitialize(id, serverInfo);
        case "tools/list":
            return handleToolsList(id, tools, category);
        case "tools/call":
            return await handleToolsCall(id, params, tools, category, log);
        case "resources/list":
            return handleResourcesList(id);
        case "prompts/list":
            return handlePromptsList(id);
        default:
            return {
                jsonrpc: "2.0",
                id,
                error: {
                    code: -32601,
                    message: `Method not found: ${method}`,
                },
            };
    }
}
