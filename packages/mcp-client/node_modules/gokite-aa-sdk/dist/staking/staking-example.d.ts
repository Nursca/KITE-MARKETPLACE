/**
 * Delegator Staking Frontend Integration Examples
 *
 * This file demonstrates how to integrate delegator staking operations in a frontend application.
 *
 * Architecture:
 * - Frontend: Handles Step 1 (initiate transactions) - users sign with their wallet
 * - Backend: Handles Step 2 & 3 (P-Chain tx + complete) - requires P-Chain private key
 */
import { ethers } from "ethers";
/**
 * Parsed contract error with human-readable information
 */
export interface ParsedContractError {
    /** Original error name from contract (e.g., "InvalidDelegationID") */
    name: string;
    /** Human-readable error description */
    description: string;
    /** Parsed error arguments with formatted values */
    args: Record<string, string>;
    /** Original error data (hex) */
    data?: string;
    /** Original error message */
    originalMessage?: string;
}
/**
 * Contract error parser for delegator staking operations
 * Provides human-readable error messages for debugging
 */
export declare class ContractErrorParser {
    private errorInterface;
    constructor();
    /**
     * Parse an error from a contract call
     * @param error - The error object from ethers.js
     * @returns Parsed error with human-readable information, or null if not a contract error
     */
    parse(error: unknown): ParsedContractError | null;
    /**
     * Parse error data hex string
     */
    private parseErrorData;
    /**
     * Format error arguments for human-readable display
     */
    private formatErrorArgs;
    /**
     * Format a single argument value based on its type
     */
    private formatArgValue;
    /**
     * Extract error data from various error formats
     */
    private extractErrorData;
    /**
     * Extract error message from various error formats
     */
    private extractErrorMessage;
    /**
     * Format a parsed error for display (console or UI)
     */
    formatForDisplay(parsed: ParsedContractError): string;
}
/**
 * Wrap an async function to parse contract errors
 * @param fn - The async function to wrap
 * @returns The wrapped function that throws StakingError on contract errors
 */
export declare function withErrorParsing<T>(fn: () => Promise<T>): Promise<T>;
/**
 * Custom error class for staking operations with parsed contract error info
 */
export declare class StakingError extends Error {
    /** Parsed contract error information */
    readonly parsedError: ParsedContractError;
    /** Original error object */
    readonly originalError: unknown;
    constructor(parsedError: ParsedContractError, originalError: unknown);
    /**
     * Get formatted error string for display
     */
    toDisplayString(): string;
}
/**
 * Parse a contract error for display
 * @param error - The error to parse
 * @returns Parsed error info or null
 */
export declare function parseContractError(error: unknown): ParsedContractError | null;
/**
 * Format a contract error for console/UI display
 * @param error - The error to format
 * @returns Formatted error string or original error message
 */
