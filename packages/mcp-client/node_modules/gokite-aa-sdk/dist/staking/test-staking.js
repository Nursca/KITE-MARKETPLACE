"use strict";
/**
 * Test script for Delegator Staking SDK
 *
 * Usage:
 *   PRIVATE_KEY=0x... npx ts-node sdk/staking/test-staking.ts <command> [args]
 *
 * Environment variables:
 *   PRIVATE_KEY    - Required: Your wallet private key
 *   BACKEND_URL    - Optional: Backend API URL (default: https://staking-api.staging.gokite.ai)
 *   DELEGATION_ID  - Optional: Delegation ID for status/claim/remove commands
 *   VALIDATION_ID  - Optional: Validation ID for register command
 *
 * Make sure the backend API server is running:
 *   cd scripts/validator-manager/staking-api
 *   docker-compose up -d
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const staking_example_1 = require("./staking-example");
/**
 * Handle and display errors from staking operations
 * This function formats contract errors for better debugging
 */
function handleError(error, operation) {
    console.error(`\n=== Error during ${operation} ===`);
    if (error instanceof staking_example_1.StakingError) {
        // Parsed contract error - display detailed info
        console.error("\nContract Error Details:");
        console.error(error.toDisplayString());
        console.error("\n--- Debug Info ---");
        console.error("Error Name:", error.parsedError.name);
        console.error("Description:", error.parsedError.description);
        if (Object.keys(error.parsedError.args).length > 0) {
            console.error("Arguments:", JSON.stringify(error.parsedError.args, null, 2));
        }
        if (error.parsedError.data) {
            console.error("Error Data (hex):", error.parsedError.data);
        }
    }
    else {
        // Try to parse the error if it's not already a StakingError
        const parsed = (0, staking_example_1.parseContractError)(error);
        if (parsed) {
            console.error("\nParsed Contract Error:");
            console.error((0, staking_example_1.formatContractError)(error));
        }
        else {
            // Unknown error format
            console.error("\nRaw Error:", error);
        }
    }
    console.error("\n=================================\n");
}
// Test configuration from environment variables
const BACKEND_URL = process.env.BACKEND_URL || staking_example_1.STAKING_CONFIG.backendApiUrl;
function getPrivateKey() {
    const pk = process.env.PRIVATE_KEY;
    if (!pk) {
        console.error("Error: PRIVATE_KEY environment variable is required");
        console.error("Usage: PRIVATE_KEY=0x... npx ts-node sdk/staking/test-staking.ts <command> [args]");
        process.exit(1);
    }
    return pk;
}
const PRIVATE_KEY = getPrivateKey();
// Known delegation ID for testing (update this with your actual delegation)
const TEST_DELEGATION_ID = process.env.DELEGATION_ID || "";
const TEST_VALIDATION_ID = process.env.VALIDATION_ID || "";
async function main() {
    console.log("===========================================");
    console.log("  Delegator Staking SDK Test");
    console.log("===========================================\n");
    // Setup provider and signer
    const provider = new ethers_1.ethers.JsonRpcProvider(staking_example_1.STAKING_CONFIG.rpcUrl);
    const wallet = new ethers_1.ethers.Wallet(PRIVATE_KEY, provider);
    console.log("Configuration:");
    console.log("  RPC URL:", staking_example_1.STAKING_CONFIG.rpcUrl);
    console.log("  Backend URL:", BACKEND_URL);
    console.log("  Wallet Address:", wallet.address);
    console.log("  Staking Manager:", staking_example_1.STAKING_CONFIG.stakingManager);
    console.log("");
    // Create staking client
    const client = new staking_example_1.DelegatorStakingClient(provider, BACKEND_URL);
    // Get wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log("Wallet KITE Balance:", ethers_1.ethers.formatEther(balance), "KITE\n");
    // Test menu
    const args = process.argv.slice(2);
    const command = args[0] || "status";
    switch (command) {
        case "validators":
            await testGetValidators(client);
            break;
        case "status":
            await testGetDelegatorStatus(client, args[1] || TEST_DELEGATION_ID);
            break;
        case "register":
            await testRegister(client, wallet, args[1] || TEST_VALIDATION_ID, args[2] || "1000");
            break;
        case "claim":
            await testClaimRewards(client, wallet, args[1] || TEST_DELEGATION_ID);
            break;
        case "remove":
            await testRemove(client, wallet, args[1] || TEST_DELEGATION_ID);
            break;
        case "uptime-proof":
            await testGetUptimeProof(args[1] || TEST_DELEGATION_ID);
            break;
        case "parse-tx":
            await parseClaimTx(args[1] || "");
            break;
        default:
            printUsage();
    }
}
function printUsage() {
    console.log("Usage: npx ts-node sdk/test-staking.ts <command> [args]");
    console.log("");
    console.log("Commands:");
    console.log("  validators                     - List active validators");
    console.log("  status <delegationID>          - Get delegator status");
    console.log("  register <validationID> <amt>  - Register as delegator (amount in KITE)");
    console.log("  claim <delegationID>           - Claim rewards");
    console.log("  remove <delegationID>          - Remove delegation (unstake)");
    console.log("  uptime-proof <delegationID>    - Get uptime proof from backend");
    console.log("  parse-tx <txHash>              - Parse events from a claim transaction");
    console.log("");
    console.log("Examples:");
    console.log("  npx ts-node sdk/test-staking.ts validators");
    console.log("  npx ts-node sdk/test-staking.ts status 0x1234...");
    console.log("  npx ts-node sdk/test-staking.ts register 0x5678... 1000");
    console.log("  npx ts-node sdk/test-staking.ts claim 0x1234...");
    console.log("  npx ts-node sdk/test-staking.ts parse-tx 0xabcd...");
}
async function testGetValidators(client) {
    console.log("--- Getting Active Validators ---\n");
    try {
        const validators = await client.getAllActiveValidators();
        console.log(`Found ${validators.length} active validators:\n`);
        for (const validationID of validators) {
            console.log(`  ${validationID}`);
            // Try to get more info
            try {
                const info = await client.getValidatorInfo(validationID);
                console.log(`    Weight: ${ethers_1.ethers.formatEther(info.weight)} KITE`);
                console.log(`    Fee: ${info.delegationFeeBips / 100}%`);
            }
            catch (e) {
                // Skip if getValidatorInfo not available
            }
        }
    }
    catch (error) {
        handleError(error, "getting validators");
    }
}
async function testGetDelegatorStatus(client, delegationID) {
    if (!delegationID) {
        console.log("Please provide a delegation ID:");
        console.log("  npx ts-node sdk/test-staking.ts status 0x1234...");
        return;
    }
    console.log("--- Getting Delegator Status ---\n");
    console.log("Delegation ID:", delegationID, "\n");
    try {
        const info = await client.getDelegatorInfo(delegationID);
        console.log("Delegator Info:");
        console.log("  Status:", info.statusName, `(${info.status})`);
        console.log("  Owner:", info.owner);
        console.log("  Validation ID:", info.validationID);
        console.log("  Weight:", ethers_1.ethers.formatEther(info.weight), "KITE");
        console.log("  Start Time:", new Date(Number(info.startTime) * 1000).toISOString());
        console.log("  Starting Nonce:", info.startingNonce.toString());
        console.log("  Ending Nonce:", info.endingNonce.toString());
        console.log("");
        // Get reward info
        const rewardInfo = await client.getDelegatorRewardInfo(delegationID);
        console.log("Reward Info:");
        console.log("  Reward Recipient:", rewardInfo.rewardRecipient);
        console.log("  Claimable Reward:", ethers_1.ethers.formatEther(rewardInfo.claimableReward), "KITE");
    }
    catch (error) {
        handleError(error, "getting delegator status");
    }
}
async function testRegister(client, signer, validationID, amountKITE) {
    if (!validationID) {
        console.log("Please provide a validation ID:");
        console.log("  npx ts-node sdk/test-staking.ts register 0x5678... 1000");
        return;
    }
    console.log("--- Registering as Delegator ---\n");
    console.log("Validation ID:", validationID);
    console.log("Amount:", amountKITE, "KITE\n");
    try {
        // Step 1: Initiate registration (frontend tx)
        console.log("Step 1: Initiating registration...");
        const initResult = await client.initiateDelegatorRegistration(signer, validationID, amountKITE);
        console.log("\nStep 1 Complete!");
        console.log("  TX Hash:", initResult.txHash);
        console.log("  Delegation ID:", initResult.delegationID);
        console.log("  Nonce:", initResult.nonce);
        // Step 2 & 3: Complete via backend
        console.log("\nStep 2 & 3: Completing registration via backend...");
        const completeResult = await client.completeRegistration(initResult.delegationID, validationID);
        if (completeResult.success) {
            console.log("\nRegistration Complete!");
            console.log("  Complete TX Hash:", completeResult.txHash);
            console.log("  P-Chain TX ID:", completeResult.pchainTxId);
        }
        else {
            console.error("\nRegistration failed:", completeResult.error);
        }
    }
    catch (error) {
        handleError(error, "delegator registration");
    }
}
// Event signatures for parsing
const CLAIM_EVENTS_ABI = [
    "event DelegatorRewardClaimed(bytes32 indexed delegationID, address indexed recipient, uint256 amount)",
    "event ValidatorRewardClaimed(bytes32 indexed validationID, address indexed recipient, uint256 amount)",
    "event RewardDistributed(address indexed to, uint256 amount)",
];
async function testClaimRewards(client, signer, delegationID) {
    if (!delegationID) {
        console.log("Please provide a delegation ID:");
        console.log("  npx ts-node sdk/test-staking.ts claim 0x1234...");
        return;
    }
    console.log("--- Claiming Rewards ---\n");
    console.log("Delegation ID:", delegationID, "\n");
    try {
        // First check status and rewards
        const info = await client.getDelegatorInfo(delegationID);
        console.log("Current Status:", info.statusName);
        const rewardInfo = await client.getDelegatorRewardInfo(delegationID);
        console.log("Stored Claimable Reward:", ethers_1.ethers.formatEther(rewardInfo.claimableReward), "KITE\n");
        if (info.status !== 2) {
            console.log("Delegator is not Active. Cannot claim rewards.");
            return;
        }
        // Claim rewards (frontend tx with uptime proof from backend)
        console.log("Claiming rewards with uptime proof...");
        const result = await client.claimRewards(signer, delegationID, true);
        console.log("\n=== Claim Complete! ===");
        console.log("  TX Hash:", result.txHash);
        console.log("  Reward Amount:", result.rewardAmountFormatted, "KITE");
        console.log("  Recipient:", result.recipient);
    }
    catch (error) {
        handleError(error, "claiming rewards");
    }
}
/**
 * Parse events from an existing transaction
 */
