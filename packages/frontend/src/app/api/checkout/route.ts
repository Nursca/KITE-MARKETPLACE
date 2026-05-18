import { NextRequest, NextResponse } from "next/server";
import { withX402, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { extractAndVerifyPayment } from "@/lib/payment-verification";

export const runtime = 'nodejs';

const facilitatorUrl = process.env.X402_FACILITATOR_URL || "https://x402-facilitator.molandak.org";
const payTo = (process.env.PAYMENT_RECIPIENT_ADDRESS || "0xb23c769dFc7ef020ec60A19567aB675C46a49910") as `0x${string}`;

const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
const server = new x402ResourceServer(facilitator)
  .register("eip155:2368", new ExactEvmScheme());

interface CheckoutResponse {
  success?: boolean;
  txHash?: string;
  explorerUrl?: string;
  timestamp?: string;
  totalPaid?: string;
  items?: any[];
  error?: string;
}

/**
 * Handler for checkout
 * CRITICAL: This handler now verifies all payments on-chain before returning receipt.
 * This prevents the payment bypass vulnerability where ANY X-PAYMENT header was accepted.
 */
async function handler(req: NextRequest): Promise<NextResponse<CheckoutResponse>> {
  try {
    const body = await req.json();
    const { items } = body;
    
    // CRITICAL SECURITY CHECK: Verify payment before processing checkout
    console.log(`[Checkout] Processing checkout request`);
    const paymentInfo = await extractAndVerifyPayment(req.headers);

    if (!paymentInfo.isValid) {
      console.warn(`[Checkout] Rejected checkout: ${paymentInfo.error}`);
      return NextResponse.json(
        { error: paymentInfo.error || "Payment verification failed" },
        { status: 402 }
      );
    }

    console.log(`[Checkout] ✓ Payment verified (tx: ${paymentInfo.txHash})`);

    const total = req.nextUrl.searchParams.get('total') || '0';
    
    return NextResponse.json({
      success: true,
      txHash: paymentInfo.txHash,
      explorerUrl: `https://testnet.kiteexplorer.com/tx/${paymentInfo.txHash}`,
      timestamp: new Date().toISOString(),
      totalPaid: total,
      items
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withX402<CheckoutResponse>(
  handler,
  {
    accepts: {
      scheme: "exact",
      price: (context) => {
        const total = context.adapter.getQueryParam?.('total');
        const priceValue = Array.isArray(total) ? total[0] : total;
        return `$${priceValue || '0'}`;
      },
      network: "eip155:2368",
      payTo
    },
    description: "Kite Marketplace Order Checkout"
  },
  server
);
