import { NextRequest, NextResponse } from "next/server";
import { withX402, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

export const runtime = 'nodejs';

const facilitatorUrl = process.env.X402_FACILITATOR_URL || "https://x402-facilitator.molandak.org";
const payTo = (process.env.PAYMENT_RECIPIENT_ADDRESS || "0xb23c769dFc7ef020ec60A19567aB675C46a49910") as `0x${string}`;

const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
const server = new x402ResourceServer(facilitator)
  .register("eip155:2368", new ExactEvmScheme());

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

async function handler(
  req: NextRequest, 
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const id = params.id;
  const resource = resources[id];

  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  // If execution reaches here, it means withX402 has verified the payment!
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

export const GET = withX402(
  handler,
  {
    accepts: {
      scheme: "exact",
      price: (context) => {
        // Find the resource price
        // context.adapter.params is not easily available here in standard withX402
        // We'll hardcode or lookup based on the path if needed
        return "$0.50"; // Default for demo
      },
      network: "eip155:2368",
      payTo
    },
    description: "Kite x402 Resource Gateway"
  },
  server
);
