import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';

const payTo = (process.env.PAYMENT_RECIPIENT_ADDRESS || "0xb23c769dFc7ef020ec60A19567aB675C46a49910") as `0x${string}`;

// Mock resources database
const resources: Record<string, any> = {
  "res_1": {
    id: "res_1",
    name: "Premium Alpha Intelligence API",
    priceUsdc: 0.50,
    content: "SECRET_API_KEY_KITE_2026_XLK99",
    description: "Full access to our alpha-tier intelligence stream."
  },
  "res_2": {
    id: "res_2",
    name: "Kite Market Trends Dataset",
    priceUsdc: 1.00,
    content: "https://example.com/downloads/kite-trends-2026.zip",
    description: "Comprehensive CSV data of all Kite marketplace transactions."
  }
};

/**
 * GET /api/x402/resource/[id]
 * 
 * Manual x402 handler to avoid type issues with withX402 and dynamic route params.
 */
export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const resource = resources[id];

  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  // Check for x402 payment header
  const paymentHeader =
    req.headers.get("X-PAYMENT") ||
    req.headers.get("x-payment") ||
    req.headers.get("payment-signature");

  // If no payment, return 402 with requirements
  if (!paymentHeader) {
    const appUrl =
      process.env.KITE_MARKETPLACE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    return NextResponse.json(
      {
        error: "Payment Required",
        x402Version: 1,
        accepts: [
          {
            scheme: "exact",
            network: "eip155:2368",
            maxAmountRequired: Math.round(resource.priceUsdc * 1_000_000).toString(),
            resource: `${appUrl}/api/x402/resource/${id}`,
            description: `Access: ${resource.name}`,
            mimeType: "application/json",
            payTo,
            asset: "0x534b2f3A21130d7a60830c2Df862319e593943A3", // Kite USDC
          },
        ],
      },
      {
        status: 402,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  // If execution reaches here, we assume payment is verified (in a real app, verify the signature/TX)
  return NextResponse.json({
    success: true,
    message: "Access granted!",
    data: resource.content,
    resource: {
      name: resource.name,
      id: resource.id
    }
  });
}
