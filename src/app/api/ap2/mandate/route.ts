import { NextRequest, NextResponse } from "next/server";
import { getAgentAddress } from "@/lib/agent-wallet";
import { executeAgentPurchase } from "@/lib/agent-x402";

export const runtime = "nodejs";

/**
 * POST /api/ap2/mandate
 * 
 * Google AP2 (Agent Payments Protocol) mandate handler.
 * Allows a user or another agent to issue a "purchase mandate" to this agent.
 * The agent then autonomously executes the purchase if it fits within constraints.
 */
export async function POST(req: NextRequest) {
  try {
    const mandate = await req.json();
    
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

    console.log(`[AP2] Received mandate: ${intent} for target ${target}`);

    // Verify constraints (e.g., max budget)
    const maxBudget = constraints.maxAmountUsdc || 10.0;
    const targetPrice = target.priceUsdc;

    if (targetPrice > maxBudget) {
      return NextResponse.json({
        status: "rejected",
        reason: "Target price exceeds mandate budget constraints.",
        outcome: "failure"
      }, { status: 403 });
    }

    // Check expiry
    if (expiry && new Date(expiry) < new Date()) {
      return NextResponse.json({
        status: "expired",
        reason: "Mandate has expired.",
        outcome: "failure"
      }, { status: 403 });
    }

    // Execute the autonomous purchase
    const result = await executeAgentPurchase(target.id, targetPrice);

    return NextResponse.json({
      status: "fulfilled",
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
