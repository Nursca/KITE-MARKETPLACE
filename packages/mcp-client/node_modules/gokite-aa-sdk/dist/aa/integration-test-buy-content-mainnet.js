"use strict";
/**
 * Mainnet Integration Test: Full x402 Buy Content Flow
 *
 * Tests the complete end-to-end flow on kite_mainnet:
 * 1. Setup AA wallet (deploy + addSupportedToken + setMasterBudgetRules)
 * 2. Create session with agent and spending rules
 * 3. Request protected content (receive 402 + PaymentRequirements)
 * 4. Sign EIP-712 transfer authorization
 * 5. Send payment via X-Payment header, receive content
 *
 * Environment variables (from ../../.env):
 *   PRIVATE_KEY          - Owner private key (also used as agent for this test)
 *   SERVICE_URL          - x402 protected service URL
 *   FACILITATOR_URL      - x402 facilitator URL
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const gokite_aa_sdk_1 = require("./gokite-aa-sdk");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
// =============================================================================
// Configuration
// =============================================================================
const NETWORK = "kite_mainnet";
const RPC_URL = "https://rpc.gokite.ai";
const BUNDLER_URL = "https://bundler-service.prod.gokite.ai/rpc/";
const CHAIN_ID = 2366n;
const X402_NETWORK = "kite";
const SETTLEMENT_TOKEN = "0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e"; // USDC, 6 decimals
const TOKEN_DECIMALS = 6;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SECONDS_PER_DAY = 86400;
const SERVICE_URL = process.env.SERVICE_URL || "https://x402.prod.gokite.ai";
const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://x402.prod.gokite.ai";
const OWNER_PRIVATE_KEY = process.env.PRIVATE_KEY;
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY ?? OWNER_PRIVATE_KEY;
if (!OWNER_PRIVATE_KEY)
    throw new Error("Missing PRIVATE_KEY env variable");
const ownerSigner = new ethers_1.ethers.Wallet(OWNER_PRIVATE_KEY);
const agentSigner = new ethers_1.ethers.Wallet(AGENT_PRIVATE_KEY);
const sdk = new gokite_aa_sdk_1.GokiteAASDK(NETWORK, RPC_URL, BUNDLER_URL);
const provider = new ethers_1.ethers.JsonRpcProvider(RPC_URL);
// =============================================================================
// Contract Interface
// =============================================================================
const gokiteAccountInterface = new ethers_1.ethers.Interface([
    "function addSupportedToken(address token)",
    "function setMasterBudgetRules(uint256[] timeWindows, uint160[] budgets)",
    "function createSession(bytes32 sessionId, address agent, tuple(uint256 timeWindow, uint160 budget, uint96 initialWindowStartTime, bytes32[] targetProviders)[] rules)",
    "function executeBatch(address[] dest, uint256[] value, bytes[] func)",
    "function isTokenSupported(address token) view returns (bool)",
    "function getAvailableBalance(address token) view returns (uint256)",
    "function sessionExists(bytes32 sessionId) view returns (bool)",
    "function getSessionAgent(bytes32 sessionId) view returns (address)",
    "function getMasterBudgetRules() view returns (tuple(tuple(uint256 timeWindow, uint160 budget, uint96 initialWindowStartTime, bytes32[] targetProviders) rule, tuple(uint128 amountUsed, uint128 currentTimeWindowStartTime) usage)[])",
]);
// =============================================================================
// EIP-712 Signing
// =============================================================================
const TRANSFER_AUTH_TYPES = {
    TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "token", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
    ],
};
function getEIP712Domain(aaWallet, chainId) {
    return {
        name: "GokiteAccount",
        version: "1",
        chainId,
        verifyingContract: aaWallet,
    };
}
// =============================================================================
// Helpers
// =============================================================================
function currentDayStart() {
    const now = Math.floor(Date.now() / 1000);
    return BigInt(Math.floor(now / SECONDS_PER_DAY) * SECONDS_PER_DAY);
}
async function signUserOp(hash) {
    return ownerSigner.signMessage(ethers_1.ethers.getBytes(hash));
}
async function sendWithTokenPayment(target, callData) {
    const request = { target, value: 0n, callData };
    const estimate = await sdk.estimateUserOperation(ownerSigner.address, request);
    const tokenAddress = estimate.sponsorshipAvailable ? ZERO_ADDRESS : SETTLEMENT_TOKEN;
    const response = await sdk.sendUserOperationWithPayment(ownerSigner.address, request, estimate.userOp, tokenAddress, signUserOp);
    if (response.status.status !== "success") {
        throw new Error(response.status.reason ?? "UserOp failed");
    }
    return response.status.transactionHash ?? "";
}
// =============================================================================
// Main Flow
// =============================================================================
async function main() {
    const endpoint = process.argv[2] || "/api/weather?location=San%20Francisco";
    console.log("=".repeat(60));
    console.log("  Kite Mainnet x402 Buy Content - Integration Test");
    console.log("=".repeat(60));
    const salt = BigInt(2);
    const aaWallet = sdk.getAccountAddress(ownerSigner.address, salt);
    console.log("\nConfiguration:");
    console.log(`  Network:       ${NETWORK} (chain ${CHAIN_ID})`);
    console.log(`  AA Wallet:     ${aaWallet}`);
    console.log(`  Owner:         ${ownerSigner.address}`);
    console.log(`  Agent:         ${agentSigner.address}`);
    console.log(`  Token:         USDC (${SETTLEMENT_TOKEN})`);
    console.log(`  Service:       ${SERVICE_URL}`);
    console.log(`  Facilitator:   ${FACILITATOR_URL}`);
    console.log(`  Endpoint:      ${endpoint}`);
    // ============ Health Check ============
    console.log("\n[Health] Checking facilitator...");
    try {
        const healthResp = await fetch(`${FACILITATOR_URL}/health`);
        if (healthResp.ok) {
            console.log("  Facilitator: OK");
        }
        else {
            console.log(`  Facilitator: ${healthResp.status} (may still work)`);
        }
    }
    catch (e) {
        console.log(`  Facilitator: UNREACHABLE (${e.message})`);
        console.log("  Continuing anyway...");
    }
    // ============ Step 1: Setup AA Wallet ============
    console.log("\n[Step 1] Checking AA wallet status...");
    const isDeployed = await sdk.isAccountDeloyed(aaWallet);
    if (!isDeployed) {
        console.log("  Wallet not deployed. Setting up (deploy + addSupportedToken + masterBudget)...");
        const masterBudgetData = gokiteAccountInterface.encodeFunctionData("setMasterBudgetRules", [
            [BigInt(SECONDS_PER_DAY), 0n],
            [ethers_1.ethers.parseUnits("1000", 18), ethers_1.ethers.parseUnits("100", 18)],
        ]);
        const setupBatchData = gokiteAccountInterface.encodeFunctionData("executeBatch", [
            [aaWallet],
            [0n],
            [masterBudgetData],
        ]);
        const setupTx = await sendWithTokenPayment(aaWallet, setupBatchData);
        console.log(`  Setup tx: ${setupTx}`);
        await new Promise((r) => setTimeout(r, 5000));
    }
    else {
        console.log("  Wallet already deployed.");
        const contract = new ethers_1.ethers.Contract(aaWallet, gokiteAccountInterface, provider);
        const tokenSupported = await contract.isTokenSupported(SETTLEMENT_TOKEN);
        console.log(`  USDC supported: ${tokenSupported}`);
        if (!tokenSupported) {
            console.log("  Adding USDC as supported token...");
            const addTokenData = gokiteAccountInterface.encodeFunctionData("addSupportedToken", [SETTLEMENT_TOKEN]);
            const addTx = await sendWithTokenPayment(aaWallet, addTokenData);
            console.log(`  addSupportedToken tx: ${addTx}`);
            await new Promise((r) => setTimeout(r, 5000));
        }
        const masterRules = await contract.getMasterBudgetRules();
        if (masterRules.length === 0) {
            console.log("  Setting master budget rules...");
            const masterBudgetData = gokiteAccountInterface.encodeFunctionData("setMasterBudgetRules", [
                [BigInt(SECONDS_PER_DAY), 0n],
                [ethers_1.ethers.parseUnits("1000", 18), ethers_1.ethers.parseUnits("100", 18)],
            ]);
            const budgetTx = await sendWithTokenPayment(aaWallet, masterBudgetData);
            console.log(`  setMasterBudgetRules tx: ${budgetTx}`);
            await new Promise((r) => setTimeout(r, 5000));
        }
        else {
            console.log(`  Master budget rules: ${masterRules.length} rule(s) already set`);
        }
    }
    // ============ Step 2: Create Session ============
    console.log("\n[Step 2] Creating session...");
    const sessionId = ethers_1.ethers.hexlify((0, ethers_1.randomBytes)(32));
    const sessionRules = [
        {
            timeWindow: BigInt(SECONDS_PER_DAY),
            budget: ethers_1.ethers.parseUnits("100", 18),
            initialWindowStartTime: currentDayStart(),
            targetProviders: [],
        },
        {
            timeWindow: 0n,
            budget: ethers_1.ethers.parseUnits("10", 18),
            initialWindowStartTime: 0n,
            targetProviders: [],
        },
    ];
    const createSessionData = gokiteAccountInterface.encodeFunctionData("createSession", [
        sessionId,
        agentSigner.address,
        sessionRules,
    ]);
    const sessionTx = await sendWithTokenPayment(aaWallet, createSessionData);
    console.log(`  Session ID: ${sessionId}`);
    console.log(`  createSession tx: ${sessionTx}`);
    await new Promise((r) => setTimeout(r, 5000));
    // Verify session
    const contract = new ethers_1.ethers.Contract(aaWallet, gokiteAccountInterface, provider);
    const sessionExists = await contract.sessionExists(sessionId);
    const sessionAgent = sessionExists ? await contract.getSessionAgent(sessionId) : null;
    console.log(`  Session exists: ${sessionExists}, agent: ${sessionAgent}`);
    if (!sessionExists) {
        console.error("  Session creation failed!");
        process.exit(1);
    }
    // ============ Step 3: Request Content (expect 402) ============
    console.log("\n[Step 3] Requesting protected content...");
    console.log(`  URL: ${SERVICE_URL}${endpoint}`);
    const response402 = await fetch(`${SERVICE_URL}${endpoint}`);
    if (response402.status !== 402) {
        console.log(`  Unexpected status: ${response402.status}`);
        if (response402.ok) {
            console.log("  Content returned without payment.");
            console.log("  Body:", (await response402.text()).slice(0, 200));
        }
        process.exit(1);
    }
    const paymentRequired = (await response402.json());
    console.log(`  Status: 402 Payment Required`);
    console.log(`  Payment options: ${paymentRequired.accepts?.length || 0}`);
    const kiteOption = paymentRequired.accepts?.find((req) => req.network === X402_NETWORK || req.network === "kite-mainnet");
    if (!kiteOption) {
        console.error(`  No ${X402_NETWORK} payment option found.`);
        console.error("  Available:", paymentRequired.accepts?.map((r) => `${r.network}/${r.scheme}`).join(", "));
        process.exit(1);
    }
    console.log(`  Network: ${kiteOption.network}`);
    console.log(`  Scheme: ${kiteOption.scheme}`);
    console.log(`  Amount: ${kiteOption.maxAmountRequired} (raw)`);
    console.log(`  Pay to: ${kiteOption.payTo}`);
    console.log(`  Asset: ${kiteOption.asset}`);
    // ============ Step 4: Sign Payment Authorization ============
    console.log("\n[Step 4] Signing EIP-712 transfer authorization...");
    const nonce = ethers_1.ethers.hexlify((0, ethers_1.randomBytes)(32));
    const now = BigInt(Math.floor(Date.now() / 1000));
    const auth = {
        from: aaWallet,
        to: kiteOption.payTo,
        token: kiteOption.asset,
        value: BigInt(kiteOption.maxAmountRequired),
        validAfter: now - 60n,
        validBefore: now + 3600n,
        nonce,
    };
    const domain = getEIP712Domain(aaWallet, CHAIN_ID);
    const signature = await agentSigner.signTypedData(domain, TRANSFER_AUTH_TYPES, auth);
    console.log(`  From: ${auth.from}`);
    console.log(`  To: ${auth.to}`);
    console.log(`  Value: ${auth.value}`);
    console.log(`  Nonce: ${nonce.slice(0, 18)}...`);
    console.log(`  Signature: ${signature.slice(0, 20)}...`);
    // ============ Step 5: Send Payment & Get Content ============
    console.log("\n[Step 5] Sending payment via X-Payment header...");
    const paymentPayload = {
        x402Version: 1,
        scheme: "gokite-aa",
        network: kiteOption.network,
        payload: {
            signature,
            authorization: {
                from: auth.from,
                to: auth.to,
                token: auth.token,
                value: auth.value.toString(),
                validAfter: auth.validAfter.toString(),
                validBefore: auth.validBefore.toString(),
                nonce: auth.nonce,
            },
            sessionId,
            metadata: "merchant=|method=x402 Protocol",
        },
    };
    const xPayment = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
    console.log(`  X-Payment header: ${xPayment.length} chars`);
    const contentResponse = await fetch(`${SERVICE_URL}${endpoint}`, {
        headers: { "X-Payment": xPayment },
    });
    console.log(`  Response status: ${contentResponse.status}`);
    // ============ Result ============
    console.log("\n" + "=".repeat(60));
    console.log("  Result");
    console.log("=".repeat(60));
    if (contentResponse.ok) {
        const contentType = contentResponse.headers.get("content-type");
        let content;
        if (contentType?.includes("application/json")) {
            const json = await contentResponse.json();
            content = JSON.stringify(json, null, 2);
        }
        else {
            content = await contentResponse.text();
        }
        console.log("  ✅ Purchase successful!");
        console.log("\n  Content:");
        console.log("  " + "─".repeat(48));
        console.log(content.split("\n").map((l) => "  " + l).join("\n"));
        console.log("  " + "─".repeat(48));
        console.log(`\n  Payment nonce: ${nonce}`);
    }
    else {
        const errorBody = await contentResponse.text();
        console.log("  ❌ Purchase failed");
        console.log(`  Status: ${contentResponse.status}`);
        console.log(`  Error: ${errorBody}`);
    }
    console.log("=".repeat(60));
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
