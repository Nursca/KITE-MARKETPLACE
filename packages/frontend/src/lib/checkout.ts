import { ethers } from 'ethers';
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";

export interface OrderConfirmation {
  success: boolean;
  txHash: string;
  explorerUrl: string;
  timestamp: string;
  totalPaid: string;
  items: any[];
}

// Kite Testnet Configuration
const KITE_RPC = process.env.NEXT_PUBLIC_KITE_RPC || 'https://rpc-testnet.gokite.ai';
const BUNDLER_RPC = 'https://bundler-service.staging.gokite.ai/rpc/';

/**
 * Executes the checkout process using Kite AI Account Abstraction and x402.
 */
export async function checkout(
  items: any[],
  total: number,
  walletClient: any // viem wallet client
): Promise<OrderConfirmation> {
  const { GokiteAASDK } = await import('gokite-aa-sdk');
  const sdk = new GokiteAASDK('kite_testnet', KITE_RPC, BUNDLER_RPC);
  
  // 1. Initialize AA SDK with the user's EOA from viem
  const userAddress = walletClient.account.address;
  const aaAddress = sdk.getAccountAddress(userAddress);
  console.log('Using Kite AA Wallet:', aaAddress);

  // 2. Create a custom scheme for Kite AA using x402
  // We wrap the AA SDK to be compatible with x402's expected interface
  const kiteAAScheme = {
    network: "eip155:2368",
    async pay(requirement: any) {
      const { amount, recipient, token } = requirement;
      
      // Convert amount to bigInt (assuming 6 decimals for USDC on Kite)
      const value = ethers.parseUnits(amount, 6);
      
      // Define the sign function for the AA SDK
      const signFunction = async (userOpHash: string): Promise<string> => {
        return await walletClient.signMessage({
          message: { raw: userOpHash as `0x${string}` }
        });
      };

      // Execute the transfer via AA UserOperation
      // Note: In a real app, this would check for active sessions/spending rules
      const receipt = await sdk.sendUserOperationAndWait(userAddress, {
        target: token || recipient, // If token exists, we call the token contract
        callData: '0x', // Encode transfer data here
        value: token ? BigInt(0) : value
      }, signFunction);

      return {
        transactionHash: receipt.userOpHash,
        hash: receipt.userOpHash
      };
    }
  };

  const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [kiteAAScheme as any],
  });

  try {
    const response = await fetchWithPayment(`/api/checkout?total=${total.toFixed(2)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Checkout failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Kite Checkout error:', error);
    throw new Error(error.message || "Checkout failed via Kite AA");
  }
}
