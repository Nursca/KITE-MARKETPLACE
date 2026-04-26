"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERC8004Client = exports.ERC8004_CONTRACTS = void 0;
/**
 * ERC-8004 Client for the buyer agent.
 * Uses Kite Testnet (chainId 2368).
 */
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const kite_1 = require("../kite");
const abis_1 = require("./abis");
exports.ERC8004_CONTRACTS = {
    identityRegistry: "0x9788b77d09e2D189B9C7e1D392B7f762D5650a3a",
    reputationRegistry: "0xeaD31017A6ca6CEE1bB1BF7c1413CB7071e2B51D",
    validationRegistry: "0x93ee9C875648846Ba16ff6f6733ebf4659d4Bcbe",
    agentPassport: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Placeholder for local/testnet deployment
};
const KITE_RPC = "https://rpc-testnet.gokite.ai/";
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
class ERC8004Client {
    constructor(privateKey) {
        const account = (0, accounts_1.privateKeyToAccount)(privateKey);
        this.address = account.address;
        this.publicClient = (0, viem_1.createPublicClient)({
            chain: kite_1.kiteTestnet,
            transport: (0, viem_1.http)(KITE_RPC),
        });
        this.walletClient = (0, viem_1.createWalletClient)({
            account,
            chain: kite_1.kiteTestnet,
            transport: (0, viem_1.http)(KITE_RPC),
        });
    }
    /** Find the agentId for a given owner address */
    async findAgentId(ownerAddress) {
        try {
            // 1. Try direct on-chain mapping (Most reliable)
            const result = await this.publicClient.readContract({
                address: exports.ERC8004_CONTRACTS.identityRegistry,
                abi: abis_1.IDENTITY_REGISTRY_ABI,
                functionName: "getAgentIdByOwner",
                args: [ownerAddress],
            });
            if (result[1]) {
                console.log(`[ERC8004] Found agentId ${result[0]} via direct mapping for ${ownerAddress}`);
                return result[0];
            }
        }
        catch (contractError) {
            console.warn("[ERC8004] Mapping lookup failed, falling back to logs:", contractError);
        }
        try {
            // 2. Fallback: Scan logs (If mapping doesn't exist or contract is old)
            const logs = await this.publicClient.getLogs({
                address: exports.ERC8004_CONTRACTS.identityRegistry,
                event: {
                    type: 'event',
                    name: 'Registered',
                    inputs: [
                        { indexed: true, name: 'agentId', type: 'uint256' },
                        { indexed: false, name: 'agentURI', type: 'string' },
                        { indexed: true, name: 'owner', type: 'address' },
                    ],
                },
                args: {
                    owner: ownerAddress
                },
                fromBlock: 20924000n
            });
            if (logs.length > 0) {
                const id = logs[logs.length - 1].args.agentId || null;
                console.log(`[ERC8004] Found agentId ${id} via logs for ${ownerAddress}`);
                return id;
            }
        }
        catch (logError) {
            console.error("[ERC8004] Log lookup failed:", logError);
        }
        return null;
    }
    /** Register this agent on the Identity Registry */
    async registerAgent(agentURI) {
        const { request } = await this.publicClient.simulateContract({
            address: exports.ERC8004_CONTRACTS.identityRegistry,
            abi: abis_1.IDENTITY_REGISTRY_ABI,
            functionName: "register",
            args: [agentURI || ""],
            account: this.walletClient.account,
        });
        const txHash = await this.walletClient.writeContract(request);
        const receipt = await this.publicClient.waitForTransactionReceipt({
            hash: txHash,
        });
        // Extract agentId from Registered event
        const registeredLog = receipt.logs.find((log) => log.address.toLowerCase() ===
            exports.ERC8004_CONTRACTS.identityRegistry.toLowerCase());
        let agentId = BigInt(0);
        if (registeredLog?.topics?.[1]) {
            agentId = BigInt(registeredLog.topics[1]);
        }
        return { agentId, txHash };
    }
    /** Get agent info by ID */
    async getAgentInfo(agentId) {
        const [owner, agentURI, agentWallet] = await Promise.all([
            this.publicClient.readContract({
                address: exports.ERC8004_CONTRACTS.identityRegistry,
                abi: abis_1.IDENTITY_REGISTRY_ABI,
                functionName: "ownerOf",
                args: [agentId],
            }),
            this.publicClient.readContract({
                address: exports.ERC8004_CONTRACTS.identityRegistry,
                abi: abis_1.IDENTITY_REGISTRY_ABI,
                functionName: "tokenURI",
                args: [agentId],
            }),
            this.publicClient.readContract({
                address: exports.ERC8004_CONTRACTS.identityRegistry,
                abi: abis_1.IDENTITY_REGISTRY_ABI,
                functionName: "getAgentWallet",
                args: [agentId],
            }),
        ]);
        return { agentId, owner, agentURI, agentWallet };
    }
    /** Check if an agent ID exists on-chain */
    async isRegistered(agentId) {
        try {
            await this.publicClient.readContract({
                address: exports.ERC8004_CONTRACTS.identityRegistry,
                abi: abis_1.IDENTITY_REGISTRY_ABI,
                functionName: "ownerOf",
                args: [agentId],
            });
            return true;
        }
        catch {
            return false;
        }
    }
    /** Get reputation summary for an agent */
    async getReputationSummary(agentId) {
        const result = (await this.publicClient.readContract({
            address: exports.ERC8004_CONTRACTS.reputationRegistry,
            abi: abis_1.REPUTATION_REGISTRY_ABI,
            functionName: "getSummary",
            args: [agentId, [], "", ""],
        }));
        return {
            count: Number(result[0]),
            summaryValue: result[1],
            summaryValueDecimals: result[2],
        };
    }
    /** Get all feedback entries for an agent */
    async getAllFeedback(agentId) {
        // First get all client addresses
        const clients = (await this.publicClient.readContract({
            address: exports.ERC8004_CONTRACTS.reputationRegistry,
            abi: abis_1.REPUTATION_REGISTRY_ABI,
            functionName: "getClients",
            args: [agentId],
        }));
        if (clients.length === 0)
            return [];
        const result = (await this.publicClient.readContract({
            address: exports.ERC8004_CONTRACTS.reputationRegistry,
            abi: abis_1.REPUTATION_REGISTRY_ABI,
            functionName: "readAllFeedback",
            args: [agentId, clients, "", "", false],
        }));
        const [returnedClients, feedbackIndexes, values, valueDecimals, tag1s, tag2s, revokedStatuses,] = result;
        return returnedClients.map((addr, i) => ({
            clientAddress: addr,
            feedbackIndex: Number(feedbackIndexes[i]),
            value: values[i],
            valueDecimals: valueDecimals[i],
            tag1: tag1s[i],
            tag2: tag2s[i],
            isRevoked: revokedStatuses[i],
        }));
    }
    /** Give feedback to a merchant agent */
    async giveFeedback(agentId, value, tag1 = "", tag2 = "") {
        const { request } = await this.publicClient.simulateContract({
            address: exports.ERC8004_CONTRACTS.reputationRegistry,
            abi: abis_1.REPUTATION_REGISTRY_ABI,
            functionName: "giveFeedback",
            args: [agentId, BigInt(value), 0, tag1, tag2, "", "", ZERO_BYTES32],
            account: this.walletClient.account,
        });
        const txHash = await this.walletClient.writeContract(request);
        await this.publicClient.waitForTransactionReceipt({ hash: txHash });
        return txHash;
    }
    /** Get validation summary for an agent */
    async getValidationSummary(agentId) {
        const result = (await this.publicClient.readContract({
            address: exports.ERC8004_CONTRACTS.validationRegistry,
            abi: abis_1.VALIDATION_REGISTRY_ABI,
            functionName: "getSummary",
            args: [agentId, [], ""],
        }));
        return {
            count: Number(result[0]),
            avgResponse: result[1],
        };
    }
    /** Get all validation request hashes for an agent */
    async getValidationHashes(agentId) {
        return (await this.publicClient.readContract({
            address: exports.ERC8004_CONTRACTS.validationRegistry,
            abi: abis_1.VALIDATION_REGISTRY_ABI,
            functionName: "getAgentValidations",
            args: [agentId],
        }));
    }
    /** Get validation status by request hash */
    async getValidationStatus(requestHash) {
        const result = (await this.publicClient.readContract({
            address: exports.ERC8004_CONTRACTS.validationRegistry,
            abi: abis_1.VALIDATION_REGISTRY_ABI,
            functionName: "getValidationStatus",
            args: [requestHash],
        }));
        return {
            validatorAddress: result[0],
            agentId: result[1],
            response: result[2],
            responseHash: result[3],
            tag: result[4],
            lastUpdate: result[5],
        };
    }
    /** Get the Agent Passport */
    async getPassport(agentId) {
        const result = await this.publicClient.readContract({
            address: exports.ERC8004_CONTRACTS.agentPassport,
            abi: abis_1.AGENT_PASSPORT_ABI,
            functionName: "getPassport",
            args: [agentId],
        });
        return {
            agentId: result.agentId,
            did: result.did,
            agentWallet: result.agentWallet,
            capabilities: result.capabilities,
            totalVolumeUsdc: result.totalVolumeUsdc,
            tier: result.tier,
            lastUpdated: result.lastUpdated,
        };
    }
}
exports.ERC8004Client = ERC8004Client;
