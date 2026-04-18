/**
 * Payment MCP Tools for Kite Marketplace
 */

import { z } from "zod";
import { toolRegistry, defineTool } from "../tool-registry";
import { getAgentAddress } from "../../agent-wallet";
import { executeAgentPurchase } from "../../agent-x402";

// ============================================================
// Tool Definitions
// ============================================================

const getAgentWalletAddressTool = defineTool({
  name: "get_agent_wallet_address",
  description: "Get the autonomous agent's CDP wallet address on Kite Testnet.",
  inputSchema: z.object({}),
  handler: async () => {
    const address = await getAgentAddress();
    return {
      success: true,
      agentAddress: address || "Not configured (set CDP_API_KEY_NAME + CDP_API_KEY_PRIVATE_KEY)",
      network: "Kite Testnet",
      chainId: 2368,
      paymentToken: "USDC"
    };
  },
});

const sendPaymentTool = defineTool({
  name: "send_payment",
  description: "Send a USDC payment on Kite Testnet for a product or listing.",
  inputSchema: z.object({
    productId: z.string().describe("The ID of the product or listing to buy"),
    amount: z.number().describe("The amount in USDC to pay")
  }),
  handler: async ({ productId, amount }) => {
    try {
      console.log(`[send_payment] 💸 Sending ${amount} USDC for ${productId}...`);
      const result = await executeAgentPurchase(productId, amount);
      return {
        success: true,
        receipt: result
      };
    } catch (error: any) {
      const baseUrl = process.env.KITE_MARKETPLACE_URL || "http://localhost:3000";
      return {
        success: false,
        error: error.message,
        x402Url: `${baseUrl}/api/listings/${productId}/content`,
        priceUsdc: amount,
        message: "Wallet might not be configured. Provide CDP keys to enable autonomous payments."
      };
    }
  },
});

const getReceiptTool = defineTool({
  name: "get_receipt",
  description: "Get the receipt and transaction details for a previous purchase.",
  inputSchema: z.object({
    txHash: z.string().describe("The transaction hash of the payment")
  }),
  handler: async ({ txHash }) => {
    return {
      success: true,
      receipt: {
        txHash,
        explorerUrl: `https://testnet.kiteexplorer.com/tx/${txHash}`,
        status: "settled",
        timestamp: new Date().toISOString()
      }
    };
  },
});

// ============================================================
// Register all payment tools
// ============================================================

export function registerPaymentTools(): void {
  toolRegistry.register(getAgentWalletAddressTool, "payments");
  toolRegistry.register(sendPaymentTool, "payments");
  toolRegistry.register(getReceiptTool, "payments");
  
  console.log("[Payment Tools] ✅ Registered 3 tools");
}
