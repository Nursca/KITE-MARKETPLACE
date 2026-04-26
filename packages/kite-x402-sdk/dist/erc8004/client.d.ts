/**
 * ERC-8004 Client for the buyer agent.
 * Uses Kite Testnet (chainId 2368).
 */
import { type Address, type Hash } from "viem";
export declare const ERC8004_CONTRACTS: {
    readonly identityRegistry: Address;
    readonly reputationRegistry: Address;
    readonly validationRegistry: Address;
    readonly agentPassport: Address;
};
export interface Passport {
    agentId: bigint;
    did: string;
    agentWallet: Address;
    capabilities: number;
    totalVolumeUsdc: bigint;
    tier: number;
    lastUpdated: bigint;
}
export interface AgentInfo {
    agentId: bigint;
    owner: Address;
    agentURI: string;
    agentWallet: Address;
}
export interface ReputationSummary {
    count: number;
    summaryValue: bigint;
    summaryValueDecimals: number;
}
export interface FeedbackEntry {
    clientAddress: Address;
    feedbackIndex: number;
    value: bigint;
    valueDecimals: number;
    tag1: string;
    tag2: string;
    isRevoked: boolean;
}
export interface ValidationSummary {
    count: number;
    avgResponse: number;
}
export declare class ERC8004Client {
    private publicClient;
    private walletClient;
    address: Address;
    constructor(privateKey: `0x${string}`);
    /** Find the agentId for a given owner address */
    findAgentId(ownerAddress: Address): Promise<bigint | null>;
    /** Register this agent on the Identity Registry */
    registerAgent(agentURI?: string): Promise<{
        agentId: bigint;
        txHash: Hash;
    }>;
    /** Get agent info by ID */
    getAgentInfo(agentId: bigint): Promise<AgentInfo>;
    /** Check if an agent ID exists on-chain */
    isRegistered(agentId: bigint): Promise<boolean>;
    /** Get reputation summary for an agent */
    getReputationSummary(agentId: bigint): Promise<ReputationSummary>;
    /** Get all feedback entries for an agent */
    getAllFeedback(agentId: bigint): Promise<FeedbackEntry[]>;
    /** Give feedback to a merchant agent */
    giveFeedback(agentId: bigint, value: number, tag1?: string, tag2?: string): Promise<Hash>;
    /** Get validation summary for an agent */
    getValidationSummary(agentId: bigint): Promise<ValidationSummary>;
    /** Get all validation request hashes for an agent */
    getValidationHashes(agentId: bigint): Promise<`0x${string}`[]>;
    /** Get validation status by request hash */
    getValidationStatus(requestHash: `0x${string}`): Promise<{
        validatorAddress: `0x${string}`;
        agentId: bigint;
        response: number;
        responseHash: `0x${string}`;
        tag: string;
        lastUpdate: bigint;
    }>;
    /** Get the Agent Passport */
    getPassport(agentId: bigint): Promise<Passport>;
}
