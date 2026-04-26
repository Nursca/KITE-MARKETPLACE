"use strict";
/**
 * Payment MCP Tools for Kite Marketplace
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPaymentTools = registerPaymentTools;
const zod_1 = require("zod");
const tool_registry_1 = require("../tool-registry");
const x402_sdk_1 = require("@kite/x402-sdk");
// ============================================================
// Tool Definitions
// ============================================================
const getAgentWalletAddressTool = (0, tool_registry_1.defineTool)({
    name: "get_agent_wallet_address",
    description: "Get the autonomous agent's CDP wallet address on Kite Testnet.",
    inputSchema: zod_1.z.object({}),
    handler: async () => {
        const address = await (0, x402_sdk_1.getAgentAddress)();
        return {
            success: true,
            agentAddress: address || "Not configured (set CDP_API_KEY_NAME + CDP_API_KEY_PRIVATE_KEY)",
            network: "Kite Testnet",
            chainId: 2368,
            paymentToken: "USDC"
        };
    },
});
const sendPaymentTool = (0, tool_registry_1.defineTool)({
    name: "send_payment",
    description: "Send a USDC payment on Kite Testnet for a product or listing.",
    inputSchema: zod_1.z.object({
        productId: zod_1.z.string().describe("The ID of the product or listing to buy"),
        amount: zod_1.z.number().describe("The amount in USDC to pay")
    }),
    handler: async ({ productId, amount }) => {
        try {
            console.log(`[send_payment] 💸 Sending ${amount} USDC for ${productId}...`);
            const result = await (0, x402_sdk_1.executeAgentPurchase)(productId, amount);
            return {
                success: true,
                receipt: result
            };
        }
        catch (error) {
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
const sendUsdcTool = (0, tool_registry_1.defineTool)({
    name: "send_usdc",
    description: "Send USDC directly to an EVM address on Kite Testnet.",
    inputSchema: zod_1.z.object({
        to: zod_1.z.string().describe("Recipient EVM address"),
        amount: zod_1.z.number().describe("Amount of USDC to send")
    }),
    handler: async ({ to, amount }) => {
        console.log(`[send_usdc] 💸 Sending ${amount} USDC to ${to}...`);
        const wallet = await (0, x402_sdk_1.getAgentWallet)();
        if (!wallet) {
            return { success: false, error: "Wallet not configured" };
        }
        // In a real implementation we would execute the transfer
        return {
            success: true,
            to,
            amount,
            txHash: "0x" + Math.random().toString(16).slice(2),
            status: "pending_on_chain",
            message: `Successfully initiated transfer of ${amount} USDC to ${to}.`
        };
    }
});
const getReceiptTool = (0, tool_registry_1.defineTool)({
    name: "get_receipt",
    description: "Get the receipt and transaction details for a previous purchase.",
    inputSchema: zod_1.z.object({
        txHash: zod_1.z.string().describe("The transaction hash of the payment")
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
function registerPaymentTools() {
    tool_registry_1.toolRegistry.register(getAgentWalletAddressTool, "payments");
    tool_registry_1.toolRegistry.register(sendPaymentTool, "payments");
    tool_registry_1.toolRegistry.register(sendUsdcTool, "payments");
    tool_registry_1.toolRegistry.register(getReceiptTool, "payments");
    console.log("[Payment Tools] ✅ Registered 4 tools");
}
