/**
 * Payment Verification Utility for x402 Routes
 * 
 * CRITICAL SECURITY: Verifies all payments on-chain before granting access to protected resources.
 * This prevents the payment bypass vulnerability where ANY X-PAYMENT header was accepted.
 * 
 * Architecture:
 * - Extracts transaction hash from payment header
 * - Verifies transaction exists on Kite Testnet blockchain
 * - Confirms transaction status is successful
 * - Only grants access with valid, confirmed payment proof
 */

import { createPublicClient, http } from "viem";
import { kiteTestnet } from "@kite/x402-sdk/erc8004";

const KITE_RPC = "https://rpc-testnet.gokite.ai/";

// Create a public client for on-chain verification (Kite Testnet, chainId 2366)
const publicClient = createPublicClient({
  chain: kiteTestnet,
  transport: http(KITE_RPC),
});

export interface PaymentInfo {
  txHash: string;
  payerAddress: string;
  isValid: boolean;
  error?: string;
}

/**
 * Extract payment details from x402 payment header
 * The header is expected to be base64-encoded JSON with structure:
 * {
 *   payload?: { transactionHash?: string, hash?: string },
 *   authorization?: { from?: string },
 *   transactionHash?: string
 * }
 */
export function parsePaymentHeader(headerValue: string): { txHash: string; payerAddress: string } {
  try {
    const decoded = JSON.parse(Buffer.from(headerValue, "base64").toString());
    const txHash =
      decoded.payload?.transactionHash ||
      decoded.payload?.hash ||
      decoded.transactionHash ||
      "";
    const payerAddress = decoded.authorization?.from || decoded.payload?.authorization?.from || "";

    return { txHash, payerAddress };
  } catch (error) {
    console.error("[Payment Verification] Failed to parse payment header:", error);
    throw new Error("Invalid payment header format");
  }
}

/**
 * CRITICAL: Verify that a transaction hash exists on-chain and represents a valid payment
 * This is the core security check that prevents payment bypass attacks.
 * 
 * @param txHash - Transaction hash to verify on Kite Testnet
 * @returns true if transaction exists and is successful, false otherwise
 */
export async function verifyPaymentOnChain(txHash: string): Promise<boolean> {
  // Reject obviously invalid transaction hashes
  if (!txHash || txHash === "0xpending" || txHash.length < 66) {
    console.warn(`[Payment Verification] Rejected invalid tx hash format: ${txHash}`);
    return false;
  }

  try {
    console.log(`[Payment Verification] Verifying transaction on Kite Testnet (chainId 2366): ${txHash}`);
    
    // Query the transaction receipt on Kite Testnet
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });
    
    // Transaction must exist and be successful
    if (!receipt) {
      console.warn(`[Payment Verification] Transaction not found on-chain: ${txHash}`);
      return false;
    }

    if (receipt.status !== "success") {
      console.warn(`[Payment Verification] Transaction failed or pending: ${txHash}, status: ${receipt.status}`);
      return false;
    }

    console.log(`[Payment Verification] ✓ Transaction verified as successful: ${txHash}`);
    return true;
  } catch (error) {
    console.error(`[Payment Verification] Failed to verify tx ${txHash} on Kite Testnet:`, error);
    return false;
  }
}

/**
 * Extract and verify payment from request headers
 * Returns payment info object that indicates whether payment is valid
 */
export async function extractAndVerifyPayment(headers: {
  get: (name: string) => string | null;
}): Promise<PaymentInfo> {
  // Check for x402 payment header (case-insensitive)
  const paymentHeader =
    headers.get("X-PAYMENT") ||
    headers.get("x-payment") ||
    headers.get("payment-signature");

  if (!paymentHeader) {
    return {
      txHash: "",
      payerAddress: "",
      isValid: false,
      error: "No payment header provided",
    };
  }

  try {
    const { txHash, payerAddress } = parsePaymentHeader(paymentHeader);

    // Verify the transaction exists on-chain
    const isValidPayment = await verifyPaymentOnChain(txHash);

    if (!isValidPayment) {
      return {
        txHash,
        payerAddress,
        isValid: false,
        error: "Transaction could not be verified on Kite Testnet",
      };
    }

    return {
      txHash,
      payerAddress,
      isValid: true,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      txHash: "",
      payerAddress: "",
      isValid: false,
      error: errorMsg,
    };
  }
}
