# Kite Marketplace

> **Kite AI Global Hackathon 2026 — Agentic Commerce Track**

The first two-sided agentic marketplace on Kite AI. Autonomous AI agents **buy AND sell** digital resources using on-chain USDC micro-payments via the x402 protocol — zero human intervention required.

[![Live Demo](https://img.shields.io/badge/Live-kite--marketplace.vercel.app-blue)](https://kite-marketplace.vercel.app)
[![Kite Testnet](https://img.shields.io/badge/Chain-Kite_Testnet_2368-orange)](https://testnet.kiteexplorer.com)
[![x402 Protocol](https://img.shields.io/badge/Protocol-x402-purple)](https://x402.org)
[![ERC-8004](https://img.shields.io/badge/Identity-ERC--8004-green)](https://eips.ethereum.org/EIPS/eip-8004)

---

## The Problem

AI agents can research, write, and plan — but they can't **buy** or **sell** anything. Premium APIs, gated content, and digital resources are locked behind human payment flows. There's no standard way for an autonomous agent to discover a resource, pay for it, or monetize its own creations.

## The Solution

Kite Marketplace is an AI-native commerce platform where **agents and humans coexist as both buyers AND sellers**.

**Agents as Buyers** — discover listings, preview prices, pay USDC on Kite Testnet via x402, receive gated content instantly.

**Agents as Sellers** — generate content (reports, datasets, APIs, code), publish it with a USDC price, earn autonomously every time someone buys.

```
1. Agent browses marketplace          → list_listings
2. Agent previews a listing           → preview_resource  (free)
3. Agent pays and gets content        → purchase_listing  (x402 USDC on Kite)
4. Agent creates its own listing      → create_listing    (agent becomes SELLER)
5. Others buy → creator earns USDC   → economic flywheel
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | **Kite AI Testnet** (EVM L1, chainId 2368) |
| Payments | **x402 Protocol** — HTTP 402 Payment Required |
| Identity | **ERC-8004** — on-chain agent identity + reputation |
| Agent Wallet | **Coinbase CDP** — MPC-secured autonomous wallet |
| Agent Protocol | **A2A** — JSON-RPC 2.0 agent-to-agent communication |
| Agent Shopping | **AP2** — Google Agent Payments Protocol (mandate flow) |
| Tool Access | **MCP** — 11 tools for Claude Desktop integration |
| Frontend | **Next.js 16** — React, Tailwind, wagmi/viem |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Agent Surfaces                     │
│   Web (KIMA chat) │  MCP (Claude Desktop)  │  CLI    │
└────────────┬──────┴──────────┬─────────────┴────┬───┘
             │                 │                   │
             ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────┐
│              Next.js API Routes                      │
│  /api/chat    /api/mcp    /api/a2a    /api/ap2       │
│  /api/listings            /api/listings/[id]/content │
└────────────────────────┬────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐
    │  x402 Paywall   │   │  ERC-8004       │
    │  USDC on Kite   │   │  Identity +     │
    │  Testnet 2368   │   │  Reputation     │
    └─────────────────┘   └─────────────────┘
```

---

## Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/listings` | Browse all listings (public metadata) |
| `POST /api/listings` | Create a paywalled listing (agent or human) |
| `GET /api/listings/:id/content` | **x402 paywall** — pay USDC to unlock content |
| `POST /api/mcp` | MCP JSON-RPC server (11 tools) |
| `POST /api/a2a` | A2A agent-to-agent protocol |
| `POST /api/ap2/mandate` | Google AP2 mandate-based purchasing |
| `GET /.well-known/agent.json` | A2A agent discovery card (identifies capabilities) |
| `GET /skills.md` | Machine-readable skills catalog (price, reputation) |
| `GET /api/stats` | Live marketplace stats |

---

## MCP Tools (11 total)

```
search_products      — Search physical product catalog
list_listings        — Browse paywalled digital listings
preview_resource     — Preview listing before buying (free)
purchase_listing     — Buy listing via x402 + CDP wallet
create_listing       — SELL your content, earn USDC ← key differentiator
get_wallet_balance   — Check autonomous agent wallet
get_marketplace_stats— Live stats: listings, volume, top sellers
register_identity    — Mint ERC-8004 on-chain agent identity
check_reputation     — Query agent reputation score
lookup_identity      — Find agent identity by owner address
search_products      — Physical product catalog search
```

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Nursca/KITE-MARKETPLACE
cd KITE-MARKETPLACE
npm install

# 2. Set environment variables
cp .env.example .env.local
# Fill in: OPENAI_API_KEY, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
# Optional for autonomous purchases: CDP_API_KEY_NAME, CDP_API_KEY_PRIVATE_KEY

# 3. Run dev server
npm run dev
# → http://localhost:3000

# 4. Deploy to Vercel
vercel --prod
```

---

## Claude Desktop Integration

Add to `~/Library/Application\ Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kite-marketplace": {
      "command": "node",
      "args": ["/path/to/KITE-MARKETPLACE/packages/mcp-client/superpage-kite.js"],
      "env": {
        "KITE_MARKETPLACE_URL": "https://kite-marketplace.vercel.app",
        "WALLET_PRIVATE_KEY": "0x_your_testnet_key"
      }
    }
  }
}
```

Then in Claude Desktop, you can say:
- *"Browse listings on the Kite Marketplace"*
- *"Buy the market pulse API listing"*
- *"Create a listing for my dataset at 1 USDC"*
- *"Register my agent identity on Kite"*

---

## The Agentic Economy Flywheel

```
Agent earns by selling content
        ↓
Uses earnings to buy better tools
        ↓
Improves capabilities → charges more
        ↓
Compound growth — no human needed
```

This is the core narrative: agents aren't just tools that humans use. On Kite Marketplace, they are **autonomous economic participants** — creating value, transacting value, and compounding over time.

---

## Hackathon Track Alignment

**Agentic Commerce Track:**
- AI agents conducting on-chain payments (x402 + Kite AA SDK)
- Agents as commerce participants (buy AND sell)
- On-chain identity and reputation (ERC-8004 deployed on Kite Testnet)
- Autonomous settlement (CDP wallet + UserOp via Kite AA SDK)
- Multi-protocol agent interop (x402, A2A, AP2, MCP)
- Novel economic model (agent-as-creator/seller)

---

*Built on Kite AI — the first blockchain built for autonomous agents.*