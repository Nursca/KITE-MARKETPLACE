/**
 * Kite Marketplace Store Registry
 * 
 * In-memory registry for connected Shopify stores.
 * In a production app, this would be a database.
 */

import * as fs from 'fs';
import * as path from 'path';

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
  private readonly dataFile: string;

  constructor() {
    // If we are in the browser or don't have Node.js environment, we don't use the file system
    const isBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;
    const hasProcess = typeof process !== 'undefined' && typeof process.cwd === 'function';
    const hasPath = path && typeof path.join === 'function';
    const hasFs = fs && (typeof fs.existsSync === 'function' || typeof (fs as any).existsSync === 'function');

    if (isBrowser || !hasProcess || !hasPath || !hasFs) {
      this.dataFile = '';
      return;
    }

    // Try to find the root data directory
    // If we are in packages/kite-x402-sdk/dist or src, we go up to project root
    try {
      const cwd = process.cwd();
      const possiblePaths = [
        path.join(cwd, 'data', 'stores.json'),
        path.join(cwd, '..', '..', 'data', 'stores.json'),
        path.join(cwd, '..', 'data', 'stores.json'),
        path.join('/tmp', 'kite-stores.json')
      ];
      
      this.dataFile = possiblePaths.find(p => {
        try {
          return fs.existsSync && fs.existsSync(path.dirname(p));
        } catch {
          return false;
        }
      }) || possiblePaths[possiblePaths.length - 1];
      
      this.load();

      // Seed with a demo store if empty
      if (this.stores.size === 0 && process.env.NODE_ENV === 'development') {
        this.add({
          id: "shop_demo_1",
          shopUrl: "kite-marketplace-demo.myshopify.com",
          name: "Kite Demo Store",
          description: "Official merchandise for Kite developers.",
          isConnected: true,
        });
      }
    } catch (e) {
      console.warn("StoreRegistry: Failed to initialize Node.js file system paths", e);
      this.dataFile = '';
    }
  }

  private load() {
    if (typeof globalThis !== 'undefined' && 'window' in globalThis || !this.dataFile || !fs.readFileSync) return;
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = fs.readFileSync(this.dataFile, 'utf-8');
        const storesArray: ShopifyStore[] = JSON.parse(data);
        storesArray.forEach(s => this.stores.set(s.id, s));
      }
    } catch (error) {
      console.error("Failed to load stores:", error);
    }
  }

  private save() {
    if (typeof globalThis !== 'undefined' && 'window' in globalThis || !this.dataFile || !fs.writeFileSync) return;
    try {
      const dataDir = path.dirname(this.dataFile);
      if (fs.existsSync && !fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.dataFile, JSON.stringify(Array.from(this.stores.values()), null, 2));
    } catch (error) {
      console.error("Failed to save stores:", error);
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
    this.save();
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
      this.save();
      return updatedStore;
    }
    return undefined;
  }

  remove(id: string) {
    this.stores.delete(id);
    this.save();
  }
}

// Singleton instance
export const storeRegistry = new StoreRegistry();
