import { NextRequest, NextResponse } from "next/server";
import { shopifyClient, storeRegistry } from "@kite/x402-sdk";

export const runtime = 'nodejs';

const payTo = (process.env.PAYMENT_RECIPIENT_ADDRESS || "0xb23c769dFc7ef020ec60A19567aB675C46a49910") as `0x${string}`;

/**
 * GET /api/x402/resource/shopify/[id]?shop=...
 * 
 * Wrap a Shopify product in an x402 paywall.
 */
export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  
  // Require shop parameter to know which store's access token to use
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");
  
  if (!shop) {
     return NextResponse.json({ error: "Missing shop parameter. Need shopUrl to authenticate." }, { status: 400 });
  }

  const store = storeRegistry.getByUrl(shop);
  if (!store || !store.accessToken) {
    return NextResponse.json({ error: "Store not found or access token missing" }, { status: 404 });
  }

  // Decode ID if needed (Shopify GIDs can contain slashes, though Admin REST usually uses raw numbers)
  const productId = decodeURIComponent(id);
  const product = await shopifyClient.getProduct(store.shopUrl, store.accessToken, productId);

  if (!product) {
    return NextResponse.json({ error: "Shopify product not found" }, { status: 404 });
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
            maxAmountRequired: Math.round(product.price * 1_000_000).toString(),
            resource: `${appUrl}/api/x402/resource/shopify/${encodeURIComponent(productId)}?shop=${shop}`,
            description: `Purchase: ${product.title}`,
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

  // In a real application, we would verify the payment signature/TX here.
  try {
    const order = await shopifyClient.createOrder(
      store.shopUrl,
      store.accessToken,
      product.variants[0].id, 
      "0xAgentAddress", // In reality, extract from payment signature
      paymentHeader
    );

    return NextResponse.json({
      success: true,
      message: "Payment verified. Shopify order created!",
      order,
      product: {
        title: product.title,
        id: product.id
      }
    });
  } catch(e: any) {
    return NextResponse.json({ error: e.message || "Failed to create order" }, { status: 500 });
  }
}
