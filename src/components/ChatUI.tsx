'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useAccount, useDisconnect, useBalance, useWalletClient, useReadContract } from 'wagmi'
import { formatUnits, erc20Abi } from 'viem'
import { useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'

const USDC_ADDRESS = '0x534b2f3A21130d7a60830c2Df862319e593943A3'
import Link from 'next/link'
import { kiteTestnet } from '@/lib/kite'
import { useCartStore, Product } from '@/store/cartStore'
import { UIMessage as Message, readUIMessageStream } from 'ai'
import { ProductCardSkeleton } from './ProductCardSkeleton'
import { checkout, OrderConfirmation } from '@/lib/checkout'
import { OrderConfirmationModal } from './OrderConfirmationModal'
import { Toast } from './Toast'

interface SearchArgs {
  query: string
  maxPrice?: number
  category?: string
}

interface AddToCartResult {
  success: boolean
  product: Product
  quantity: number
}

interface ToolInvocation {
  state: 'partial-call' | 'call' | 'result'
  toolCallId: string
  toolName: string
  args: unknown
  result?: unknown
}

interface ExtendedMessage extends Message {
  toolInvocations?: ToolInvocation[]
}

export function ChatUI() {
  const { address, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const queryClient = useQueryClient()
  const { data: balance } = useBalance({ address })
  
  const [mounted, setMounted] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [activeView, setActiveView] = useState<'chat' | 'discovery' | 'merchant' | 'identity'>('chat')

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    // Load from local storage on mount
    if (typeof window !== 'undefined' && address) {
      const savedId = localStorage.getItem(`kite_agent_${address.toLowerCase()}`)
      if (savedId) setAgentId(savedId)
    }
  }, [address])

  // Auto-lookup agent identity on connection
  useEffect(() => {
    if (!mounted || !address || agentId) return;
    
    const lookupIdentity = async () => {
      try {
        const response = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'lookup_identity_by_owner',
              arguments: { ownerAddress: address }
            }
          })
        });
        const data = await response.json();
        if (data.result) {
          const resultText = data.result.content[0].text;
          const result = JSON.parse(resultText);
          if (result.success && result.found) {
            setAgentId(result.agentId);
            localStorage.setItem(`kite_agent_${address.toLowerCase()}`, result.agentId);
          }
        }
      } catch (err) {
        console.error('Auto-lookup failed:', err);
      }
    };

    lookupIdentity();
  }, [address, mounted, agentId]);

  const { data: usdcBalanceValue } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })

  const usdcBalance = useMemo(() => {
    if (usdcBalanceValue === undefined) return null;
    return {
      value: usdcBalanceValue as bigint,
      decimals: 6,
      symbol: 'USDC'
    }
  }, [usdcBalanceValue])

  const { data: walletClient } = useWalletClient()
  const { items: cart, addItem, removeItem, updateQuantity } = useCartStore()

  // Dynamic Chat State
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', parts: [{ type: 'text', text: "I've curated a selection of high-fidelity options. Use the chat to find anything you need." }] }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [currentProducts, setCurrentProducts] = useState<Product[]>([])
  const [lastSearchQuery, setLastSearchQuery] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)

  // Sidebar and Modal State
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'success'>('idle')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null)

  const handleRegisterIdentity = async () => {
    if (!address) return
    setIsRegistering(true)
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'register_identity',
            arguments: {}
          }
        })
      })
      const data = await response.json()
      if (data.result) {
        const resultText = data.result.content[0].text
        const result = JSON.parse(resultText)
        if (result.success) {
          setAgentId(result.agentId)
          localStorage.setItem(`kite_agent_${address.toLowerCase()}`, result.agentId)
        }
      }
    } catch (err) {
      console.error('Registration failed:', err)
    } finally {
      setIsRegistering(false)
    }
  }

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.priceUsdc * item.quantity, 0)
  }, [cart])

  const cartItemCount = useMemo(() => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }, [cart])

  const isWrongNetwork = chain?.id !== kiteTestnet.id

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const lastMessage = messages[messages.length - 1] as ExtendedMessage
    if (lastMessage?.role === 'assistant' && lastMessage.toolInvocations) {
      const searchInv = lastMessage.toolInvocations.find(inv => inv.toolName === 'searchProducts')
      if (searchInv?.state === 'result') {
        setCurrentProducts(searchInv.result as Product[])
        setLastSearchQuery((searchInv.args as SearchArgs).query)
        setIsSearching(false)
      } else if (searchInv?.state === 'call') {
        setIsSearching(true)
      }

      const addInv = lastMessage.toolInvocations.find(inv => inv.toolName === 'addToCart')
      if (addInv?.state === 'result' && (addInv.result as AddToCartResult).success) {
        addItem((addInv.result as AddToCartResult).product, (addInv.result as AddToCartResult).quantity)
        setIsCartOpen(true)
      }
    }
  }, [messages, addItem])

  const handleCheckout = async () => {
    if (!walletClient) {
      setPaymentError("Wallet not connected")
      return
    }

    if (isWrongNetwork) {
      setPaymentError("Please switch to Kite testnet")
      return
    }

    setCheckoutStatus('processing')
    setPaymentError(null)

    try {
      const confirmation = await checkout(cart, cartTotal, walletClient)
      setOrderConfirmation(confirmation)
      setCheckoutStatus('success')
      useCartStore.getState().clearCart()
      setIsCartOpen(false)
      setIsCheckoutOpen(false)
      await handleSubmit(undefined, `Payment confirmed. Transaction hash: ${confirmation.txHash}.`)
    } catch (err: any) {
      console.error('Checkout failed:', err)
      setCheckoutStatus('idle')
      setPaymentError(err.message || "Payment failed")
    }
  }

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault()
    const text = overrideInput ?? input
    if (!text.trim() || isLoading) return

    const userMessage: Message = { 
        id: Date.now().toString(), 
        role: 'user', 
        parts: [{ type: 'text', text: text }] 
    }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ 
            messages: newMessages.map(m => ({ 
                role: m.role, 
                content: m.parts.filter(p => p.type === 'text').map(p => p.type === 'text' ? p.text : '').join('')
            })) 
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch')
      if (!response.body) throw new Error('No body')

      const messageStream = readUIMessageStream({ stream: response.body as any })

      for await (const message of messageStream) {
        setMessages(prev => {
          const index = prev.findIndex(m => m.id === message.id)
          if (index !== -1) {
            const updated = [...prev]
            updated[index] = message
            return updated
          }
          return [...prev, message]
        })
      }
    } catch (err) {
      console.error('Chat error:', err)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        parts: [{ type: 'text', text: 'Sorry, I encountered an error. Please check your AI API key.' }]
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const isOverlayOpen = isCartOpen || isCheckoutOpen

  if (!mounted) return null

  return (
    <div className={`font-body text-on-surface min-h-screen flex flex-col bg-background ${isOverlayOpen ? 'overflow-hidden' : ''}`}>
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-surface-container-low border-r border-outline-variant/20 z-40 flex flex-col p-6 space-y-8 transition-all duration-300 ${isOverlayOpen ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/30 relative">
            <Image 
              className="w-full h-full object-cover" 
              alt="The Curator" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBm1gwgqK89gJsf0qQY7zVN6cNr_uUzMVWF2yGxxcOk1EcX0-MRo7njVp2fWC65vExPUqsZZKbjxuzPcR5S02xuov1b_d8qEPIpI1iczrcf8Hwi5QJAm3hAhgXMeTtSMBj9xmheINFTJ44f2hGGheYb2L7p3SUqsVNrgpS8l9jDGqyL9Obi385rCNLvfHgctubYsrl_3CzYUZVIXs1cVJU5dVlm9Fr8R6OJHElj8rLaQLB79UMDxNWOahSvYz9jrRPa68_blJhA6v5_"
              fill
            />
          </div>
          <div>
            <h2 className="font-headline text-on-surface leading-none">The Curator</h2>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">AI Shopping Intelligence</p>
          </div>
        </div>
        <nav className="flex-1 flex flex-col space-y-2">
          <button 
            onClick={() => setActiveView('chat')}
            className={`flex items-center gap-3 p-3 font-label text-sm rounded-lg transition-all ${activeView === 'chat' ? 'text-primary bg-surface-container-high' : 'text-on-surface opacity-60 hover:bg-surface-container-high hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-xl">chat_bubble</span>
            <span>Concierge</span>
          </button>
          <button 
            onClick={() => setActiveView('discovery')}
            className={`flex items-center gap-3 p-3 font-label text-sm rounded-lg transition-all ${activeView === 'discovery' ? 'text-primary bg-surface-container-high' : 'text-on-surface opacity-60 hover:bg-surface-container-high hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-xl">auto_awesome</span>
            <span>Discovery</span>
          </button>
          <button 
            onClick={() => setActiveView('merchant')}
            className={`flex items-center gap-3 p-3 font-label text-sm rounded-lg transition-all ${activeView === 'merchant' ? 'text-primary bg-surface-container-high' : 'text-on-surface opacity-60 hover:bg-surface-container-high hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-xl">storefront</span>
            <span>Merchant</span>
          </button>
          <button 
            onClick={() => setActiveView('identity')}
            className={`flex items-center gap-3 p-3 font-label text-sm rounded-lg transition-all ${activeView === 'identity' ? 'text-primary bg-surface-container-high' : 'text-on-surface opacity-60 hover:bg-surface-container-high hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-xl">fingerprint</span>
            <span>Identity</span>
          </button>
        </nav>
        
        <div className="pt-4 border-t border-outline-variant/10">
          <div className="mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 opacity-60">On-chain Identity</h3>
            {agentId ? (
              <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                <p className="text-[10px] text-primary font-bold uppercase mb-1">Agent Registered</p>
                <p className="text-xs font-mono font-bold">ID: {agentId}</p>
              </div>
            ) : (
              <button 
                onClick={handleRegisterIdentity}
                disabled={isRegistering}
                className="w-full flex items-center justify-between gap-2 p-3 bg-primary text-on-primary rounded-lg text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
              >
                {isRegistering ? 'Registering...' : 'Register Identity'}
                <span className="material-symbols-outlined text-sm">how_to_reg</span>
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {balance ? `${parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(2)} ${balance.symbol}` : '0.00 KITE'}
            </span>
            <span className="text-[10px] opacity-60 font-mono">
              {address ? truncateAddress(address) : 'Not connected'}
            </span>
          </div>
          <button onClick={() => disconnect()} className="w-full py-4 border border-primary/30 text-primary font-bold rounded-lg text-sm uppercase tracking-widest hover:bg-primary/5 transition-colors">Disconnect</button>
        </div>
      </aside>

      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className={`fixed top-0 right-0 left-64 w-auto z-50 flex justify-between items-center px-8 py-4 bg-background/70 backdrop-blur-xl transition-all ${isOverlayOpen ? 'blur-sm pointer-events-none' : ''}`}>
          <div className="text-2xl font-headline italic text-on-surface">The Editorial Intelligence</div>
          <div className="flex items-center gap-6">
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-on-surface opacity-70 cursor-pointer hover:text-primary transition-colors" onClick={() => setIsCartOpen(true)}>shopping_bag</span>
            </div>
          </div>
        </header>

        <main className={`flex-grow pt-20 flex h-screen overflow-hidden transition-all ${isOverlayOpen ? 'blur-md pointer-events-none' : ''}`}>
          {activeView === 'chat' && (
            <>
              <section className="w-[55%] flex flex-col border-r border-outline-variant/10 bg-surface-container-low p-12 justify-end">
                <div ref={scrollRef} className="flex-grow overflow-y-auto scrollbar-hide space-y-8 mb-8">
                  {messages.map((msg, i) => {
                    const content = msg.parts.filter(p => p.type === 'text').map(p => (p.type === 'text' ? p.text : '')).join('')
                    if (!content && msg.role === 'assistant') return null
                    return (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-primary text-on-primary px-6 py-4 rounded-xl shadow-sm' : 'bg-surface-container-high px-6 py-5 rounded-xl'}`}>
                          {msg.role === 'assistant' && <p className="font-headline text-lg italic text-primary mb-2">The Digital Curator</p>}
                          <p className={`text-sm ${msg.role === 'user' ? 'font-medium leading-relaxed italic' : 'text-on-surface-variant leading-relaxed'}`}>{content}</p>
                        </div>
                      </div>
                    )
                  })}
                  {isLoading && (
                    <div className="flex justify-start items-center gap-2 px-2">
                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    </div>
                  )}
                </div>
                <form onSubmit={handleSubmit} className="max-w-2xl w-full">
                  <div className="relative flex items-center">
                    <input className="w-full bg-surface-container-high border-none focus:ring-1 focus:ring-primary-container py-4 pl-6 pr-16 text-sm rounded-xl" placeholder="Ask me anything..." type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={isLoading} />
                    <button disabled={isLoading || !input.trim()} className="absolute right-2 p-2 bg-primary text-on-primary hover:brightness-110 transition-colors rounded-lg disabled:opacity-50">
                      <span className="material-symbols-outlined text-sm">arrow_upward</span>
                    </button>
                  </div>
                </form>
              </section>

              <section className="w-[45%] bg-surface overflow-y-auto scrollbar-hide p-12">
                <h2 className="font-headline text-4xl italic text-on-surface tracking-tight mb-10">
                  {isSearching ? 'Curating Selection...' : 'Curated Selection'}
                </h2>
                <div className="grid grid-cols-1 gap-12">
                  {isSearching ? Array(2).fill(0).map((_, i) => <ProductCardSkeleton key={i} />) : 
                   currentProducts.length > 0 ? currentProducts.map((p) => (
                     <ProductCard key={p.id} product={p} onAddToCart={() => addItem(p, 1)} />
                   )) : <div className="py-20 text-center opacity-40 italic">Search for products...</div>}
                </div>
              </section>
            </>
          )}

          {activeView === 'discovery' && (
            <section className="w-full bg-surface overflow-y-auto p-12">
               <div className="max-w-5xl mx-auto space-y-12">
                  <h2 className="font-headline text-5xl italic text-on-surface tracking-tight">Resource Explorer</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
                    {[
                      { id: 'res_1', type: 'api', name: 'Alpha Intel API', price: '0.50', desc: 'Real-time market intelligence stream for Kite.' },
                      { id: 'res_2', type: 'file', name: 'Transaction Set v4', price: '1.20', desc: 'Complete historical Kite Testnet dataset.' },
                    ].map((item) => (
                      <div key={item.id} className="p-8 rounded-3xl bg-surface-container-low border border-outline-variant/20 hover:border-primary/30 transition-all group">
                         <span className="material-symbols-outlined text-primary mb-6">{item.type === 'api' ? 'code' : 'description'}</span>
                         <h3 className="text-2xl font-headline italic mb-2">{item.name}</h3>
                         <p className="text-on-surface-variant text-sm mb-6">{item.desc}</p>
                         <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">{item.price} USDC</span>
                            <button className="text-[10px] font-bold uppercase border-b border-primary pb-1">Access</button>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
            </section>
          )}

          {activeView === 'merchant' && (
            <section className="w-full bg-surface overflow-y-auto p-12">
               <div className="max-w-6xl mx-auto space-y-12">
                  <div className="flex justify-between items-end">
                    <h2 className="font-headline text-5xl italic text-on-surface tracking-tight">Merchant Hub</h2>
                    <button className="bg-primary text-on-primary px-8 py-4 text-[10px] font-bold uppercase rounded-lg">Create Resource</button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-8">
                     <div className="p-8 rounded-3xl bg-surface-container-low border border-outline-variant/20">
                        <p className="text-[10px] uppercase opacity-60 mb-2">Earnings</p>
                        <p className="text-4xl font-headline italic">124.50 USDC</p>
                     </div>
                  </div>
               </div>
            </section>
          )}

          {activeView === 'identity' && (
            <section className="w-full bg-surface overflow-y-auto p-12">
               <div className="max-w-4xl mx-auto space-y-12">
                  <h2 className="font-headline text-5xl italic text-on-surface text-center">Agent Passport</h2>
                  <div className="grid md:grid-cols-2 gap-12 pt-8">
                     <div className="p-8 rounded-3xl bg-surface-container-low border border-outline-variant/20 space-y-6">
                        <h3 className="font-headline text-2xl italic">Identity Registry</h3>
                        {agentId ? <p className="text-2xl font-mono font-bold tracking-tighter">#{agentId}</p> : 
                        <button onClick={handleRegisterIdentity} disabled={isRegistering} className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest">{isRegistering ? 'Minting...' : 'Mint Agent Passport'}</button>}
                     </div>
                  </div>
               </div>
            </section>
          )}
        </main>
      </div>

      {isOverlayOpen && <div className="fixed inset-0 bg-background/40 backdrop-blur-[16px] z-[60]" onClick={() => { if (checkoutStatus !== 'processing') { setIsCartOpen(false); setIsCheckoutOpen(false); } }}></div>}

      <aside className={`fixed right-0 top-0 h-full w-[360px] bg-surface-container-lowest shadow-2xl z-[70] flex flex-col border-l border-outline-variant/20 transition-transform duration-300 ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 flex justify-between items-center border-b border-outline-variant/10">
          <h2 className="font-headline text-2xl italic">Your cart</h2>
          <button onClick={() => setIsCartOpen(false)} className="material-symbols-outlined">close</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.map((item) => (
            <div key={item.productId} className="flex gap-4 items-start">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container shrink-0 relative border border-outline-variant/20">
                <Image className="w-full h-full object-cover" alt={item.productName} src={item.image} fill />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-on-surface">{item.productName}</p>
                <p className="text-xs text-primary font-bold">{item.priceUsdc.toFixed(2)} USDC</p>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="p-6 border-t border-outline-variant/10 space-y-4">
            <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold uppercase tracking-wide">Checkout</button>
          </div>
        )}
      </aside>

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-surface-container-lowest p-8 rounded-2xl shadow-2xl border border-outline-variant/30 pointer-events-auto">
            {checkoutStatus === 'success' ? <div className="text-center py-8 space-y-6"><h3 className="text-2xl font-headline italic">Payment Confirmed</h3></div> : 
            <div className="space-y-6">
              <h3 className="text-on-surface text-xl font-bold">Confirm payment</h3>
              <p className="text-4xl font-headline italic text-on-surface">{cartTotal.toFixed(2)} USDC</p>
              <button disabled={checkoutStatus === 'processing'} onClick={handleCheckout} className="w-full bg-primary text-on-primary py-3 px-8 rounded-lg font-bold uppercase">{checkoutStatus === 'processing' ? 'Processing...' : 'Approve in wallet'}</button>
            </div>}
          </div>
        </div>
      )}
      {orderConfirmation && <OrderConfirmationModal order={orderConfirmation} onClose={() => setOrderConfirmation(null)} />}
    </div>
  )
}

function ProductCard({ product, onAddToCart }: { product: Product, onAddToCart: () => void }) {
  const { name, brand, priceUsdc, image } = product
  return (
    <div className="bg-surface-container-low p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col rounded-[12px]">
      <div className="aspect-square bg-surface-container-lowest mb-4 overflow-hidden rounded-[8px] relative"><Image alt={name} src={image} fill className="object-cover" /></div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-secondary font-bold mb-1">{brand}</p>
      <h3 className="font-headline text-lg leading-tight mb-3 line-clamp-2">{name}</h3>
      <div className="mt-auto flex justify-between items-center">
        <span className="font-mono text-sm font-semibold">{priceUsdc.toFixed(2)} USDC</span>
        <button onClick={onAddToCart} className="bg-primary text-on-primary px-4 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider">Add</button>
      </div>
    </div>
  )
}
