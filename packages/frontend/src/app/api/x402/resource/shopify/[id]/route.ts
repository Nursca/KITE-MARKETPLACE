import { NextRequest, NextResponse } from "next/server";
import { shopifyClient, storeRegistry } from "@kite/x402-sdk";
import { extractAndVerifyPayment } from "@/lib/payment-verification";

export const runtime = 'nodejs';

const payTo = (process.env.PAYMENT_RECIPIENT_ADDRESS || "0xb23c769dFc7ef020ec60A19567aB675C46a49910") as `0x${string}`;

/**
 * GET /api/x402/resource/shopify/[id]?shop=...
 * 
 * Wrap a Shopify product in an x402 paywall.
 * CRITICAL: This endpoint now verifies all payments on-chain before granting access.
 * This prevents the payment bypass vulnerability where ANY X-PAYMENT header was accepted.
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

    console.log(`[x402 Shopify] No payment header for product ${productId}, returning 402 with requirements`);
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

  // CRITICAL SECURITY CHECK: Verify payment before granting access
  console.log(`[x402 Shopify] Processing payment for product ${productId}`);
  const paymentInfo = await extractAndVerifyPayment(req.headers);

  if (!paymentInfo.isValid) {
    console.warn(`[x402 Shopify] Rejected request for product ${productId}: ${paymentInfo.error}`);
    return NextResponse.json(
      {
        error: "Payment Verification Failed",
        detail: paymentInfo.error || "Transaction could not be verified on Kite Testnet"
      },
      { status: 403 }
    );
  }

  console.log(`[x402 Shopify] ✓ Payment verified for product ${productId} (tx: ${paymentInfo.txHash}, payer: ${paymentInfo.payerAddress})`);

  try {
    const order = await shopifyClient.createOrder(
      store.shopUrl,
      store.accessToken,
      product.variants[0].id, 
      paymentInfo.payerAddress || "0xUnknown",
      paymentHeader
    );

    console.log(`[x402 Shopify] ✓ Shopify order created for product ${productId}`);
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
    console.error(`[x402 Shopify] Failed to create order for product ${productId}:`, e);
    return NextResponse.json({ error: e.message || "Failed to create order" }, { status: 500 });
  }
}
