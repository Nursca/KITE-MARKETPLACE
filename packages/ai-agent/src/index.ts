#!/usr/bin/env node
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { groq } from '@ai-sdk/groq';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import dotenv from 'dotenv';
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { 
  executeAgentPurchase, 
  getAgentAddress,
  ERC8004Client 
} from '@kite/x402-sdk';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const program = new Command();

program
  .name('kite-agent')
  .description('Standalone AI Agent for the Kite Marketplace')
  .version('0.1.0')
  .argument('[prompt]', 'Initial prompt for the agent')
  .option('-m, --model <model>', 'Model to use (openai, anthropic, groq)', 'openai')
  .action(async (prompt, options) => {
    if (!prompt) {
      console.log(chalk.bold.cyan('\n🤖 KIMA CLI Agent'));
      console.log('Usage: kite-agent "search for datasets under 1 USDC"\n');
      process.exit(0);
    }

    await runAgent(prompt, options.model);
  });

async function runAgent(prompt: string, modelType: string) {
  console.log(chalk.yellow(`\n🚀 KIMA Agent starting (Model: ${modelType})...\n`));

  let model: any;
  if (modelType === 'anthropic') {
    model = anthropic('claude-opus-4.6');
  } else if (modelType === 'groq') {
    model = groq('llama-3.3-70b-versatile');
  } else {
    model = openai('gpt-4o');
  }

  try {
    // Aggressively cast to any to bypass strict version-mismatched types in the environment
    const options: any = {
      model,
      system: `You are KIMA, an autonomous AI commerce agent for Kite AI.
      You can browse listings, purchase resources, and register agent identities.
      When asked to buy, use the autonomousPurchase tool.
      When asked to register or check identity, use the erc8004 tools.
      Always be concise and professional.`,
      prompt,
      maxSteps: 5,
      tools: {
        browseListings: tool({
          description: 'Browse available digital listings on the Kite Marketplace.',
          inputSchema: z.object({
            type: z.string().optional().describe('Filter by type: api | file | article | dataset | code'),
            maxPrice: z.number().optional().describe('Max price in USDC')
          }),
          execute: async (input: any) => {
            const { type, maxPrice } = input;
            console.log(chalk.blue(`  🔍 Browsing listings (type: ${type || 'any'}, max: ${maxPrice || 'any'})...`));
            const backendUrl = process.env.KITE_BACKEND_URL || 'http://localhost:3001';
            const res = await fetch(`${backendUrl}/api/listings?type=${type || ''}&maxPrice=${maxPrice || ''}`);
            return await res.json();
          }
        }),

        autonomousPurchase: tool({
          description: 'Autonomously purchase a listing using your CDP wallet and x402 on Kite.',
          inputSchema: z.object({
            listingId: z.string().describe('The ID of the listing to buy'),
            amount: z.number().describe('The amount in USDC')
          }),
          execute: async (input: any) => {
            const { listingId, amount } = input;
            console.log(chalk.green(`  💸 Purchasing listing ${listingId} for ${amount} USDC...`));
            try {
              return await executeAgentPurchase(listingId, amount);
            } catch (error: any) {
              return { error: error.message, status: 'failed' };
            }
          }
        }),

        getWalletAddress: tool({
          description: 'Get your autonomous agent wallet address.',
          inputSchema: z.object({}),
          execute: async () => {
            const address = await getAgentAddress();
            return { address: address || 'Not configured' };
          }
        }),

        registerIdentity: tool({
          description: 'Register your agent identity on-chain (ERC-8004).',
          inputSchema: z.object({
            agentURI: z.string().optional().describe('Metadata URI for the agent')
          }),
          execute: async (input: any) => {
            const { agentURI } = input;
            console.log(chalk.magenta(`  🆔 Registering on-chain identity...`));
            const privateKey = process.env.WALLET_PRIVATE_KEY as `0x${string}`;
            if (!privateKey) return { error: 'WALLET_PRIVATE_KEY not set' };
            
            const client = new ERC8004Client(privateKey);
            const { agentId, txHash } = await client.registerAgent(agentURI);
            return { success: true, agentId: agentId.toString(), txHash };
          }
        }),

        checkReputation: tool({
          description: 'Check an agent\'s on-chain reputation.',
          inputSchema: z.object({
            agentId: z.string().describe('The agent ID to check')
          }),
          execute: async (input: any) => {
            const { agentId } = input;
            console.log(chalk.blue(`  ⭐ Checking reputation for ${agentId}...`));
            const privateKey = (process.env.WALLET_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001") as `0x${string}`;
            const client = new ERC8004Client(privateKey);
            return await client.getReputationSummary(BigInt(agentId));
          }
        })
      }
    };

    const result = await (generateText as any)(options);

    console.log(chalk.bold('\n--- KIMA Response ---'));
    console.log(result.text);
    console.log(chalk.bold('----------------------\n'));

  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
  }
}

program.parse();
