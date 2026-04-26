"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeAgentPurchase = executeAgentPurchase;
/// <reference path="./declarations.d.ts" />
const ethers_1 = require("ethers");
const fetch_1 = require("@x402/fetch");
const agent_wallet_1 = require("./agent-wallet");
const KITE_RPC = process.env.NEXT_PUBLIC_KITE_RPC || 'https://rpc-testnet.gokite.ai';
const BUNDLER_RPC = 'https://bundler-service.staging.gokite.ai/rpc/';
/**
 * Execute an autonomous purchase using the Agent's CDP Wallet and x402 retry flow.
 */
async function executeAgentPurchase(productId, amount) {
    const wallet = await (0, agent_wallet_1.getAgentWallet)();
    if (!wallet)
        throw new Error("Autonomous Agent wallet not configured (CDP keys missing).");
    const { GokiteAASDK } = await Promise.resolve().then(() => __importStar(require('gokite-aa-sdk')));
    const sdk = new GokiteAASDK('kite_testnet', KITE_RPC, BUNDLER_RPC);
    const ownerAddress = (await wallet.getDefaultAddress()).getId();
    const aaAddress = sdk.getAccountAddress(ownerAddress);
    console.log(`Agent ${aaAddress} (Owner: ${ownerAddress}) initiating autonomous purchase...`);
    const kiteAgentScheme = {
        network: "eip155:2368",
        async pay(requirement) {
            console.log("Agent received 402 Payment Required. Settling via CDP Wallet...");
            const { amount, recipient, token } = requirement;
            // Kite USDC uses 6 decimals
            const value = ethers_1.ethers.parseUnits(amount, 6);
            const signFunction = async (userOpHash) => {
                // Sign the hash using CDP Wallet MPC signing
                const payloadSignature = await wallet.createPayloadSignature(userOpHash);
                const signature = payloadSignature.getSignature();
                if (!signature)
                    throw new Error("Failed to get signature from CDP wallet");
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
    const fetchWithPayment = (0, fetch_1.wrapFetchWithPaymentFromConfig)(fetch, {
        schemes: [kiteAgentScheme],
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
    }
    catch (error) {
        console.error('Agent autonomous purchase error:', error);
        throw new Error(error.message || "Autonomous purchase flow failed");
    }
}
