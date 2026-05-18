#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = require("@ai-sdk/openai");
const anthropic_1 = require("@ai-sdk/anthropic");
const groq_1 = require("@ai-sdk/groq");
const ai_1 = require("ai");
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const x402_sdk_1 = require("@kite/x402-sdk");
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '../../.env') });
const program = new commander_1.Command();
program
    .name('kite-agent')
    .description('Standalone AI Agent for the Kite Marketplace')
    .version('0.1.0')
    .argument('[prompt]', 'Initial prompt for the agent')
    .option('-m, --model <model>', 'Model to use (openai, anthropic, groq)', 'openai')
    .action(async (prompt, options) => {
    if (!prompt) {
        console.log(chalk_1.default.bold.cyan('\n🤖 KIMA CLI Agent'));
        console.log('Usage: kite-agent "search for datasets under 1 USDC"\n');
        process.exit(0);
    }
    await runAgent(prompt, options.model);
});
async function runAgent(prompt, modelType) {
    console.log(chalk_1.default.yellow(`\n🚀 KIMA Agent starting (Model: ${modelType})...\n`));
    let model;
    if (modelType === 'anthropic') {
        model = (0, anthropic_1.anthropic)('claude-sonnet-4-6');
    }
    else if (modelType === 'groq') {
        model = (0, groq_1.groq)('llama-3.3-70b-versatile');
    }
    else {
        model = (0, openai_1.openai)('gpt-4o');
    }
    try {
        // Aggressively cast to any to bypass strict version-mismatched types in the environment
        const options = {
            model,
            system: `You are KIMA, an autonomous AI commerce agent for Kite AI.
      You can browse listings, purchase resources, and register agent identities.
      When asked to buy, use the autonomousPurchase tool.
      When asked to register or check identity, use the erc8004 tools.
      Always be concise and professional.`,
            prompt,
            maxSteps: 5,
            tools: {
                browseListings: (0, ai_1.tool)({
                    description: 'Browse available digital listings on the Kite Marketplace.',
                    inputSchema: zod_1.z.object({
                        type: zod_1.z.string().optional().describe('Filter by type: api | file | article | dataset | code'),
                        maxPrice: zod_1.z.number().optional().describe('Max price in USDC')
                    }),
                    execute: async (input) => {
                        const { type, maxPrice } = input;
                        console.log(chalk_1.default.blue(`  🔍 Browsing listings (type: ${type || 'any'}, max: ${maxPrice || 'any'})...`));
                        const backendUrl = process.env.KITE_BACKEND_URL || 'http://localhost:3001';
                        const res = await fetch(`${backendUrl}/api/listings?type=${type || ''}&maxPrice=${maxPrice || ''}`);
                        return await res.json();
                    }
                }),
                autonomousPurchase: (0, ai_1.tool)({
                    description: 'Autonomously purchase a listing using your CDP wallet and x402 on Kite.',
                    inputSchema: zod_1.z.object({
                        listingId: zod_1.z.string().describe('The ID of the listing to buy'),
                        amount: zod_1.z.number().describe('The amount in USDC')
                    }),
                    execute: async (input) => {
                        const { listingId, amount } = input;
                        console.log(chalk_1.default.green(`  💸 Purchasing listing ${listingId} for ${amount} USDC...`));
                        try {
                            return await (0, x402_sdk_1.executeAgentPurchase)(listingId, amount);
                        }
                        catch (error) {
                            return { error: error.message, status: 'failed' };
                        }
                    }
                }),
                getWalletAddress: (0, ai_1.tool)({
                    description: 'Get your autonomous agent wallet address.',
                    inputSchema: zod_1.z.object({}),
                    execute: async () => {
                        const address = await (0, x402_sdk_1.getAgentAddress)();
                        return { address: address || 'Not configured' };
                    }
                }),
                registerIdentity: (0, ai_1.tool)({
                    description: 'Register your agent identity on-chain (ERC-8004).',
                    inputSchema: zod_1.z.object({
                        agentURI: zod_1.z.string().optional().describe('Metadata URI for the agent')
                    }),
                    execute: async (input) => {
                        const { agentURI } = input;
                        console.log(chalk_1.default.magenta(`  🆔 Registering on-chain identity...`));
                        const privateKey = process.env.WALLET_PRIVATE_KEY;
                        if (!privateKey)
                            return { error: 'WALLET_PRIVATE_KEY not set' };
                        const client = new x402_sdk_1.ERC8004Client(privateKey);
                        const { agentId, txHash } = await client.registerAgent(agentURI);
                        return { success: true, agentId: agentId.toString(), txHash };
                    }
                }),
                checkReputation: (0, ai_1.tool)({
                    description: 'Check an agent\'s on-chain reputation.',
                    inputSchema: zod_1.z.object({
                        agentId: zod_1.z.string().describe('The agent ID to check')
                    }),
                    execute: async (input) => {
                        const { agentId } = input;
                        console.log(chalk_1.default.blue(`  ⭐ Checking reputation for ${agentId}...`));
                        const privateKey = (process.env.WALLET_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001");
                        const client = new x402_sdk_1.ERC8004Client(privateKey);
                        return await client.getReputationSummary(BigInt(agentId));
                    }
                })
            }
        };
        const result = await ai_1.generateText(options);
        console.log(chalk_1.default.bold('\n--- KIMA Response ---'));
        console.log(result.text);
        console.log(chalk_1.default.bold('----------------------\n'));
    }
    catch (error) {
        console.error(chalk_1.default.red(`\n❌ Error: ${error.message}\n`));
    }
}
program.parse();
