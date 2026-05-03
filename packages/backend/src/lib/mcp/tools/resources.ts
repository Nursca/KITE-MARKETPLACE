/**
 * Resource MCP Tools for Kite Marketplace
 */

import { z } from "zod";
import { toolRegistry, defineTool } from "../tool-registry";
import { listingStore } from "../../listing-store";

// ============================================================
// Tool Definitions
// ============================================================

const createListingTool = defineTool({
  name: "create_listing",
  description: "CREATE a paywalled listing — content is hidden behind x402 until a buyer pays USDC on Kite. This is how agents EARN money.",
  inputSchema: z.object({
    type: z.enum(["api", "file", "article", "dataset", "code", "shopify"]),
    name: z.string().describe("Name of the resource"),
    description: z.string().optional().describe("Description of what the buyer gets"),
    priceUsdc: z.number().describe("Price in USDC"),
    content: z.string().describe("The secret content or URL revealed after payment"),
    preview: z.string().describe("Public teaser (no secrets)"),
    creatorAddress: z.string().describe("EVM address to receive USDC")
  }),
  handler: async (args) => {
    console.log(`[create_listing] 💎 Creating ${args.type} listing: ${args.name}`);
    
    const listing = await listingStore.create(args);
    const baseUrl = process.env.KITE_MARKETPLACE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    return {
      success: true,
      listingId: listing.id,
      x402Url: `${baseUrl}/api/listings/${listing.id}/content`,
      message: `Successfully created paywalled ${args.type}. Others can now buy it for ${args.priceUsdc} USDC.`,
      listing: {
        id: listing.id,
        name: listing.name,
        type: listing.type,
        priceUsdc: listing.priceUsdc,
        preview: listing.preview
      }
    };
  },
});

const listListingsTool = defineTool({
  name: "list_listings",
  description: "Browse all paywalled digital listings (APIs, datasets, articles, code, files) on Kite Marketplace.",
  inputSchema: z.object({
    type: z.string().optional().describe("Filter by type: api | file | article | dataset | code"),
    maxPrice: z.number().optional().describe("Max price in USDC")
  }),
  handler: async ({ type, maxPrice }) => {
    const listings = await listingStore.list({ type, maxPrice });
    // Strip content for the list
    const publicListings = listings.map(({ content, ...rest }) => rest);
    
    return {
      success: true,
      listings: publicListings,
      count: publicListings.length
    };
  },
});

const previewListingTool = defineTool({
  name: "preview_listing",
  description: "Preview a listing — name, description, price, public teaser — WITHOUT paying.",
  inputSchema: z.object({
    listingId: z.string().describe("The listing ID to preview")
  }),
  handler: async ({ listingId }) => {
    const listing = await listingStore.get(listingId);
    if (!listing) {
      return { success: false, error: "Listing not found" };
    }
    
    const { content, ...meta } = listing;
    return {
      success: true,
      listing: meta
    };
  },
});

const buyListingTool = defineTool({
  name: "buy_listing",
  description: "Purchase a digital listing using agent CDP wallet + x402 on Kite Testnet.",
  inputSchema: z.object({
    listingId: z.string().describe("The listing ID to purchase"),
    amount: z.number().describe("Price in USDC")
  }),
  handler: async ({ listingId, amount }) => {
    const baseUrl = process.env.KITE_MARKETPLACE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const x402Url = `${baseUrl}/api/listings/${listingId}/content`;

    // In a real execution environment, we'd call executeAgentPurchase
    // For MCP output, we return the instruction on how to fulfill the x402
    return {
      success: true,
      action: "X402_PAYMENT_REQUIRED",
      x402Url,
      priceUsdc: amount,
      network: "Kite Testnet (chainId 2368)",
      protocol: "x402 — HTTP 402 + on-chain USDC",
      message: `To access this resource, send ${amount} USDC to the recipient specified in the x402 header at ${x402Url}.`
    };
  },
});

// ============================================================
// Register all Resource tools
// ============================================================

export function registerResourceTools(): void {
  toolRegistry.register(createListingTool, "resources");
  toolRegistry.register(listListingsTool, "resources");
  toolRegistry.register(previewListingTool, "resources");
  toolRegistry.register(buyListingTool, "resources");
  
  console.log("[Resource Tools] ✅ Registered 4 tools");
}
