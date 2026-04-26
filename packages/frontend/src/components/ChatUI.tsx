'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useAccount, useDisconnect, useBalance, useWalletClient, useReadContract } from 'wagmi'
import { formatUnits, erc20Abi } from 'viem'
import { useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, Unlock, Zap, Database, Code, FileText, Layers, TrendingUp, ExternalLink, Plus, ShoppingBag, Shield, Menu, X as XIcon } from 'lucide-react'

const USDC_ADDRESS = '0x534b2f3A21130d7a60830c2Df862319e593943A3'

import { kiteTestnet } from '@kite/x402-sdk'
import { useCartStore, Product } from '@/store/cartStore'
import { UIMessage as Message, readUIMessageStream } from 'ai'
import { ProductCardSkeleton } from './ProductCardSkeleton'
import { checkout, OrderConfirmation } from '@/lib/checkout'
import { OrderConfirmationModal } from './OrderConfirmationModal'
import { PassportView } from './PassportView'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchArgs { query: string; maxPrice?: number; category?: string }
interface AddToCartResult { success: boolean; product: Product; quantity: number }
interface ToolInvocation {
  state: 'partial-call' | 'call' | 'result'
  toolCallId: string
  toolName: string
  args: unknown
  result?: unknown
}
interface ExtendedMessage extends Message { toolInvocations?: ToolInvocation[] }

interface Listing {
  id: string; type: string; name: string; description: string
  priceUsdc: number; preview: string; salesCount: number
  totalEarnedUsdc: number; creatorAddress: string; createdAt: string
}

interface MarketplaceStats {
  totalListings: number; totalSales: number; totalVolumeUsdc: number
  topSellers: { id: string; name: string; earnedUsdc: number }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  api: <Zap className="h-4 w-4" />,
  dataset: <Database className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
  article: <FileText className="h-4 w-4" />,
  file: <FileText className="h-4 w-4" />,
}

