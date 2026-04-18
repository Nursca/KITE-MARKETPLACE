import { openai } from '@ai-sdk/openai'
import { streamText, ModelMessage } from 'ai'
import productsData from '@/../data/products.json'
import { getAgentAddress } from '@/lib/agent-wallet'
import { executeAgentPurchase } from '@/lib/agent-x402'

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

const SYSTEM_PROMPT = `You are MONA, an autonomous AI shopping agent built on Monad and Kite AI.
You help users discover products, make decisions, and settle purchases autonomously using your own CDP-managed wallet.

Your Workflow:
1. DISCOVER: Search for products.
2. DECIDE: Help the user choose.
3. PAY & SETTLE: Purchase the product autonomously.
4. OUTCOME: Provide the JSON receipt.

Rules:
- Be transparent about costs.
- Show transaction hashes and explorer links.
- Keep responses concise.`

export async function POST(req: Request) {
  const { messages }: { messages: ModelMessage[] } = await req.json()

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: SYSTEM_PROMPT,
    messages,
    maxSteps: 5,
    onError: ({ error }) => {
      console.error('AI Stream Error:', error)
    },
    tools: {
      searchProducts: {
        description: 'Search the product catalog and return matching items.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            maxPrice: { type: 'number', description: 'Max price in USDC' }
          },
          required: ['query']
        },
        execute: async ({ query, maxPrice }: { query: string, maxPrice?: number }) => {
          const lowerQuery = query.toLowerCase()
          return products.filter((p) => {
            const matchesText = p.name.toLowerCase().includes(lowerQuery) || 
                               p.brand.toLowerCase().includes(lowerQuery) || 
                               p.description.toLowerCase().includes(lowerQuery)
            const matchesPrice = maxPrice ? p.priceUsdc <= maxPrice : true
            return matchesText && matchesPrice
          }).slice(0, 6)
        }
      },
      addToCart: {
        description: 'Add a product to the user\'s manual shopping cart.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'The product ID' },
            quantity: { type: 'number', description: 'Quantity' }
          },
          required: ['productId', 'quantity']
        },
        execute: async ({ productId, quantity }: { productId: string, quantity: number }) => {
          const product = products.find(p => p.id === productId)
          if (!product) return { success: false, message: 'Product not found' }
          return {
            success: true,
            productId,
            productName: product.name,
            quantity,
            product,
            message: `${quantity} x ${product.name} added to cart`
          }
        }
      },
      getAgentWalletAddress: {
        description: 'Get your autonomous CDP Agent wallet address.',
        parameters: {
          type: 'object',
          properties: {
            unused: { type: 'string' }
          }
        },
        execute: async () => {
          const address = await getAgentAddress();
          return { 
            address: address || "Not configured",
            network: "Kite Testnet"
          };
        }
      },
      autonomousPurchase: {
        description: 'Autonomously purchase a product.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'The product ID' },
            amount: { type: 'number', description: 'Price in USDC' }
          },
          required: ['productId', 'amount']
        },
        execute: async ({ productId, amount }) => {
          try {
            return await executeAgentPurchase(productId, amount);
          } catch (error: any) {
            return {
              type: 'AP2_RECEIPT',
              status: 'failed',
              error: error.message || "Purchase failed"
            };
          }
        }
      }
    }
  })

  return result.toUIMessageStreamResponse()
}
