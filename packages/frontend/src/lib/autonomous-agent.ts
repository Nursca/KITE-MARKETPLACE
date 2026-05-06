'use server'

import { openai } from '@ai-sdk/openai'
import { groq } from '@ai-sdk/groq'
import { generateText, tool } from 'ai'
import { z } from 'zod'

/**
 * Autonomous agent that purchases listings on the Kite Marketplace
 * Runs every 5 minutes via Vercel cron job
 * No human intervention required
 */

interface PurchaseResult {
  success: boolean
  listingId?: string
  listingName?: string
  txHash?: string
  amount?: number
  error?: string
  timestamp: string
}

/**
 * Execute autonomous purchase of a listing via x402
 * This simulates what a real agent would do with Kite's x402 payment infrastructure
 */
async function executePurchaseViaX402(listingId: string, creatorAddress: string): Promise<{ txHash: string; success: boolean }> {
  try {
    // In production, this would:
    // 1. Call x402 facilitator for payment authorization
    // 2. Execute payment from agent's CDP wallet
    // 3. Record transaction on Kite Testnet
    // 4. Return real transaction hash
    
    // For demo, we'll create a mock transaction hash and log it
    const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
    
    console.log(`[Autonomous Agent] Purchased listing ${listingId} from ${creatorAddress}`)
    console.log(`[Autonomous Agent] Mock Transaction: ${mockTxHash}`)
    console.log(`[Autonomous Agent] Explorer URL: https://testnet.kiteexplorer.com/tx/${mockTxHash}`)
    
    return { txHash: mockTxHash, success: true }
  } catch (error) {
    console.error('[Autonomous Agent] Purchase execution failed:', error)
    return { txHash: '', success: false }
  }
}

/**
 * Main autonomous agent loop
 * Called every 5 minutes by Vercel cron
 */
export async function runAutonomousAgentLoop(): Promise<PurchaseResult> {
  console.log('[Autonomous Agent] Starting 5-minute loop...')

  try {
    // Fetch all available listings under $1
    const backendUrl = process.env.KITE_BACKEND_URL || 
                       process.env.NEXT_PUBLIC_KITE_MARKETPLACE_API || 
                       'http://localhost:3001'
    
    const listingsRes = await fetch(`${backendUrl}/api/listings?maxPrice=1`, {
      headers: { 'Content-Type': 'application/json' }
    })

    if (!listingsRes.ok) {
      return {
        success: false,
        error: 'Failed to fetch listings',
        timestamp: new Date().toISOString()
      }
    }

    const { listings } = await listingsRes.json()

    if (!listings || listings.length === 0) {
      console.log('[Autonomous Agent] No listings under $1 available')
      return {
        success: false,
        error: 'No sub-$1 listings available',
        timestamp: new Date().toISOString()
      }
    }

    // Use AI to select which listing to purchase
    const model = process.env.GROQ_API_KEY 
      ? groq('llama-3.3-70b-versatile')
      : openai('gpt-4o')

    const { text } = await generateText({
      model,
      prompt: `You are an autonomous agent shopping on the Kite Marketplace. 
      
Available listings under $1:
${listings.map((l: any) => `- ${l.name} ($${l.priceUsdc}) by ${l.creatorAddress.slice(0, 8)}... - "${l.description}"`).join('\n')}

Select ONE listing that seems most valuable to purchase. Respond with ONLY the listing index (0-based) you want to purchase.`,
    })

    const selectedIndex = Math.min(parseInt(text.trim()) || 0, listings.length - 1)
    const selectedListing = listings[selectedIndex]

    console.log(`[Autonomous Agent] Selected: ${selectedListing.name}`)

    // Execute purchase via x402
    const { txHash, success } = await executePurchaseViaX402(selectedListing.id, selectedListing.creatorAddress)

    if (!success) {
      return {
        success: false,
        error: 'Purchase execution failed',
        timestamp: new Date().toISOString()
      }
    }

    return {
      success: true,
      listingId: selectedListing.id,
      listingName: selectedListing.name,
      txHash,
      amount: selectedListing.priceUsdc,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('[Autonomous Agent] Loop error:', error)
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`,
      timestamp: new Date().toISOString()
    }
  }
}
