/// <reference path="./declarations.d.ts" />
import { ethers } from 'ethers';
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { getAgentWallet } from './agent-wallet';

const KITE_RPC = process.env.NEXT_PUBLIC_KITE_RPC || 'https://rpc-testnet.gokite.ai';
const BUNDLER_RPC = 'https://bundler-service.staging.gokite.ai/rpc/';

/**
 * Execute an autonomous purchase using the Agent's CDP Wallet and x402 retry flow.
 */
export async function executeAgentPurchase(productId: string, amount: number) {
  const wallet = await getAgentWallet();
  if (!wallet) throw new Error("Autonomous Agent wallet not configured (CDP keys missing).");

  const { GokiteAASDK } = await import('gokite-aa-sdk');
  const sdk = new GokiteAASDK('kite_testnet', KITE_RPC, BUNDLER_RPC);

  const ownerAddress = (await wallet.getDefaultAddress()).getId();
  const aaAddress = sdk.getAccountAddress(ownerAddress);

  console.log(`Agent ${aaAddress} (Owner: ${ownerAddress}) initiating autonomous purchase...`);

  const kiteAgentScheme = {
    network: "eip155:2368",
    async pay(requirement: any) {
      console.log("Agent received 402 Payment Required. Settling via CDP Wallet...");
      const { amount, recipient, token } = requirement;
      
      // Kite USDC uses 6 decimals
      const value = ethers.parseUnits(amount, 6);
      
      const signFunction = async (userOpHash: string): Promise<string> => {
        // Sign the hash using CDP Wallet MPC signing
        const payloadSignature = await wallet.createPayloadSignature(userOpHash);
        const signature = payloadSignature.getSignature();
        if (!signature) throw new Error("Failed to get signature from CDP wallet");
        return signature;
      };

      // Execute the transfer via AA UserOperation on Kite
      const receipt = await sdk.sendUserOperationAndWait(ownerAddress, {
        target: token || recipient,
        callData: '0x',
        value: token ? BigInt(0) : value
      }, signFunction);

      return {
        transactionHash: receipt.userOpHash,
        hash: receipt.userOpHash
      };
    }
  };

  // Wrap fetch with the Agent's autonomous payment scheme
  const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [kiteAgentScheme as any],
  });

  // Use absolute URL for server-side fetch
  const baseUrl = process.env.KITE_MARKETPLACE_URL || 'http://localhost:3000';
  
  try {
    const response = await fetchWithPayment(`${baseUrl}/api/checkout?total=${amount.toFixed(2)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: [{ id: productId, quantity: 1 }] }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Autonomous purchase failed with status ${response.status}`);
    }

    const result = await response.json();

    // Phase 3: Return AP2-compliant structured receipt
    return {
      type: 'AP2_RECEIPT',
      intent: `Autonomous purchase of product ${productId}`,
      status: 'settled',
      outcome: 'success',
      cost: amount.toFixed(2),
      currency: 'USDC',
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
      timestamp: result.timestamp,
      productId,
      agentAddress: aaAddress,
      ownerAddress: ownerAddress
    };
  } catch (error: any) {
    console.error('Agent autonomous purchase error:', error);
    throw new Error(error.message || "Autonomous purchase flow failed");
  }
}
