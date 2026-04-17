"use strict";
/**
 * Delegator Staking Frontend Integration Examples
 *
 * This file demonstrates how to integrate delegator staking operations in a frontend application.
 *
 * Architecture:
 * - Frontend: Handles Step 1 (initiate transactions) - users sign with their wallet
 * - Backend: Handles Step 2 & 3 (P-Chain tx + complete) - requires P-Chain private key
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelegatorStakingClient = exports.STAKING_CONFIG = exports.StakingError = exports.ContractErrorParser = void 0;
exports.withErrorParsing = withErrorParsing;
exports.parseContractError = parseContractError;
exports.formatContractError = formatContractError;
const ethers_1 = require("ethers");
// ============================================================================
// Contract Error Definitions (for Delegator Operations)
// ============================================================================
/**
 * Custom error ABI definitions from StakingManager and related contracts
 * These are used to decode revert reasons from failed transactions
 */
const DELEGATOR_ERROR_ABI = [
    // StakingManager errors (delegator related)
    "error InvalidDelegationFee(uint16 delegationFeeBips)",
    "error InvalidDelegationID(bytes32 delegationID)",
    "error InvalidDelegatorStatus(uint8 status)",
    "error InvalidRewardRecipient(address rewardRecipient)",
    "error InvalidStakeAmount(uint256 stakeAmount)",
    "error InvalidMinStakeDuration(uint64 minStakeDuration)",
    "error InvalidStakeMultiplier(uint8 maximumStakeMultiplier)",
    "error MaxWeightExceeded(uint64 newValidatorWeight)",
    "error MinStakeDurationNotPassed(uint64 endTime)",
    "error UnauthorizedOwner(address sender)",
    "error ValidatorNotPoS(bytes32 validationID)",
    "error ValidatorIneligibleForRewards(bytes32 validationID)",
    "error DelegatorIneligibleForRewards(bytes32 delegationID)",
    "error ZeroWeightToValueFactor()",
    "error InvalidUptimeBlockchainID(bytes32 uptimeBlockchainID)",
    "error NoRewardsToClaim()",
    "error InvalidWarpOriginSenderAddress(address senderAddress)",
    "error InvalidWarpSourceChainID(bytes32 sourceChainID)",
    "error UnexpectedValidationID(bytes32 validationID, bytes32 expectedValidationID)",
    "error InvalidValidatorStatus(uint8 status)",
    "error InvalidNonce(uint64 nonce)",
    "error InvalidWarpMessage()",
    "error ZeroAddress()",
    "error RewardClaimFailed()",
    "error InvalidValidationID(bytes32 validationID)",
    // KiteStakingManager errors
    "error RewardVaultNotSet()",
    "error InsufficientRewardVaultBalance(uint256 requested, uint256 available)",
    "error InvalidRewardVaultAddress()",
    // RewardVault errors
    "error UnauthorizedCaller(address caller)",
    "error InsufficientBalance(uint256 requested, uint256 available)",
    "error TransferFailed()",
    // ValidatorMessages errors
    "error InvalidMessageLength(uint32 actual, uint32 expected)",
    "error InvalidCodecID(uint32 id)",
    "error InvalidMessageType()",
    "error InvalidBLSPublicKey()",
];
/**
 * Human-readable error descriptions for delegator operations
 */
