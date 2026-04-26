/**
 * Base MCP Handler
 * 
 * Shared JSON-RPC 2.0 handler that can be used by any MCP server.
 * Handles protocol methods (initialize, tools/list, tools/call).
 */

import { 
  JsonRpcRequest, 
  JsonRpcResponse, 
  MCPServerInfo 
} from "./types";
import { toolRegistry } from "./tool-registry";

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
 * Handle initialize request
 */
function handleInitialize(
  id: string | number | null, 
  serverInfo: MCPServerInfo
): JsonRpcResponse {
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
function handleToolsList(
  id: string | number | null,
  toolNames?: string[],
  category?: string
): JsonRpcResponse {
  // Get tool names to include
  let names = toolNames;
  if (!names && category) {
    names = toolRegistry.getNamesByCategory(category);
  }

  const tools = toolRegistry.getMetadata(names);

  return {
    jsonrpc: "2.0",
    id,
    result: { tools },
  };
}

/**
 * Handle tools/call request
 */
async function handleToolsCall(
  id: string | number | null,
  params: Record<string, any>,
  allowedTools?: string[],
  category?: string,
  log: (...args: any[]) => void = () => {}
): Promise<JsonRpcResponse> {
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
    const categoryTools = toolRegistry.getNamesByCategory(category);
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
  
  const result = await toolRegistry.execute(toolName, toolArgs);
  
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
function handleResourcesList(id: string | number | null): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { resources: [] },
  };
}

/**
 * Handle prompts/list (empty for now)
 */
function handlePromptsList(id: string | number | null): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: { prompts: [] },
  };
}

/**
 * Handle an MCP request
 */
export async function handleMCPRequest(
  body: JsonRpcRequest,
  options: MCPHandlerOptions,
  log: (...args: any[]) => void = () => {}
): Promise<JsonRpcResponse> {
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
