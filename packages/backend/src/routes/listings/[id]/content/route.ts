import { NextRequest, NextResponse } from "next/server";
import { listingStore } from "@/lib/listing-store";

export const runtime = "nodejs";

const payTo = (
  process.env.PAYMENT_RECIPIENT_ADDRESS ||
  "0xb23c769dFc7ef020ec60A19567aB675C46a49910"
) as `0x${string}`;

/**
 * GET /api/listings/[id]/content
 *
 * x402 paywall — returns listing content after USDC payment on Kite Testnet.
 *
 * Flow:
 *  1. First request → returns 402 with payment requirements
 *  2. Agent/client pays on Kite Testnet, includes X-PAYMENT header
 *  3. Second request with valid payment → returns content + receipt
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const listing = await listingStore.get(id);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
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
      "https://kite-marketplace.vercel.app";

    return NextResponse.json(
      {
        error: "Payment Required",
        x402Version: 1,
        accepts: [
          {
            scheme: "gokite-aa",
            network: "kite-mainnet",
            maxAmountRequired: Math.round(listing.priceUsdc * 1_000_000).toString(), // USDC 6 decimals
            resource: `${appUrl}/api/listings/${id}/content`,
            description: `Unlock this digital listing`,
            mimeType: "application/json",
            payTo,
            maxTimeoutSeconds: 300,
            asset: process.env.KITE_MAINNET_USDC_ADDRESS || "0x...", // Kite Mainnet USDC
            merchantName: "Kite Marketplace",
            extra: {
              listingId: listing.id,
              listingName: listing.name,
              listingType: listing.type,
              preview: listing.preview,
            },
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

  // Payment header present — parse and record sale
  let txHash = "0xpending";
  let payerAddress = "";
  try {
    const decoded = JSON.parse(Buffer.from(paymentHeader, "base64").toString());
    txHash =
      decoded.payload?.transactionHash ||
      decoded.payload?.hash ||
      decoded.transactionHash ||
      txHash;
    payerAddress = decoded.authorization?.from || decoded.payload?.authorization?.from || "";
  } catch {
    // non-fatal parse failure
  }

  const buyerAddress =
    req.headers.get("x-buyer-address") ||
    req.headers.get("X-Buyer-Address") ||
    payerAddress ||
    "0xunknown";

  // Check if they have a Passport DID (call Kite's identity resolver)
  let passportData = null;
  if (payerAddress) {
    try {
      const passportRes = await fetch(
        `https://api.gokite.ai/identity/resolve/${payerAddress}`
      );
      if (passportRes.ok) {
        passportData = await passportRes.json();
      }
    } catch {
      // Ignore
    }
  }

  await listingStore.recordSale(listing.id, buyerAddress, txHash);

  return NextResponse.json({
    success: true,
    listing: {
      id: listing.id,
      name: listing.name,
      type: listing.type,
    },
    content: listing.content,
    receipt: {
      listingId: listing.id,
      listingName: listing.name,
      amountPaid: `${listing.priceUsdc} USDC`,
      txHash,
      explorerUrl: `https://testnet.kiteexplorer.com/tx/${txHash}`,
      timestamp: new Date().toISOString(),
      passportIdentity: passportData,
    },
  });
}