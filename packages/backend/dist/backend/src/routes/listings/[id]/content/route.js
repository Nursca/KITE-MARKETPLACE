"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const listing_store_1 = require("@/lib/listing-store");
exports.runtime = "nodejs";
const payTo = (process.env.PAYMENT_RECIPIENT_ADDRESS ||
    "0xb23c769dFc7ef020ec60A19567aB675C46a49910");
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
async function GET(req, context) {
    const { id } = await context.params;
    const listing = listing_store_1.listingStore.get(id);
    if (!listing) {
        return server_1.NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    // Check for x402 payment header
    const paymentHeader = req.headers.get("X-PAYMENT") ||
        req.headers.get("x-payment") ||
        req.headers.get("payment-signature");
    // If no payment, return 402 with requirements
    if (!paymentHeader) {
        const appUrl = process.env.KITE_MARKETPLACE_URL ||
            process.env.NEXT_PUBLIC_APP_URL ||
            "https://kite-marketplace.vercel.app";
        return server_1.NextResponse.json({
            error: "Payment Required",
            x402Version: 1,
            accepts: [
                {
                    scheme: "exact",
                    network: "eip155:2368",
                    maxAmountRequired: Math.round(listing.priceUsdc * 1000000).toString(), // USDC 6 decimals
                    resource: `${appUrl}/api/listings/${id}/content`,
                    description: `Purchase: ${listing.name}`,
                    mimeType: "application/json",
                    payTo,
                    maxTimeoutSeconds: 300,
                    asset: "0x534b2f3A21130d7a60830c2Df862319e593943A3", // Kite Testnet USDC
                    extra: {
                        listingId: listing.id,
                        listingName: listing.name,
                        listingType: listing.type,
                        preview: listing.preview,
                    },
                },
            ],
        }, {
            status: 402,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
    // Payment header present — parse and record sale
    let txHash = "0xpending";
    try {
        const decoded = JSON.parse(Buffer.from(paymentHeader, "base64").toString());
        txHash =
            decoded.payload?.transactionHash ||
                decoded.payload?.hash ||
                decoded.transactionHash ||
                txHash;
    }
    catch {
        // non-fatal parse failure
    }
    const buyerAddress = req.headers.get("x-buyer-address") ||
        req.headers.get("X-Buyer-Address") ||
        "0xunknown";
    listing_store_1.listingStore.recordSale(listing.id, buyerAddress, txHash);
    return server_1.NextResponse.json({
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
        },
    });
}
