"use strict";
/**
 * Kite Marketplace Store Registry
 *
 * In-memory registry for connected Shopify stores.
 * In a production app, this would be a database.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeRegistry = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class StoreRegistry {
    constructor() {
        this.stores = new Map();
        // If we are in the browser or don't have Node.js environment, we don't use the file system
        const isBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;
        const hasProcess = typeof process !== 'undefined' && typeof process.cwd === 'function';
        const hasPath = path && typeof path.join === 'function';
        const hasFs = fs && (typeof fs.existsSync === 'function' || typeof fs.existsSync === 'function');
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
                }
                catch {
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
        }
        catch (e) {
            console.warn("StoreRegistry: Failed to initialize Node.js file system paths", e);
            this.dataFile = '';
        }
    }
    load() {
        if (typeof globalThis !== 'undefined' && 'window' in globalThis || !this.dataFile || !fs.readFileSync)
            return;
        try {
            if (fs.existsSync(this.dataFile)) {
                const data = fs.readFileSync(this.dataFile, 'utf-8');
                const storesArray = JSON.parse(data);
                storesArray.forEach(s => this.stores.set(s.id, s));
            }
        }
        catch (error) {
            console.error("Failed to load stores:", error);
        }
    }
    save() {
        if (typeof globalThis !== 'undefined' && 'window' in globalThis || !this.dataFile || !fs.writeFileSync)
            return;
        try {
            const dataDir = path.dirname(this.dataFile);
            if (fs.existsSync && !fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(this.dataFile, JSON.stringify(Array.from(this.stores.values()), null, 2));
        }
        catch (error) {
            console.error("Failed to save stores:", error);
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
        this.save();
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
            this.save();
            return updatedStore;
        }
        return undefined;
    }
    remove(id) {
        this.stores.delete(id);
        this.save();
    }
}
// Singleton instance
exports.storeRegistry = new StoreRegistry();