export declare function formatContractError(error: unknown): string;
export declare const STAKING_CONFIG: {
    stakingManager: string;
    validatorManager: string;
    warpPrecompile: string;
    chainId: number;
    rpcUrl: string;
    backendApiUrl: string;
    minStakeAmount: string;
};
export interface DelegatorInfo {
    status: number;
    statusName: string;
    owner: string;
    validationID: string;
    weight: bigint;
    startTime: bigint;
    startingNonce: bigint;
    endingNonce: bigint;
    lastRewardClaimTime: bigint;
    lastClaimUptimeSeconds: bigint;
}
export interface ValidatorInfo {
    validationID: string;
    nodeID: string;
    weight: bigint;
    delegationFeeBips: number;
    status: number;
}
export interface BackendResponse {
    success: boolean;
    txHash?: string;
    pchainTxId?: string;
    error?: string;
}
export interface ClaimRewardsResult {
    txHash: string;
    rewardAmount: bigint;
    rewardAmountFormatted: string;
    recipient: string;
}
export interface UptimeProofResponse {
    success: boolean;
    signedUptimeProof?: string;
    storageKeys?: string[];
    uptimeSeconds?: number;
    error?: string;
}
export declare class DelegatorStakingClient {
    private provider;
    private stakingManager;
    private backendUrl;
    constructor(provider: ethers.Provider, backendUrl?: string);
    /**
     * Initiate delegator registration
     * @param signer - User's wallet signer
     * @param validationID - Target validator's validation ID
     * @param stakeAmountKITE - Amount to stake in KITE (e.g., "1000" for 1000 KITE)
     * @param rewardRecipient - Address to receive rewards (defaults to signer)
     * @returns Transaction result with delegationID and nonce
     */
    initiateDelegatorRegistration(signer: ethers.Signer, validationID: string, stakeAmountKITE: string, rewardRecipient?: string): Promise<{
        txHash: string;
        delegationID: string;
        nonce: number;
    }>;
    /**
     * Initiate delegator removal (unstaking)
     * @param signer - User's wallet signer
     * @param delegationID - The delegation ID to remove
     * @returns Transaction hash
     */
    initiateDelegatorRemoval(signer: ethers.Signer, delegationID: string): Promise<{
        txHash: string;
    }>;
    /**
     * Send initiate delegator removal transaction
     */
    private sendInitiateDelegatorRemovalTx;
    /**
     * Complete delegator registration via backend
     * @param delegationID - The delegation ID
     * @param validationID - The validation ID
     */
    completeRegistration(delegationID: string, validationID: string): Promise<BackendResponse>;
    /**
     * Complete delegator removal via backend
     * @param delegationID - The delegation ID
     */
    completeRemoval(delegationID: string): Promise<BackendResponse>;
    /**
     * Claim delegator rewards (frontend transaction - owner must sign)
     * @param signer - User's wallet signer (must be the delegation owner)
     * @param delegationID - The delegation ID
     * @param includeUptimeProof - Whether to include uptime proof (recommended: true)
     * @returns Transaction hash and reward amount claimed
     */
    claimRewards(signer: ethers.Signer, delegationID: string, includeUptimeProof?: boolean): Promise<ClaimRewardsResult>;
    /**
     * Parse DelegatorRewardClaimed event from transaction receipt
     */
    private parseClaimRewardsEvents;
    /**
     * Get signed uptime proof from backend
     * @param delegationID - The delegation ID
     * @returns Object with storageKeys for AccessList
     */
    private getUptimeProof;
    /**
     * Send claim rewards transaction
     */
    private sendClaimRewardsTx;
    /**
     * Full registration flow
     * 1. Frontend initiates (user signs)
     * 2. Backend completes (P-Chain + L1)
     */
    registerDelegator(signer: ethers.Signer, validationID: string, stakeAmountKITE: string, rewardRecipient?: string): Promise<{
        delegationID: string;
        initiateTxHash: string;
        completeTxHash?: string;
        success: boolean;
        error?: string;
    }>;
    /**
     * Full removal flow
     * 1. Frontend initiates (user signs)
     * 2. Backend completes (P-Chain + L1)
     */
    removeDelegator(signer: ethers.Signer, delegationID: string): Promise<{
        initiateTxHash: string;
        completeTxHash?: string;
        success: boolean;
        error?: string;
    }>;
    /**
     * Get delegator information
     */
    getDelegatorInfo(delegationID: string): Promise<DelegatorInfo>;
    /**
     * Get delegator reward information
     */
    getDelegatorRewardInfo(delegationID: string): Promise<{
        rewardRecipient: string;
        claimableReward: bigint;
    }>;
    /**
     * Get all active validators
     */
    getAllActiveValidators(): Promise<string[]>;
    /**
     * Get validator information
     */
    getValidatorInfo(validationID: string): Promise<ValidatorInfo>;
    /**
     * Check if an address has an active delegation
     */
    getUserDelegations(userAddress: string): Promise<DelegatorInfo[]>;
}
export default DelegatorStakingClient;
