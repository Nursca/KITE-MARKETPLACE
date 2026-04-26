import { Wallet } from "@coinbase/coinbase-sdk";
/**
 * Loads or provisions the CDP Agent Wallet.
 * In a production environment, you would save/load the wallet data from a database.
 */
export declare function getAgentWallet(): Promise<Wallet | null>;
/**
 * Helper to get the agent's address for display in the UI.
 */
export declare function getAgentAddress(): Promise<string | null>;
