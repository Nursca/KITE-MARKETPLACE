'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X as XClose } from "lucide-react";
import { 
  Store, 
  Trash2, 
  ExternalLink, 
  Plus, 
  ArrowLeft,
  ShoppingBag,
  CheckCircle2,
  RefreshCw,
  X,
  Loader2,
  Lock,
  Zap,
  Database,
  Code,
  FileText,
  Layers
} from "lucide-react";
import Image from "next/image";
import { Toast } from "@/components/Toast";

interface ShopifyStore {
  id: string;
  shopUrl: string;
  name: string;
  description: string;
  isConnected: boolean;
  createdAt: string;
}

interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
}

interface Listing {
  id: string;
  type: string;
  name: string;
  description: string;
  priceUsdc: number;
  preview: string;
  salesCount: number;
  totalEarnedUsdc: number;
  creatorAddress: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  api: <Zap className="h-4 w-4" />,
  dataset: <Database className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
  article: <FileText className="h-4 w-4" />,
  file: <FileText className="h-4 w-4" />,
  shopify: <ShoppingBag className="h-4 w-4" />,
};

const MERCHANT_ADDRESS = '0xb23c769dFc7ef020ec60A19567aB675C46a49910';

export default function StoresPage() {
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingListings, setLoadingListings] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Import Modal State
  const [importStoreId, setImportStoreId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchStoresList();
    fetchMyListings();
  }, []);

  const fetchStoresList = async () => {
    try {
      const response = await fetch('/api/shopify/stores');
      const data = await response.json();
      setStores(data.stores);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch stores", error);
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    try {
      const response = await fetch(`/api/listings?creatorAddress=${MERCHANT_ADDRESS}`);
      const data = await response.json();
      if (data.listings) {
        setMyListings(data.listings);
      }
      setLoadingListings(false);
    } catch (error) {
      console.error("Failed to fetch listings", error);
      setLoadingListings(false);
    }
  };

  const handleOpenImport = async (storeId: string) => {
    setImportStoreId(storeId);
    setIsImportModalOpen(true);
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/shopify/products?storeId=${storeId}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      console.error("Fetch products error");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleImport = async (product: ShopifyProduct) => {
    setImportingId(product.id);
    try {
      const store = stores.find(s => s.id === importStoreId);
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'shopify',
          name: product.title,
          description: product.description,
          priceUsdc: product.price,
          content: `SHOPIFY_STORE=${store?.shopUrl}\nPRODUCT_ID=${product.id}\nVARIANT_ID=default`,
          preview: `Physical product from ${store?.name}. Ships worldwide.`,
          creatorAddress: MERCHANT_ADDRESS
        })
      });
      
      if (res.ok) {
        setToast({ message: `Successfully imported "${product.title}" to marketplace!`, type: 'success' });
        fetchMyListings();
      } else {
        setToast({ message: "Failed to import product", type: 'error' });
      }
    } catch {
      setToast({ message: "An error occurred during import", type: 'error' });
    } finally {
      setImportingId(null);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this store?")) return;
    
    try {
      await fetch('/api/shopify/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'remove' })
      });
      fetchStoresList();
    } catch (error) {
      console.error("Failed to remove store", error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background font-body">
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      
      {/* TopNavBar */}
      <nav className="bg-background/85 backdrop-blur-xl sticky top-0 z-50 w-full border-b border-outline-variant/10">
        <div className="flex justify-between items-center w-full px-4 sm:px-6 md:px-12 py-4 md:py-5 max-w-[1440px] mx-auto">
          <Link href="/" className="text-xl sm:text-2xl font-headline italic text-on-background tracking-tighter">
            KITE MARKETPLACE
          </Link>
          <div className="hidden md:flex gap-10 items-center">
            <Link href="/#how-it-works" className="font-label uppercase tracking-widest text-[11px] text-on-background opacity-70 hover:opacity-100 transition-opacity">
              How it works
            </Link>
            <Link href="/#marketplace" className="font-label uppercase tracking-widest text-[11px] text-on-background opacity-70 hover:opacity-100 transition-opacity">
              Marketplace
            </Link>
            <Link href="/stores" className="font-label uppercase tracking-widest text-[11px] text-primary font-bold border-b border-primary pb-1">
              My Stores
            </Link>
          </div>
          <div className="flex gap-2 sm:gap-3 items-center">
            <Link href="/connect-shopify" className="bg-primary text-on-primary px-4 sm:px-5 py-2 text-[10px] sm:text-[11px] font-label uppercase tracking-widest hover:opacity-90 transition-opacity">
              + Connect Store
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-on-background hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <XClose className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-outline-variant/10 bg-background/95 backdrop-blur-xl px-4 py-4 space-y-3">
            <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block font-label uppercase tracking-widest text-[11px] text-on-background opacity-70 py-2">How it works</Link>
            <Link href="/#marketplace" onClick={() => setMobileMenuOpen(false)} className="block font-label uppercase tracking-widest text-[11px] text-on-background opacity-70 py-2">Marketplace</Link>
            <Link href="/stores" onClick={() => setMobileMenuOpen(false)} className="block font-label uppercase tracking-widest text-[11px] text-primary font-bold py-2">My Stores</Link>
          </div>
        )}
      </nav>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-label font-bold uppercase tracking-widest text-xs">
              <ShoppingBag className="h-3.5 w-3.5" />
              Merchant Hub
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline italic">Your Shopify Stores</h1>
            <p className="text-on-surface-variant max-w-xl text-sm leading-relaxed">
              Manage your connected Shopify stores and monitor agentic commerce performance.
            </p>
          </div>
          <Link 
            href="/connect-shopify"
            className="flex items-center gap-2 bg-surface-container-highest px-6 py-3 text-xs font-label uppercase tracking-widest hover:bg-surface-container-high transition-colors self-start"
          >
            <Plus className="h-4 w-4" /> Add new store
          </Link>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 rounded-3xl bg-surface-container-low animate-pulse border border-outline-variant/10" />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="bg-surface-container-low rounded-3xl p-16 text-center border border-dashed border-outline-variant/30 max-w-3xl mx-auto">
            <div className="size-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
              <Store className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-headline italic mb-3">No stores connected yet</h2>
            <p className="text-on-surface-variant text-sm max-w-sm mx-auto mb-8 leading-relaxed">
              Connect your Shopify store to allow AI agents to discover and purchase your products on the Kite Network.
            </p>
            <Link 
              href="/connect-shopify"
              className="bg-primary text-on-primary px-8 py-4 text-xs font-label uppercase tracking-widest inline-flex items-center gap-3 hover:opacity-90 transition-opacity"
            >
              Connect your first store <ArrowLeft className="h-4 w-4 rotate-180" />
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map(store => (
              <div key={store.id} className="group bg-surface-container-lowest border border-outline-variant/20 rounded-3xl p-6 hover:border-primary/40 transition-all duration-300 flex flex-col gap-6">
                <div className="flex items-start justify-between">
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold font-label uppercase tracking-widest">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-headline italic">{store.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant opacity-60">
                    <span className="font-mono">{store.shopUrl}</span>
                    <Link href={`https://${store.shopUrl}`} target="_blank" className="hover:text-primary">
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                <p className="text-sm text-on-surface-variant line-clamp-2 italic h-10 opacity-80">
                  {store.description || "No description provided for this store."}
                </p>

                <div className="mt-auto flex items-center gap-3 pt-4 border-t border-outline-variant/10">
                  <button 
                    onClick={() => handleOpenImport(store.id)}
                    className="flex-1 bg-surface-container-highest py-3 text-[10px] font-label uppercase tracking-widest hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Import Products
                  </button>
                  <button 
                    onClick={() => handleRemove(store.id)}
                    className="size-10 flex items-center justify-center text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {/* Add another store CTA */}
            <Link 
              href="/connect-shopify"
              className="group border-2 border-dashed border-outline-variant/30 rounded-3xl p-6 hover:border-primary/40 transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center min-h-[280px]"
            >
              <div className="size-14 rounded-full bg-surface-container-low text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors">
                <Plus className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="font-label uppercase tracking-widest text-xs font-bold text-on-surface-variant group-hover:text-primary transition-colors">Connect Another Store</p>
                <p className="text-[10px] text-on-surface-variant opacity-50 italic">Expand your agentic reach</p>
              </div>
            </Link>
          </div>
        )}

        {/* My Marketplace Listings Section */}
        <div className="mt-20 mb-8 sm:mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-label font-bold uppercase tracking-widest text-xs">
              <Zap className="h-3.5 w-3.5" />
              Kite Marketplace
            </div>
            <h2 className="text-3xl sm:text-4xl font-headline italic">Your Active Listings</h2>
            <p className="text-on-surface-variant max-w-xl text-sm leading-relaxed">
              Digital assets and Shopify products you are currently selling on the Kite Network.
            </p>
          </div>
        </div>

        {loadingListings ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 rounded-2xl bg-surface-container-low animate-pulse border border-outline-variant/10" />
            ))}
          </div>
        ) : myListings.length === 0 ? (
          <div className="bg-surface-container-low rounded-3xl p-12 text-center border border-dashed border-outline-variant/30 max-w-3xl">
            <p className="text-on-surface-variant italic text-sm mb-0">You haven't created any marketplace listings yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {myListings.map(listing => (
              <div key={listing.id} className="group p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-all duration-300 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      {TYPE_ICONS[listing.type] || <Layers className="h-4 w-4" />}
                    </span>
                    <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant opacity-60">
                      {listing.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-primary font-bold text-sm">
                    <Lock className="h-3 w-3" />
                    {listing.priceUsdc.toFixed(2)} USDC
                  </div>
                </div>
                <div>
                  <h3 className="font-headline italic text-base mb-1">{listing.name}</h3>
                  <p className="text-xs text-on-surface-variant opacity-70 line-clamp-2">{listing.description}</p>
                </div>
                <div className="mt-auto">
                  <p className="text-[10px] text-on-surface-variant opacity-50 mb-3 italic">{listing.preview}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-on-surface-variant opacity-40 font-label">
                      {listing.salesCount} sold
                    </span>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 text-green-500 text-[10px] font-bold font-label uppercase tracking-widest">
                      Active
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)} />
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative z-10 shadow-2xl">
            <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-headline italic">Import Products</h2>
                  <p className="text-xs text-on-surface-variant opacity-60">Select products from {stores.find(s => s.id === importStoreId)?.name} to list on Kite</p>
                </div>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="size-10 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingProducts ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-sm font-label uppercase tracking-widest opacity-50">Fetching your inventory...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4 text-center">
                  <ShoppingBag className="h-12 w-12 opacity-20" />
                  <p className="text-sm text-on-surface-variant opacity-60">No products found in this store.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {products.map(product => (
                    <div key={product.id} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex gap-4 group hover:border-primary/30 transition-all">
                      <div className="size-20 rounded-xl bg-surface-container-lowest overflow-hidden flex-shrink-0 border border-outline-variant/10 relative">
                        {product.images?.[0] ? (
                          <Image src={product.images[0]} alt={product.title} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-on-surface-variant opacity-20">
                            <ShoppingBag className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="font-headline italic text-lg truncate mb-0.5">{product.title}</h4>
                          <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{product.price} USDC</p>
                        </div>
                        <button
                          onClick={() => handleImport(product)}
                          disabled={importingId === product.id}
                          className="mt-2 w-full py-2 rounded-lg bg-primary text-on-primary text-[10px] font-label uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {importingId === product.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <><Plus className="h-3 w-3" /> Import Product</>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-surface-container-low border-t border-outline-variant/10 flex items-center justify-between">
              <p className="text-[10px] text-on-surface-variant opacity-50 uppercase tracking-widest">
                {products.length} products found
              </p>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="px-6 py-2.5 text-xs font-label uppercase tracking-widest bg-surface-container-highest hover:bg-surface-container-high transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
