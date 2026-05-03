"use strict";
/**
 * Shopping MCP Tools for Kite Marketplace
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerShoppingTools = registerShoppingTools;
const zod_1 = require("zod");
const tool_registry_1 = require("../tool-registry");
const products_json_1 = __importDefault(require("../../../../data/products.json"));
const listing_store_1 = require("../../listing-store");
const x402_sdk_1 = require("@kite/x402-sdk");
const products = products_json_1.default;
// ============================================================
// Tool Definitions
// ============================================================
const searchProductsTool = (0, tool_registry_1.defineTool)({
    name: "search_products",
    description: "Search the physical product catalog and return matching items.",
    inputSchema: zod_1.z.object({
        query: zod_1.z.string().describe("The plain-text search term"),
        maxPrice: zod_1.z.number().optional().describe("Maximum price filter"),
        category: zod_1.z.string().optional().describe("One of: electronics, footwear, bags, accessories, gaming")
    }),
    handler: async ({ query, maxPrice, category }) => {
        console.log(`[search_products] 🔍 Searching for: ${query}`);
        const lowerQuery = query.toLowerCase();
        const filtered = products.filter((p) => {
            const matchesText = p.name.toLowerCase().includes(lowerQuery) ||
                p.brand.toLowerCase().includes(lowerQuery) ||
                p.description.toLowerCase().includes(lowerQuery);
            const matchesPrice = maxPrice ? p.price <= maxPrice : true;
            const matchesCategory = category ? p.category === category : true;
            return matchesText && matchesPrice && matchesCategory;
        });
        const results = filtered.slice(0, 6);
        console.log(`[search_products] ✅ Found ${results.length} product(s)`);
        return {
            success: true,
            products: results,
            count: results.length
        };
    },
});
const getMarketplaceStatsTool = (0, tool_registry_1.defineTool)({
    name: "get_marketplace_stats",
    description: "Get live Kite Marketplace stats: listings, sales volume, top sellers.",
    inputSchema: zod_1.z.object({}),
    handler: async () => {
        const stats = await listing_store_1.listingStore.getStats();
        return {
            success: true,
            stats
        };
    },
});
const getProductDetailsTool = (0, tool_registry_1.defineTool)({
    name: "get_product_details",
    description: "Get full details for a specific product by its ID.",
    inputSchema: zod_1.z.object({
        productId: zod_1.z.string().describe("The unique ID of the product")
    }),
    handler: async ({ productId }) => {
        console.log(`[get_product_details] 📦 Fetching details for: ${productId}`);
        const product = products.find(p => p.id === productId);
        if (!product) {
            return {
                success: false,
                error: "Product not found"
            };
        }
        return {
            success: true,
            product
        };
    },
});
/**
 * NEW: Shopify Tools
 */
const x402_sdk_2 = require("@kite/x402-sdk");
const searchShopifyProductsTool = (0, tool_registry_1.defineTool)({
    name: "search_shopify_products",
    description: "Search for products on the connected Shopify stores.",
    inputSchema: zod_1.z.object({
        query: zod_1.z.string().describe("Search term for Shopify products")
    }),
    handler: async ({ query }) => {
        const stores = x402_sdk_2.storeRegistry.list().filter(s => s.isConnected && s.accessToken);
        if (stores.length === 0) {
            return { success: false, error: "No connected Shopify stores found." };
        }
        // For simplicity, we search the first connected store
        const store = stores[0];
        try {
            const products = await x402_sdk_1.shopifyClient.searchProducts(store.shopUrl, store.accessToken, query);
            return {
                success: true,
                products,
                count: products.length,
                shopUrl: store.shopUrl
            };
        }
        catch (e) {
            return { success: false, error: e.message || "Failed to search Shopify products" };
        }
    }
});
const buyShopifyProductTool = (0, tool_registry_1.defineTool)({
    name: "buy_shopify_product",
    description: "Purchase a physical product from Shopify using x402 payment flow.",
    inputSchema: zod_1.z.object({
        productId: zod_1.z.string().describe("The Shopify GID (e.g. gid://shopify/Product/123)"),
        variantId: zod_1.z.string().optional().describe("Specific variant ID"),
        shopUrl: zod_1.z.string().describe("The Shopify store URL (e.g. store.myshopify.com)")
    }),
    handler: async ({ productId, shopUrl }) => {
        const baseUrl = process.env.KITE_MARKETPLACE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const x402Url = `${baseUrl}/api/x402/resource/shopify/${encodeURIComponent(productId)}?shop=${encodeURIComponent(shopUrl)}`;
        return {
            success: true,
            action: "X402_PAYMENT_REQUIRED",
            x402Url,
            network: "Kite Testnet (chainId 2368)",
            protocol: "x402 — HTTP 402 + on-chain USDC",
            message: `To purchase this Shopify item, initiate an x402 payment to ${x402Url}. Payment will trigger order creation.`
        };
    }
});
// ============================================================
// Register all shopping tools
// ============================================================
function registerShoppingTools() {
    tool_registry_1.toolRegistry.register(searchProductsTool, "shopping");
    tool_registry_1.toolRegistry.register(getMarketplaceStatsTool, "shopping");
    tool_registry_1.toolRegistry.register(getProductDetailsTool, "shopping");
    // Register Shopify tools
    tool_registry_1.toolRegistry.register(searchShopifyProductsTool, "shopping");
    tool_registry_1.toolRegistry.register(buyShopifyProductTool, "shopping");
    console.log("[Shopping Tools] ✅ Registered 5 tools (including Shopify)");
}