function ListingCard({ listing, onBuy }: { listing: Listing; onBuy: (id: string) => void }) {
  return (
    <div className="group p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-all flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">{TYPE_ICONS[listing.type] || <Layers className="h-4 w-4" />}</span>
          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant opacity-60">{listing.type}</span>
        </div>
        <div className="flex items-center gap-1 text-primary font-bold text-sm">
          <Lock className="h-3 w-3" />{listing.priceUsdc.toFixed(2)} USDC
        </div>
      </div>
      <div>
        <h3 className="font-headline italic text-base mb-1">{listing.name}</h3>
        <p className="text-xs text-on-surface-variant opacity-70 line-clamp-2">{listing.description}</p>
      </div>
      <div className="mt-auto">
        <p className="text-[10px] text-on-surface-variant opacity-50 mb-3 italic">{listing.preview}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-on-surface-variant opacity-40">{listing.salesCount} sold · {listing.totalEarnedUsdc.toFixed(2)} earned</span>
          <button
            onClick={() => onBuy(listing.id)}
            className="flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 text-[10px] font-label uppercase tracking-widest hover:opacity-90 transition-opacity rounded-sm"
          >
            <Unlock className="h-3 w-3" /> Buy x402
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tool result renderers ────────────────────────────────────────────────────

function ToolResultBubble({ invocation }: { invocation: ToolInvocation }) {
  const { toolName, state, result } = invocation
  if (state !== 'result' || !result) return null

  const r = result as any

  if (toolName === 'browseListings') {
    const listings: Listing[] = r.listings || []
    const stats: MarketplaceStats = r.stats
    return (
      <div className="mt-2 space-y-3">
        {stats && (
          <div className="flex gap-4 text-[10px] font-label uppercase tracking-widest text-on-surface-variant opacity-60">
            <span><span className="text-primary font-bold">{stats.totalListings}</span> listings</span>
            <span><span className="text-primary font-bold">{stats.totalSales}</span> sales</span>
            <span><span className="text-primary font-bold">${stats.totalVolumeUsdc.toFixed(2)}</span> vol</span>
          </div>
        )}
        <div className="grid gap-3">
          {listings.slice(0, 4).map(l => (
            <div key={l.id} className="bg-surface-container p-3 rounded-lg border border-outline-variant/20 text-sm">
              <div className="flex justify-between items-start">
                <span className="font-medium">{l.name}</span>
                <span className="text-primary font-bold text-xs">{l.priceUsdc.toFixed(2)} USDC</span>
              </div>
              <p className="text-xs opacity-60 mt-1">{l.preview}</p>
              <code className="text-[10px] opacity-40 mt-1 block">{l.id}</code>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (toolName === 'createListing') {
    return (
      <div className="mt-2 bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-sm space-y-1">
        <p className="text-green-600 dark:text-green-400 font-bold text-xs uppercase tracking-widest">✓ Listing created</p>
        <p className="font-mono text-xs opacity-70">ID: {r.listingId}</p>
        <p className="font-mono text-xs opacity-70 break-all">x402: {r.x402Url}</p>
        <p className="text-xs opacity-60">{r.message}</p>
      </div>
    )
  }

  if (toolName === 'autonomousPurchase') {
    const success = r.status !== 'wallet_not_configured' && !r.error
    return (
      <div className={`mt-2 p-3 rounded-lg text-sm space-y-1 border ${success ? 'bg-primary/5 border-primary/20' : 'bg-surface-container border-outline-variant/20'}`}>
        {success ? (
          <>
            <p className="text-primary font-bold text-xs uppercase tracking-widest">✓ Purchase complete</p>
            <p className="font-mono text-xs opacity-70">tx: {r.txHash || r.transactionHash}</p>
          </>
        ) : (
          <>
            <p className="font-bold text-xs uppercase tracking-widest opacity-70">x402 Demo Mode</p>
            <p className="text-xs opacity-60">{r.message}</p>
            <p className="font-mono text-xs opacity-50 break-all">{r.x402Url}</p>
          </>
        )}
      </div>
    )
  }

  if (toolName === 'getMarketplaceStats') {
    return (
      <div className="mt-2 grid grid-cols-3 gap-2">
        {[
          { label: 'Listings', val: r.totalListings },
          { label: 'Sales', val: r.totalSales },
          { label: 'Vol (USDC)', val: `$${(r.totalVolumeUsdc || 0).toFixed(2)}` },
        ].map(s => (
          <div key={s.label} className="bg-surface-container p-3 rounded-lg text-center">
            <p className="text-primary font-bold text-lg font-headline">{s.val}</p>
            <p className="text-[10px] uppercase tracking-widest opacity-60">{s.label}</p>
          </div>
        ))}
      </div>
    )
  }

  if (toolName === 'previewListing' && r.listing) {
    const l = r.listing
    return (
      <div className="mt-2 bg-surface-container border border-outline-variant/20 p-3 rounded-lg text-sm space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-medium">{l.name}</span>
          <span className="text-primary font-bold text-xs">{l.priceUsdc?.toFixed(2)} USDC</span>
        </div>
        <p className="text-xs opacity-60">{l.description}</p>
        <p className="text-[10px] italic opacity-50">{l.preview}</p>
        <code className="text-[10px] opacity-40 block">{l.id}</code>
      </div>
    )
  }

  if (toolName === 'getAgentWalletAddress') {
    return (
      <div className="mt-2 bg-surface-container border border-outline-variant/20 p-3 rounded-lg text-xs space-y-1 font-mono">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 font-sans">Agent Wallet</p>
        <p className="break-all">{r.agentAddress}</p>
        <p className="opacity-50 font-sans">Kite Testnet · chainId {r.chainId} · USDC</p>
      </div>
    )
  }

  return null
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ChatUI() {
  const { address, chain } = useAccount()
  const { disconnect } = useDisconnect()
  useQueryClient()
  const { data: balance } = useBalance({ address })

  const [mounted, setMounted] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [passport, setPassport] = useState<any | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [activeView, setActiveView] = useState<'chat' | 'discovery' | 'merchant' | 'identity'>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Discovery + Merchant data
  const [listings, setListings] = useState<Listing[]>([])
  const [listingsLoading, setListingsLoading] = useState(true)
  const [marketStats, setMarketStats] = useState<MarketplaceStats | null>(null)

  // Create listing form
  const [createForm, setCreateForm] = useState({ type: 'api', name: '', description: '', priceUsdc: '0.50', content: '', preview: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && address) {
      const savedId = localStorage.getItem(`kite_agent_${address.toLowerCase()}`)
      if (savedId) setAgentId(savedId)
    }
  }, [address])

  // Load Passport data
  useEffect(() => {
    if (!agentId) return;
    // In a real app, this tool would exist. For now we simulate or use the existing lookup tools.
    fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        jsonrpc: '2.0', id: 2, method: 'tools/call', 
        params: { name: 'check_reputation', arguments: { agentId } } 
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.result) {
          const res = JSON.parse(data.result.content[0].text)
          if (res.success) {
            setPassport({
              agentId,
              tier: res.feedbackCount > 5 ? 3 : res.feedbackCount > 2 ? 2 : 1,
              reputation: res.averageScore,
              totalVolume: res.feedbackCount * 25, // Simulated
              did: `did:kite:${address}`,
              lastUpdated: new Date().toISOString()
            })
          }
        }
      })
      .catch(() => {})
  }, [agentId, address])

  // Auto-lookup identity on connect
  useEffect(() => {
    if (!mounted || !address || agentId) return
    fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'lookup_identity_by_owner', arguments: { ownerAddress: address } } })
    })
      .then(r => r.json())
      .then(data => {
        if (data.result) {
          const result = JSON.parse(data.result.content[0].text)
          if (result.success && result.found) {
            setAgentId(result.agentId)
            localStorage.setItem(`kite_agent_${address.toLowerCase()}`, result.agentId)
          }
        }
      })
      .catch(() => {})
  }, [address, mounted, agentId])

  // Load listings + stats for discovery/merchant views
  useEffect(() => {
    fetch('/api/listings')
      .then(r => r.json())
      .then(d => { setListings(d.listings || []); setMarketStats(d.stats); setListingsLoading(false) })
      .catch(() => setListingsLoading(false))
  }, [])

  const { data: usdcBalanceValue } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  const usdcBalance = useMemo(() => {
    if (usdcBalanceValue === undefined) return null
    return { value: usdcBalanceValue as bigint, decimals: 6, symbol: 'USDC' }
  }, [usdcBalanceValue])

  const { data: walletClient } = useWalletClient()
  const { items: cart, addItem, removeItem } = useCartStore()

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', parts: [{ type: 'text', text: "Hi! I'm KIMA — your autonomous Kite Marketplace agent. I can help you discover and buy digital resources, or help you create listings to earn USDC. What would you like to do?" }] }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [currentProducts, setCurrentProducts] = useState<Product[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'success'>('idle')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null)

  const isWrongNetwork = chain?.id !== kiteTestnet.id

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    const lastMessage = messages[messages.length - 1] as ExtendedMessage
    if (lastMessage?.role === 'assistant' && lastMessage.toolInvocations) {
      const searchInv = lastMessage.toolInvocations.find(inv => inv.toolName === 'searchProducts')
      if (searchInv?.state === 'result') { setCurrentProducts(searchInv.result as Product[]); setIsSearching(false) }
      else if (searchInv?.state === 'call') setIsSearching(true)

      const addInv = lastMessage.toolInvocations.find(inv => inv.toolName === 'addToCart')
      if (addInv?.state === 'result' && (addInv.result as AddToCartResult).success) {
        addItem((addInv.result as AddToCartResult).product, (addInv.result as AddToCartResult).quantity)
        setIsCartOpen(true)
      }

      // Refresh listings after a create
      const createInv = lastMessage.toolInvocations.find(inv => inv.toolName === 'createListing')
      if (createInv?.state === 'result') {
        fetch('/api/listings').then(r => r.json()).then(d => { setListings(d.listings || []); setMarketStats(d.stats) }).catch(() => {})
      }
    }
  }, [messages, addItem])

  const handleCheckout = async () => {
    if (!walletClient) { setPaymentError('Wallet not connected'); return }
    if (isWrongNetwork) { setPaymentError('Please switch to Kite testnet'); return }
    setCheckoutStatus('processing'); setPaymentError(null)
    try {
      const confirmation = await checkout(cart, cartTotal, walletClient)
      setOrderConfirmation(confirmation); setCheckoutStatus('success')
      useCartStore.getState().clearCart()
      setIsCartOpen(false); setIsCheckoutOpen(false)
      await handleSubmit(undefined, `Payment confirmed. Transaction hash: ${confirmation.txHash}.`)
    } catch (err: any) {
      setCheckoutStatus('idle'); setPaymentError(err.message || 'Payment failed')
    }
  }

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault()
    const text = overrideInput ?? input
    if (!text.trim() || isLoading) return
    const userMessage: Message = { id: Date.now().toString(), role: 'user', parts: [{ type: 'text', text }] }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages); setInput(''); setIsLoading(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.parts.filter(p => p.type === 'text').map(p => p.type === 'text' ? p.text : '').join('') })) })
      })
      if (!response.ok) throw new Error('Failed to fetch')
      if (!response.body) throw new Error('No body')
      const messageStream = readUIMessageStream({ stream: response.body as any })
      for await (const message of messageStream) {
        setMessages(prev => {
          const index = prev.findIndex(m => m.id === message.id)
          if (index !== -1) { const updated = [...prev]; updated[index] = message; return updated }
          return [...prev, message]
        })
      }
    } catch {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', parts: [{ type: 'text', text: 'Sorry, I hit an error. Check your OPENAI_API_KEY env var.' }] }])
    } finally { setIsLoading(false) }
  }

  const handleBuyListing = (listingId: string) => {
    handleSubmit(undefined, `Buy listing ${listingId} for me using the autonomous agent wallet.`)
    setActiveView('chat')
  }

  const handleRegisterIdentity = async () => {
    if (!address) return; setIsRegistering(true)
    try {
      const data = await fetch('/api/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'register_identity', arguments: {} } }) }).then(r => r.json())
      if (data.result) {
        const result = JSON.parse(data.result.content[0].text)
        if (result.success) { setAgentId(result.agentId); localStorage.setItem(`kite_agent_${address.toLowerCase()}`, result.agentId) }
      }
    } catch {}
    finally { setIsRegistering(false) }
  }

  const handleCreateListing = async () => {
    if (!address || !createForm.name || !createForm.content) return
    setCreating(true)
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createForm, priceUsdc: parseFloat(createForm.priceUsdc), creatorAddress: address })
      })
      const data = await res.json()
      if (data.success) {
        setListings(prev => [...prev, { ...data.listing, content: '', salesCount: 0, totalEarnedUsdc: 0, creatorAddress: address, createdAt: new Date().toISOString() }])
        setCreateForm({ type: 'api', name: '', description: '', priceUsdc: '0.50', content: '', preview: '' })
      }
    } catch {}
    finally { setCreating(false) }
  }

  const cartTotal = useMemo(() => cart.reduce((t, i) => t + i.priceUsdc * i.quantity, 0), [cart])
  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const isOverlayOpen = isCartOpen || isCheckoutOpen

  // My listings (created by connected wallet)
  const myListings = listings.filter(l => l.creatorAddress.toLowerCase() === (address || '').toLowerCase())
  const myEarnings = myListings.reduce((t, l) => t + l.totalEarnedUsdc, 0)

  if (!mounted) return null

  return (
    <div className={`font-body text-on-surface min-h-screen flex flex-col bg-background ${isOverlayOpen ? 'overflow-hidden' : ''}`}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="md:hidden sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-surface-container-low border-r border-outline-variant/20 z-40 flex flex-col p-6 space-y-6 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${isOverlayOpen ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">M</div>
            <div>
              <h2 className="font-headline text-on-surface leading-none">KIMA</h2>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">Kite AI Agent</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 text-on-surface-variant hover:text-primary transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col space-y-1">
          {([
            { key: 'chat', icon: 'chat_bubble', label: 'Agent Chat' },
            { key: 'discovery', icon: 'explore', label: 'Discovery' },
            { key: 'merchant', icon: 'storefront', label: 'Merchant Hub' },
            { key: 'identity', icon: 'fingerprint', label: 'Identity' },
          ] as const).map(v => (
            <button key={v.key} onClick={() => { setActiveView(v.key); setSidebarOpen(false) }}
              className={`flex items-center gap-3 p-3 font-label text-sm rounded-lg transition-all text-left ${activeView === v.key ? 'text-primary bg-surface-container-high' : 'text-on-surface opacity-60 hover:bg-surface-container-high hover:text-primary'}`}>
              <span className="material-symbols-outlined text-xl">{v.icon}</span>
              <span>{v.label}</span>
            </button>
          ))}
          <Link href="/stores" className="flex items-center gap-3 p-3 font-label text-sm rounded-lg transition-all text-left text-on-surface opacity-60 hover:bg-surface-container-high hover:text-primary">
            <span className="material-symbols-outlined text-xl">shopping_bag</span>
            <span>My Stores</span>
          </Link>
        </nav>

        {/* Quick suggest buttons */}
        <div className="space-y-2">
          <p className="text-[10px] font-label uppercase tracking-widest opacity-50">Quick actions</p>
          {[
            { label: 'Browse listings', msg: 'Show me all listings on the marketplace' },
            { label: 'Sell content', msg: 'Help me create a listing to sell my API access for 0.50 USDC' },
            { label: 'My stats', msg: 'Show me the marketplace stats' },
          ].map(q => (
            <button key={q.label} onClick={() => { setActiveView('chat'); setSidebarOpen(false); handleSubmit(undefined, q.msg) }}
              className="w-full text-left px-3 py-2 text-[11px] rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface">
              {q.label}
            </button>
          ))}
        </div>

        <div className="pt-3 border-t border-outline-variant/10 space-y-3">
          <div className="bg-primary/5 border border-primary/10 p-3 rounded-lg">
            {agentId ? (
              <>
                <p className="text-[10px] text-primary font-bold uppercase mb-1">Agent Registered</p>
                <p className="text-xs font-mono">ID: {agentId}</p>
              </>
            ) : (
              <button onClick={handleRegisterIdentity} disabled={isRegistering}
                className="w-full flex items-center justify-between gap-2 bg-primary text-on-primary p-2 rounded-lg text-[10px] font-bold uppercase tracking-widest disabled:opacity-50">
                {isRegistering ? 'Registering...' : 'Register Identity'}
                <span className="material-symbols-outlined text-sm">how_to_reg</span>
              </button>
            )}
          </div>
          <div>
            <p className="text-[10px] text-primary font-bold">{usdcBalance ? `${formatUnits(usdcBalance.value, 6)} USDC` : balance ? `${parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)} KITE` : '—'}</p>
            <p className="text-[10px] opacity-50 font-mono">{address ? truncateAddress(address) : ''}</p>
          </div>
          <button onClick={() => disconnect()} className="w-full py-2.5 border border-primary/30 text-primary font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-primary/5 transition-colors">
            Disconnect
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-0 md:ml-64 flex flex-col min-h-screen">
        <header className={`fixed top-0 right-0 left-0 md:left-64 z-30 flex justify-between items-center px-4 sm:px-8 py-3 sm:py-4 bg-background/70 backdrop-blur-xl border-b border-outline-variant/10 transition-all ${isOverlayOpen ? 'blur-sm pointer-events-none' : ''}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1 text-on-surface-variant hover:text-primary transition-colors mr-1">
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-lg sm:text-xl font-headline italic">Kite Marketplace</span>
            {marketStats && (
              <span className="hidden lg:flex items-center gap-1.5 text-[10px] font-label uppercase tracking-widest text-on-surface-variant opacity-60">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                {marketStats.totalListings} listings · ${marketStats.totalVolumeUsdc.toFixed(2)} vol
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/.well-known/agent.json" target="_blank" className="text-[10px] font-label uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity hidden md:block">A2A Card</Link>
            <button onClick={() => setIsCartOpen(true)} className="relative">
              <span className="material-symbols-outlined text-on-surface opacity-70 hover:text-primary transition-colors">shopping_bag</span>
              {cart.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-on-primary text-[9px] font-bold flex items-center justify-center">{cart.length}</span>}
            </button>
          </div>
        </header>

        <main className={`flex-grow pt-14 sm:pt-16 flex h-screen overflow-hidden transition-all ${isOverlayOpen ? 'blur-md pointer-events-none' : ''}`}>

          {/* ── Chat view ── */}
          {activeView === 'chat' && (
            <>
              <section className="w-full lg:w-[55%] flex flex-col border-r-0 lg:border-r border-outline-variant/10 bg-surface-container-low p-4 sm:p-6 lg:p-8 justify-end">
                <div ref={scrollRef} className="flex-grow overflow-y-auto scrollbar-hide space-y-4 sm:space-y-6 mb-4 sm:mb-6">
                  {messages.map((msg, i) => {
                    const extMsg = msg as ExtendedMessage
                    const content = msg.parts.filter(p => p.type === 'text').map(p => (p.type === 'text' ? p.text : '')).join('')
                    if (!content && msg.role === 'assistant') return null
                    return (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] sm:max-w-[85%] ${msg.role === 'user' ? 'bg-primary text-on-primary px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl' : 'bg-surface-container-high px-4 sm:px-5 py-3 sm:py-4 rounded-xl'}`}>
                          {msg.role === 'assistant' && <p className="font-headline italic text-primary mb-1.5 text-sm">KIMA</p>}
                          <p className={`text-sm ${msg.role === 'user' ? 'font-medium leading-relaxed' : 'text-on-surface-variant leading-relaxed'}`}>{content}</p>
                          {msg.role === 'assistant' && extMsg.toolInvocations?.map((inv, j) => (
                            <ToolResultBubble key={j} invocation={inv} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {isLoading && (
                    <div className="flex justify-start items-center gap-2 px-2">
                      {[0, 1, 2].map(d => <div key={d} className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />)}
                    </div>
                  )}
                </div>
                <form onSubmit={handleSubmit} className="w-full">
                  <div className="relative flex items-center">
                    <input className="w-full bg-surface-container-high border-none focus:ring-1 focus:ring-primary py-3 sm:py-3.5 pl-4 sm:pl-5 pr-12 sm:pr-14 text-sm rounded-xl" placeholder="Ask KIMA to buy, sell, or browse..." value={input} onChange={e => setInput(e.target.value)} disabled={isLoading} />
                    <button disabled={isLoading || !input.trim()} className="absolute right-2 p-2 bg-primary text-on-primary hover:opacity-90 transition-opacity rounded-lg disabled:opacity-50">
                      <span className="material-symbols-outlined text-sm">arrow_upward</span>
                    </button>
                  </div>
                </form>
              </section>

              <section className="hidden lg:block w-[45%] bg-surface overflow-y-auto scrollbar-hide p-6 lg:p-8">
                <h2 className="font-headline text-2xl lg:text-3xl italic mb-6">{isSearching ? 'Searching...' : 'Results'}</h2>
                <div className="grid gap-4 lg:gap-6">
                  {isSearching ? Array(2).fill(0).map((_, i) => <ProductCardSkeleton key={i} />) :
                    currentProducts.length > 0 ? currentProducts.map(p => (
                      <ProductCard key={p.id} product={p} onAddToCart={() => addItem(p, 1)} />
                    )) : (
                      <div className="space-y-3">
                        <p className="text-sm opacity-50 italic mb-4">Ask KIMA to search products or browse listings...</p>
                        {listings.slice(0, 3).map(l => (
                          <ListingCard key={l.id} listing={l} onBuy={handleBuyListing} />
                        ))}
                      </div>
                    )}
                </div>
              </section>
            </>
          )}

          {/* ── Discovery view ── */}
          {activeView === 'discovery' && (
            <section className="w-full bg-surface overflow-y-auto p-4 sm:p-6 lg:p-10">
              <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl italic">Resource Explorer</h2>
                    <p className="text-sm text-on-surface-variant opacity-60 mt-1">All paywalled listings — pay with x402 USDC on Kite Testnet</p>
                  </div>
                  {marketStats && (
                    <div className="flex gap-4 sm:gap-6 text-right">
                      <div><p className="text-primary font-bold text-lg sm:text-xl">{marketStats.totalListings}</p><p className="text-[10px] uppercase tracking-widest opacity-50">Listings</p></div>
                      <div><p className="text-primary font-bold text-lg sm:text-xl">${marketStats.totalVolumeUsdc.toFixed(2)}</p><p className="text-[10px] uppercase tracking-widest opacity-50">Volume</p></div>
                    </div>
                  )}
                </div>
                {listingsLoading ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">{[1,2,3].map(i => <div key={i} className="h-48 rounded-xl bg-surface-container animate-pulse" />)}</div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {listings.map(l => <ListingCard key={l.id} listing={l} onBuy={handleBuyListing} />)}
                    <button onClick={() => setActiveView('merchant')}
                      className="p-5 rounded-2xl border-2 border-dashed border-outline-variant/30 hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-3 text-on-surface-variant hover:text-primary">
                      <Plus className="h-8 w-8" />
                      <span className="text-xs font-label uppercase tracking-widest">Sell your content</span>
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Merchant hub ── */}
          {activeView === 'merchant' && (
            <MerchantHub
              listings={listings}
              myListings={myListings}
              myEarnings={myEarnings}
              address={address}
              creating={creating}
              createForm={createForm}
              setCreateForm={setCreateForm}
              handleCreateListing={handleCreateListing}
              onBuyListing={handleBuyListing}
            />
          )}

          {/* ── Passport view ── */}
          {activeView === 'identity' && (
            <PassportView 
              agentId={agentId} 
              address={address} 
              passport={passport} 
              onRegister={handleRegisterIdentity}
              isRegistering={isRegistering}
            />
          )}
        </main>
      </div>

      {/* Backdrop */}
      {isOverlayOpen && <div className="fixed inset-0 bg-background/40 backdrop-blur-[16px] z-[60]" onClick={() => { if (checkoutStatus !== 'processing') { setIsCartOpen(false); setIsCheckoutOpen(false) } }} />}

      {/* Cart drawer */}
      <aside className={`fixed right-0 top-0 h-full w-full sm:w-[360px] bg-surface-container-lowest shadow-2xl z-[70] flex flex-col border-l border-outline-variant/20 transition-transform duration-300 ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 flex justify-between items-center border-b border-outline-variant/10">
          <h2 className="font-headline text-2xl italic">Cart</h2>
          <button onClick={() => setIsCartOpen(false)} className="material-symbols-outlined">close</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.map(item => (
            <div key={item.productId} className="flex gap-4 items-start">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container shrink-0 relative border border-outline-variant/20">
                <Image className="w-full h-full object-cover" alt={item.productName} src={item.image} fill />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.productName}</p>
                <p className="text-xs text-primary font-bold">{item.priceUsdc.toFixed(2)} USDC</p>
              </div>
              <button onClick={() => removeItem(item.productId)} className="opacity-40 hover:opacity-100 transition-opacity text-xs">✕</button>
            </div>
          ))}
          {cart.length === 0 && <p className="text-sm opacity-40 italic text-center py-8">Cart is empty</p>}
        </div>
        {cart.length > 0 && (
          <div className="p-6 border-t border-outline-variant/10 space-y-3">
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span><span className="text-primary">{cartTotal.toFixed(2)} USDC</span>
            </div>
            <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true) }} className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold uppercase tracking-wide text-xs">
              Checkout on Kite
            </button>
          </div>
        )}
      </aside>

      {/* Checkout modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-surface-container-lowest p-8 rounded-2xl shadow-2xl border border-outline-variant/30 pointer-events-auto space-y-6">
            {checkoutStatus === 'success' ? (
              <div className="text-center py-8 space-y-4">
                <span className="material-symbols-outlined text-5xl text-green-500">check_circle</span>
                <h3 className="text-2xl font-headline italic">Payment Confirmed</h3>
                <p className="text-sm opacity-60">Settled on Kite Testnet</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold">Confirm payment</h3>
                <p className="text-4xl font-headline italic">{cartTotal.toFixed(2)} USDC</p>
                <p className="text-xs opacity-50">On Kite Testnet (chainId 2368)</p>
                {paymentError && <p className="text-xs text-red-500">{paymentError}</p>}
                <button disabled={checkoutStatus === 'processing'} onClick={handleCheckout}
                  className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold uppercase text-xs disabled:opacity-50">
                  {checkoutStatus === 'processing' ? 'Processing...' : 'Approve in wallet'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {orderConfirmation && <OrderConfirmationModal order={orderConfirmation} onClose={() => setOrderConfirmation(null)} />}
    </div>
  )
}


// ─── MerchantHub ─────────────────────────────────────────────────────────────

type CreateStep = 'list' | 'pick-type' | 'details'
type ListingType = 'api' | 'dataset' | 'article' | 'code' | 'file' | 'shopify'
type FilterTab = 'all' | ListingType

const LISTING_TYPES_CONFIG: { type: ListingType; title: string; description: string; hint: string; contentLabel: string; contentPlaceholder: string }[] = [
  { type: 'api', title: 'API Key / Endpoint', description: 'Monetize any API key or proxy endpoint with pay-per-access', hint: 'Perfect for OpenAI keys, weather APIs, data feeds', contentLabel: 'API key or endpoint URL (secret)', contentPlaceholder: 'sk-... or https://api.example.com/endpoint' },
  { type: 'dataset', title: 'Dataset', description: 'Sell CSV, JSON or any structured data file', hint: 'Market data, training sets, scraped data', contentLabel: 'Download URL or raw data (secret)', contentPlaceholder: 'https://s3.amazonaws.com/... or paste CSV here' },
  { type: 'article', title: 'Article / Report', description: 'Paywall a written report, research, or blog post', hint: 'Research reports, newsletters, analysis', contentLabel: 'Full article content (secret)', contentPlaceholder: 'Paste the full article text — only revealed after payment' },
  { type: 'code', title: 'Code / Script', description: 'Sell a script, template, snippet or codebase', hint: 'Automation scripts, prompts, Solidity contracts', contentLabel: 'Code content or repo URL (secret)', contentPlaceholder: '#!/usr/bin/env python\n# Your script here\n...' },
  { type: 'file', title: 'File / Download', description: 'Gate any downloadable file behind USDC payment', hint: 'PDFs, images, models, zip archives', contentLabel: 'Direct download URL (secret)', contentPlaceholder: 'https://drive.google.com/... or https://s3.amazonaws.com/...' },
  { type: 'shopify', title: 'Shopify Store', description: 'Connect your Shopify store and sell physical products for USDC', hint: 'Apparel, hardware, accessories, stickers', contentLabel: 'Shopify Admin API Token (secret)', contentPlaceholder: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxx' },
]

const TYPE_ICON_MAP: Record<ListingType, React.ReactNode> = {
  api: <Zap className="h-7 w-7" />,
  dataset: <Database className="h-7 w-7" />,
  article: <FileText className="h-7 w-7" />,
  code: <Code className="h-7 w-7" />,
  file: <Layers className="h-7 w-7" />,
  shopify: <ShoppingBag className="h-7 w-7" />,
}

const TYPE_ICON_SMALL: Record<ListingType, React.ReactNode> = {
  api: <Zap className="h-5 w-5" />,
  dataset: <Database className="h-5 w-5" />,
  article: <FileText className="h-5 w-5" />,
  code: <Code className="h-5 w-5" />,
  file: <Layers className="h-5 w-5" />,
  shopify: <ShoppingBag className="h-5 w-5" />,
}

interface MerchantHubProps {
  listings: Listing[]
  myListings: Listing[]
  myEarnings: number
  address?: string
  creating: boolean
  createForm: { type: string; name: string; description: string; priceUsdc: string; content: string; preview: string }
  setCreateForm: React.Dispatch<React.SetStateAction<{ type: string; name: string; description: string; priceUsdc: string; content: string; preview: string }>>
  handleCreateListing: () => void
  onBuyListing: (id: string) => void
}

function MerchantHub({ listings, myListings, myEarnings, address, creating, createForm, setCreateForm, handleCreateListing, onBuyListing }: MerchantHubProps) {
  const [step, setStep] = useState<CreateStep>('list')
  const [selectedType, setSelectedType] = useState<ListingType | null>(null)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyEndpoint = (id: string) => {
    const url = `${window.location.origin}/api/listings/${id}/content`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handlePickType = (type: ListingType) => {
    setSelectedType(type)
    setCreateForm(f => ({ ...f, type }))
    setStep('details')
  }

  const handleSubmitAndBack = () => {
    handleCreateListing()
    setStep('list')
    setSelectedType(null)
  }

  const typeInfo = selectedType ? LISTING_TYPES_CONFIG.find(t => t.type === selectedType) : null
  const totalSales = myListings.reduce((t, l) => t + l.salesCount, 0)

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'api', label: 'API' },
    { key: 'dataset', label: 'Datasets' },
    { key: 'article', label: 'Articles' },
    { key: 'code', label: 'Code' },
    { key: 'file', label: 'Files' },
  ]

  const filteredAll = listings.filter(l => filterTab === 'all' || l.type === filterTab)

  // ── List view ─────────────────────────────────────────────────────────────
  if (step === 'list') return (
    <section className="w-full bg-surface overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-5 sm:space-y-7">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl italic">Merchant Hub</h2>
            <p className="text-sm text-on-surface-variant opacity-60 mt-1">Create and manage paywalled listings — earn USDC from every purchase</p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Link href="/stores" className="flex items-center gap-2 bg-surface-container-highest px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-label uppercase tracking-widest hover:bg-surface-container-high transition-colors">
              <ShoppingBag className="h-4 w-4" /> My Stores
            </Link>
            <button onClick={() => setStep('pick-type')} className="flex items-center gap-2 bg-primary text-on-primary px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-label uppercase tracking-widest hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" /> New Listing
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: 'My listings', val: myListings.length },
            { label: 'Total earned', val: `$${myEarnings.toFixed(2)}` },
            { label: 'Total sales', val: totalSales },
          ].map(s => (
            <div key={s.label} className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-outline-variant/20">
              <p className="text-xl sm:text-2xl font-headline italic text-primary">{s.val}</p>
              <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-4 overflow-x-auto">
          {TABS.map(tab => {
            const count = tab.key === 'all' ? listings.length : listings.filter(l => l.type === tab.key).length
            return (
              <button key={tab.key} onClick={() => setFilterTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-label uppercase tracking-widest whitespace-nowrap transition-all ${filterTab === tab.key ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant opacity-60 hover:text-primary hover:bg-primary/5'}`}>
                {tab.key !== 'all' && TYPE_ICON_SMALL[tab.key as ListingType] && <span className="opacity-70">{TYPE_ICON_SMALL[tab.key as ListingType]}</span>}
                {tab.label} ({count})
              </button>
            )
          })}
        </div>

        {filteredAll.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 opacity-50">
            <TrendingUp className="h-12 w-12 mb-4 opacity-30" />
            <p className="font-headline italic text-xl">No listings yet</p>
            <p className="text-sm mt-2">Create your first listing to start earning USDC from agents and humans</p>
            <button onClick={() => setStep('pick-type')} className="mt-5 flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 text-xs font-label uppercase tracking-widest hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" /> Create listing
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAll.map(l => {
              const isOwner = l.creatorAddress.toLowerCase() === (address || '').toLowerCase()
              return (
                <div key={l.id} className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all ${isOwner ? 'bg-primary/[0.03] border-primary/20 hover:border-primary/40' : 'bg-surface-container-low border-outline-variant/20 hover:border-primary/30'}`}>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-all">
                    {TYPE_ICON_SMALL[l.type as ListingType] || <Layers className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-medium text-sm truncate">{l.name}</h3>
                      {isOwner && <span className="px-2 py-0.5 text-[9px] rounded-full bg-primary/10 text-primary font-label uppercase tracking-widest shrink-0">yours</span>}
                      <span className="px-2 py-0.5 text-[9px] rounded-full bg-surface-container text-on-surface-variant opacity-60 font-label uppercase tracking-widest shrink-0">{l.type}</span>
                    </div>
                    {l.description && <p className="text-xs text-on-surface-variant opacity-60 truncate mb-2">{l.description}</p>}
                    <div className="flex items-center gap-4 text-[10px] text-on-surface-variant opacity-50 font-label uppercase tracking-widest flex-wrap">
                      <span className="text-primary font-bold opacity-100">{l.priceUsdc.toFixed(2)} USDC</span>
                      <span>·</span><span>{l.salesCount} sales</span>
                      {isOwner && <><span>·</span><span className="text-primary opacity-100">${l.totalEarnedUsdc.toFixed(2)} earned</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => copyEndpoint(l.id)} title="Copy x402 URL" className="p-2 rounded-lg text-on-surface-variant opacity-40 hover:opacity-100 hover:text-primary hover:bg-primary/5 transition-all text-[10px] font-mono">
                      {copiedId === l.id ? <span className="text-primary font-bold">✓</span> : 'x402'}
                    </button>
                    <Link href={`/api/listings/${l.id}/content`} target="_blank" className="p-2 rounded-lg text-on-surface-variant opacity-40 hover:opacity-100 hover:text-primary hover:bg-primary/5 transition-all" title="Open paywall URL">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    {!isOwner && (
                      <button onClick={() => onBuyListing(l.id)} className="ml-1 flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 text-[10px] font-label uppercase tracking-widest hover:opacity-90 transition-opacity rounded-sm">
                        <Unlock className="h-3 w-3" /> Buy
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )

  // ── Step 1: Pick type ─────────────────────────────────────────────────────
  if (step === 'pick-type') return (
    <section className="w-full bg-surface overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-5 sm:space-y-7">
        <button onClick={() => setStep('list')} className="flex items-center gap-2 text-xs text-on-surface-variant opacity-60 hover:opacity-100 hover:text-primary transition-all font-label uppercase tracking-widest">
          <span className="text-base leading-none">←</span> Back to listings
        </button>
        <div>
          <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl italic">New Listing</h2>
          <p className="text-sm text-on-surface-variant opacity-60 mt-1">Choose what you want to sell</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {LISTING_TYPES_CONFIG.map(opt => (
            <button key={opt.type} onClick={() => handlePickType(opt.type)}
              className="group p-5 sm:p-6 rounded-2xl border border-outline-variant/20 text-left transition-all hover:border-primary/50 hover:bg-primary/[0.03] hover:scale-[1.02] hover:shadow-lg">
              <div className="text-primary mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                {TYPE_ICON_MAP[opt.type]}
              </div>
              <h3 className="font-medium text-sm mb-1">{opt.title}</h3>
              <p className="text-xs text-on-surface-variant opacity-60 leading-relaxed mb-3">{opt.description}</p>
              <p className="text-[10px] text-primary opacity-70 font-label uppercase tracking-widest">{opt.hint}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  )

  // ── Step 2: Details form ──────────────────────────────────────────────────
  if (step === 'details' && typeInfo) return (
    <section className="w-full bg-surface overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
        <button onClick={() => setStep('pick-type')} className="flex items-center gap-2 text-xs text-on-surface-variant opacity-60 hover:opacity-100 hover:text-primary transition-all font-label uppercase tracking-widest">
          <span className="text-base leading-none">←</span> Back
        </button>

        {selectedType === 'shopify' ? (
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Shopify Form */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShoppingBag className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="font-headline text-3xl italic">Connect Shopify</h2>
                  <p className="text-sm text-on-surface-variant opacity-60">Monetize physical inventory with AI agents</p>
                </div>
              </div>

              <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 space-y-5">
                <div>
                  <label className="text-[10px] font-label uppercase tracking-widest opacity-60 block mb-1.5">Shopify Store URL *</label>
                  <input value={createForm.content} onChange={e => setCreateForm(f => ({ ...f, content: e.target.value }))} placeholder="my-awesome-store.myshopify.com"
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-label uppercase tracking-widest opacity-60 block mb-1.5">Store Name (Optional)</label>
                  <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="My Kite Shop"
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-label uppercase tracking-widest opacity-60 block mb-1.5">Description (Optional)</label>
                  <textarea rows={2} value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="The best gear for autonomous agents."
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none resize-none" />
                </div>

                <button
                  onClick={() => {
                    let url = createForm.content.replace(/^https?:\/\//, '').replace(/\/$/, '');
                    if (!url.includes('.myshopify.com')) url += '.myshopify.com';
                    const params = new URLSearchParams({ shop: url, name: createForm.name, description: createForm.description });
                    window.location.href = `/api/shopify/auth?${params.toString()}`;
                  }}
                  disabled={!createForm.content}
                  className="w-full flex items-center gap-2 justify-center bg-primary text-on-primary px-6 py-3 text-xs font-label uppercase tracking-widest disabled:opacity-50 hover:opacity-90 transition-opacity rounded-sm shadow-lg shadow-primary/20"
                >
                  Install with Shopify <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Shopify Guidelines */}
            <div className="bg-surface-container-highest/30 border border-outline-variant/20 rounded-3xl p-8 space-y-6">
              <h3 className="font-headline text-2xl italic mb-4">How it works</h3>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Click Install to connect', desc: 'Enter your store URL and click the install button to begin the connection process.' },
                  { step: '02', title: 'Authorize Permissions', desc: 'Redirect to your Shopify Admin to authorize Kite Marketplace to access your catalog.' },
                  { step: '03', title: 'Select Products', desc: 'Choose which products you want to make available for AI agents to discover.' },
                  { step: '04', title: 'Receive Orders', desc: 'Orders will be automatically created in your Shopify store when an agent buys.' }
                ].map(item => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-headline italic text-lg">{item.step}</div>
                    <div>
                      <h4 className="font-headline text-lg italic leading-none mb-1">{item.title}</h4>
                      <p className="text-xs text-on-surface-variant opacity-60 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-outline-variant/10 flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-500 opacity-50" />
                <p className="text-[10px] text-on-surface-variant opacity-50 leading-tight">Secure OAuth connection powered by Shopify. We never store your password.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">{TYPE_ICON_MAP[selectedType!]}</div>
              <div>
                <h2 className="font-headline text-3xl italic">{typeInfo.title}</h2>
                <p className="text-sm text-on-surface-variant opacity-60">{typeInfo.description}</p>
              </div>
            </div>
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 space-y-5">
              <div>
                <label className="text-[10px] font-label uppercase tracking-widest opacity-60 block mb-1.5">Listing name *</label>
                <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder={`My Premium ${typeInfo.title}`}
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-label uppercase tracking-widest opacity-60 block mb-1.5">Description</label>
                <textarea rows={2} value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="What does the buyer receive?"
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-label uppercase tracking-widest opacity-60 block mb-1.5">Price (USDC) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm opacity-50">$</span>
                  <input type="number" step="0.01" min="0.01" max="100" value={createForm.priceUsdc} onChange={e => setCreateForm(f => ({ ...f, priceUsdc: e.target.value }))}
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-lg pl-7 pr-20 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none" />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] opacity-50 font-label uppercase tracking-widest">USDC · Kite</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {['0.10', '0.50', '1.00', '5.00'].map(p => (
                    <button key={p} onClick={() => setCreateForm(f => ({ ...f, priceUsdc: p }))}
                      className={`px-3 py-1 rounded-lg text-[10px] font-label uppercase tracking-widest transition-all border ${createForm.priceUsdc === p ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant/30 text-on-surface-variant opacity-60 hover:border-primary/40 hover:text-primary'}`}>
                      ${p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-label uppercase tracking-widest opacity-60 block mb-1.5">Public preview <span className="normal-case opacity-40">(no secrets — shown before payment)</span></label>
                <input value={createForm.preview} onChange={e => setCreateForm(f => ({ ...f, preview: e.target.value }))} placeholder="Teaser buyers see before paying..."
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-label uppercase tracking-widest text-primary block mb-1.5">
                  🔒 {typeInfo.contentLabel} <span className="opacity-60 normal-case">(only revealed after payment)</span>
                </label>
                <textarea rows={typeInfo.type === 'article' || typeInfo.type === 'code' ? 6 : 3} value={createForm.content} onChange={e => setCreateForm(f => ({ ...f, content: e.target.value }))} placeholder={typeInfo.contentPlaceholder}
                  className="w-full bg-surface-container border border-primary/20 rounded-lg px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none resize-none font-mono" />
                <p className="text-[10px] opacity-40 mt-1">Hidden behind x402 paywall — only buyers who pay on Kite Testnet see this</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSubmitAndBack} disabled={creating || !createForm.name || !createForm.content}
                  className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 text-xs font-label uppercase tracking-widest disabled:opacity-50 hover:opacity-90 transition-opacity">
                  {creating ? 'Creating...' : <><Plus className="h-3.5 w-3.5" /> Create listing</>}
                </button>
                <button onClick={() => setStep('list')} className="px-6 py-2.5 text-xs font-label uppercase tracking-widest border border-outline-variant/30 hover:bg-surface-container transition-colors">
                  Cancel
                </button>
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
              <p className="text-xs font-label uppercase tracking-widest text-primary opacity-80 mb-2">What happens next</p>
              <p className="text-sm text-on-surface-variant opacity-70 leading-relaxed">
                Your listing goes live immediately. Anyone — humans or AI agents — hits your x402 URL, pays <strong>{createForm.priceUsdc} USDC</strong> on Kite Testnet, and gets the content instantly. No checkout friction.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )

  return null
}

function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  const { name, brand, priceUsdc, image } = product
  return (
    <div className="bg-surface-container-low p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col rounded-xl">
      <div className="aspect-square bg-surface-container-lowest mb-4 overflow-hidden rounded-lg relative">
        <Image alt={name} src={image} fill className="object-cover" />
      </div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-secondary font-bold mb-1">{brand}</p>
      <h3 className="font-headline text-lg leading-tight mb-3 line-clamp-2">{name}</h3>
      <div className="mt-auto flex justify-between items-center">
        <span className="font-mono text-sm font-semibold">{priceUsdc.toFixed(2)} USDC</span>
        <button onClick={onAddToCart} className="bg-primary text-on-primary px-4 py-2 rounded text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">Add</button>
      </div>
    </div>
  )
}