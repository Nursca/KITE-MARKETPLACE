'use client'

import { useState } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  Shield,
  ExternalLink
} from "lucide-react";

export default function ConnectShopifyPage() {
  const [shopUrl, setShopUrl] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopUrl) return;

    setIsLoading(true);
    
    // Normalize shop URL
    let normalizedUrl = shopUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!normalizedUrl.includes('.myshopify.com')) {
      normalizedUrl += '.myshopify.com';
    }

    // In a real app, this would redirect to the Shopify OAuth URL
    // For this demo, we'll simulate the redirect
    const params = new URLSearchParams({
      shop: normalizedUrl,
      name: storeName,
      description: description
    });

    window.location.href = `/api/shopify/auth?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-background text-on-background font-body">
      {/* TopNavBar */}
      <nav className="bg-background/85 backdrop-blur-xl sticky top-0 z-50 w-full border-b border-outline-variant/10">
        <div className="flex justify-between items-center w-full px-6 md:px-12 py-5 max-w-[1440px] mx-auto">
          <Link href="/" className="text-2xl font-headline italic text-on-background tracking-tighter">
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
          <div className="flex gap-3 items-center">
            <Link href="/" className="bg-surface-container-highest px-5 py-2 text-[11px] font-label uppercase tracking-widest hover:bg-surface-container-high transition-colors">
              Back Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-16">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Side: Form */}
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold font-label uppercase tracking-widest">
                <ShoppingBag className="h-3.5 w-3.5" />
                Shopify Integration
              </div>
              <h1 className="text-5xl font-headline italic tracking-tight">Connect your Store</h1>
              <p className="text-on-surface-variant text-lg max-w-md">
                Enable your products to be discovered and purchased by autonomous AI agents on the Kite Network.
              </p>
            </div>

            <form onSubmit={handleInstall} className="space-y-6 max-w-md">
              <div className="space-y-2">
                <label className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant font-bold">
                  Shopify Store URL *
                </label>
                <input
                  type="text"
                  required
                  placeholder="my-awesome-store.myshopify.com"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:border-primary/60 transition-colors"
                  value={shopUrl}
                  onChange={(e) => setShopUrl(e.target.value)}
                />
                <p className="text-[10px] text-on-surface-variant opacity-60 italic">
                  Example: store-name.myshopify.com
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant font-bold">
                  Store Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Kite Gear Shop"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:border-primary/60 transition-colors"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant font-bold">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="The best place for Kite-native hardware and accessories."
                  rows={3}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 px-4 py-3 text-sm focus:outline-none focus:border-primary/60 transition-colors resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-on-primary py-4 text-xs font-label uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? "Redirecting..." : (
                  <>Install with Shopify <ExternalLink className="h-4 w-4" /></>
                )}
              </button>
            </form>
          </div>

          {/* Right Side: Guidelines */}
          <div className="bg-surface-container-low rounded-3xl p-8 md:p-12 border border-outline-variant/20">
            <h2 className="text-3xl font-headline italic mb-8">How it works</h2>
            
            <div className="space-y-8">
              {[
                {
                  step: "01",
                  title: "Click Install to connect",
                  desc: "Enter your store URL and click the install button to begin the connection process."
                },
                {
                  step: "02",
                  title: "Authorize Permissions",
                  desc: "Redirect to your Shopify Admin to authorize Kite Marketplace to access your product catalog."
                },
                {
                  step: "03",
                  title: "Select Products",
                  desc: "Choose which products you want to make available for AI agents to discover and purchase."
                },
                {
                  step: "04",
                  title: "Receive Orders",
                  desc: "Orders will be automatically created in your Shopify store whenever an AI agent makes a purchase."
                }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-6">
                  <div className="flex-shrink-0 size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-headline italic text-xl">
                    {item.step}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline text-xl italic">{item.title}</h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 rounded-2xl bg-surface-container-highest border border-outline-variant/20 flex items-center gap-4">
              <div className="size-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <Shield className="h-6 w-6" />
              </div>
              <div className="text-xs text-on-surface-variant leading-relaxed">
                <strong>Secure Connection:</strong> Kite Marketplace uses official Shopify OAuth to securely connect to your store. We never store your Shopify password.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
