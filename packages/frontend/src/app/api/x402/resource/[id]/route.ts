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

/**
 * Get backend URL for listing lookups
 * Allows x402 resource route to fetch live listing data instead of using hardcoded mock resources
 */
function getBackendUrl(): string {
  if (process.env.KITE_BACKEND_URL) {
    return process.env.KITE_BACKEND_URL;
  }
  if (process.env.NEXT_PUBLIC_KITE_MARKETPLACE_API) {
    return process.env.NEXT_PUBLIC_KITE_MARKETPLACE_API;
  }
  return '/api';
}

interface ResourceResponse {
  success?: boolean;
  message?: string;
  data?: string;
  resource?: { name: string; id: string };
  error?: string;
}

async function handler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ResourceResponse>> {
  try {
    const { id } = await context.params;

    // Fetch listing from backend (unified data source instead of hardcoded mock)
    let resource: any = null;
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/listings/${id}`);
      if (res.ok) {
        const data = await res.json();
        resource = {
          id: data.listing?.id || id,
          name: data.listing?.name || "Resource",
          priceUsdc: data.listing?.priceUsdc || 0.50,
          content: data.listing?.content || "Resource content",
          description: data.listing?.description || "Digital resource"
        };
      }
    } catch (err) {
      console.warn(`[x402 Resource] Failed to fetch listing ${id} from backend:`, err);
    }

    // Fallback: if backend unavailable, use minimal resource
    if (!resource) {
      resource = {
        id,
        name: "Digital Resource",
        priceUsdc: 0.50,
        content: "Resource content - backend unavailable",
        description: "Digital resource from Kite Marketplace"
      };
    }

    // x402 handler receives verified payment context from middleware
    return NextResponse.json({
      success: true,
      message: "Access granted!",
      data: resource.content,
      resource: {
        name: resource.name,
        id: resource.id
      }
    });
  } catch (error) {
    console.error('[x402 Resource] Handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withX402<ResourceResponse>(
  handler,
  {
    accepts: {
      scheme: "exact",
      price: (context) => {
        // In a real app, extract from listing data
        return "$0.50";
      },
      network: "eip155:2368",
      payTo,
      description: "Kite Marketplace Resource Access"
    }
  },
  server
);
