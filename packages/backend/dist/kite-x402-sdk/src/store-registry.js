"use strict";
/**
 * Kite Marketplace Store Registry
 *
 * In-memory registry for connected Shopify stores.
 * In a production app, this would be a database.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeRegistry = void 0;
class StoreRegistry {
    constructor() {
        this.stores = new Map();
        // Seed with a demo store if needed
        if (process.env.NODE_ENV === 'development') {
            this.add({
                id: "shop_demo_1",
                shopUrl: "kite-marketplace-demo.myshopify.com",
                name: "Kite Demo Store",
                description: "Official merchandise for Kite developers.",
                isConnected: true,
            });
        }
    }
    get(id) {
        return this.stores.get(id);
    }
    getByUrl(shopUrl) {
        return Array.from(this.stores.values()).find(s => s.shopUrl === shopUrl);
    }
    list() {
        return Array.from(this.stores.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    add(args) {
        const id = args.id || `shop_${Math.random().toString(36).substring(2, 9)}`;
        const store = {
            id,
            name: args.name || args.shopUrl.split('.')[0],
            description: args.description || "",
            isConnected: args.isConnected ?? false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...args
        };
        this.stores.set(id, store);
        return store;
    }
    update(id, updates) {
        const store = this.stores.get(id);
        if (store) {
            const updatedStore = {
                ...store,
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.stores.set(id, updatedStore);
            return updatedStore;
        }
        return undefined;
    }
    remove(id) {
        this.stores.delete(id);
    }
}
// Singleton instance
exports.storeRegistry = new StoreRegistry();
