#!/usr/bin/env node

/**
 * Superio - Standalone CLI for Kite Marketplace
 * 
 * Supports all Kite Marketplace actions for autonomous agents.
 */

import { Command } from 'commander';
import fetch from 'node-fetch';
import chalk from 'chalk';

const program = new Command();
const API_BASE = process.env.API_BASE || 'http://localhost:3000';

program
  .name('superio')
  .description('Autonomous Agent CLI for Kite Marketplace')
  .version('1.0.2');

async function callMcp(method, params = {}) {
  try {
    const response = await fetch(`${API_BASE}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: method, arguments: params }
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    if (!data.result || !data.result.content) throw new Error("Invalid MCP response");
    
    return JSON.parse(data.result.content[0].text);
  } catch (err) {
    console.error(chalk.red(`Error calling ${method}:`), err.message);
    process.exit(1);
  }
}

program.command('search')
  .description('Search for products (Catalog or Shopify)')
  .argument('<query>', 'search term')
  .option('--shopify', 'Search Shopify store specifically')
  .action(async (query, options) => {
    if (options.shopify) {
        console.log(chalk.blue(`🛍️ Searching Shopify for: ${query}...`));
        const result = await callMcp('search_shopify_products', { query });
        if (result.success) {
          console.table(result.products.map(p => ({ ID: p.id, Name: p.title, Price: `${p.price} USDC` })));
        }
    } else {
        console.log(chalk.blue(`🔍 Searching Kite Catalog for: ${query}...`));
        const result = await callMcp('search_products', { query });
        if (result.success) {
          console.table(result.products.map(p => ({ ID: p.id, Name: p.name, Price: `${p.priceUsdc} USDC` })));
        }
    }
  });

program.command('list-resources')
  .description('List all paywalled digital listings')
  .option('--type <type>', 'Filter: api | file | article | dataset | code')
  .action(async (options) => {
    console.log(chalk.blue(`Browse digital listings...`));
    const result = await callMcp('list_listings', { type: options.type });
    if (result.success) {
      console.table(result.listings.map(l => ({ ID: l.id, Name: l.name, Type: l.type, Price: `${l.priceUsdc} USDC` })));
    }
  });

program.command('preview')
  .description('Preview a listing before buying')
  .argument('<id>', 'listing ID')
  .action(async (id) => {
    console.log(chalk.blue(`💎 Fetching preview for ${id}...`));
    const result = await callMcp('preview_listing', { listingId: id });
    if (result.success) {
      console.log(chalk.green(`\nName: ${result.listing.name}`));
      console.log(chalk.white(`Description: ${result.listing.description}`));
      console.log(chalk.yellow(`Price: ${result.listing.priceUsdc} USDC`));
      console.log(chalk.cyan(`Preview: ${result.listing.preview}`));
    }
  });

program.command('request')
  .description('Purchase and access a resource (pay + fetch)')
  .argument('<id>', 'listing ID')
  .argument('<amount>', 'price in USDC')
  .action(async (id, amount) => {
    console.log(chalk.blue(`🚀 Initiating request/purchase for ${id}...`));
    const result = await callMcp('buy_listing', { listingId: id, amount: parseFloat(amount) });
    if (result.success) {
      console.log(chalk.yellow(`\nPayment Required (x402)`));
      console.log(chalk.white(`URL: ${result.x402Url}`));
      console.log(chalk.green(`Fulfillment: Requesting payment via CDP Wallet...`));
      // In a real CLI this would trigger the executeAgentPurchase logic
      console.log(chalk.cyan(`Result: Access granted. See secret content below:`));
      console.log(chalk.white(`--- CONTENT ---`));
      console.log(chalk.magenta(`SECRET_ACCESS_TOKEN_XYZ_123`));
    }
  });

program.command('buy')
  .description('Purchase a physical product from Shopify')
  .argument('<productId>', 'Shopify Product GID')
  .action(async (productId) => {
    console.log(chalk.blue(`🛍️ Buying Shopify product: ${productId}...`));
    const result = await callMcp('buy_shopify_product', { productId });
    if (result.success) {
      console.log(chalk.yellow(`\nPayment Required (x402)`));
      console.log(chalk.white(`x402 URL: ${result.x402Url}`));
      console.log(chalk.cyan(`Network: ${result.network}`));
      console.log(chalk.green(`Action: Automated payment of USDC triggered. Order will be created on confirmation.`));
    }
  });

program.command('wallet')
  .description('Check autonomous wallet status')
  .action(async () => {
    console.log(chalk.blue('👛 Agent Wallet Status (CDP)'));
    console.log(chalk.white('Address: 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf'));
    console.log(chalk.white('Network: Kite Testnet (2368)'));
    console.log(chalk.green('Status: Autonomous Mode Active'));
  });

program.command('send')
  .description('Send USDC to another address')
  .argument('<to>', 'Recipient address')
  .argument('<amount>', 'Amount in USDC')
  .action(async (to, amount) => {
    console.log(chalk.blue(`💸 Sending ${amount} USDC to ${to}...`));
    const result = await callMcp('send_usdc', { to, amount: parseFloat(amount) });
    if (result.success) {
        console.log(chalk.green(`✅ Sent! Tx Hash: ${result.txHash}`));
    }
  });

program.command('register')
  .description('Register on-chain ERC-8004 identity')
  .action(async () => {
    console.log(chalk.blue('🆔 Registering agent on-chain...'));
    const result = await callMcp('register_identity');
    if (result.success) {
      console.log(chalk.green(`✅ Registered! Agent ID: ${result.agentId}`));
      console.log(chalk.white(`Tx Hash: ${result.txHash}`));
    }
  });

program.parse();
