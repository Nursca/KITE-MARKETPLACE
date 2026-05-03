/**
 * Kite Marketplace Listing Store
 *
 * Migrated to Supabase (PostgreSQL) for production-grade persistence.
 * Includes a local JSON fallback for development without a DB.
 */
export interface Listing {
    id: string;
    type: 'api' | 'file' | 'article' | 'dataset' | 'code' | 'shopify';
    name: string;
    description: string;
    priceUsdc: number;
    content: string;
    preview: string;
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
declare class ListingStore {
    private supabase;
    private listings;
    private sales;
    private readonly dataDir;
    private readonly listingsFile;
    private readonly salesFile;
    private isUsingSupabase;
    constructor();
    private ensureDataDir;
    private loadLocal;
    private saveLocal;
    private seed;
    get(id: string): Promise<Listing | undefined>;
    list(filters?: {
        type?: string;
        maxPrice?: number;
        creatorAddress?: string;
    }): Promise<Listing[]>;
    create(args: Partial<Listing> & {
        name: string;
        type: any;
        priceUsdc: number;
    }): Promise<Listing>;
    recordSale(listingId: string, buyerAddress: string, txHash: string): Promise<void>;
    getStats(): Promise<{
        totalListings: number;
        totalSales: number;
        totalVolumeUsdc: number;
        activeAgents: number;
        topSellers: {
            address: string;
            sales: number;
        }[];
    }>;
}
export declare const listingStore: ListingStore;
export {};
