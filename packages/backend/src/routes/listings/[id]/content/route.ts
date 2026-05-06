import { Request, Response } from "express";
import { listingStore } from "@/lib/listing-store";
import { createPublicClient, http } from "viem";
import { kiteTestnet } from "@kite/x402-sdk/erc8004";
import { signDownloadToken } from "@/lib/blob-token";

/**
 * Parse a listing's hidden content as a blob descriptor. Sellers who upload a
 * file via the marketplace UI store a JSON envelope here; legacy listings (URL
 * or plain text) return null so we keep the existing behaviour for them.
 */
interface BlobDescriptor {
  kind: "blob";
  pathname: string;
  filename: string;
  size: number;
  contentType: string;
}

function parseBlobDescriptor(content: string): BlobDescriptor | null {
  if (!content || typeof content !== "string") return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && parsed.kind === "blob" && typeof parsed.pathname === "string") {
      return parsed as BlobDescriptor;
    }
  } catch {
    // Not JSON — treat as plain content.
  }
  return null;
}

const payTo = (
  process.env.PAYMENT_RECIPIENT_ADDRESS ||
  "0xb23c769dFc7ef020ec60A19567aB675C46a49910"
) as `0x${string}`;

const KITE_RPC = "https://rpc-testnet.gokite.ai/";
const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://x402-facilitator.molandak.org";

// Create a public client for on-chain verification
const publicClient = createPublicClient({
  chain: kiteTestnet,
  transport: http(KITE_RPC),
});

/**
 * Verify that a transaction hash exists on-chain and represents a valid payment
 * This prevents the payment verification bypass where ANY X-PAYMENT header would be accepted
 */
async function verifyPaymentOnChain(txHash: string): Promise<boolean> {
  if (!txHash || txHash === "0xpending" || txHash.length < 66) {
    return false;
  }

  try {
    // Query the transaction on Kite Testnet
    const tx = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });
    
    // Transaction must exist and be successful
    return tx !== null && tx.status === "success";
  } catch (error) {
    console.error(`[Payment Verification] Failed to verify tx ${txHash}:`, error);
    return false;
  }
}

/**
 * GET /api/listings/[id]/content
 *
 * x402 paywall — returns listing content after USDC payment on Kite Testnet.
 *
 * **CRITICAL**: This endpoint now verifies all payments on-chain using the Kite Testnet RPC.
 * Blank X-PAYMENT headers are rejected with 402. Invalid transaction hashes are rejected with 403.
 *
 * Flow:
 *  1. First request → returns 402 with payment requirements
 *  2. Agent/client pays on Kite Testnet, includes X-PAYMENT header with valid tx hash
 *  3. Endpoint verifies tx exists on-chain and is successful
 *  4. Second request with verified payment → returns content + receipt
 */
export async function GET(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    const listing = await listingStore.get(id);

    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    // Check for x402 payment header
    const paymentHeader =
      req.headers["x-payment"] ||
      req.headers["payment-signature"] ||
      req.headers["X-PAYMENT"];

    // If no payment, return 402 with requirements
    if (!paymentHeader) {
      const appUrl =
        process.env.KITE_MARKETPLACE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://kite-marketplace.vercel.app";

      res.status(402).json({
        error: "Payment Required",
        x402Version: 1,
        accepts: [
          {
            scheme: "gokite-aa",
            network: "kite-testnet",
            maxAmountRequired: Math.round(listing.priceUsdc * 1_000_000).toString(), // USDC 6 decimals
            resource: `${appUrl}/api/listings/${id}/content`,
            description: `Unlock this digital listing`,
            mimeType: "application/json",
            payTo,
            maxTimeoutSeconds: 300,
            asset: process.env.KITE_TESTNET_USDC_ADDRESS || "0x...", // Kite Testnet USDC
            merchantName: "Kite Marketplace",
            extra: {
              listingId: listing.id,
              listingName: listing.name,
              listingType: listing.type,
              preview: listing.preview,
            },
          },
        ],
      });
      return;
    }

    // Payment header present — extract and verify transaction
    let txHash = "";
    let payerAddress = "";
    try {
      const headerStr = Array.isArray(paymentHeader) ? paymentHeader[0] : paymentHeader;
      const decoded = JSON.parse(Buffer.from(headerStr, "base64").toString());
      txHash =
        decoded.payload?.transactionHash ||
        decoded.payload?.hash ||
        decoded.transactionHash ||
        "";
      payerAddress = decoded.authorization?.from || decoded.payload?.authorization?.from || "";
    } catch (parseError) {
      console.error("[Payment Verification] Failed to parse payment header:", parseError);
      res.status(400).json({ error: "Invalid payment header format" });
      return;
    }

    // CRITICAL: Verify the transaction exists on-chain
    const isValidPayment = await verifyPaymentOnChain(txHash);
    if (!isValidPayment) {
      console.warn(`[Payment Verification] Rejected unverified tx: ${txHash}`);
      res.status(403).json({
        error: "Payment Verification Failed",
        detail: "Transaction could not be verified on Kite Testnet. Please complete payment and try again.",
      });
      return;
    }

    const buyerAddress =
      (req.headers["x-buyer-address"] as string) ||
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

    // Detect file/download listings (content is a JSON blob descriptor).
    // For these, we never expose the underlying blob URL; instead we mint a
    // short-lived HMAC-signed download URL that the buyer's client pulls from
    // /api/listings/[id]/download (frontend route, streams via @vercel/blob get()).
    const blob = parseBlobDescriptor(listing.content);

    let file: {
      filename: string;
      size: number;
      contentType: string;
      downloadUrl: string;
      expiresAt: number;
    } | undefined;

    if (blob) {
      const appUrl =
        process.env.KITE_MARKETPLACE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://kite-marketplace.vercel.app";
      const token = signDownloadToken(blob.pathname);
      const url = new URL(`${appUrl.replace(/\/$/, "")}/api/listings/${listing.id}/download`);
      url.searchParams.set("p", token.pathname);
      url.searchParams.set("e", String(token.expiresAt));
      url.searchParams.set("s", token.signature);
      url.searchParams.set("n", blob.filename);
      file = {
        filename: blob.filename,
        size: blob.size,
        contentType: blob.contentType,
        downloadUrl: url.toString(),
        expiresAt: token.expiresAt,
      };
    }

    res.status(200).json({
      success: true,
      listing: {
        id: listing.id,
        name: listing.name,
        type: listing.type,
      },
      // For blob-backed listings we hide the raw envelope and surface the
      // download URL instead — the JSON pathname is server-only metadata.
      content: blob ? null : listing.content,
      file,
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
  } catch (error) {
    console.error("[Content Route] Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
