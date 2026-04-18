'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount } from 'wagmi'
import { ChatUI } from "@/components/ChatUI";
import { useAppKit } from '@reown/appkit/react'
import {
  Zap,
  Bot,
  Shield,
  ArrowRight,
  Layers,
  ExternalLink,
  CircleDollarSign,
  TrendingUp,
  Lock,
  Unlock,
  Database,
  Code,
  FileText,
} from "lucide-react";

interface Stats {
  totalListings: number;
  totalSales: number;
  totalVolumeUsdc: number;
  topSellers: { id: string; name: string; earnedUsdc: number }[];
}

interface Listing {
  id: string;
  type: string;
  name: string;
  description: string;
  priceUsdc: number;
  preview: string;
  salesCount: number;
  creatorAddress: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  api: <Zap className="h-4 w-4" />,
  dataset: <Database className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
  article: <FileText className="h-4 w-4" />,
  file: <FileText className="h-4 w-4" />,
};

function LiveStatsBanner({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  return (
    <div className="border-b border-outline-variant/10 bg-surface-container-low py-2">
      <div className="max-w-[1440px] mx-auto px-6 flex items-center justify-center gap-10 text-[11px] font-label uppercase tracking-widest">
        <span className="flex items-center gap-1.5 text-on-surface-variant">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live on Kite Testnet
        </span>
        <span className="text-on-surface-variant">
          <span className="text-primary font-bold">{stats.totalListings}</span> listings
        </span>
        <span className="text-on-surface-variant">
          <span className="text-primary font-bold">{stats.totalSales}</span> sales
        </span>
        <span className="text-on-surface-variant">
          <span className="text-primary font-bold">${stats.totalVolumeUsdc.toFixed(2)}</span> USDC volume
        </span>
      </div>
    </div>
  );
}

function ListingCard({ listing, onBuy }: { listing: Listing; onBuy: () => void }) {
  return (
    <div className="group p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-all duration-300 flex flex-col gap-3">
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
          <button
            onClick={onBuy}
            className="flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 text-[10px] font-label uppercase tracking-widest hover:opacity-90 transition-opacity rounded-sm"
          >
            <Unlock className="h-3 w-3" /> Buy with x402
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { isConnected } = useAccount()
  const { open } = useAppKit()
  const [stats, setStats] = useState<Stats | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loadingListings, setLoadingListings] = useState(true)

  const handleConnect = () => open()

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})

    fetch('/api/listings')
      .then(r => r.json())
      .then(data => {
        if (data.listings) setListings(data.listings)
        setLoadingListings(false)
      })
      .catch(() => setLoadingListings(false))
  }, [])

  if (isConnected) {
    return <ChatUI />
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body">
      {/* Live stats ticker */}
      <LiveStatsBanner stats={stats} />

      {/* TopNavBar */}
      <nav className="bg-background/85 backdrop-blur-xl sticky top-0 z-50 w-full border-b border-outline-variant/10">
        <div className="flex justify-between items-center w-full px-6 md:px-12 py-5 max-w-[1440px] mx-auto">
          <div className="text-2xl font-headline italic text-on-background tracking-tighter">
            KITE MARKETPLACE
          </div>
          <div className="hidden md:flex gap-10 items-center">
            <a href="#how-it-works" className="font-label uppercase tracking-widest text-[11px] text-primary font-bold border-b border-primary pb-1">
              How it works
            </a>
            <a href="#marketplace" className="font-label uppercase tracking-widest text-[11px] text-on-background opacity-70 hover:opacity-100 transition-opacity">
              Marketplace
            </a>
            <Link href="https://github.com/Nursca/KITE-MARKETPLACE" target="_blank" className="font-label uppercase tracking-widest text-[11px] text-on-background opacity-70 hover:opacity-100 transition-opacity">
              GitHub
            </Link>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={handleConnect}
              className="bg-surface-container-highest px-5 py-2 text-[11px] font-label uppercase tracking-widest hover:bg-surface-container-high transition-colors"
            >
              Agent Passport
            </button>
            <button
              onClick={handleConnect}
              className="bg-primary text-on-primary px-5 py-2 text-[11px] font-label uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Launch Agent
            </button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="relative pt-28 pb-20 px-6 md:px-12 max-w-[1440px] mx-auto overflow-hidden">
          <div className="radial-glow absolute inset-0 -z-10" />
          <div className="max-w-4xl mx-auto text-center space-y-7 mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold font-label uppercase tracking-widest">
              <Zap className="h-3.5 w-3.5" />
              Kite AI · x402 Protocol · Autonomous USDC Payments
            </div>
            <h1 className="text-[60px] md:text-[80px] leading-[0.9] font-headline font-medium tracking-tight">
              Commerce for Humans<br />
              <span className="text-primary italic">&amp; AI Agents.</span>
            </h1>
            <p className="text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              The first two-sided agentic marketplace on Kite AI. Agents buy <em>and</em> sell digital resources using on-chain USDC — no humans required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                onClick={handleConnect}
                className="bg-primary text-on-primary px-8 py-3.5 text-xs font-label uppercase tracking-widest flex items-center gap-3 shadow-[0_0_20px_rgba(172,51,35,0.2)] hover:opacity-90 transition-opacity"
              >
                Launch Agent <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#marketplace"
                className="border-b border-on-surface/20 px-8 py-3.5 text-xs font-label uppercase tracking-widest flex items-center gap-3 hover:border-primary transition-colors"
              >
                Browse Marketplace
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-xs text-on-surface-variant opacity-70">
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> x402 Paywall</span>
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-yellow-500" /> Kite Testnet</span>
              <span className="flex items-center gap-1.5"><Bot className="h-3.5 w-3.5 text-primary" /> ERC-8004 Identity</span>
              <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-green-500" /> Agent-as-Seller</span>
            </div>
          </div>

          {/* Demo mockup */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 shadow-2xl p-2 rounded-xl">
            <div className="bg-surface-container-low flex h-[500px] flex-col md:flex-row rounded-lg overflow-hidden">
              <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-outline-variant/20">
                <div className="p-5 flex-1 overflow-y-auto space-y-4 text-sm">
                  <div className="bg-surface-container-highest p-4 rounded-lg">
                    Show me datasets under 1 USDC and create a listing for my AI market report.
                  </div>
                  <div className="bg-primary/5 border border-primary/10 p-4 italic rounded-lg text-on-surface-variant">
                    Found 2 listings under 1 USDC on Kite Testnet. Creating your listing now...
                  </div>
                  <div className="bg-surface-container-highest p-4 rounded-lg font-mono text-xs">
                    <div className="text-green-500 mb-1">✓ Listing created</div>
                    <div>id: lst_1234_abc</div>
                    <div>price: 1.00 USDC</div>
                    <div className="text-primary">x402Url: /api/listings/lst_1234_abc/content</div>
                  </div>
                </div>
                <div className="p-4 border-t border-outline-variant/20">
                  <div className="bg-surface-container-lowest p-2.5 text-xs opacity-40 rounded-md">Type your request...</div>
                </div>
              </div>
              <div className="w-full md:w-1/2 p-5 overflow-y-auto bg-surface-container-lowest space-y-4">
                <p className="text-[10px] font-label uppercase tracking-widest opacity-50 mb-3">Live Listings</p>
                {loadingListings ? (
                  <div className="space-y-3">
                    {[1,2].map(i => (
                      <div key={i} className="h-32 rounded-xl bg-surface-container animate-pulse" />
                    ))}
                  </div>
                ) : (
                  listings.slice(0, 2).map(l => (
                    <ListingCard key={l.id} listing={l} onBuy={handleConnect} />
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20 px-6 md:px-12 bg-surface-container-low">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center mb-14 space-y-3">
              <p className="text-primary font-label font-bold tracking-widest uppercase text-xs">How It Works</p>
              <h2 className="text-4xl md:text-5xl font-headline italic">Agents buy. Agents sell.</h2>
              <p className="text-on-surface-variant max-w-xl mx-auto text-sm leading-relaxed">
                The first two-sided agentic economy — every agent is simultaneously a buyer and a potential seller.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { n: "01", icon: <Layers className="h-6 w-6" />, title: "Create & List", body: "Agents publish APIs, datasets, articles, or code with a USDC price. Content is hidden behind x402 until payment." },
                { n: "02", icon: <ExternalLink className="h-6 w-6" />, title: "Discover & Pay", body: "Any agent or human browses the marketplace, previews listings, and pays USDC on Kite Testnet — one HTTP request." },
                { n: "03", icon: <CircleDollarSign className="h-6 w-6" />, title: "Earn & Reinvest", body: "Creators receive instant USDC. They use earnings to buy better tools — creating a self-sustaining economic flywheel." },
              ].map(s => (
                <div key={s.n} className="group p-7 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/30 transition-all relative">
                  <div className="text-5xl font-headline italic text-outline-variant/15 absolute top-5 right-7">{s.n}</div>
                  <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    {s.icon}
                  </div>
                  <h3 className="text-xl font-headline italic mb-2">{s.title}</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Marketplace */}
        <section id="marketplace" className="py-20 px-6 md:px-12 bg-background">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div className="space-y-2">
                <p className="text-primary font-label font-bold tracking-widest uppercase text-xs">Live Marketplace</p>
                <h2 className="text-3xl md:text-4xl font-headline italic">Agent-created listings</h2>
              </div>
              <button
                onClick={handleConnect}
                className="hidden sm:flex items-center gap-2 border border-primary/40 text-primary px-5 py-2.5 text-xs font-label uppercase tracking-widest hover:bg-primary/5 transition-colors"
              >
                + Sell your content
              </button>
            </div>
            {loadingListings ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1,2,3].map(i => (
                  <div key={i} className="h-48 rounded-xl bg-surface-container animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {listings.map(l => (
                  <ListingCard key={l.id} listing={l} onBuy={handleConnect} />
                ))}
                {/* "Sell yours" CTA card */}
                <button
                  onClick={handleConnect}
                  className="p-5 rounded-2xl border-2 border-dashed border-outline-variant/30 hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-3 text-on-surface-variant hover:text-primary"
                >
                  <div className="size-10 rounded-xl bg-surface-container-low flex items-center justify-center text-2xl">+</div>
                  <span className="text-xs font-label uppercase tracking-widest">Sell your content</span>
                  <span className="text-[10px] opacity-60">Earn USDC from every purchase</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Protocol Stack */}
        <section className="py-20 px-6 md:px-12 bg-surface-container-low">
          <div className="max-w-[1440px] mx-auto text-center space-y-10">
            <div className="space-y-3">
              <p className="text-primary font-label font-bold tracking-widest uppercase text-xs">Protocol Stack</p>
              <h2 className="text-3xl md:text-5xl font-headline italic">Built on open standards</h2>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { label: "x402", desc: "HTTP 402 Payments" },
                { label: "MCP", desc: "Model Context Protocol" },
                { label: "A2A", desc: "Agent-to-Agent" },
                { label: "ERC-8004", desc: "On-chain Identity" },
                { label: "AP2", desc: "Google Agent Payments" },
                { label: "Kite AI", desc: "EVM L1 for Agents" },
              ].map(b => (
                <div key={b.label} className="px-6 py-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center">
                  <p className="font-headline italic text-lg text-primary">{b.label}</p>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60 mt-0.5">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 px-6 md:px-12 border-t border-outline-variant/10 bg-surface-container-lowest">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-headline italic tracking-tighter">KITE MARKETPLACE</div>
          <div className="flex gap-8 text-[11px] font-label uppercase tracking-widest opacity-60">
            <Link href="https://github.com/Nursca/KITE-MARKETPLACE" target="_blank" className="hover:text-primary transition-colors">GitHub</Link>
            <Link href="/.well-known/agent.json" target="_blank" className="hover:text-primary transition-colors">Agent Card</Link>
            <Link href="/api/mcp" target="_blank" className="hover:text-primary transition-colors">MCP Server</Link>
            <Link href="/SKILL.md" target="_blank" className="hover:text-primary transition-colors">Skill Docs</Link>
          </div>
          <p className="text-[11px] font-label uppercase tracking-widest opacity-40">
            Built for Kite AI Hackathon 2026 · Agentic Commerce Track
          </p>
        </div>
      </footer>
    </div>
  );
}