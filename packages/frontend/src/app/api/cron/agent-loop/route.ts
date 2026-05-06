import { NextRequest, NextResponse } from 'next/server'
import { runAutonomousAgentLoop } from '@/lib/autonomous-agent'

export const runtime = 'nodejs'

/**
 * GET /api/cron/agent-loop
 * 
 * Autonomous agent cron job running every 5 minutes on Vercel
 * 
 * Flow:
 * 1. Fetch all listings under $1 from marketplace
 * 2. Use AI to select a valuable listing
 * 3. Execute x402 purchase autonomously (no human input)
 * 4. Log transaction hash on Kite Testnet
 * 5. Return purchase details for logging
 * 
 * This demonstrates true agent autonomy for judges evaluating Agentic Commerce
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verify request is from Vercel (if needed, you can add auth here)
  const authHeader = req.headers.get('authorization')
  
  console.log('[Cron Handler] Agent loop triggered')
  console.log('[Cron Handler] Time:', new Date().toISOString())

  try {
    // Run the autonomous agent
    const result = await runAutonomousAgentLoop()

    if (result.success) {
      console.log('[Cron Handler] ✓ Purchase completed')
      console.log(`  Listing: ${result.listingName}`)
      console.log(`  Amount: $${result.amount?.toFixed(2)} USDC`)
      console.log(`  Tx Hash: ${result.txHash}`)
      console.log(`  Explorer: https://testnet.kiteexplorer.com/tx/${result.txHash}`)
    } else {
      console.log('[Cron Handler] ✗ Purchase failed or skipped')
      console.log(`  Reason: ${result.error}`)
    }

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Purchase completed' : 'Purchase skipped',
      data: result,
      timestamp: new Date().toISOString(),
      explorerUrl: result.txHash ? `https://testnet.kiteexplorer.com/tx/${result.txHash}` : undefined
    })
  } catch (error) {
    console.error('[Cron Handler] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Cron job failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
