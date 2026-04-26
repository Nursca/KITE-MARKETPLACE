"use strict";
/**
 * Shopify Admin API Client for Kite Marketplace
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shopifyClient = void 0;
exports.shopifyClient = {
    /**
     * Helper to execute Shopify Admin REST API requests
     */
    async request(shopUrl, accessToken, path, options = {}) {
        const url = `https://${shopUrl}/admin/api/2024-01/${path}`;
        const headers = {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
            ...(options.headers || {})
        };
        const res = await fetch(url, { ...options, headers });
        if (!res.ok) {
            const text = await res.text();
            console.error(`[Shopify API Error] ${res.status} ${res.statusText}: ${text}`);
            throw new Error(`Shopify API Error: ${res.statusText}`);
        }
        return res.json();
    },
    /**
     * Search Shopify products
     */
    async searchProducts(shopUrl, accessToken, query = "") {
        console.log(`[Shopify] 🔍 Searching products on ${shopUrl}`);
        // Optional: add query parameter logic (e.g. title:query)
        const data = await this.request(shopUrl, accessToken, 'products.json?status=active');
        return data.products.map((p) => this.mapProduct(p));
    },
    /**
     * Get product details
     */
    async getProduct(shopUrl, accessToken, id) {
        console.log(`[Shopify] 📦 Getting product details: ${id} on ${shopUrl}`);
        try {
            const data = await this.request(shopUrl, accessToken, `products/${id}.json`);
            return this.mapProduct(data.product);
        }
        catch (e) {
            return null;
        }
    },
    /**
     * Create a Shopify order after payment
     */
    async createOrder(shopUrl, accessToken, variantId, customerAddress, txHash) {
        console.log(`[Shopify] 📝 Creating order for variant ${variantId} on ${shopUrl} after payment ${txHash}`);
        // We append the Kite Agent address/transaction hash to note attributes
        const payload = {
            order: {
                line_items: [
                    {
                        variant_id: parseInt(variantId, 10),
                        quantity: 1
                    }
                ],
                financial_status: "paid",
                note_attributes: [
                    { name: "Kite Agent Customer", value: customerAddress },
                    { name: "x402 Transaction", value: txHash }
                ]
            }
        };
        const data = await this.request(shopUrl, accessToken, 'orders.json', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return {
            success: true,
            orderId: data.order.id.toString(),
            orderNumber: data.order.order_number,
            totalPrice: parseFloat(data.order.total_price),
            customer: customerAddress,
            status: data.order.financial_status
        };
    },
    /**
     * Map Shopify Admin Product object to Kite Marketplace format
     */
    mapProduct(product) {
        return {
            id: product.id.toString(),
            title: product.title,
            handle: product.handle,
            description: product.body_html || "",
            price: product.variants[0]?.price ? parseFloat(product.variants[0].price) : 0,
            currencyCode: "USD", // Simplification; adapt based on shop config if needed
            images: product.images.map(img => img.src),
            variants: product.variants.map(v => ({
                id: v.id.toString(),
                title: v.title,
                price: v.price ? parseFloat(v.price) : 0,
                sku: v.sku || ""
            }))
        };
    }
};
