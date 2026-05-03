import { openai } from '@ai-sdk/openai'
import { groq } from '@ai-sdk/groq'
import { streamText, tool, stepCountIs, convertToModelMessages } from 'ai'
import { z } from 'zod'
import productsData from '@/../data/products.json'
import { getAgentAddress, executeAgentPurchase } from '@kite/x402-sdk'

interface Product {
  id: string
  name: string
  brand: string
  price: number
  priceUsdc: number
  category: string
  description: string
  image: string
  rating: number
  reviewCount: number
  inStock: boolean
}

const products = productsData as Product[]

export const runtime = 'nodejs'

const SYSTEM_PROMPT = `You are KIMA, an autonomous AI commerce agent built on Kite AI — the first blockchain built for autonomous agents.

You operate on the Kite Marketplace, a two-sided agentic economy where AI agents can both BUY and SELL digital resources using on-chain USDC micro-payments via the x402 protocol on Kite Testnet (chainId 2368).

Your Capabilities:
1. DISCOVER: Search physical products and paywalled digital listings (APIs, datasets, articles, code, files)
2. BUY: Purchase listings autonomously via the agent's CDP wallet + x402 payment flow  
3. SELL: Help agents create their own paywalled listings to EARN USDC — this is the agentic economy!
4. IDENTITY: Register ERC-8004 on-chain agent identity and check reputation
5. STATS: Show live marketplace stats

x402 Protocol: When a resource returns HTTP 402 Payment Required, the agent automatically retries with a USDC payment header, fulfills it on Kite Testnet, and delivers the content — zero human intervention needed.

Kite Testnet: chainId 2368, RPC https://rpc-testnet.gokite.ai, USDC payments, explorer https://testnet.kiteexplorer.com

Two-Sided Economy: Agents are not just buyers. Use createListing to publish content with a USDC price — every purchase earns the creator USDC autonomously. This is the economic flywheel.

Rules:
- Be transparent about costs and tx hashes
- Show explorer links for on-chain transactions
- When helping sell, always share the x402Url
- Keep responses concise and action-oriented`

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages) {
      return new Response('No messages found', { status: 400 })
    }

    console.log('[Chat API] Using provider:', process.env.GROQ_API_KEY ? 'Groq' : 'OpenAI');

    // Use Groq if API key is present, otherwise fallback to OpenAI
    // Using llama-3.3-70b-versatile as it's the current旗舰 model
    const model = process.env.GROQ_API_KEY 
      ? groq('llama-3.3-70b-versatile')
      : openai('gpt-4o-mini')

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(5),
      onError: ({ error }) => {
        console.error('[AI Chat Error Context]', error);
      },
      tools: {
        searchProducts: {
          description: 'Search physical products: electronics, footwear, bags, gaming, accessories.',
          inputSchema: z.object({
            query: z.string().describe('Search term'),
            maxPrice: z.number().optional().describe('Max price in USDC')
          }),
          execute: async ({ query, maxPrice }: { query: string, maxPrice?: number }) => {
            const lowerQuery = query.toLowerCase()
            return products.filter((p) => {
              const matchesText =
                p.name.toLowerCase().includes(lowerQuery) ||
                p.brand.toLowerCase().includes(lowerQuery) ||
                p.description.toLowerCase().includes(lowerQuery)
              const matchesPrice = maxPrice ? p.priceUsdc <= maxPrice : true
              return matchesText && matchesPrice
            }).slice(0, 6)
          }
        },

        browseListings: {
          description: 'Browse paywalled digital listings on Kite Marketplace (APIs, datasets, articles, code, files, shopify) created by agents and humans to earn USDC.',
          inputSchema: z.object({
            type: z.string().optional().describe('Filter: api | file | article | dataset | code | shopify'),
            maxPrice: z.number().optional().describe('Max price in USDC')
          }),
          execute: async ({ type, maxPrice }: { type?: string, maxPrice?: number }) => {
            try {
              const resListings = await fetch(`http://localhost:3001/api/listings?type=${type || ''}&maxPrice=${maxPrice || ''}`);
              const { listings } = await resListings.json();
              const resStats = await fetch('http://localhost:3001/api/stats');
              const stats = await resStats.json();
              return { listings, stats, count: listings.length }
            } catch (e: any) {
              console.error('[Tool browseListings Error]', e.message);
              return { listings: [], stats: null, count: 0, error: 'Backend service unavailable' };
            }
          }
        },

        previewListing: {
          description: 'Preview a listing — name, description, price, public teaser — WITHOUT paying.',
          inputSchema: z.object({
            listingId: z.string().describe('Listing ID e.g. lst_demo_1')
          }),
          execute: async ({ listingId }: { listingId: string }) => {
            try {
              const res = await fetch(`http://localhost:3001/api/listings/${listingId}/content`);
              if (!res.ok) return { success: false, error: 'Listing not found' }
              const data = await res.json();
              return { success: true, listing: data.listing }
            } catch (e: any) {
              return { success: false, error: 'Backend service unavailable' };
            }
          }
        },

        createListing: {
          description: 'CREATE a paywalled listing — content is hidden behind x402 until a buyer pays USDC on Kite. This is how agents EARN money.',
          inputSchema: z.object({
            type: z.enum(['api', 'file', 'article', 'dataset', 'code', 'shopify']),
            name: z.string(),
            description: z.string().describe('What does the buyer receive?'),
            priceUsdc: z.number().describe('Price in USDC'),
            content: z.string().describe('SECRET content revealed after payment'),
            preview: z.string().describe('Public teaser (no secrets)'),
            creatorAddress: z.string().describe('EVM address to receive USDC')
          }),
          execute: async (args: {
            type: 'api' | 'file' | 'article' | 'dataset' | 'code' | 'shopify',
            name: string,
            description: string,
            priceUsdc: number,
            content: string,
            preview: string,
            creatorAddress: string
          }) => {
            try {
              const res = await fetch('http://localhost:3001/api/listings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(args)
              });
              return res.json();
            } catch (e: any) {
              return { success: false, error: 'Backend service unavailable' };
            }
          }
        },

        autonomousPurchase: {
          description: 'Autonomously purchase a product or listing using agent CDP wallet + x402 on Kite Testnet.',
          inputSchema: z.object({
            productId: z.string().describe('Product or listing ID'),
            amount: z.number().describe('Price in USDC')
          }),
          execute: async ({ productId, amount }: { productId: string, amount: number }) => {
            try {
              return await executeAgentPurchase(productId, amount)
            } catch (error: any) {
              const baseUrl = process.env.KITE_MARKETPLACE_URL || 'http://localhost:3000'
              return {
                status: 'wallet_not_configured',
                message: 'Set CDP_API_KEY_NAME + CDP_API_KEY_PRIVATE_KEY to enable autonomous payments.',
                x402Url: `${baseUrl}/api/listings/${productId}/content`,
                priceUsdc: amount,
                network: 'Kite Testnet (chainId 2368)',
                protocol: 'x402 — HTTP 402 + on-chain USDC'
              }
            }
          }
        },

        getAgentWalletAddress: {
          description: 'Get the autonomous agent CDP wallet address.',
          inputSchema: z.object({}),
          execute: async () => {
            const address = await getAgentAddress()
            return {
              agentAddress: address || 'Not configured (set CDP_API_KEY_NAME + CDP_API_KEY_PRIVATE_KEY)',
              network: 'Kite Testnet',
              chainId: 2368,
              paymentToken: 'USDC'
            }
          }
        },

        getMarketplaceStats: {
          description: 'Get live Kite Marketplace stats: listings, sales volume, top sellers.',
          inputSchema: z.object({}),
          execute: async () => {
            try {
              const res = await fetch('http://localhost:3001/api/stats');
              return res.json();
            } catch (e: any) {
              return { error: 'Backend service unavailable' };
            }
          }
        },

        getAgentPassport: {
          description: 'Get the on-chain Agent Passport for a specific agent ID. Shows tier, volume, and reputation.',
          inputSchema: z.object({
            agentId: z.string().describe('The on-chain Agent ID')
          }),
          execute: async ({ agentId }) => {
            try {
              const res = await fetch('/api/mcp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_passport', arguments: { agentId } } })
              });
              return res.json();
            } catch (e: any) {
              return { error: 'MCP service unavailable' };
            }
          }
        },

        addToCart: {
          description: 'Add a physical product to the shopping cart.',
          inputSchema: z.object({
            productId: z.string(),
            quantity: z.number()
          }),
          execute: async ({ productId, quantity }: { productId: string, quantity: number }) => {
            const product = products.find(p => p.id === productId)
            if (!product) return { success: false, message: 'Product not found' }
            return { success: true, productId, productName: product.name, quantity, product }
          }
        }
      }
    })

    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error('[Chat API Global Error]', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
