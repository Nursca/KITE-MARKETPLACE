#!/usr/bin/env node
/**
 * Kite Marketplace — Claude Desktop MCP Server
 * 
 * Exposes all 9 marketplace tools as an MCP stdio server.
 * Manages a local agent wallet to sign x402 transactions automatically,
 * and implements a MAX_AUTO_PAYMENT safety cap (default $10 USDC) to prevent runaway spending.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// We can load from dotenv if running directly, but Claude Desktop often sets env vars directly.
import dotenv from "dotenv";
dotenv.config();

const SERVER_URL = process.env.KITE_MARKETPLACE_URL || "http://localhost:3000";
const MAX_AUTO_PAYMENT = parseFloat(process.env.MAX_AUTO_PAYMENT || "10"); // USDC limit

// Local state for tracking cumulative session spend
let currentSessionSpend = 0;

// ─── Tool schemas ──────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "search_products",
    description: "Search physical products (electronics, footwear, bags, gaming) in the Kite Marketplace catalog.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term" },
        maxPrice: { type: "number", description: "Max price in USDC" }
      },
      required: ["query"]
    }
  },
  {
    name: "list_listings",
    description: "Browse all paywalled digital listings (APIs, datasets, articles, code) created by agents to earn USDC.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Filter: api | file | article | dataset | code" },
        maxPrice: { type: "number", description: "Max price in USDC" }
      }
    }
  },
  {
    name: "preview_resource",
    description: "Preview a listing — name, price, description, public teaser — without paying.",
    inputSchema: {
      type: "object",
      properties: {
        listingId: { type: "string", description: "Listing ID e.g. lst_demo_1" }
      },
      required: ["listingId"]
    }
  },
  {
    name: "purchase_listing",
    description: "Purchase a listing using the autonomous agent wallet. Pays USDC via x402 on Kite Testnet and returns the secret content.",
    inputSchema: {
      type: "object",
      properties: {
        listingId: { type: "string", description: "ID of the listing to purchase" },
        amount: { type: "number", description: "The price in USDC" }
      },
      required: ["listingId", "amount"]
    }
  },
  {
    name: "create_listing",
    description: "Create a paywalled listing so other agents pay USDC to access it. This is how agents EARN on Kite Marketplace.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "api | file | article | dataset | code" },
        name: { type: "string" },
        description: { type: "string", description: "What does the buyer receive?" },
        priceUsdc: { type: "number", description: "Price in USDC (e.g. 0.50)" },
        content: { type: "string", description: "SECRET content revealed after payment" },
        preview: { type: "string", description: "Public teaser (no secrets)" },
        creatorAddress: { type: "string", description: "EVM address to receive USDC" }
      },
      required: ["type", "name", "description", "priceUsdc", "content", "preview", "creatorAddress"]
    }
  },
  {
    name: "get_wallet_balance",
    description: "Check the autonomous agent wallet address and balance on Kite Testnet.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_marketplace_stats",
    description: "Get live Kite Marketplace stats: total listings, sales volume, top-earning sellers.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "register_identity",
    description: "Register an ERC-8004 on-chain agent identity on Kite Testnet. Creates a unique agent NFT.",
    inputSchema: {
      type: "object",
      properties: {
        agentURI: { type: "string", description: "Optional URI for agent metadata" }
      }
    }
  },
  {
    name: "check_reputation",
    description: "Check an agent's on-chain reputation score on Kite Testnet.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "ERC-8004 agent ID" }
      },
      required: ["agentId"]
    }
  },
  {
    name: "get_passport",
    description: "Get the full on-chain Agent Passport metadata for a given agent.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "The Agent ID to query" }
      },
      required: ["agentId"]
    }
  }
];

import { executeAgentPurchase } from "@kite/x402-sdk";

// ─── MCP-to-HTTP bridge ────────────────────────────────────────────────────

async function callMCPTool(name, args) {
  // Safety cap enforcement for autonomous purchases
  if (name === "purchase_listing" || name === "buy_listing" || name === "autonomousPurchase") {
    const amount = args.amount;
    if (typeof amount !== "number") {
      throw new Error("Missing or invalid 'amount' parameter for purchase.");
    }
    
    if (amount > MAX_AUTO_PAYMENT) {
      throw new Error(`SAFETY CAP EXCEEDED: Attempted to spend ${amount} USDC, but MAX_AUTO_PAYMENT is ${MAX_AUTO_PAYMENT} USDC per transaction.`);
    }

    if (currentSessionSpend + amount > MAX_AUTO_PAYMENT * 3) {
      throw new Error(`SAFETY CAP EXCEEDED: Cumulative session spend limit reached. Used ${currentSessionSpend} USDC so far.`);
    }
    
    currentSessionSpend += amount;
    console.error(`[SAFETY] Approved auto-payment of ${amount} USDC. Session total: ${currentSessionSpend} USDC.`);
    
    // Execute local x402 payment signing instead of sending to the backend
    try {
      const receipt = await executeAgentPurchase(args.listingId || args.productId, amount);
      return JSON.stringify(receipt, null, 2);
    } catch (error) {
      throw new Error(`Local Agent Purchase Failed: ${error.message}`);
    }
  }

  if (name === "register_identity") {
    name = "register_identity";
  }

  const response = await fetch(`${SERVER_URL}/api/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name, arguments: args }
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  // MCP result content is an array of text blocks
  const content = data.result?.content;
  if (Array.isArray(content) && content[0]?.text) {
    return content[0].text;
  }
  return JSON.stringify(data.result || data);
}

// ─── Server setup ──────────────────────────────────────────────────────────

const server = new Server(
  { name: "kite-marketplace-claude", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    const result = await callMCPTool(name, args);
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error calling ${name}: ${error.message}` }]
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Kite Marketplace Claude MCP Server connected to ${SERVER_URL}`);
  console.error(`MAX_AUTO_PAYMENT Cap: ${MAX_AUTO_PAYMENT} USDC`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
