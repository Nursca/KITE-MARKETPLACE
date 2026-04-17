import { google } from '@ai-sdk/google'
import { streamText, tool, ModelMessage, stepCountIs } from 'ai'
import { z } from 'zod'
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
1. DISCOVER: Use searchProducts to find what the user wants.
2. DECIDE: Help the user choose by comparing specs and price.
3. PAY & SETTLE: Use autonomousPurchase to buy the product. You will automatically handle x402 payments using your agent wallet.
4. OUTCOME: Provide the user with the AP2-compliant JSON receipt returned by the purchase tool.

Tools:
- searchProducts: search the product catalog.
- addToCart: add to user's manual cart (for non-autonomous checkout).
- getAgentWalletAddress: Show your CDP Agent wallet address.
- autonomousPurchase: Purchase a product autonomously on behalf of the user. This tool handles the x402 payment flow.

Rules:
- Always check your wallet address before suggesting an autonomous purchase so the user knows where the funds come from.
- Be transparent about costs.
- When an autonomous purchase is complete, always show the transaction hash and explorer link.
- Keep responses concise.`

export async function POST(req: Request) {
  const { messages }: { messages: ModelMessage[] } = await req.json()

  const result = streamText({
    model: google('gemini-2.0-flash-001'),
    system: SYSTEM_PROMPT,
    messages,
    maxSteps: 5,
    onError: ({ error }) => {
      console.error('Gemini Stream Error:', error)
    },
    tools: {
      searchProducts: tool({
        description: 'Search the product catalog and return matching items.',
        parameters: z.object({
          query: z.string().describe('The plain-text search term'),
          maxPrice: z.number().optional().describe('Maximum price filter'),
          category: z.string().optional().describe('One of: electronics, footwear, bags, accessories, gaming')
        }),
        execute: async ({ query, maxPrice, category }: { query: string, maxPrice?: number, category?: string }) => {
          const lowerQuery = query.toLowerCase()
          const filtered = products.filter((p) => {
            const matchesText = p.name.toLowerCase().includes(lowerQuery) || 
                               p.brand.toLowerCase().includes(lowerQuery) || 
                               p.description.toLowerCase().includes(lowerQuery)
            const matchesPrice = maxPrice ? p.price <= maxPrice : true
            const matchesCategory = category ? p.category === category : true
            return matchesText && matchesPrice && matchesCategory
          })
          return filtered.slice(0, 6)
        }
      }),
      addToCart: tool({
        description: 'Add a product to the user\'s manual shopping cart.',
        parameters: z.object({
          productId: z.string().describe('The unique ID of the product'),
          quantity: z.number().default(1).describe('The quantity to add')
        }),
        execute: async ({ productId, quantity }: { productId: string, quantity: number }) => {
          const product = products.find(p => p.id === productId)
          if (!product) {
            return { success: false, message: 'Product not found' }
          }
          return {
            success: true,
            productId,
            productName: product.name,
            quantity: quantity || 1,
            product,
            message: `${quantity || 1} x ${product.name} added to cart`
          }
        }
      }),
      getAgentWalletAddress: tool({
        description: 'Get your autonomous CDP Agent wallet address.',
        parameters: z.object({}),
        execute: async () => {
          const address = await getAgentAddress();
          return { 
            address: address || "Not configured",
            network: "Kite Testnet (via CDP Base Sepolia owner)"
          };
        }
      }),
      autonomousPurchase: tool({
        description: 'Autonomously purchase a product. This tool will automatically handle x402 payments using the agent\'s funds.',
        parameters: z.object({
          productId: z.string().describe('The unique ID of the product to buy'),
          amount: z.number().describe('The cost of the product in USDC')
        }),
        execute: async ({ productId, amount }) => {
          try {
            return await executeAgentPurchase(productId, amount);
          } catch (error: any) {
            return {
              type: 'AP2_RECEIPT',
              status: 'failed',
              error: error.message || "Autonomous purchase failed"
            };
          }
        }
      })
    }
  })

  return result.toUIMessageStreamResponse()
}