const ERROR_DESCRIPTIONS = {
    // Delegation errors
    InvalidDelegationFee: "Invalid delegation fee percentage. Fee must be within allowed range (0-10000 bips).",
    InvalidDelegationID: "Invalid or unknown delegation ID. The delegation may not exist or has been removed.",
    InvalidDelegatorStatus: "Invalid delegator status for this operation. Check if the delegation is in the correct state (Active/PendingAdded/PendingRemoved).",
    InvalidRewardRecipient: "Invalid reward recipient address. Cannot be zero address.",
    InvalidStakeAmount: "Invalid stake amount. Must be above minimum stake requirement (500,000 KITE).",
    InvalidMinStakeDuration: "Minimum stake duration not met.",
    InvalidStakeMultiplier: "Invalid stake multiplier configuration.",
    MaxWeightExceeded: "Maximum validator weight exceeded. The validator cannot accept more delegations.",
    MinStakeDurationNotPassed: "Minimum stake duration has not passed yet. Cannot remove delegation before the minimum stake period ends.",
    UnauthorizedOwner: "Unauthorized: You are not the owner of this delegation.",
    ValidatorNotPoS: "The specified validator is not a Proof-of-Stake validator.",
    ValidatorIneligibleForRewards: "The validator is not eligible for rewards. It may be inactive or removed.",
    DelegatorIneligibleForRewards: "The delegator is not eligible for rewards. The delegation may not be active.",
    ZeroWeightToValueFactor: "Zero weight to value factor. Configuration error.",
    InvalidUptimeBlockchainID: "Invalid uptime blockchain ID in the proof.",
    NoRewardsToClaim: "No rewards available to claim. Wait for more rewards to accumulate.",
    InvalidWarpOriginSenderAddress: "Invalid warp message origin sender. Message verification failed.",
    InvalidWarpSourceChainID: "Invalid warp message source chain ID. Cross-chain verification failed.",
    UnexpectedValidationID: "Unexpected validation ID in the message.",
    InvalidValidatorStatus: "Invalid validator status for this operation. The validator may be inactive or removed.",
    InvalidNonce: "Invalid nonce. The operation may be out of order or already processed.",
    InvalidWarpMessage: "Invalid warp message. Cross-chain message verification failed.",
    ZeroAddress: "Zero address not allowed.",
    RewardClaimFailed: "Reward claim failed. Transfer to recipient may have failed.",
    InvalidValidationID: "Invalid or unknown validation ID. The validator may not exist.",
    // KiteStakingManager errors
    RewardVaultNotSet: "Reward vault is not configured. Contact administrator.",
    InsufficientRewardVaultBalance: "Insufficient balance in reward vault. Not enough rewards available.",
    InvalidRewardVaultAddress: "Invalid reward vault address configuration.",
    // RewardVault errors
    UnauthorizedCaller: "Unauthorized caller. Only StakingManager can call this function.",
    InsufficientBalance: "Insufficient balance for this operation.",
    TransferFailed: "Native token transfer failed.",
    // ValidatorMessages errors
    InvalidMessageLength: "Invalid message length. Cross-chain message is malformed.",
    InvalidCodecID: "Invalid codec ID. Message format not supported.",
    InvalidMessageType: "Invalid message type. Unexpected cross-chain message.",
    InvalidBLSPublicKey: "Invalid BLS public key format.",
};
/**
 * Delegator status names for error messages
 */
const DELEGATOR_STATUS_NAMES = {
    0: "None",
    1: "PendingAdded",
    2: "Active",
    3: "PendingRemoved",
};
/**
 * Validator status names for error messages
 */
const VALIDATOR_STATUS_NAMES = {
    0: "None",
    1: "PendingAdded",
    2: "Active",
    3: "PendingRemoved",
};
/**
 * Contract error parser for delegator staking operations
 * Provides human-readable error messages for debugging
 */
