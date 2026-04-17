import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";

// Initialize Coinbase SDK
const apiKeyName = process.env.CDP_API_KEY_NAME;
const privateKey = process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (apiKeyName && privateKey) {
  Coinbase.configure({ apiKeyName, privateKey });
} else {
  console.warn("CDP API Keys missing. Agent wallet will not be autonomous.");
}

let agentWallet: Wallet | null = null;

/**
 * Loads or provisions the CDP Agent Wallet.
 * In a production environment, you would save/load the wallet data from a database.
 */
export async function getAgentWallet(): Promise<Wallet | null> {
  if (agentWallet) return agentWallet;

  if (!apiKeyName || !privateKey) return null;

  try {
    const savedWalletData = process.env.CDP_WALLET_DATA;
    
    if (savedWalletData) {
      console.log("Loading existing CDP Agent Wallet...");
      agentWallet = await Wallet.import(JSON.parse(savedWalletData));
    } else {
      console.log("Provisioning new CDP Agent Wallet on Base Sepolia...");
      // We use Base Sepolia as the default network for the CDP wallet instance
      agentWallet = await Wallet.create({ networkId: 'base-sepolia' });
      
      // In a real app, you MUST save this export data to your DB to maintain access
      const exported = agentWallet.export();
      console.log("NEW AGENT WALLET PROVISIONED. SAVE THIS TO CDP_WALLET_DATA:");
      console.log(JSON.stringify(exported));
      
      // Attempt to fund with faucet for testing
      try {
        await agentWallet.faucet();
        console.log("Agent wallet funded via faucet.");
      } catch (faucetError) {
        console.warn("Faucet funding failed, agent may require manual funding.");
      }
    }
    
    return agentWallet;
  } catch (error) {
    console.error("Failed to initialize Agent Wallet:", error);
    return null;
  }
}

/**
 * Helper to get the agent's address for display in the UI.
 */
export async function getAgentAddress(): Promise<string | null> {
  const wallet = await getAgentWallet();
  if (!wallet) return null;
  const address = await wallet.getDefaultAddress();
  return address.getAddressId();
}
