"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgentWallet = getAgentWallet;
exports.getAgentAddress = getAgentAddress;
const coinbase_sdk_1 = require("@coinbase/coinbase-sdk");
let agentWallet = null;
let cdpConfigured = false;
let cdpCheckDone = false;
/**
 * Initialize CDP config lazily (on first use, after dotenv is loaded).
 */
function ensureCDPConfigured() {
    if (cdpCheckDone)
        return cdpConfigured;
    cdpCheckDone = true;
    const hasProcess = typeof process !== 'undefined';
    const apiKeyName = hasProcess ? process.env.CDP_API_KEY_NAME : undefined;
    const privateKey = hasProcess ? process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, '\n') : undefined;
    if (apiKeyName && privateKey) {
        coinbase_sdk_1.Coinbase.configure({ apiKeyName, privateKey });
        cdpConfigured = true;
    }
    else {
        console.warn("CDP API Keys missing. Agent wallet will not be autonomous.");
        cdpConfigured = false;
    }
    return cdpConfigured;
}
/**
 * Loads or provisions the CDP Agent Wallet.
 * In a production environment, you would save/load the wallet data from a database.
 */
async function getAgentWallet() {
    if (agentWallet)
        return agentWallet;
    if (!ensureCDPConfigured())
        return null;
    try {
        const savedWalletData = typeof process !== 'undefined' ? process.env.CDP_WALLET_DATA : undefined;
        if (savedWalletData) {
            console.log("Loading existing CDP Agent Wallet...");
            agentWallet = await coinbase_sdk_1.Wallet.import(JSON.parse(savedWalletData));
        }
        else {
            console.log("Provisioning new CDP Agent Wallet on Base Sepolia...");
            // We use Base Sepolia as the default network for the CDP wallet instance
            agentWallet = await coinbase_sdk_1.Wallet.create({ networkId: 'base-sepolia' });
            // In a real app, you MUST save this export data to your DB to maintain access
            const exported = agentWallet.export();
            console.log("NEW AGENT WALLET PROVISIONED. SAVE THIS TO CDP_WALLET_DATA:");
            console.log(JSON.stringify(exported));
            // Attempt to fund with faucet for testing
            try {
                await agentWallet.faucet();
                console.log("Agent wallet funded via faucet.");
            }
            catch (faucetError) {
                console.warn("Faucet funding failed, agent may require manual funding.");
            }
        }
        return agentWallet;
    }
    catch (error) {
        console.error("Failed to initialize Agent Wallet:", error);
        return null;
    }
}
/**
 * Helper to get the agent's address for display in the UI.
 */
async function getAgentAddress() {
    const wallet = await getAgentWallet();
    if (!wallet)
        return null;
    const address = await wallet.getDefaultAddress();
    return address.getId();
}
