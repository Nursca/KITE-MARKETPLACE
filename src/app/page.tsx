'use client'

import Image from "next/image";
import Link from "next/link";
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
  Code,
  FileText,
  Globe,
  ShoppingBag
} from "lucide-react";

export default function Home() {
  const { isConnected } = useAccount()
  const { open } = useAppKit()

  const handleConnect = () => {
    open()
  }

  if (isConnected) {
    return <ChatUI />
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body">
      {/* TopNavBar */}
      <nav className="bg-background/85 backdrop-blur-xl sticky top-0 z-50 transition-opacity duration-300 w-full border-b border-outline-variant/10">
        <div className="flex justify-between items-center w-full px-6 md:px-12 py-6 max-w-[1440px] mx-auto">
          <div className="text-2xl font-headline italic text-on-background tracking-tighter">
            KITE MARKETPLACE
          </div>
          <div className="hidden md:flex gap-10 items-center">
            <Link
              className="font-label uppercase tracking-widest text-[11px] text-primary font-bold border-b border-primary pb-1"
              href="#"
            >
              How it works
            </Link>
            <Link
              className="font-label uppercase tracking-widest text-[11px] text-on-background opacity-70 hover:opacity-100 transition-opacity duration-300"
              href="#"
            >
              Features
            </Link>
            <Link
              className="font-label uppercase tracking-widest text-[11px] text-on-background opacity-70 hover:opacity-100 transition-opacity duration-300"
              href="#"
            >
              Built on Kite AI
            </Link>
          </div>
          <div className="flex gap-4 items-center">
            <button 
              onClick={handleConnect}
              className="bg-surface-container-highest px-6 py-2.5 text-[11px] font-label uppercase tracking-widest hover:bg-surface-container-high transition-colors"
            >
              Agent Passport
            </button>
            <button 
              onClick={handleConnect}
              className="bg-primary text-on-primary px-6 py-2.5 text-[11px] font-label uppercase tracking-widest scale-100 hover:scale-95 transition-all duration-200"
            >
              Launch Agent
            </button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 px-6 md:px-12 max-w-[1440px] mx-auto overflow-hidden">
          <div className="radial-glow absolute inset-0 -z-10"></div>
          
          <div className="max-w-4xl mx-auto text-center space-y-8 mb-20">
             {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold">
              <Zap className="h-4 w-4" />
              x402 Protocol &middot; Autonomous Payments
            </div>

            <h1 className="text-[64px] md:text-[84px] leading-[0.9] font-headline font-medium tracking-tight">
              Commerce for Humans <br />
              <span className="text-primary italic">&amp; AI Agents.</span>
            </h1>
            
            <p className="text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              The first AI-native marketplace built on Kite AI. Paywall your APIs, files, articles, and stores. 
              Autonomous agents discover, pay, and settle on-chain with zero friction.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button 
                onClick={handleConnect}
                className="bg-primary text-on-primary px-8 py-4 text-sm font-label uppercase tracking-widest flex items-center gap-3 group shadow-[0_0_20px_rgba(172,51,35,0.2)]"
              >
                Start shopping free
                <ArrowRight className="h-5 w-5" />
              </button>
              <button className="border-b border-on-surface/20 px-8 py-4 text-sm font-label uppercase tracking-widest flex items-center gap-3 hover:border-primary transition-colors">
                <span className="material-symbols-outlined">play_circle</span>
                Watch demo
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 pt-12 text-sm text-on-surface-variant opacity-70">
              <div className="flex items-center gap-1.5 font-medium">
                <Shield className="h-4 w-4 text-primary" /> Secure Payments
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Zap className="h-4 w-4 text-tertiary" /> Instant Settlement
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Bot className="h-4 w-4 text-primary" /> AI-Native
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/30 shadow-2xl p-2 rounded-xl">
            <div className="bg-surface-container-low flex h-[540px] flex-col md:flex-row rounded-lg overflow-hidden">
              {/* Mockup Sidebar: Chat */}
              <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-outline-variant/20">
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                  <div className="bg-surface-container-highest p-4 text-sm rounded-lg">
                    I&apos;m looking for a minimal mechanical keyboard, olive
                    green, with silent switches. Budget is $200.
                  </div>
                  <div className="bg-primary-container/10 p-4 text-sm italic rounded-lg">
                    Curating options for your workspace... Found 3 matches
                    matching your aesthetic and technical specs.
                  </div>
                </div>
                <div className="p-6 border-t border-outline-variant/20">
                  <div className="bg-surface-container-lowest p-3 text-xs opacity-40 rounded-md">
                    Type your request...
                  </div>
                </div>
              </div>
              {/* Mockup Content: Results */}
              <div className="w-full md:w-1/2 p-6 overflow-y-auto bg-surface-container-lowest">
                <div className="space-y-6">
                  <div className="group">
                    <div className="aspect-[4/3] bg-surface-container mb-3 overflow-hidden relative rounded-lg">
                      <Image
                        className="w-full h-full object-cover"
                        alt="minimalist mechanical keyboard"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBCSZxoWNjQUQNbhrm_KquDDpy4a4wLNRum6wyiyqVQ_Rc0V_UeMoVKXMC6m2QEucueLTkKqt-HgO-YmKm-BUF18RTYsAoWrKc6xt8mgOJTAHE2sHnWlQ0F71Avvc7um8GH8SIPK_y1LAx2j1pjJT5cFKFWhoHjzpCG6rjPOfC6eombR9j5uhGOOuYoG02KT9T_QtF98OBukkD-oMVYJ2IqPUogQp9GpQeLrOs0XaH58y1mZT03YtWuoV2p_IkzI7lrrKMDURHuf3u"
                        fill
                      />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-headline text-lg italic">
                          Terra Series Mk.I
                        </h4>
                        <p className="text-[10px] uppercase tracking-widest opacity-60 font-label">
                          Custom Built
                        </p>
                      </div>
                      <span className="font-bold text-primary">$189.00</span>
                    </div>
                  </div>
                  <div className="opacity-50 blur-[1px]">
                    <div className="aspect-[4/3] bg-surface-container mb-3 rounded-lg"></div>
                    <div className="h-4 w-3/4 bg-surface-container mb-2"></div>
                    <div className="h-4 w-1/4 bg-surface-container"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 px-6 md:px-12 bg-surface-container-low">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center mb-16 space-y-4">
              <p className="text-primary font-label font-bold tracking-widest uppercase text-xs">How It Works</p>
              <h2 className="text-4xl md:text-5xl font-headline italic">Three steps. That&apos;s it.</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="group p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/30 transition-all duration-300 relative">
                <div className="text-6xl font-headline italic text-outline-variant/20 group-hover:text-primary/10 transition-colors absolute top-6 right-8">01</div>
                <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Layers className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-headline italic mb-3">Create</h3>
                <p className="text-on-surface-variant leading-relaxed text-sm">Paywall your APIs, files, articles, or connect your Shopify store.</p>
              </div>

              <div className="group p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/30 transition-all duration-300 relative">
                <div className="text-6xl font-headline italic text-outline-variant/20 group-hover:text-primary/10 transition-colors absolute top-6 right-8">02</div>
                <div className="size-14 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ExternalLink className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-headline italic mb-3">Share</h3>
                <p className="text-on-surface-variant leading-relaxed text-sm">Share your unique SuperPage link. Anyone — humans or AI agents — can pay and access.</p>
              </div>

              <div className="group p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/30 transition-all duration-300 relative">
                <div className="text-6xl font-headline italic text-outline-variant/20 group-hover:text-primary/10 transition-colors absolute top-6 right-8">03</div>
                <div className="size-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <CircleDollarSign className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-headline italic mb-3">Earn</h3>
                <p className="text-on-surface-variant leading-relaxed text-sm">Instant USDC on Kite. No waiting, no fees, no middlemen.</p>
              </div>
            </div>
          </div>
        </section>

        {/* AI-Native Protocol */}
        <section className="py-24 px-6 md:px-12 bg-background relative overflow-hidden">
          <div className="max-w-[1440px] mx-auto text-center space-y-12">
            <div className="space-y-4">
              <p className="text-primary font-label font-bold tracking-widest uppercase text-xs">AI-Native Protocol</p>
              <h2 className="text-4xl md:text-6xl font-headline italic">
                The Internet&apos;s Missing Payment Layer
              </h2>
              <p className="text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
                AI agents need to access paid resources, make purchases, and interact with services.
                x402 provides a standard HTTP protocol that any agent can use.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {[
                { label: "x402", desc: "HTTP 402" },
                { label: "MCP", desc: "Model Context" },
                { label: "A2A", desc: "Agent-to-Agent" },
                { label: "ERC-8004", desc: "Trustless Agents" },
              ].map((badge) => (
                <div
                  key={badge.label}
                  className="px-8 py-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-center min-w-[160px]"
                >
                  <p className="font-headline italic text-xl text-primary">{badge.label}</p>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 md:px-12 border-t border-outline-variant/10 bg-surface-container-lowest">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-xl font-headline italic text-on-background tracking-tighter">
            KITE MARKETPLACE
          </div>
          <div className="flex gap-8 text-[11px] font-label uppercase tracking-widest opacity-60">
            <Link href="#" className="hover:text-primary transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-primary transition-colors">GitHub</Link>
            <Link href="#" className="hover:text-primary transition-colors">Docs</Link>
          </div>
          <p className="text-[11px] font-label uppercase tracking-widest opacity-40">
            &copy; 2026 Kite Marketplace. Built on Flow & Kite.
          </p>
        </div>
      </footer>
    </div>
  );
}
