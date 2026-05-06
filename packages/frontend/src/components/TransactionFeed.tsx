'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Activity, ExternalLink, Zap, Database, Code, FileText, Layers } from 'lucide-react'

interface Sale {
  buyerAddress: string
  txHash: string
  timestamp: string
  listingId: string
  listingName: string
  listingType: string
  priceUsdc: number
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  api: <Zap className="h-3 w-3" />,
  dataset: <Database className="h-3 w-3" />,
  code: <Code className="h-3 w-3" />,
  article: <FileText className="h-3 w-3" />,
  file: <FileText className="h-3 w-3" />,
}

const POLL_INTERVAL_MS = 8000
const ROTATE_INTERVAL_MS = 4000

function truncate(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length <= head + tail + 2) return addr || ''
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`
}

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

export function TransactionFeed() {
  const [sales, setSales] = useState<Sale[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)

  // Polling: fetch the 10 most recent sales every 8 seconds.
  useEffect(() => {
    let cancelled = false

    const fetchSales = async () => {
      try {
        const res = await fetch('/api/sales/recent?limit=10', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (Array.isArray(data.sales)) {
          setSales(data.sales)
        }
      } catch {
        // Silent failure — empty state handles it.
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }

    fetchSales()
    const id = setInterval(fetchSales, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  // Rotation: cycle through the 5 most recent every 4 seconds.
  useEffect(() => {
    if (sales.length <= 1) return
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % Math.min(sales.length, 5))
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [sales.length])

  // Reset index if sales list shrinks.
  useEffect(() => {
    if (activeIndex >= sales.length && sales.length > 0) {
      setActiveIndex(0)
    }
  }, [sales.length, activeIndex])

  const explorerBase =
    process.env.NEXT_PUBLIC_KITE_EXPLORER_URL || 'https://kitescan.ai'

  const current = sales[activeIndex]

  return (
    <div className="border-b border-outline-variant/10 bg-surface-container-lowest">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3 sm:gap-5 overflow-hidden">
        {/* LIVE FEED pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="font-label uppercase tracking-widest text-[10px] text-primary font-bold">
            Live Feed
          </span>
        </div>

        <div className="h-3 w-px bg-outline-variant/30 shrink-0" />

        {/* Rotating transaction row */}
        <div className="flex-1 min-w-0 relative h-5">
          {!loaded && (
            <div className="absolute inset-0 flex items-center text-[11px] font-label uppercase tracking-widest text-on-surface-variant opacity-40">
              Loading agent activity...
            </div>
          )}

          {loaded && sales.length === 0 && (
            <div className="absolute inset-0 flex items-center gap-2 text-[11px] text-on-surface-variant">
              <Activity className="h-3 w-3 opacity-50" />
              <span className="font-label uppercase tracking-widest text-[10px] opacity-60">
                Awaiting first agent transaction...
              </span>
            </div>
          )}

          {loaded && current && (
            <div
              key={`${current.txHash}-${activeIndex}`}
              className="absolute inset-0 flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-on-surface-variant whitespace-nowrap animate-[fadeIn_0.4s_ease-out]"
              style={{ animation: 'fadeIn 0.4s ease-out' }}
            >
              <span className="font-mono text-primary font-bold shrink-0">
                {truncate(current.buyerAddress)}
              </span>
              <ArrowRight className="h-3 w-3 opacity-40 shrink-0" />
              <span className="flex items-center gap-1 shrink-0 text-on-surface-variant opacity-70">
                {TYPE_ICON[current.listingType] || <Layers className="h-3 w-3" />}
              </span>
              <span className="font-headline italic text-on-background truncate">
                {current.listingName}
              </span>
              <span className="text-primary font-bold shrink-0">
                ${current.priceUsdc.toFixed(2)} USDC
              </span>
              <span className="hidden sm:inline opacity-40 shrink-0">·</span>
              <span className="hidden sm:inline font-label uppercase tracking-widest text-[10px] opacity-50 shrink-0">
                {timeAgo(current.timestamp)}
              </span>
              <a
                href={`${explorerBase}/tx/${current.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1 text-primary opacity-60 hover:opacity-100 transition-opacity shrink-0 ml-auto"
                aria-label={`View transaction ${truncate(current.txHash, 8, 6)} on Kitescan`}
              >
                <span className="font-mono text-[10px]">{truncate(current.txHash, 8, 6)}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Pagination dots */}
        {sales.length > 1 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {sales.slice(0, 5).map((_, i) => (
              <span
                key={i}
                className={`h-1 w-1 rounded-full transition-all ${
                  i === activeIndex ? 'bg-primary w-3' : 'bg-outline-variant/40'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
