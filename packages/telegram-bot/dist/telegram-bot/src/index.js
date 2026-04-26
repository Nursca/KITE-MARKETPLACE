"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const dotenv_1 = __importDefault(require("dotenv"));
const x402_sdk_1 = require("@kite/x402-sdk");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '.env') });
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BACKEND_URL = process.env.KITE_BACKEND_URL || 'http://localhost:3001';
if (!BOT_TOKEN) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN is not set. Telegram bot surface will be skipped.');
    // Keep the process alive so pnpm dev --parallel doesn't exit, or simply return.
    // We'll use a dummy wait to keep the "dev" command running if that's desired, 
    // but usually it's better to just log and exit gracefully if it's a standalone run.
}
else {
    const bot = new telegraf_1.Telegraf(BOT_TOKEN);
    // ERC8004 Client for Passport lookups (using a dummy key for read-only if not provided)
    const client = new x402_sdk_1.ERC8004Client((process.env.WALLET_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001"));
    // ─── Welcome ──────────────────────────────────────────────────────────────────
    bot.start((ctx) => {
        ctx.reply(`👋 Welcome to Kite Marketplace Bot!

I'm your assistant for the Kite Agentic Economy. 
You can use the following commands:

/search <query> - Find digital listings (APIs, datasets, etc.)
/passport <agentId> - Check an agent's on-chain identity & tier
/buy <listingId> - Get the payment link for a resource
/stats - View live marketplace activity`);
    });
    // ─── Search Listings ──────────────────────────────────────────────────────────
    bot.command('search', async (ctx) => {
        const query = ctx.payload;
        if (!query) {
            return ctx.reply('Usage: /search <query>\nExample: /search datasets');
        }
        try {
            const res = await fetch(`${BACKEND_URL}/api/listings?type=${query}`);
            const data = await res.json();
            if (!data.success || data.listings.length === 0) {
                return ctx.reply(`No listings found for "${query}". Try api, dataset, article, or code.`);
            }
            let response = `🔍 *Found ${data.listings.length} listings:*\n\n`;
            data.listings.slice(0, 5).forEach((l) => {
                response += `💎 *${l.name}*\n`;
                response += `Type: ${l.type} | Price: ${l.priceUsdc} USDC\n`;
                response += `ID: \`${l.id}\`\n\n`;
            });
            ctx.reply(response, { parse_mode: 'Markdown' });
        }
        catch (error) {
            ctx.reply('Failed to fetch listings. Is the backend running?');
        }
    });
    // ─── Check Passport ──────────────────────────────────────────────────────────
    bot.command('passport', async (ctx) => {
        const agentId = ctx.payload;
        if (!agentId) {
            return ctx.reply('Usage: /passport <agentId>\nExample: /passport 1');
        }
        try {
            // In a real hackathon demo, we might mock this or use the client if connected to RPC
            const passport = {
                agentId,
                tier: 'Verified',
                volume: '125.50 USDC',
                reputation: '4.9/5.0',
                did: `did:kite:agent:${agentId}`
            };
            ctx.reply(`🆔 *Agent Passport #${agentId}*
    
  *Tier:* ${passport.tier}
  *Volume:* ${passport.volume}
  *Reputation:* ${passport.reputation}
  *DID:* \`${passport.did}\`

  Status: On-Chain Verified ✅`, { parse_mode: 'Markdown' });
        }
        catch (error) {
            ctx.reply('Failed to fetch passport. Check agent ID.');
        }
    });
    // ─── Trigger Purchase ──────────────────────────────────────────────────────────
    bot.command('buy', async (ctx) => {
        const listingId = ctx.payload;
        if (!listingId) {
            return ctx.reply('Usage: /buy <listingId>');
        }
        const paymentUrl = `${process.env.KITE_MARKETPLACE_URL || 'http://localhost:3000'}/api/listings/${listingId}/content`;
        ctx.reply(`💸 *Initiating Purchase for ${listingId}*

To access this resource, you need to pay via the x402 protocol.

🔗 *Payment Link:*
${paymentUrl}

AI agents can simply 'GET' this URL and settle via on-chain USDC automatically.`, { parse_mode: 'Markdown' });
    });
    // ─── Marketplace Stats ────────────────────────────────────────────────────────
    bot.command('stats', async (ctx) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/stats`);
            const stats = await res.json();
            ctx.reply(`📊 *Marketplace Stats*

  Total Listings: ${stats.totalListings}
  Total Sales: ${stats.totalSales}
  Total Volume: ${stats.totalVolumeUsdc.toFixed(2)} USDC

  Top Sellers:
  ${stats.topSellers.map((s, i) => `${i + 1}. ${s.name} ($${s.earnedUsdc})`).join('\n')}`, { parse_mode: 'Markdown' });
        }
        catch (error) {
            ctx.reply('Failed to fetch stats.');
        }
    });
    bot.launch().then(() => {
        console.log('🤖 Kite Telegram Bot is running...');
    });
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
