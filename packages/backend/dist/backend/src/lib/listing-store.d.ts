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
    private mapFromDb;
    private mapToDb;
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
    /**
     * getRecentSales — returns the most recent sales joined with their listing
     * metadata (name, price). Used to power the homepage live transaction feed
     * and the /demo page summary. Defaults to 20 most recent.
     */
    getRecentSales(limit?: number): Promise<Array<{
        buyerAddress: string;
        txHash: string;
        timestamp: string;
        listingId: string;
        listingName: string;
        listingType: string;
        priceUsdc: number;
    }>>;
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