class ContractErrorParser {
    constructor() {
        this.errorInterface = new ethers_1.Interface(DELEGATOR_ERROR_ABI);
    }
    /**
     * Parse an error from a contract call
     * @param error - The error object from ethers.js
     * @returns Parsed error with human-readable information, or null if not a contract error
     */
    parse(error) {
        // Extract error data from various error formats
        const errorData = this.extractErrorData(error);
        if (errorData) {
            const parsed = this.parseErrorData(errorData);
            if (parsed) {
                parsed.originalMessage = this.extractErrorMessage(error) ?? undefined;
                return parsed;
            }
        }
        // If we couldn't parse the error data, try to extract info from the message
        const message = this.extractErrorMessage(error);
        if (message) {
            // Try to find known error patterns in the message
            for (const errorName of Object.keys(ERROR_DESCRIPTIONS)) {
                if (message.includes(errorName)) {
                    return {
                        name: errorName,
                        description: ERROR_DESCRIPTIONS[errorName],
                        args: {},
                        originalMessage: message,
                    };
                }
            }
        }
        return null;
    }
    /**
     * Parse error data hex string
     */
    parseErrorData(data) {
        try {
            const decoded = this.errorInterface.parseError(data);
            if (!decoded)
                return null;
            const name = decoded.name;
            const description = ERROR_DESCRIPTIONS[name] || `Contract error: ${name}`;
            const args = this.formatErrorArgs(name, decoded.args);
            return {
                name,
                description,
                args,
                data,
            };
        }
        catch {
            return null;
        }
    }
    /**
     * Format error arguments for human-readable display
     */
    formatErrorArgs(errorName, args) {
        const formatted = {};
        for (let i = 0; i < args.length; i++) {
            const value = args[i];
            const fragment = this.errorInterface.getError(errorName);
            const paramName = fragment?.inputs[i]?.name || `arg${i}`;
            formatted[paramName] = this.formatArgValue(paramName, value);
        }
        return formatted;
    }
    /**
     * Format a single argument value based on its type
     */
    formatArgValue(paramName, value) {
        if (typeof value === "bigint") {
            // Format different numeric types appropriately
            if (paramName.toLowerCase().includes("amount") ||
                paramName.toLowerCase().includes("weight") ||
                paramName.toLowerCase().includes("balance") ||
                paramName.toLowerCase().includes("requested") ||
                paramName.toLowerCase().includes("available")) {
                return `${ethers_1.ethers.formatEther(value)} KITE (${value.toString()} wei)`;
            }
            if (paramName.toLowerCase().includes("time") || paramName.toLowerCase().includes("duration")) {
                const date = new Date(Number(value) * 1000);
                return `${value.toString()} (${date.toISOString()})`;
            }
            if (paramName.toLowerCase().includes("bips") || paramName.toLowerCase().includes("fee")) {
                return `${Number(value) / 100}% (${value.toString()} bips)`;
            }
            return value.toString();
        }
        if (typeof value === "number") {
            // Format status codes
            if (paramName === "status") {
                const statusName = DELEGATOR_STATUS_NAMES[value] || VALIDATOR_STATUS_NAMES[value] || "Unknown";
                return `${statusName} (${value})`;
            }
            return value.toString();
        }
        if (typeof value === "string") {
            return value;
        }
        return String(value);
    }
    /**
     * Extract error data from various error formats
     */
    extractErrorData(error) {
        if (!error || typeof error !== "object")
            return null;
        const err = error;
        // ethers.js v6 ContractTransactionResponse error format
        if (err.data && typeof err.data === "string" && err.data.startsWith("0x")) {
            return err.data;
        }
        // ethers.js v6 error format with info
        if (err.info && typeof err.info === "object") {
            const info = err.info;
            if (info.error && typeof info.error === "object") {
                const innerError = info.error;
                if (innerError.data && typeof innerError.data === "string") {
                    return innerError.data;
                }
            }
        }
        // Nested error format
        if (err.error && typeof err.error === "object") {
            const innerError = err.error;
            if (innerError.data && typeof innerError.data === "string") {
                return innerError.data;
            }
        }
        // EIP-1193 provider error format
        if (err.code === "CALL_EXCEPTION" && err.data && typeof err.data === "string") {
            return err.data;
        }
        // Try to extract from reason/message
        const reason = err.reason || err.message;
        if (typeof reason === "string") {
            // Look for hex data in the message
            const match = reason.match(/0x[a-fA-F0-9]+/);
            if (match && match[0].length >= 10) {
                return match[0];
            }
        }
        return null;
    }
    /**
     * Extract error message from various error formats
     */
    extractErrorMessage(error) {
        if (!error || typeof error !== "object")
            return null;
        const err = error;
        // Check various message properties
        if (typeof err.shortMessage === "string")
            return err.shortMessage;
        if (typeof err.reason === "string")
            return err.reason;
        if (typeof err.message === "string")
            return err.message;
        return null;
    }
    /**
     * Format a parsed error for display (console or UI)
     */
    formatForDisplay(parsed) {
        const lines = [
            `Contract Error: ${parsed.name}`,
            `Description: ${parsed.description}`,
        ];
        if (Object.keys(parsed.args).length > 0) {
            lines.push("Arguments:");
            for (const [key, value] of Object.entries(parsed.args)) {
                lines.push(`  ${key}: ${value}`);
            }
        }
        if (parsed.data) {
            lines.push(`Error Data: ${parsed.data}`);
        }
        return lines.join("\n");
    }
}
exports.ContractErrorParser = ContractErrorParser;
// Global error parser instance
const errorParser = new ContractErrorParser();
/**
 * Wrap an async function to parse contract errors
 * @param fn - The async function to wrap
 * @returns The wrapped function that throws StakingError on contract errors
 */
async function withErrorParsing(fn) {
    try {
        return await fn();
    }
    catch (error) {
        const parsed = errorParser.parse(error);
        if (parsed) {
            throw new StakingError(parsed, error);
        }
        throw error;
    }
}
/**
 * Custom error class for staking operations with parsed contract error info
 */
