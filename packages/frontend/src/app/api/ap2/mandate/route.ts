import { NextRequest, NextResponse } from "next/server";
import { getAgentAddress, executeAgentPurchase } from "@kite/x402-sdk";

export const runtime = "nodejs";

/**
 * POST /api/ap2/mandate
 * 
 * Google AP2 (Agent Payments Protocol) mandate handler.
 * Allows a user or another agent to issue a "purchase mandate" to this agent.
 * The agent then autonomously executes the purchase if it fits within constraints.
 * 
 * Query parameter: ?dryRun=true
 *   - Simulates mandate execution without real USDC expenditure
 *   - Returns structured plan showing budget compliance and outcome
 *   - Useful for judges to demo without CDP wallet setup
 */
export async function POST(req: NextRequest) {
  try {
    const mandate = await req.json();
    const url = new URL(req.url);
    const isDryRun = url.searchParams.get('dryRun') === 'true';
    
    // AP2 Mandate structure (simplified for hackathon)
    const { 
      intent, 
      constraints, 
      target, 
      expiry 
    } = mandate;

    if (!intent || !target || !constraints) {
      return NextResponse.json(
        { error: "Invalid AP2 mandate structure" },
        { status: 400 }
      );
    }

    console.log(`[AP2] Received mandate: ${intent} for target ${target}${isDryRun ? ' (DRY RUN)' : ''}`);

    // Verify constraints (e.g., max budget)
    const maxBudget = constraints.maxAmountUsdc || 10.0;
    const targetPrice = target.priceUsdc;

    if (targetPrice > maxBudget) {
      return NextResponse.json({
        status: "rejected",
        reason: "Target price exceeds mandate budget constraints.",
        outcome: "failure",
        dryRun: isDryRun,
        plan: {
          intent,
          target: target.id,
          constraints,
          budgetCheckResult: `Price $${targetPrice} exceeds budget $${maxBudget}`,
          simulatedOutcome: "REJECTED"
        }
      }, { status: 403 });
    }

    // Check expiry
    if (expiry && new Date(expiry) < new Date()) {
      return NextResponse.json({
        status: "expired",
        reason: "Mandate has expired.",
        outcome: "failure",
        dryRun: isDryRun,
        plan: {
          intent,
          target: target.id,
          constraints,
          expiryCheck: `Expired at ${expiry}`,
          simulatedOutcome: "EXPIRED"
        }
      }, { status: 403 });
    }

    // If dryRun mode, return simulated result without actual execution
    if (isDryRun) {
      const mandateId = `man_${Math.random().toString(36).substring(2, 9)}`;
      return NextResponse.json({
        status: "dry-run",
        dryRun: true,
        mandateId,
        message: "Simulation only — no funds deducted, no transactions executed.",
        plan: {
          intent,
          target: target.id,
          constraints: {
            maxBudgetUsdc: maxBudget,
            allowedCategories: constraints.allowedCategories || "all"
          },
          budgetCheckResult: `Price $${targetPrice} within budget $${maxBudget}`,
          simulatedOutcome: "SUCCESS",
          wouldExecute: {
            action: "autonomousPurchase",
            listing: target.id,
            amount: `$${targetPrice} USDC`,
            network: "kiteTestnet",
            status: "WOULD_EXECUTE"
          },
          message: "In production, this mandate would now execute the purchase on-chain. For demo, this shows budget compliance.",
          timestamp: new Date().toISOString()
        }
      });
    }

    // Execute the autonomous purchase (real mode)
    const result = await executeAgentPurchase(target.id, targetPrice);

    return NextResponse.json({
      status: "fulfilled",
      dryRun: false,
      mandateId: `man_${Math.random().toString(36).substring(2, 9)}`,
      receipt: result,
      message: `Mandate "${intent}" fulfilled autonomously on Kite Testnet.`
    });

  } catch (error: any) {
    console.error("AP2 Mandate execution error:", error);
    return NextResponse.json(
      { error: "Mandate fulfillment failed", message: error.message },
      { status: 500 }
    );
  }
}
