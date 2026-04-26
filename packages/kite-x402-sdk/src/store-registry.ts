/**
 * Kite Marketplace Store Registry
 * 
 * In-memory registry for connected Shopify stores.
 * In a production app, this would be a database.
 */

export interface ShopifyStore {
  id: string;
  shopUrl: string;
  name?: string;
  description?: string;
  accessToken?: string;
  isConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

class StoreRegistry {
  private stores: Map<string, ShopifyStore> = new Map();

  constructor() {
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

  get(id: string): ShopifyStore | undefined {
    return this.stores.get(id);
  }

  getByUrl(shopUrl: string): ShopifyStore | undefined {
    return Array.from(this.stores.values()).find(s => s.shopUrl === shopUrl);
  }

  list(): ShopifyStore[] {
    return Array.from(this.stores.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  add(args: Partial<ShopifyStore> & { shopUrl: string }): ShopifyStore {
    const id = args.id || `shop_${Math.random().toString(36).substring(2, 9)}`;
    const store: ShopifyStore = {
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

  update(id: string, updates: Partial<ShopifyStore>): ShopifyStore | undefined {
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

  remove(id: string) {
    this.stores.delete(id);
  }
}

// Singleton instance
export const storeRegistry = new StoreRegistry();