class StakingError extends Error {
    constructor(parsedError, originalError) {
        super(`${parsedError.name}: ${parsedError.description}`);
        this.name = "StakingError";
        this.parsedError = parsedError;
        this.originalError = originalError;
    }
    /**
     * Get formatted error string for display
     */
    toDisplayString() {
        return errorParser.formatForDisplay(this.parsedError);
    }
}
exports.StakingError = StakingError;
/**
 * Parse a contract error for display
 * @param error - The error to parse
 * @returns Parsed error info or null
 */
function parseContractError(error) {
    return errorParser.parse(error);
}
/**
 * Format a contract error for console/UI display
 * @param error - The error to format
 * @returns Formatted error string or original error message
 */
function formatContractError(error) {
    const parsed = errorParser.parse(error);
    if (parsed) {
        return errorParser.formatForDisplay(parsed);
    }
    // Fallback to original error message
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
// ============================================================================
// Configuration
// ============================================================================
exports.STAKING_CONFIG = {
    // Contract addresses (Kite Staging)
    stakingManager: "0x034E72260cE9c57a07856D3ffE2097fC4Ee0e924",
    validatorManager: "0x0Feedc0de0000000000000000000000000000000",
    warpPrecompile: "0x0200000000000000000000000000000000000005",
    // Chain config
    chainId: 236601,
    rpcUrl: "http://k8s-mainneta-gokiteva-c68a325044-98747e337116e7fe.elb.us-east-1.amazonaws.com:9650/ext/bc/kite/rpc",
    // Backend API URL (for completing operations)
    backendApiUrl: "https://staking-api.staging.gokite.ai",
    // Minimum stake amount (500,000 KITE)
    minStakeAmount: "500000",
};
// ============================================================================
// Contract ABIs
// ============================================================================
const STAKING_MANAGER_ABI = [
    // Initiate functions (frontend calls these)
    "function initiateDelegatorRegistration(bytes32 validationID, address rewardRecipient) external payable returns (bytes32)",
    "function initiateDelegatorRemoval(bytes32 delegationID, bool includeUptimeProof, uint32 messageIndex) external",
    // Query functions
    "function getDelegatorInfo(bytes32 delegationID) external view returns (tuple(uint8 status, address owner, bytes32 validationID, uint64 weight, uint64 startTime, uint64 startingNonce, uint64 endingNonce, uint64 lastRewardClaimTime, uint64 lastClaimUptimeSeconds))",
    "function getDelegatorRewardInfo(bytes32 delegationID) external view returns (address rewardRecipient, uint256 claimableReward)",
    "function getAllActiveValidators() external view returns (bytes32[] memory)",
    "function getValidatorInfo(bytes32 validationID) external view returns (tuple(uint8 status, bytes nodeID, uint64 startingWeight, uint64 sentNonce, uint64 receivedNonce, uint64 weight, uint64 startTime, uint64 endTime, uint16 delegationFeeBips))",
    // Events
    "event InitiatedDelegatorRegistration(bytes32 indexed delegationID, bytes32 indexed validationID, address indexed delegatorAddress, uint64 nonce, uint64 validatorWeight, uint64 delegatorWeight, bytes32 setWeightMessageID, address rewardRecipient, uint256 stakeAmount)",
    "event InitiatedDelegatorRemoval(bytes32 indexed delegationID, bytes32 indexed validationID)",
    "event CompletedDelegatorRegistration(bytes32 indexed delegationID, bytes32 indexed validationID, uint64 startTime)",
    "event CompletedDelegatorRemoval(bytes32 indexed delegationID, bytes32 indexed validationID, uint256 rewards)",
];
// Status mapping
const STATUS_NAMES = {
    0: "None",
    1: "PendingAdded",
    2: "Active",
    3: "PendingRemoved",
};
// ============================================================================
// Staking Client Class
// ============================================================================
class DelegatorStakingClient {
    constructor(provider, backendUrl = exports.STAKING_CONFIG.backendApiUrl) {
        this.provider = provider;
        this.backendUrl = backendUrl;
        this.stakingManager = new ethers_1.ethers.Contract(exports.STAKING_CONFIG.stakingManager, STAKING_MANAGER_ABI, provider);
    }
    // ==========================================================================
    // Step 1: Frontend Transactions (User Signs)
    // ==========================================================================
    /**
     * Initiate delegator registration
     * @param signer - User's wallet signer
     * @param validationID - Target validator's validation ID
     * @param stakeAmountKITE - Amount to stake in KITE (e.g., "1000" for 1000 KITE)
     * @param rewardRecipient - Address to receive rewards (defaults to signer)
     * @returns Transaction result with delegationID and nonce
     */
    async initiateDelegatorRegistration(signer, validationID, stakeAmountKITE, rewardRecipient) {
        const signerAddress = await signer.getAddress();
        const recipient = rewardRecipient || signerAddress;
        const stakeAmount = ethers_1.ethers.parseEther(stakeAmountKITE);
        // // Validate minimum stake
        // const minStake = ethers.parseEther(STAKING_CONFIG.minStakeAmount);
        // if (stakeAmount < minStake) {
        //   throw new Error(
        //     `Stake amount must be at least ${STAKING_CONFIG.minStakeAmount} KITE`
        //   );
        // }
        console.log("Initiating delegator registration...");
        console.log("  Validation ID:", validationID);
        console.log("  Stake Amount:", stakeAmountKITE, "KITE");
        console.log("  Reward Recipient:", recipient);
        return await withErrorParsing(async () => {
            const contract = this.stakingManager.connect(signer);
            const tx = await contract.initiateDelegatorRegistration(validationID, recipient, { value: stakeAmount });
            console.log("Transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Transaction confirmed in block:", receipt.blockNumber);
            // Parse event
            const iface = new ethers_1.ethers.Interface(STAKING_MANAGER_ABI);
            let delegationID = "";
            let nonce = 0;
            for (const log of receipt.logs) {
                try {
                    const parsed = iface.parseLog({
                        topics: log.topics,
                        data: log.data,
                    });
                    if (parsed?.name === "InitiatedDelegatorRegistration") {
                        delegationID = parsed.args.delegationID;
                        nonce = Number(parsed.args.nonce);
                        console.log("  Delegation ID:", delegationID);
                        console.log("  Nonce:", nonce);
                        console.log("  Delegator Weight:", parsed.args.delegatorWeight?.toString());
                        console.log("  Stake Amount:", ethers_1.ethers.formatEther(parsed.args.stakeAmount), "KITE");
                        break;
                    }
                }
                catch {
                    // Skip logs that don't match
                }
            }
            if (!delegationID) {
                throw new Error("InitiatedDelegatorRegistration event not found");
            }
            return { txHash: tx.hash, delegationID, nonce };
        });
    }
    /**
     * Initiate delegator removal (unstaking)
     * @param signer - User's wallet signer
     * @param delegationID - The delegation ID to remove
     * @returns Transaction hash
     */
    async initiateDelegatorRemoval(signer, delegationID) {
        // Verify ownership
        const signerAddress = await signer.getAddress();
        const info = await this.getDelegatorInfo(delegationID);
        if (info.owner.toLowerCase() !== signerAddress.toLowerCase()) {
            throw new Error("Not the owner of this delegation");
        }
        if (info.status !== 2) {
            throw new Error(`Cannot remove delegation in ${info.statusName} status. Must be Active.`);
        }
        console.log("Initiating delegator removal...");
        console.log("  Delegation ID:", delegationID);
        return await withErrorParsing(async () => {
            // Try to get uptime proof first
            console.log("Fetching uptime proof from backend...");
            const uptimeProofResult = await this.getUptimeProof(delegationID);
            let tx;
            if (uptimeProofResult) {
                console.log("Got uptime proof, storage keys count:", uptimeProofResult.storageKeys.length);
                tx = await this.sendInitiateDelegatorRemovalTx(signer, delegationID, true, uptimeProofResult.storageKeys);
            }
            else {
                console.warn("Failed to get uptime proof, initiating removal without it...");
                tx = await this.sendInitiateDelegatorRemovalTx(signer, delegationID, false, null);
            }
            console.log("Transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Transaction confirmed in block:", receipt?.blockNumber);
            return { txHash: tx.hash };
        });
    }
    /**
     * Send initiate delegator removal transaction
     */
    async sendInitiateDelegatorRemovalTx(signer, delegationID, includeUptimeProof, storageKeys) {
        const stakingManagerAddr = exports.STAKING_CONFIG.stakingManager;
        // Encode function call
        const iface = new ethers_1.ethers.Interface([
            "function initiateDelegatorRemoval(bytes32 delegationID, bool includeUptimeProof, uint32 messageIndex)"
        ]);
        const data = iface.encodeFunctionData("initiateDelegatorRemoval", [
            delegationID,
            includeUptimeProof,
            0 // messageIndex
        ]);
        if (includeUptimeProof && storageKeys && storageKeys.length > 0) {
            // Build transaction with AccessList containing warp message
            const warpPrecompile = exports.STAKING_CONFIG.warpPrecompile;
            console.log("Sending initiate removal tx with AccessList:");
            console.log("  Warp Precompile:", warpPrecompile);
            console.log("  Storage Keys:", storageKeys.length, "keys");
            const tx = {
                to: stakingManagerAddr,
                data: data,
                type: 1, // EIP-2930 AccessList transaction
                gasLimit: 500000n, // Manual gas limit
                accessList: [
                    {
                        address: warpPrecompile,
                        storageKeys: storageKeys,
                    },
                ],
            };
            return await signer.sendTransaction(tx);
        }
        else {
            console.log("Sending initiate removal tx WITHOUT AccessList (no uptime proof)");
            return await signer.sendTransaction({
                to: stakingManagerAddr,
                data: data,
            });
        }
    }
    // ==========================================================================
    // Step 2 & 3: Backend Calls
    // ==========================================================================
    /**
     * Complete delegator registration via backend
     * @param delegationID - The delegation ID
     * @param validationID - The validation ID
     */
    async completeRegistration(delegationID, validationID) {
        const response = await fetch(`${this.backendUrl}/api/staking/complete-registration`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ delegationID, validationID }),
        });
        return response.json();
    }
    /**
     * Complete delegator removal via backend
     * @param delegationID - The delegation ID
     */
    async completeRemoval(delegationID) {
        const response = await fetch(`${this.backendUrl}/api/staking/complete-removal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ delegationID }),
        });
        return response.json();
    }
    /**
     * Claim delegator rewards (frontend transaction - owner must sign)
     * @param signer - User's wallet signer (must be the delegation owner)
     * @param delegationID - The delegation ID
     * @param includeUptimeProof - Whether to include uptime proof (recommended: true)
     * @returns Transaction hash and reward amount claimed
     */
    async claimRewards(signer, delegationID, includeUptimeProof = true) {
        // Verify ownership
        const signerAddress = await signer.getAddress();
        const info = await this.getDelegatorInfo(delegationID);
        if (info.owner.toLowerCase() !== signerAddress.toLowerCase()) {
            throw new Error("Not the owner of this delegation. Only owner can claim rewards.");
        }
        if (info.status !== 2) {
            throw new Error(`Cannot claim rewards in ${info.statusName} status. Must be Active.`);
        }
        console.log("Claiming delegator rewards...");
        console.log("  Delegation ID:", delegationID);
        console.log("  Include Uptime Proof:", includeUptimeProof);
        return await withErrorParsing(async () => {
            let tx;
            if (includeUptimeProof) {
                // Get signed uptime proof from backend (returns pre-encoded storage keys)
                console.log("Fetching uptime proof from backend...");
                const uptimeProofResult = await this.getUptimeProof(delegationID);
                if (!uptimeProofResult) {
                    console.warn("Failed to get uptime proof, claiming without it...");
                    tx = await this.sendClaimRewardsTx(signer, delegationID, false, null);
                }
                else {
                    console.log("Got uptime proof, storage keys count:", uptimeProofResult.storageKeys.length);
                    console.log("Storage keys:", uptimeProofResult.storageKeys.slice(0, 2), "...");
                    tx = await this.sendClaimRewardsTx(signer, delegationID, true, uptimeProofResult.storageKeys);
                }
            }
            else {
                tx = await this.sendClaimRewardsTx(signer, delegationID, false, null);
            }
            console.log("Transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Transaction confirmed in block:", receipt?.blockNumber);
            // Parse DelegatorRewardClaimed event from receipt
            const result = this.parseClaimRewardsEvents(receipt, delegationID);
            console.log("Reward claimed:", result.rewardAmountFormatted, "KITE");
            return result;
        });
    }
    /**
     * Parse DelegatorRewardClaimed event from transaction receipt
     */
    parseClaimRewardsEvents(receipt, delegationID) {
        const defaultResult = {
            txHash: receipt?.hash || "",
            rewardAmount: 0n,
            rewardAmountFormatted: "0",
            recipient: "",
        };
        if (!receipt) {
            return defaultResult;
        }
        // Event ABI for parsing
        const eventAbi = [
            "event DelegatorRewardClaimed(bytes32 indexed delegationID, address indexed recipient, uint256 amount)",
        ];
        const iface = new ethers_1.ethers.Interface(eventAbi);
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog({
                    topics: log.topics,
                    data: log.data,
                });
                if (parsed && parsed.name === "DelegatorRewardClaimed") {
                    // Verify it's for our delegation
                    if (parsed.args.delegationID.toLowerCase() === delegationID.toLowerCase()) {
                        return {
                            txHash: receipt.hash,
                            rewardAmount: parsed.args.amount,
                            rewardAmountFormatted: ethers_1.ethers.formatEther(parsed.args.amount),
                            recipient: parsed.args.recipient,
                        };
                    }
                }
            }
            catch {
                // Skip logs that don't match
            }
        }
        return { ...defaultResult, txHash: receipt.hash };
    }
    /**
     * Get signed uptime proof from backend
     * @param delegationID - The delegation ID
     * @returns Object with storageKeys for AccessList
     */
    async getUptimeProof(delegationID) {
        try {
            const response = await fetch(`${this.backendUrl}/api/staking/uptime-proof`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ delegationID }),
            });
            const result = await response.json();
            if (result.success && result.storageKeys && result.storageKeys.length > 0) {
                return { storageKeys: result.storageKeys };
            }
            console.warn("Backend uptime proof response:", result.error);
            return null;
        }
        catch (error) {
            console.warn("Failed to get uptime proof from backend:", error);
            return null;
        }
    }
    /**
     * Send claim rewards transaction
     */
    async sendClaimRewardsTx(signer, delegationID, includeUptimeProof, storageKeys) {
        const stakingManagerAddr = exports.STAKING_CONFIG.stakingManager;
        // Encode function call
        const iface = new ethers_1.ethers.Interface([
            "function claimDelegatorRewards(bytes32 delegationID, bool includeUptimeProof, uint32 messageIndex)"
        ]);
        const data = iface.encodeFunctionData("claimDelegatorRewards", [
            delegationID,
            includeUptimeProof,
            0 // messageIndex
        ]);
        if (includeUptimeProof && storageKeys && storageKeys.length > 0) {
            // Build transaction with AccessList containing warp message
            // Storage keys are pre-encoded by backend using predicateutils
            const warpPrecompile = exports.STAKING_CONFIG.warpPrecompile;
            console.log("Sending claim tx with AccessList:");
            console.log("  Warp Precompile:", warpPrecompile);
            console.log("  Storage Keys:", storageKeys.length, "keys");
            // Note: We must set gasLimit manually because estimateGas doesn't support AccessList
            // and will fail when trying to verify the warp message without the access list
            const tx = {
                to: stakingManagerAddr,
                data: data,
                type: 1, // EIP-2930 AccessList transaction
                gasLimit: 500000n, // Manual gas limit (same as Go implementation)
                accessList: [
                    {
                        address: warpPrecompile,
                        storageKeys: storageKeys,
                    },
                ],
            };
            return await signer.sendTransaction(tx);
        }
        else {
            console.log("Sending claim tx WITHOUT AccessList (no uptime proof)");
            // Simple transaction without AccessList
            return await signer.sendTransaction({
                to: stakingManagerAddr,
                data: data,
            });
        }
    }
    // ==========================================================================
    // Full Flows (Combining Frontend + Backend)
    // ==========================================================================
    /**
     * Full registration flow
     * 1. Frontend initiates (user signs)
     * 2. Backend completes (P-Chain + L1)
     */
    async registerDelegator(signer, validationID, stakeAmountKITE, rewardRecipient) {
        // Step 1: Frontend initiates
        const { txHash, delegationID, nonce } = await this.initiateDelegatorRegistration(signer, validationID, stakeAmountKITE, rewardRecipient);
        console.log("Step 1 complete!");
        console.log("  Delegation ID:", delegationID);
        console.log("  Nonce:", nonce);
        // Step 2 & 3: Backend completes
        console.log("Calling backend to complete registration...");
        const result = await this.completeRegistration(delegationID, validationID);
        if (result.success) {
            console.log("Registration complete! TX:", result.txHash);
        }
        else {
            console.error("Registration failed:", result.error);
        }
        return {
            delegationID,
            initiateTxHash: txHash,
            completeTxHash: result.txHash,
            success: result.success,
            error: result.error,
        };
    }
    /**
     * Full removal flow
     * 1. Frontend initiates (user signs)
     * 2. Backend completes (P-Chain + L1)
     */
    async removeDelegator(signer, delegationID) {
        // Step 1: Frontend initiates
        const { txHash } = await this.initiateDelegatorRemoval(signer, delegationID);
        console.log("Step 1 complete! TX:", txHash);
        // Step 2 & 3: Backend completes
        console.log("Calling backend to complete removal...");
        const result = await this.completeRemoval(delegationID);
        if (result.success) {
            console.log("Removal complete! TX:", result.txHash);
        }
        else {
            console.error("Removal failed:", result.error);
        }
        return {
            initiateTxHash: txHash,
            completeTxHash: result.txHash,
            success: result.success,
            error: result.error,
        };
    }
    // ==========================================================================
    // Query Functions (Read-Only)
    // ==========================================================================
    /**
     * Get delegator information
     */
    async getDelegatorInfo(delegationID) {
        return await withErrorParsing(async () => {
            const info = await this.stakingManager.getDelegatorInfo(delegationID);
            return {
                status: Number(info.status),
                statusName: STATUS_NAMES[Number(info.status)] || "Unknown",
                owner: info.owner,
                validationID: info.validationID,
                weight: info.weight,
                startTime: info.startTime,
                startingNonce: info.startingNonce,
                endingNonce: info.endingNonce,
                lastRewardClaimTime: info.lastRewardClaimTime,
                lastClaimUptimeSeconds: info.lastClaimUptimeSeconds,
            };
        });
    }
    /**
     * Get delegator reward information
     */
    async getDelegatorRewardInfo(delegationID) {
        return await withErrorParsing(async () => {
            const [rewardRecipient, claimableReward] = await this.stakingManager.getDelegatorRewardInfo(delegationID);
            return { rewardRecipient, claimableReward };
        });
    }
    /**
     * Get all active validators
     */
    async getAllActiveValidators() {
        return await withErrorParsing(async () => {
            return await this.stakingManager.getAllActiveValidators();
        });
    }
    /**
     * Get validator information
     */
    async getValidatorInfo(validationID) {
        return await withErrorParsing(async () => {
            const info = await this.stakingManager.getValidatorInfo(validationID);
            return {
                validationID,
                nodeID: ethers_1.ethers.hexlify(info.nodeID),
                weight: info.weight,
                delegationFeeBips: Number(info.delegationFeeBips),
                status: Number(info.status),
            };
        });
    }
    /**
     * Check if an address has an active delegation
     */
    async getUserDelegations(userAddress) {
        // Note: This is a simplified implementation
        // In production, you'd want to track delegation IDs via events or a subgraph
        // For now, this just demonstrates the pattern
        console.warn("getUserDelegations requires event indexing or subgraph for production use");
        return [];
    }
}
exports.DelegatorStakingClient = DelegatorStakingClient;
// ============================================================================
// Usage Examples
// ============================================================================
/*
// Example 1: Connect and register as a delegator

import { ethers } from 'ethers';
import { DelegatorStakingClient, STAKING_CONFIG } from './staking-example';

async function example() {
  // Connect to provider (browser wallet)
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Create staking client
  const client = new DelegatorStakingClient(provider);

  // Get active validators
  const validators = await client.getAllActiveValidators();
  console.log('Active validators:', validators);

  // Register as delegator (full flow)
  const result = await client.registerDelegator(
    signer,
    validators[0], // First validator
    "1000" // Stake 1000 KITE
  );

  console.log('Registration result:', result);
}


// Example 2: Check delegation status and claim rewards

async function checkAndClaim(delegationID: string) {
  const provider = new ethers.JsonRpcProvider(STAKING_CONFIG.rpcUrl);
  const client = new DelegatorStakingClient(provider);

  // Get delegation info
  const info = await client.getDelegatorInfo(delegationID);
  console.log('Delegation status:', info.statusName);
  console.log('Weight:', ethers.formatEther(info.weight), 'KITE');

  // Get reward info
  const rewards = await client.getDelegatorRewardInfo(delegationID);
  console.log('Claimable rewards:', ethers.formatEther(rewards.claimableReward), 'KITE');

  // Claim rewards (via backend)
  if (rewards.claimableReward > 0n || info.status === 2) {
    const claimResult = await client.claimRewards(delegationID, true);
    console.log('Claim result:', claimResult);
  }
}


// Example 3: Unstake (remove delegation)

async function unstake(delegationID: string) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const client = new DelegatorStakingClient(provider);

  const result = await client.removeDelegator(signer, delegationID);
  console.log('Unstake result:', result);
}
*/
exports.default = DelegatorStakingClient;
