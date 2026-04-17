/**
 * Shopping MCP Tools for Kite Marketplace
 */

import { z } from "zod";
import { toolRegistry, defineTool } from "../tool-registry";
import productsData from "../../../../data/products.json";

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  priceUsdc: number;
  category: string;
  description: string;
  image: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
}

const products = productsData as Product[];

// ============================================================
// Tool Definitions
// ============================================================

const searchProductsTool = defineTool({
  name: "search_products",
  description: "Search the product catalog and return matching items.",
  inputSchema: z.object({
    query: z.string().describe("The plain-text search term"),
    maxPrice: z.number().optional().describe("Maximum price filter"),
    category: z.string().optional().describe("One of: electronics, footwear, bags, accessories, gaming")
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

const getProductDetailsTool = defineTool({
  name: "get_product_details",
  description: "Get full details for a specific product by its ID.",
  inputSchema: z.object({
    productId: z.string().describe("The unique ID of the product")
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

// ============================================================
// Register all shopping tools
// ============================================================

export function registerShoppingTools(): void {
  toolRegistry.register(searchProductsTool, "shopping");
  toolRegistry.register(getProductDetailsTool, "shopping");
  
  console.log("[Shopping Tools] ✅ Registered 2 tools");
}
