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
    private listings;
    private sales;
    constructor();
    private seed;
    get(id: string): Listing | undefined;
    list(filters?: {
        type?: string;
        maxPrice?: number;
    }): Listing[];
    create(args: Partial<Listing> & {
        name: string;
        type: any;
        priceUsdc: number;
    }): Listing;
    recordSale(listingId: string, buyerAddress: string, txHash: string): void;
    getStats(): {
        totalListings: number;
        totalSales: number;
        totalVolumeUsdc: number;
        activeAgents: number;
        topSellers: {
            address: string;
            sales: number;
        }[];
    };
}
export declare const listingStore: ListingStore;
export {};
