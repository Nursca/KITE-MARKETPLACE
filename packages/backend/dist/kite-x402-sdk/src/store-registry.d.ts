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
declare class StoreRegistry {
    private stores;
    private readonly dataFile;
    constructor();
    private load;
    private save;
    get(id: string): ShopifyStore | undefined;
    getByUrl(shopUrl: string): ShopifyStore | undefined;
    list(): ShopifyStore[];
    add(args: Partial<ShopifyStore> & {
        shopUrl: string;
    }): ShopifyStore;
    update(id: string, updates: Partial<ShopifyStore>): ShopifyStore | undefined;
    remove(id: string): void;
}
export declare const storeRegistry: StoreRegistry;
export {};
