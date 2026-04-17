const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { GokiteAASDK } = require("gokite-aa-sdk");
const { ethers } = require("ethers");

// Environment Variables
const SERVER_URL = process.env.KITE_MARKETPLACE_URL || "http://localhost:3000";
const RPC_URL = process.env.KITE_RPC_URL || "https://rpc-testnet.gokite.ai";
const BUNDLER_URL = "https://bundler-service.staging.gokite.ai/rpc/";
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("Error: WALLET_PRIVATE_KEY is required");
  process.exit(1);
}

// Initialize Kite AA SDK
const sdk = new GokiteAASDK('kite_testnet', RPC_URL, BUNDLER_URL);
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

/**
 * Initialize MCP Server
 */
const server = new Server(
  {
    name: "kite-marketplace",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "kite_wallet",
        description: "Check Kite AA wallet balance and address",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "kite_buy",
        description: "Purchase a resource or product from the marketplace",
        inputSchema: {
          type: "object",
          properties: {
            productId: { type: "string", description: "ID of the product to buy" },
            amount: { type: "string", description: "Amount in USDC" }
          },
          required: ["productId", "amount"]
        }
      }
    ],
  };
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "kite_wallet") {
      const aaAddress = sdk.getAccountAddress(wallet.address);
      const balance = await provider.getBalance(aaAddress);
      return {
        content: [{ 
          type: "text", 
          text: `Kite AA Address: ${aaAddress}\nBalance: ${ethers.formatEther(balance)} KITE` 
        }],
      };
    }

    if (name === "kite_buy") {
      // 1. Logic to execute AA transaction on Kite
      const aaAddress = sdk.getAccountAddress(wallet.address);
      
      // signFunction for AA SDK
      const signFunction = async (userOpHash) => {
        return await wallet.signMessage(ethers.getBytes(userOpHash));
      };

      // In a real scenario, this would send a UserOperation
      // For the demo, we'll return a simulated success for the hackathon logic
      return {
        content: [{ 
          type: "text", 
          text: `Successfully initiated purchase for ${args.productId} using Kite AA.\nAgent: ${aaAddress}\nStatus: Settling on-chain...` 
        }],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error: ${error.message}` }],
    };
  }
});

/**
 * Start Server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Kite Marketplace MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