async function parseClaimTx(txHash) {
    console.log("--- Parsing Claim Transaction ---\n");
    console.log("TX Hash:", txHash, "\n");
    const provider = new ethers_1.ethers.JsonRpcProvider(staking_example_1.STAKING_CONFIG.rpcUrl);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
        console.log("Transaction not found");
        return;
    }
    console.log("Block Number:", receipt.blockNumber);
    console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
    console.log("Gas Used:", receipt.gasUsed.toString());
    console.log("\n--- Events ---");
    const iface = new ethers_1.ethers.Interface(CLAIM_EVENTS_ABI);
    let foundEvents = false;
    for (const log of receipt.logs) {
        try {
            const parsed = iface.parseLog({ topics: log.topics, data: log.data });
            if (parsed) {
                foundEvents = true;
                if (parsed.name === "DelegatorRewardClaimed") {
                    console.log("\nDelegatorRewardClaimed:");
                    console.log("  Delegation ID:", parsed.args.delegationID);
                    console.log("  Recipient:", parsed.args.recipient);
                    console.log("  Amount:", ethers_1.ethers.formatEther(parsed.args.amount), "KITE");
                }
                else if (parsed.name === "ValidatorRewardClaimed") {
                    console.log("\nValidatorRewardClaimed:");
                    console.log("  Validation ID:", parsed.args.validationID);
                    console.log("  Recipient:", parsed.args.recipient);
                    console.log("  Amount:", ethers_1.ethers.formatEther(parsed.args.amount), "KITE");
                }
                else if (parsed.name === "RewardDistributed") {
                    console.log("\nRewardDistributed:");
                    console.log("  To:", parsed.args.to);
                    console.log("  Amount:", ethers_1.ethers.formatEther(parsed.args.amount), "KITE");
                }
            }
        }
        catch {
            // Skip
        }
    }
    if (!foundEvents) {
        console.log("No reward events found in this transaction.");
        console.log("\nAll logs:");
        for (const log of receipt.logs) {
            console.log("  Topic[0]:", log.topics[0]);
        }
    }
}
async function testRemove(client, signer, delegationID) {
    if (!delegationID) {
        console.log("Please provide a delegation ID:");
        console.log("  npx ts-node sdk/test-staking.ts remove 0x1234...");
        return;
    }
    console.log("--- Removing Delegation (Unstaking) ---\n");
    console.log("Delegation ID:", delegationID, "\n");
    try {
        // First check status
        const info = await client.getDelegatorInfo(delegationID);
        console.log("Current Status:", info.statusName);
        console.log("Weight:", ethers_1.ethers.formatEther(info.weight), "KITE\n");
        if (info.status !== 2) {
            console.log("Delegator is not Active. Cannot remove.");
            return;
        }
        // Step 1: Initiate removal (frontend tx)
        console.log("Step 1: Initiating removal...");
        const initResult = await client.initiateDelegatorRemoval(signer, delegationID);
        console.log("\nStep 1 Complete!");
        console.log("  TX Hash:", initResult.txHash);
        // Step 2 & 3: Complete via backend
        console.log("\nStep 2 & 3: Completing removal via backend...");
        const completeResult = await client.completeRemoval(delegationID);
        if (completeResult.success) {
            console.log("\nRemoval Complete!");
            console.log("  Complete TX Hash:", completeResult.txHash);
            console.log("  P-Chain TX ID:", completeResult.pchainTxId);
        }
        else {
            console.error("\nRemoval failed:", completeResult.error);
        }
    }
    catch (error) {
        handleError(error, "delegator removal");
    }
}
async function testGetUptimeProof(delegationID) {
    if (!delegationID) {
        console.log("Please provide a delegation ID:");
        console.log("  npx ts-node sdk/test-staking.ts uptime-proof 0x1234...");
        return;
    }
    console.log("--- Getting Uptime Proof from Backend ---\n");
    console.log("Delegation ID:", delegationID, "\n");
    try {
        const response = await fetch(`${BACKEND_URL}/api/staking/uptime-proof`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ delegationID }),
        });
        const result = await response.json();
        if (result.success) {
            console.log("Uptime Proof Retrieved:");
            console.log("  Uptime Seconds:", result.uptimeSeconds);
            console.log("  Proof Length:", result.signedUptimeProof?.length, "chars");
            console.log("  Storage Keys Count:", result.storageKeys?.length || 0);
            if (result.storageKeys && result.storageKeys.length > 0) {
                console.log("  First Storage Key:", result.storageKeys[0]);
            }
        }
        else {
            console.error("Failed to get uptime proof:", result.error);
        }
    }
    catch (error) {
        handleError(error, "getting uptime proof");
    }
}
main().catch(console.error);
