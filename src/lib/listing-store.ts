/**
 * Kite Marketplace Listing Store
 * 
 * In-memory store for digital listings (APIs, datasets, articles, code, files)
 * built for the Kite Testnet Agentic Economy.
 * 
 * In a production app, this would be a database (PostgreSQL/Supabase/Drizzle).
 */

export interface Listing {
  id: string;
  type: 'api' | 'file' | 'article' | 'dataset' | 'code';
  name: string;
  description: string;
  priceUsdc: number;
  content: string; // Secret content revealed after x402 payment
  preview: string; // Public teaser
  creatorAddress: string;
  createdAt: string;
  salesCount: number;
}

export interface Sale {
  listingId: string;
  buyerAddress: string;
  txHash: string;
  timestamp: string;
}

class ListingStore {
  private listings: Map<string, Listing> = new Map();
  private sales: Sale[] = [];

  constructor() {
    // Seed with some demo listings
    this.seed();
  }

  private seed() {
    this.create({
      id: "lst_demo_1",
      type: "api",
      name: "Kite Network Stats API",
      description: "Real-time gas prices and block times for Kite Testnet.",
      priceUsdc: 0.50,
      content: "ENDPOINT=https://stats.gokite.ai/v1/snapshot?key=KITE_HACKATHON_2026_SECRET",
      preview: "Returns gasPrice, blockTime, activeAgents, and tps.",
      creatorAddress: "0xb23c769dFc7ef020ec60A19567aB675C46a49910"
    });

    this.create({
      id: "lst_demo_2",
      type: "dataset",
      name: "Agentic Commerce Trends 2026",
      description: "CSV dataset of 10,000 autonomous transactions on Kite.",
      priceUsdc: 1.00,
      content: "https://storage.gokite.ai/datasets/agent-trends-apr-2026.csv?sig=abc123xyz",
      preview: "10,000 rows. Columns: timestamp, buyer_type, amount_usdc, category.",
      creatorAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
    });

    this.create({
      id: "lst_demo_3",
      type: "article",
      name: "How to Build Autonomous Sellers",
      description: "A deep dive into the agentic flywheel and x402 mechanics.",
      priceUsdc: 0.25,
      content: "The secret to agentic commerce is the 'Autonomous Seller' pattern where agents generate value and list it directly on-chain...",
      preview: "Master the x402 protocol and create self-sustaining agent economies.",
      creatorAddress: "0xb23c769dFc7ef020ec60A19567aB675C46a49910"
    });
  }

  get(id: string): Listing | undefined {
    return this.listings.get(id);
  }

  list(filters: { type?: string; maxPrice?: number } = {}): Listing[] {
    let result = Array.from(this.listings.values());
    
    if (filters.type) {
      result = result.filter(l => l.type === filters.type);
    }
    
    if (filters.maxPrice !== undefined) {
      result = result.filter(l => l.priceUsdc <= (filters.maxPrice ?? Infinity));
    }
    
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  create(args: Partial<Listing> & { name: string; type: any; priceUsdc: number }): Listing {
    const id = args.id || `lst_${Math.random().toString(36).substring(2, 9)}`;
    const listing: Listing = {
      id,
      description: "",
      preview: "",
      creatorAddress: "0x0000000000000000000000000000000000000000",
      createdAt: new Date().toISOString(),
      salesCount: 0,
      ...args
    } as Listing;
    
    this.listings.set(id, listing);
    return listing;
  }

  recordSale(listingId: string, buyerAddress: string, txHash: string) {
    const listing = this.listings.get(listingId);
    if (listing) {
      listing.salesCount++;
      this.sales.push({
        listingId,
        buyerAddress,
        txHash,
        timestamp: new Date().toISOString()
      });
    }
  }

  getStats() {
    const totalVolume = this.sales.reduce((acc, sale) => {
      const listing = this.listings.get(sale.listingId);
      return acc + (listing?.priceUsdc || 0);
    }, 0);

    return {
      totalListings: this.listings.size,
      totalSales: this.sales.length,
      totalVolumeUsdc: parseFloat(totalVolume.toFixed(2)),
      activeAgents: 124, // Mock
      topSellers: [
        { address: "0xb23c769dFc7ef020ec60A19567aB675C46a49910", sales: 42 },
        { address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", sales: 18 }
      ]
    };
  }
}

// Singleton instance
export const listingStore = new ListingStore();
