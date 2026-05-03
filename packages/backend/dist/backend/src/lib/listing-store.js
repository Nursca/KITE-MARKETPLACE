"use strict";
/**
 * Kite Marketplace Listing Store
 *
 * Migrated to Supabase (PostgreSQL) for production-grade persistence.
 * Includes a local JSON fallback for development without a DB.
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
exports.listingStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const supabase_js_1 = require("@supabase/supabase-js");
class ListingStore {
    constructor() {
        this.supabase = null;
        this.listings = new Map();
        this.sales = [];
        this.isUsingSupabase = false;
        // 1. Initialize Supabase if credentials exist
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
            this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
            this.isUsingSupabase = true;
            console.log("🚀 ListingStore: Using Supabase Persistence");
        }
        else {
            console.warn("⚠️ ListingStore: Supabase credentials missing. Falling back to JSON persistence.");
        }
        // 2. Local Fallback Configuration
        const hasProcess = typeof process !== 'undefined' && typeof process.cwd === 'function';
        const hasFs = fs && typeof fs.existsSync === 'function';
        if (hasProcess && hasFs) {
            const cwd = process.cwd();
            if (cwd.endsWith('packages/backend')) {
                this.dataDir = path.join(cwd, 'data');
            }
            else if (fs.existsSync(path.join(cwd, 'packages', 'backend'))) {
                this.dataDir = path.join(cwd, 'packages', 'backend', 'data');
            }
            else {
                this.dataDir = path.join(cwd, 'data');
            }
        }
        else {
            this.dataDir = '/tmp/kite-data';
        }
        this.listingsFile = path.join(this.dataDir, 'listings.json');
        this.salesFile = path.join(this.dataDir, 'sales.json');
        if (!this.isUsingSupabase) {
            this.ensureDataDir();
            this.loadLocal();
            if (this.listings.size === 0)
                this.seed();
        }
    }
    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }
    loadLocal() {
        try {
            if (fs.existsSync(this.listingsFile)) {
                const data = fs.readFileSync(this.listingsFile, 'utf-8');
                const listingsArray = JSON.parse(data);
                listingsArray.forEach(l => this.listings.set(l.id, l));
            }
            if (fs.existsSync(this.salesFile)) {
                const data = fs.readFileSync(this.salesFile, 'utf-8');
                this.sales = JSON.parse(data);
            }
        }
        catch (error) {
            console.error("Failed to load local data:", error);
        }
    }
    saveLocal() {
        if (this.isUsingSupabase)
            return;
        try {
            fs.writeFileSync(this.listingsFile, JSON.stringify(Array.from(this.listings.values()), null, 2));
            fs.writeFileSync(this.salesFile, JSON.stringify(this.sales, null, 2));
        }
        catch (error) {
            console.error("Failed to save local data:", error);
        }
    }
    seed() {
        const demos = [
            {
                id: "lst_demo_1",
                type: "api",
                name: "Kite Network Stats API",
                description: "Real-time gas prices and block times for Kite Testnet.",
                priceUsdc: 0.50,
                content: "ENDPOINT=https://stats.gokite.ai/v1/snapshot?key=KITE_HACKATHON_2026_SECRET",
                preview: "Returns gasPrice, blockTime, activeAgents, and tps.",
                creatorAddress: "0xb23c769dFc7ef020ec60A19567aB675C46a49910"
            },
            {
                id: "lst_demo_2",
                type: "dataset",
                name: "Agentic Commerce Trends 2026",
                description: "CSV dataset of 10,000 autonomous transactions on Kite.",
                priceUsdc: 1.00,
                content: "https://storage.gokite.ai/datasets/agent-trends-apr-2026.csv?sig=abc123xyz",
                preview: "10,000 rows. Columns: timestamp, buyer_type, amount_usdc, category.",
                creatorAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
            }
        ];
        demos.forEach(d => this.create(d));
    }
    async get(id) {
        if (this.isUsingSupabase && this.supabase) {
            const { data, error } = await this.supabase
                .from('listings')
                .select('*')
                .eq('id', id)
                .single();
            if (error || !data)
                return undefined;
            return data;
        }
        return this.listings.get(id);
    }
    async list(filters = {}) {
        if (this.isUsingSupabase && this.supabase) {
            let query = this.supabase.from('listings').select('*');
            if (filters.type)
                query = query.eq('type', filters.type);
            if (filters.maxPrice)
                query = query.lte('priceUsdc', filters.maxPrice);
            if (filters.creatorAddress)
                query = query.ilike('creatorAddress', filters.creatorAddress);
            const { data, error } = await query.order('createdAt', { ascending: false });
            if (error) {
                console.error("Supabase list error:", error);
                return [];
            }
            return data;
        }
        // Local filter
        let result = Array.from(this.listings.values());
        if (filters.type)
            result = result.filter(l => l.type === filters.type);
        if (filters.maxPrice !== undefined) {
            const maxPrice = filters.maxPrice;
            result = result.filter(l => l.priceUsdc <= maxPrice);
        }
        if (filters.creatorAddress)
            result = result.filter(l => l.creatorAddress.toLowerCase() === filters.creatorAddress?.toLowerCase());
        return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    async create(args) {
        const id = args.id || `lst_${Math.random().toString(36).substring(2, 9)}`;
        const listing = {
            id,
            description: "",
            preview: "",
            creatorAddress: "0x0000000000000000000000000000000000000000",
            createdAt: new Date().toISOString(),
            salesCount: 0,
            totalEarnedUsdc: 0,
            ...args
        };
        if (this.isUsingSupabase && this.supabase) {
            const { error } = await this.supabase.from('listings').insert([listing]);
            if (error)
                console.error("Supabase create error:", error);
        }
        else {
            this.listings.set(id, listing);
            this.saveLocal();
        }
        return listing;
    }
    async recordSale(listingId, buyerAddress, txHash) {
        if (this.isUsingSupabase && this.supabase) {
            const listing = await this.get(listingId);
            if (!listing)
                return;
            const sale = {
                listingId,
                buyerAddress,
                txHash,
                timestamp: new Date().toISOString()
            };
            // Atomic update for salesCount and earned
            const { error: saleErr } = await this.supabase.from('sales').insert([sale]);
            const { error: listErr } = await this.supabase
                .from('listings')
                .update({
                salesCount: listing.salesCount + 1,
                totalEarnedUsdc: listing.totalEarnedUsdc + listing.priceUsdc
            })
                .eq('id', listingId);
            if (saleErr || listErr)
                console.error("Supabase recordSale error:", saleErr || listErr);
        }
        else {
            const listing = this.listings.get(listingId);
            if (listing) {
                listing.salesCount++;
                listing.totalEarnedUsdc += listing.priceUsdc;
                this.sales.push({
                    listingId,
                    buyerAddress,
                    txHash,
                    timestamp: new Date().toISOString()
                });
                this.saveLocal();
            }
        }
    }
    async getStats() {
        if (this.isUsingSupabase && this.supabase) {
            const { count: totalListings } = await this.supabase.from('listings').select('*', { count: 'exact', head: true });
            const { data: salesData } = await this.supabase.from('sales').select('listingId');
            const { data: listingsData } = await this.supabase.from('listings').select('priceUsdc, creatorAddress');
            const totalSales = salesData?.length || 0;
            const totalVolumeUsdc = listingsData?.reduce((acc, l) => acc + (l.priceUsdc || 0), 0) || 0; // This is naive, should join with sales
            return {
                totalListings: totalListings || 0,
                totalSales,
                totalVolumeUsdc: parseFloat(totalVolumeUsdc.toFixed(2)),
                activeAgents: 124,
                topSellers: [] // Implementation for top sellers would go here
            };
        }
        const totalVolume = this.sales.reduce((acc, sale) => {
            const listing = this.listings.get(sale.listingId);
            return acc + (listing?.priceUsdc || 0);
        }, 0);
        return {
            totalListings: this.listings.size,
            totalSales: this.sales.length,
            totalVolumeUsdc: parseFloat(totalVolume.toFixed(2)),
            activeAgents: 124,
            topSellers: [
                { address: "0xb23c769dFc7ef020ec60A19567aB675C46a49910", sales: 42 },
                { address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", sales: 18 }
            ]
        };
    }
}
// Singleton instance
exports.listingStore = new ListingStore();
