"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gokite_aa_sdk_1 = require("./gokite-aa-sdk");
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const NETWORK = 'kite_mainnet';
const RPC_URL = 'https://rpc.gokite.ai';
const BUNDLER_URL = 'https://bundler-service.prod.gokite.ai/rpc/';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
async function main() {
    console.log('='.repeat(60));
    console.log('Gokite AA SDK - Mainnet Integration Test');
    console.log('='.repeat(60));
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey)
        throw new Error('Missing PRIVATE_KEY env variable');
    const ownerSigner = new ethers_1.ethers.Wallet(privateKey);
    const provider = new ethers_1.ethers.JsonRpcProvider(RPC_URL);
    console.log(`\nOwner EOA: ${ownerSigner.address}`);
    const balance = await provider.getBalance(ownerSigner.address);
    console.log(`EOA Balance: ${ethers_1.ethers.formatEther(balance)} KITE`);
    // Step 1: Initialize SDK
    console.log('\n[Step 1] Initializing SDK...');
    const sdk = new gokite_aa_sdk_1.GokiteAASDK(NETWORK, RPC_URL, BUNDLER_URL);
    console.log('  SDK initialized for kite_mainnet');
    // Step 2: Compute account address
    console.log('\n[Step 2] Computing AA account address...');
    const salt = BigInt(2);
    const accountAddress = sdk.getAccountAddress(ownerSigner.address, salt);
    console.log(`  AA Account: ${accountAddress}`);
    // Step 3: Check deployment status
    console.log('\n[Step 3] Checking account deployment status...');
    const isDeployed = await sdk.isAccountDeloyed(accountAddress);
    console.log(`  Account deployed: ${isDeployed}`);
    // Step 4: Check nonce
    console.log('\n[Step 4] Getting account nonce...');
    const nonce = await sdk.getAccountNonce(accountAddress);
    console.log(`  Current nonce: ${nonce}`);
    // Step 5: Estimate a simple self-transfer (0 value)
    console.log('\n[Step 5] Estimating UserOp (self-transfer)...');
    const selfTransferRequest = {
        target: accountAddress,
        value: 0n,
        callData: '0x',
    };
    try {
        const estimate = await sdk.estimateUserOperation(ownerSigner.address, selfTransferRequest);
        console.log('  Estimation result:');
        console.log(`    Total cost (KITE): ${estimate.totalCostKITEFormatted}`);
        console.log(`    Sponsorship available: ${estimate.sponsorshipAvailable}`);
        console.log(`    Remaining sponsorships: ${estimate.remainingSponsorships}`);
        console.log(`    Supported tokens: ${estimate.supportedTokens.map(t => `${t.tokenSymbol}: ${t.formattedCost}`).join(', ')}`);
        console.log(`    Gas estimate: callGasLimit=${estimate.gasEstimate.callGasLimit}, verificationGasLimit=${estimate.gasEstimate.verificationGasLimit}, preVerificationGas=${estimate.gasEstimate.preVerificationGas}`);
        // Step 6: Send a sponsored UserOp (self-transfer with 0 value)
        console.log('\n[Step 6] Sending sponsored UserOp (self-transfer)...');
        const signFn = async (hash) => {
            return ownerSigner.signMessage(ethers_1.ethers.getBytes(hash));
        };
        if (estimate.sponsorshipAvailable) {
            console.log('  Using free sponsorship (KITE native)...');
            const result = await sdk.sendUserOperationWithPayment(ownerSigner.address, selfTransferRequest, estimate.userOp, ZERO_ADDRESS, signFn, salt);
            console.log(`  UserOp hash: ${result.userOpHash}`);
            console.log(`  Status: ${result.status.status}`);
            if (result.status.transactionHash) {
                console.log(`  Transaction: ${result.status.transactionHash}`);
            }
            if (result.status.status === 'success') {
                console.log('\n  ✅ Integration test PASSED!');
            }
            else {
                console.log(`\n  ❌ UserOp failed: ${result.status.reason}`);
            }
        }
        else {
            console.log('  No sponsorship available, skipping send step.');
            console.log('  ✅ Estimation test PASSED (send skipped).');
        }
    }
    catch (error) {
        console.error(`\n  ❌ Error: ${error.message}`);
        if (error.details) {
            console.error('  Details:', JSON.stringify(error.details, null, 2));
        }
        process.exit(1);
    }
    console.log('\n' + '='.repeat(60));
    console.log('Integration test completed.');
    console.log('='.repeat(60));
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
