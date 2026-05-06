'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ExternalLink } from 'lucide-react'

interface Transaction {
  id: string
  listingName: string
  buyerAddress: string
  priceUsdc: number
  txHash: string
  timestamp: string
}

export function TransactionFeed() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[TransactionFeed] Supabase credentials not configured')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Subscribe to realtime sales updates
    const channel = supabase
      .channel('sales-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales',
        },
        async (payload) => {
          try {
            const sale = payload.new as any
            
            // Fetch listing details to get name and price
            const { data: listing } = await supabase
              .from('listings')
              .select('name, price_usdc')
              .eq('id', sale.listing_id)
              .single()

            const transaction: Transaction = {
              id: `${sale.id}-${Date.now()}`,
              listingName: listing?.name || 'Unknown Listing',
              buyerAddress: sale.buyer_address,
              priceUsdc: listing?.price_usdc || 0,
              txHash: sale.tx_hash || 'pending',
              timestamp: new Date().toISOString(),
            }

            setTransactions((prev) => [transaction, ...prev.slice(0, 4)])
          } catch (error) {
            console.error('[TransactionFeed] Error processing transaction:', error)
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (!isConnected || transactions.length === 0) {
    return null
  }

  const truncateAddress = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`
  const truncateHash = (hash: string) =>
    hash === 'pending' ? 'pending' : `${hash.slice(0, 10)}...${hash.slice(-8)}`

  return (
    <div className="border-b border-outline-variant/10 bg-surface-container-low py-3">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
            Live Marketplace
          </span>
        </div>
        <div className="overflow-hidden">
          <div className="space-y-1.5">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 text-xs font-mono p-2 rounded-lg bg-surface-container/50 hover:bg-surface-container transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface truncate">
                    <span className="text-primary font-bold">{truncateAddress(tx.buyerAddress)}</span>{' '}
                    <span className="text-on-surface-variant">purchased</span>{' '}
                    <span className="text-primary font-bold line-clamp-1">{tx.listingName}</span>{' '}
                    <span className="text-on-surface-variant">for</span>{' '}
                    <span className="text-primary font-bold">${tx.priceUsdc.toFixed(2)}</span> USDC
                  </p>
                </div>
                <a
                  href={`https://kitescan.ai/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                  title={tx.txHash}
                >
                  <span className="text-[10px]">{truncateHash(tx.txHash)}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
