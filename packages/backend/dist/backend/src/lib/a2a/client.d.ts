/**
 * A2A JSON-RPC Client
 *
 * Thin HTTP wrapper for A2A protocol communication.
 */
import type { A2AJsonRpcResponse, AgentCard } from "./types";
export declare class A2AClient {
    private a2aEndpoint;
    private baseUrl;
    private requestIdCounter;
    constructor(baseUrl: string);
    /** Fetch the AgentCard from /.well-known/agent.json */
    getAgentCard(): Promise<AgentCard>;
    /** Send a JSON-RPC request to the A2A endpoint */
    sendRpc(method: string, params: Record<string, unknown>): Promise<A2AJsonRpcResponse>;
    /** Send message/send with a data part */
    sendMessage(data: Record<string, unknown>): Promise<A2AJsonRpcResponse>;
    /** Get task by ID */
    getTask(taskId: string): Promise<A2AJsonRpcResponse>;
    /** Cancel task */
    cancelTask(taskId: string): Promise<A2AJsonRpcResponse>;
    listStores(): Promise<unknown[]>;
    listProducts(storeId: string): Promise<unknown[]>;
    listResources(): Promise<unknown[]>;
}
