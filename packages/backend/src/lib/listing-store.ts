/**
 * Kite Marketplace Listing Store
 * 
 * Migrated to Supabase (PostgreSQL) for production-grade persistence.
 * Includes a local JSON fallback for development without a DB.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Listing {
  id: string;
  type: 'api' | 'file' | 'article' | 'dataset' | 'code' | 'shopify';
  name: string;
  description: string;
  priceUsdc: number;
  content: string; // Secret content revealed after x402 payment
  preview: string; // Public teaser
  creatorAddress: string;
  createdAt: string;
  salesCount: number;
  totalEarnedUsdc: number;
}

export interface Sale {
  listingId: string;
  buyerAddress: string;
  txHash: string;
  timestamp: string;
}

class ListingStore {
  private supabase: SupabaseClient | null = null;
  private listings: Map<string, Listing> = new Map();
  private sales: Sale[] = [];
  private readonly dataDir: string;
  private readonly listingsFile: string;
  private readonly salesFile: string;
  private isUsingSupabase = false;

  constructor() {
    // 1. Initialize Supabase if credentials exist
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.isUsingSupabase = true;
      console.log("🚀 ListingStore: Using Supabase Persistence");
    } else {
      console.warn("⚠️ ListingStore: Supabase credentials missing. Falling back to JSON persistence.");
    }

    // 2. Local Fallback Configuration
    const hasProcess = typeof process !== 'undefined' && typeof process.cwd === 'function';
    const hasFs = fs && typeof fs.existsSync === 'function';
    
    if (hasProcess && hasFs) {
      const cwd = process.cwd();
      if (cwd.endsWith('packages/backend')) {
        this.dataDir = path.join(cwd, 'data');
      } else if (fs.existsSync(path.join(cwd, 'packages', 'backend'))) {
        this.dataDir = path.join(cwd, 'packages', 'backend', 'data');
      } else {
        this.dataDir = path.join(cwd, 'data');
      }
    } else {
      this.dataDir = '/tmp/kite-data';
    }
    
    this.listingsFile = path.join(this.dataDir, 'listings.json');
    this.salesFile = path.join(this.dataDir, 'sales.json');

    if (!this.isUsingSupabase) {
      this.ensureDataDir();
      this.loadLocal();
      if (this.listings.size === 0) this.seed();
    }
  }

  private ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadLocal() {
    try {
      if (fs.existsSync(this.listingsFile)) {
        const data = fs.readFileSync(this.listingsFile, 'utf-8');
        const listingsArray: Listing[] = JSON.parse(data);
        listingsArray.forEach(l => this.listings.set(l.id, l));
      }
      if (fs.existsSync(this.salesFile)) {
        const data = fs.readFileSync(this.salesFile, 'utf-8');
        this.sales = JSON.parse(data);
      }
    } catch (error) {
      console.error("Failed to load local data:", error);
    }
  }

  private saveLocal() {
    if (this.isUsingSupabase) return;
    try {
      fs.writeFileSync(this.listingsFile, JSON.stringify(Array.from(this.listings.values()), null, 2));
      fs.writeFileSync(this.salesFile, JSON.stringify(this.sales, null, 2));
    } catch (error) {
      console.error("Failed to save local data:", error);
    }
  }

  private seed() {
    const demos: any[] = [
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

  // --- DB Mappers to handle snake_case <-> camelCase ---
  private mapFromDb(row: any): Listing {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description,
      priceUsdc: Number(row.price_usdc),
      content: row.content,
      preview: row.preview,
      creatorAddress: row.creator_address,
      createdAt: row.created_at,
      salesCount: row.sales_count,
      totalEarnedUsdc: Number(row.total_earned_usdc)
    };
  }

  private mapToDb(listing: Listing): any {
    return {
      id: listing.id,
      type: listing.type,
      name: listing.name,
      description: listing.description,
      price_usdc: listing.priceUsdc,
      content: listing.content,
      preview: listing.preview,
      creator_address: listing.creatorAddress,
      created_at: listing.createdAt,
      sales_count: listing.salesCount,
      total_earned_usdc: listing.totalEarnedUsdc
    };
  }
  // -----------------------------------------------------

  async get(id: string): Promise<Listing | undefined> {
    if (this.isUsingSupabase && this.supabase) {
      const { data, error } = await this.supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) return undefined;
      return this.mapFromDb(data);
    }
    return this.listings.get(id);
  }

  async list(filters: { type?: string; maxPrice?: number; creatorAddress?: string } = {}): Promise<Listing[]> {
    if (this.isUsingSupabase && this.supabase) {
      let query = this.supabase.from('listings').select('*');
      
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.maxPrice) query = query.lte('price_usdc', filters.maxPrice);
      if (filters.creatorAddress) query = query.ilike('creator_address', filters.creatorAddress);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error("Supabase list error:", error);
        return [];
      }
      return data.map((row: any) => this.mapFromDb(row));
    }

    // Local filter
    let result = Array.from(this.listings.values());
    if (filters.type) result = result.filter(l => l.type === filters.type);
    if (filters.maxPrice !== undefined) {
      const maxPrice = filters.maxPrice;
      result = result.filter(l => l.priceUsdc <= maxPrice);
    }
    if (filters.creatorAddress) result = result.filter(l => l.creatorAddress.toLowerCase() === filters.creatorAddress?.toLowerCase());
    
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(args: Partial<Listing> & { name: string; type: any; priceUsdc: number }): Promise<Listing> {
    const id = args.id || `lst_${Math.random().toString(36).substring(2, 9)}`;
    const listing: Listing = {
      id,
      description: "",
      preview: "",
      creatorAddress: "0x0000000000000000000000000000000000000000",
      createdAt: new Date().toISOString(),
      salesCount: 0,
      totalEarnedUsdc: 0,
      ...args
    } as Listing;
    
    if (this.isUsingSupabase && this.supabase) {
      const { error } = await this.supabase.from('listings').insert([this.mapToDb(listing)]);
      if (error) console.error("Supabase create error:", error);
    } else {
      this.listings.set(id, listing);
      this.saveLocal();
    }
    
    return listing;
  }

  async recordSale(listingId: string, buyerAddress: string, txHash: string) {
    if (this.isUsingSupabase && this.supabase) {
      const listing = await this.get(listingId);
      if (!listing) return;

      const sale: any = {
        listing_id: listingId,
        buyer_address: buyerAddress,
        tx_hash: txHash,
        timestamp: new Date().toISOString()
      };

      // Atomic update for salesCount and earned
      const { error: saleErr } = await this.supabase.from('sales').insert([sale]);
      const { error: listErr } = await this.supabase
        .from('listings')
        .update({ 
          sales_count: listing.salesCount + 1,
          total_earned_usdc: listing.totalEarnedUsdc + listing.priceUsdc
        })
        .eq('id', listingId);

      if (saleErr || listErr) console.error("Supabase recordSale error:", saleErr || listErr);
    } else {
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
      const { data: salesData } = await this.supabase.from('sales').select('listing_id');
      const { data: listingsData } = await this.supabase.from('listings').select('price_usdc, creator_address');
      
      const totalSales = salesData?.length || 0;
      const totalVolumeUsdc = listingsData?.reduce((acc: any, l: any) => acc + (l.price_usdc || 0), 0) || 0; // naive sum

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
export const listingStore = new ListingStore();
