/**
 * Shopify Admin API Client for Kite Marketplace
 */
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
interface ShopifyAdminProduct {
    id: number;
    title: string;
    handle: string;
    body_html: string;
    variants: any[];
    images: any[];
}
export declare const shopifyClient: {
    /**
     * Helper to execute Shopify Admin REST API requests
     */
    request(shopUrl: string, accessToken: string, path: string, options?: RequestInit): Promise<any>;
    /**
     * Search Shopify products
     */
    searchProducts(shopUrl: string, accessToken: string, query?: string): Promise<ShopifyProduct[]>;
    /**
     * Get product details
     */
    getProduct(shopUrl: string, accessToken: string, id: string): Promise<ShopifyProduct | null>;
    /**
     * Create a Shopify order after payment
     */
    createOrder(shopUrl: string, accessToken: string, variantId: string, customerAddress: string, txHash: string): Promise<any>;
    /**
     * Map Shopify Admin Product object to Kite Marketplace format
     */
    mapProduct(product: ShopifyAdminProduct): ShopifyProduct;
};
export {};
