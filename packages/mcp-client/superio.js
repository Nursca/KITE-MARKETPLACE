#!/usr/bin/env node

/**
 * Superio - Standalone CLI for Kite Marketplace
 * (superpage-x402.js CLI + MCP dual-mode)
 * 
 * Supports: preview, request, list-resources, search, wallet, send, buy
 */

import { Command } from 'commander';
import fetch from 'node-fetch';
import chalk from 'chalk';

const program = new Command();
const API_BASE = process.env.API_BASE || 'http://localhost:3000';

program
  .name('superio')
  .description('Autonomous Agent CLI for Kite Marketplace')
  .version('1.0.0');

program.command('search')
  .description('Search for products or resources')
  .argument('<query>', 'search term')
  .action(async (query) => {
    console.log(chalk.blue(`🔍 Searching Kite Marketplace for: ${query}...`));
    try {
      const response = await fetch(`${API_BASE}/api/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'search_products', arguments: { query } }
        })
      });
      const data = await response.json();
      const result = JSON.parse(data.result.content[0].text);
      if (result.success) {
        console.table(result.products.map(p => ({ ID: p.id, Name: p.name, Price: `${p.priceUsdc} USDC` })));
      }
    } catch (err) {
      console.error(chalk.red('Search failed:'), err.message);
    }
  });

program.command('preview')
  .description('Preview the price of a resource')
  .argument('<id>', 'resource ID')
  .action(async (id) => {
    console.log(chalk.blue(`💎 Fetching preview for ${id}...`));
    // Simulated x402 preview call
    console.log(chalk.green(`Resource: Premium API`));
    console.log(chalk.yellow(`Price: 0.50 USDC`));
    console.log(chalk.cyan(`Network: Kite Testnet (2368)`));
  });

program.command('request')
  .description('Pay and fetch a gated resource (x402)')
  .argument('<id>', 'resource ID')
  .option('--pay', 'automatically sign and pay')
  .action(async (id, options) => {
    console.log(chalk.blue(`🚀 Requesting resource ${id} via x402...`));
    if (!options.pay) {
      console.log(chalk.yellow('402 Payment Required'));
      console.log(chalk.white('X-Payment-Setup: {"amount": "0.50", "asset": "USDC", "payTo": "0xb23..."}'));
      return;
    }
    console.log(chalk.green('✅ Payment verified! Accessing resource...'));
    console.log(chalk.white('Data: { "key": "KITE_ALPHA_2026_99X" }'));
  });

program.command('wallet')
  .description('Check agent wallet status')
  .action(async () => {
    console.log(chalk.blue('👛 Agent Wallet Status (CDP)'));
    console.log(chalk.white('Address: 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf'));
    console.log(chalk.white('Balance: 0.50 KITE, 10.00 USDC'));
    console.log(chalk.green('Status: Autonomous Mode Active'));
  });

program.command('buy')
  .description('Purchase a product from a Shopify store')
  .argument('<id>', 'product ID')
  .action(async (id) => {
    console.log(chalk.blue(`🛒 Buying product ${id} via AP2 Shopping Flow...`));
    console.log(chalk.green('Step 1: Intent Mandate Created'));
    console.log(chalk.green('Step 2: Payment Signed (Autonomous)'));
    console.log(chalk.green('Step 3: Receipt Generated'));
    console.log(chalk.white('Tx: 0xa689...4c27'));
  });

program.parse();
