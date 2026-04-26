"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.A2AClient = void 0;
/** Safely extract an array property from an unknown parsed JSON value. */
function extractArray(data, key) {
    if (Array.isArray(data))
        return data;
    if (data && typeof data === "object" && key in data) {
        const val = data[key];
        return Array.isArray(val) ? val : [];
    }
    return [];
}
class A2AClient {
    constructor(baseUrl) {
        this.requestIdCounter = 0;
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.a2aEndpoint = `${this.baseUrl}/a2a`;
    }
    /** Fetch the AgentCard from /.well-known/agent.json */
    async getAgentCard() {
        let res;
        try {
            res = await fetch(`${this.baseUrl}/.well-known/agent.json`);
        }
        catch (err) {
            throw new Error(`Network error fetching AgentCard: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (!res.ok)
            throw new Error(`Failed to fetch AgentCard: ${res.status} ${res.statusText}`);
        return res.json();
    }
    /** Send a JSON-RPC request to the A2A endpoint */
    async sendRpc(method, params) {
        const id = ++this.requestIdCounter;
        const body = { jsonrpc: "2.0", id, method, params };
        let res;
        try {
            res = await fetch(this.a2aEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        }
        catch (err) {
            throw new Error(`Network error in A2A request: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (!res.ok)
            throw new Error(`A2A request failed: ${res.status} ${res.statusText}`);
        return res.json();
    }
    /** Send message/send with a data part */
    async sendMessage(data) {
        return this.sendRpc("message/send", {
            message: {
                role: "user",
                parts: [{ type: "data", data }],
            },
        });
    }
    /** Get task by ID */
    async getTask(taskId) {
        return this.sendRpc("tasks/get", { id: taskId });
    }
    /** Cancel task */
    async cancelTask(taskId) {
        return this.sendRpc("tasks/cancel", { id: taskId });
    }
    // ── REST helpers for browsing ──
    async listStores() {
        let res;
        try {
            res = await fetch(`${this.baseUrl}/x402/stores`);
        }
        catch (err) {
            throw new Error(`Network error listing stores: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (!res.ok)
            throw new Error(`Failed to list stores: ${res.status}`);
        const data = await res.json();
        return extractArray(data, "stores");
    }
    async listProducts(storeId) {
        let res;
        try {
            res = await fetch(`${this.baseUrl}/x402/stores/${storeId}/products`);
        }
        catch (err) {
            throw new Error(`Network error listing products: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (!res.ok)
            throw new Error(`Failed to list products: ${res.status}`);
        const data = await res.json();
        return extractArray(data, "products");
    }
    async listResources() {
        let res;
        try {
            res = await fetch(`${this.baseUrl}/x402/resources`);
        }
        catch (err) {
            throw new Error(`Network error listing resources: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (!res.ok)
            throw new Error(`Failed to list resources: ${res.status}`);
        const data = await res.json();
        return extractArray(data, "resources");
    }
}
exports.A2AClient = A2AClient;
