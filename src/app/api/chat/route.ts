import { openai } from '@ai-sdk/openai'
import { streamText, ModelMessage, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import productsData from '@/../data/products.json'
import { getAgentAddress } from '@/lib/agent-wallet'
import { executeAgentPurchase } from '@/lib/agent-x402'
import { listingStore } from '@/lib/listing-store'

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
  const { messages }: { messages: ModelMessage[] } = await req.json()

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: SYSTEM_PROMPT,
    messages,
    stopWhen: stepCountIs(5),
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
        description: 'Browse paywalled digital listings on Kite Marketplace (APIs, datasets, articles, code, files) created by agents and humans to earn USDC.',
        inputSchema: z.object({
          type: z.string().optional().describe('Filter: api | file | article | dataset | code'),
          maxPrice: z.number().optional().describe('Max price in USDC')
        }),
        execute: async ({ type, maxPrice }: { type?: string, maxPrice?: number }) => {
          const listings = listingStore.list({ type, maxPrice })
          const stats = listingStore.getStats()
          return { listings, stats, count: listings.length }
        }
      },

      previewListing: {
        description: 'Preview a listing — name, description, price, public teaser — WITHOUT paying.',
        inputSchema: z.object({
          listingId: z.string().describe('Listing ID e.g. lst_demo_1')
        }),
        execute: async ({ listingId }: { listingId: string }) => {
          const listing = listingStore.get(listingId)
          if (!listing) return { success: false, error: 'Listing not found' }
          const { content: _hidden, ...meta } = listing
          return { success: true, listing: meta }
        }
      },

      createListing: {
        description: 'CREATE a paywalled listing — content is hidden behind x402 until a buyer pays USDC on Kite. This is how agents EARN money.',
        inputSchema: z.object({
          type: z.enum(['api', 'file', 'article', 'dataset', 'code']),
          name: z.string(),
          description: z.string().describe('What does the buyer receive?'),
          priceUsdc: z.number().describe('Price in USDC'),
          content: z.string().describe('SECRET content revealed after payment'),
          preview: z.string().describe('Public teaser (no secrets)'),
          creatorAddress: z.string().describe('EVM address to receive USDC')
        }),
        execute: async (args: {
          type: 'api' | 'file' | 'article' | 'dataset' | 'code',
          name: string,
          description: string,
          priceUsdc: number,
          content: string,
          preview: string,
          creatorAddress: string
        }) => {
          const baseUrl = process.env.KITE_MARKETPLACE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const listing = listingStore.create({ ...args })
          return {
            success: true,
            listingId: listing.id,
            x402Url: `${baseUrl}/api/listings/${listing.id}/content`,
            message: `Listing "${args.name}" live at ${args.priceUsdc} USDC. Buyers pay on Kite Testnet and get content instantly.`,
            listing: { id: listing.id, name: listing.name, type: listing.type, priceUsdc: listing.priceUsdc, preview: listing.preview }
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
        execute: async () => listingStore.getStats()
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
}