/**
 * Shopify Admin API Client for Kite Marketplace
 */

const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME || "kite-marketplace-demo";
const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "shpat_xxxxxxxxxxxxxxxxxxxxxxxx";

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  price: number;
  currencyCode: string;
  images: string[];
  variants: {
    id: string;
    title: string;
    price: number;
    sku: string;
  }[];
}

/**
 * Mock Shopify Data
 */
const MOCK_SHOPIFY_PRODUCTS: ShopifyProduct[] = [
  {
    id: "gid://shopify/Product/123456789",
    title: "Kite Developer Hoodie",
    handle: "kite-developer-hoodie",
    description: "Premium heavyweight hoodie for Kite developers.",
    price: 45.00,
    currencyCode: "USDC",
    images: ["https://example.com/images/hoodie.jpg"],
    variants: [
      { id: "gid://shopify/ProductVariant/111", title: "S", price: 45.00, sku: "KITE-HD-S" },
      { id: "gid://shopify/ProductVariant/222", title: "M", price: 45.00, sku: "KITE-HD-M" },
      { id: "gid://shopify/ProductVariant/333", title: "L", price: 45.00, sku: "KITE-HD-L" },
    ]
  },
  {
    id: "gid://shopify/Product/987654321",
    title: "Kite Hardware Wallet Case",
    handle: "kite-wallet-case",
    description: "Durable leather case for hardware wallets.",
    price: 15.00,
    currencyCode: "USDC",
    images: ["https://example.com/images/case.jpg"],
    variants: [
      { id: "gid://shopify/ProductVariant/444", title: "Default", price: 15.00, sku: "KITE-CASE-DEF" },
    ]
  }
];

export const shopifyClient = {
  /**
   * Search Shopify products
   */
  async searchProducts(query: string): Promise<ShopifyProduct[]> {
    console.log(`[Shopify] 🔍 Searching products: ${query}`);
    const lowerQuery = query.toLowerCase();
    return MOCK_SHOPIFY_PRODUCTS.filter(p => 
      p.title.toLowerCase().includes(lowerQuery) || 
      p.description.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Get product details
   */
  async getProduct(id: string): Promise<ShopifyProduct | null> {
    console.log(`[Shopify] 📦 Getting product details: ${id}`);
    return MOCK_SHOPIFY_PRODUCTS.find(p => p.id === id) || null;
  },

  /**
   * Create a Shopify order after payment
   */
  async createOrder(productId: string, variantId: string, customerAddress: string, txHash: string): Promise<any> {
    console.log(`[Shopify] 📝 Creating order for variant ${variantId} after payment ${txHash}`);
    // In a real app, this would use the Shopify Admin API to create an order
    return {
      success: true,
      orderId: `shopify_order_${Date.now()}`,
      orderNumber: 1001,
      totalPrice: 45.00,
      customer: customerAddress,
      status: "paid"
    };
  }
};
