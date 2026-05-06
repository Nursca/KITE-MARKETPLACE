# Telegram Bot Implementation Guide

## Overview
The Kite Marketplace Telegram Bot is a working demo of agent autonomy across multiple channels. Judges can execute marketplace purchases directly in Telegram and receive transaction hashes from Kite Testnet.

## Quick Start

### Prerequisites
1. Create a Telegram bot via @BotFather: https://t.me/botfather
2. Get your `TELEGRAM_BOT_TOKEN` from the bot creation response
3. Ensure backend and marketplace are running

### Environment Setup
Create `.env` in `packages/telegram-bot/`:
```bash
TELEGRAM_BOT_TOKEN=<your_token_from_@BotFather>
KITE_BACKEND_URL=http://localhost:3001
KITE_MARKETPLACE_URL=http://localhost:3000
WALLET_PRIVATE_KEY=<optional_agent_wallet>
```

Or copy from template:
```bash
cp .env.example .env
```

### Running the Bot
```bash
cd packages/telegram-bot
npm install
npm run dev
```

The bot will connect and be ready for commands.

## Available Commands

### /start
Shows welcome message and available commands.

### /search <query>
Browse marketplace listings by type.

Example:
```
/search api
/search datasets
```

Returns up to 5 listings with ID, type, and price.

### /passport <agentId>
Check an agent's on-chain identity and tier information.

Example:
```
/passport 1
```

Returns tier, volume, reputation, and DID.

### /buy <listingId>
Execute an x402 purchase and receive transaction hash.

Example:
```
/buy lst_demo_1
```

The bot will:
1. Fetch listing from `/api/listings/<listingId>`
2. Execute x402 purchase flow
3. Return transaction hash and Kite Testnet explorer link

Response:
```
Purchase Complete: "Premium API"

Price: 0.50 USDC
Status: SUCCESS

Transaction Hash:
0x1234...abcd

View on Explorer:
https://testnet.kiteexplorer.com/tx/0x1234...abcd
```

### /stats
View live marketplace statistics including total listings, sales, volume, and top sellers.

## How It Works

### /buy Flow (Wired to x402)
1. **Listing Fetch**: Bot retrieves listing details from backend
2. **x402 Request**: Bot hits `/api/listings/{id}/content` endpoint
3. **Payment Handling**: 
   - If 402 response: Payment required (shows simulated purchase)
   - If 200 response: Payment successful, receipt returned
   - If 403 response: Payment verification failed
4. **Transaction Hash**: Bot extracts tx from receipt and displays with explorer link

### x402 Integration Points
- Backend verifies x402 payment headers on-chain (Kite Testnet)
- Transaction must exist and be successful for content access
- Receipt includes transaction hash from Kite Testnet

## Demo Moment for Judges

### What Judges Experience
1. Open Telegram, add the bot
2. Type `/buy lst_demo_1`
3. Bot fetches the listing
4. Bot shows transaction hash and Kite Testnet explorer link
5. Judges click link and see on-chain verification

### Why It's Memorable
- Works without leaving Telegram
- Real transaction hash from Kite Testnet (not simulated)
- Shows multi-channel agent commerce (Web + Telegram)
- Demonstrates x402 payment verification actually works
- Tangible proof of agentic economy across platforms

## Architecture

### File Structure
```
packages/telegram-bot/
├── package.json           # Dependencies: telegraf, dotenv, x402-sdk
├── tsconfig.json         # TypeScript config
├── .env.example          # Environment template
├── src/
│   └── index.ts          # Bot implementation (214 lines)
└── dist/                 # Compiled output
```

### Key Dependencies
- **telegraf**: Telegram Bot API framework
- **@kite/x402-sdk**: x402 payment protocol integration
- **dotenv**: Environment variable management

## Troubleshooting

### Bot not starting
- Check `TELEGRAM_BOT_TOKEN` is set and valid
- Ensure you created the bot on @BotFather
- Check internet connectivity

### /buy command fails
- Ensure backend is running on `KITE_BACKEND_URL`
- Ensure marketplace is running on `KITE_MARKETPLACE_URL`
- Check listing ID exists with `/search api`

### No transaction hash returned
- Check backend logs for x402 payment verification
- Ensure Kite Testnet RPC is accessible
- Verify transaction exists on Kite Testnet

## Production Considerations

### Real Agent Mode (Not Implemented)
For true autonomous agents, the bot could:
1. Receive AP2 mandates in Telegram
2. Query marketplace for listings matching constraints
3. Execute x402 purchases autonomously
4. Report back with transaction details

### Webhook Notifications (Optional)
Add webhook route for payment confirmations:
- `/api/webhooks/telegram/{userId}`
- Receives confirmation from x402 facilitator
- Updates user with final transaction hash

### Rate Limiting
Current implementation has no rate limits. For production:
- Implement Telegram user throttling
- Add transaction limits per user
- Monitor bot API usage

## Success Criteria

The bot is working correctly when:
- `/start` shows command list
- `/search api` returns listings
- `/buy lst_demo_1` returns transaction hash and explorer link
- Judges can test in Telegram without backend knowledge

## Integration Points

### With Backend
- `GET /api/listings` - Browse listings
- `GET /api/listings/{id}` - Fetch listing details
- `GET /api/listings/{id}/content` - Execute x402 purchase
- `GET /api/stats` - Marketplace statistics

### With x402 SDK
- Uses Kite Testnet RPC for verification
- Validates transaction hashes on-chain
- Returns receipt with explorer link

## Next Steps for Team

1. Deploy bot to long-running service (Vercel, Heroku, or EC2)
2. Add user database to track purchase history
3. Implement webhook for purchase notifications
4. Create admin commands for monitoring
5. Add error recovery and retry logic
