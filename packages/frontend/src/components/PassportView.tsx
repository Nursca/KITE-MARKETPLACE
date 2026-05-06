'use client'

import { useEffect, useState } from 'react'
import { Shield, Zap, TrendingUp, Bot, FileText, CheckCircle2 } from 'lucide-react'

const TIER_NAMES = ['Scout', 'Trader', 'Verified', 'Elite']
const TIER_THRESHOLDS = [0, 10, 100, 500] // USDC thresholds for each tier
const TIER_COLORS = [
  'text-slate-400 bg-slate-400/10 border-slate-400/20',
  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'text-green-400 bg-green-400/10 border-green-400/20',
  'text-primary bg-primary/10 border-primary/20',
]

/**
 * Calculate tier dynamically based on total volume earned
 * Scout: $0, Trader: $10, Verified: $100, Elite: $500
 */
function calculateTier(totalEarnedUsdc: number): number {
  if (totalEarnedUsdc >= TIER_THRESHOLDS[3]) return 3
  if (totalEarnedUsdc >= TIER_THRESHOLDS[2]) return 2
  if (totalEarnedUsdc >= TIER_THRESHOLDS[1]) return 1
  return 0
}

interface PassportViewProps {
  agentId: string | null
  address?: string
  passport: any | null
  onRegister: () => void
  isRegistering: boolean
}

interface CreatorStats {
  totalEarnedUsdc: number
  salesCount: number
  error?: string
}

export function PassportView({ agentId, address, passport, onRegister, isRegistering }: PassportViewProps) {
  const [creatorStats, setCreatorStats] = useState<CreatorStats>({ totalEarnedUsdc: 0, salesCount: 0 })
  const [loadingStats, setLoadingStats] = useState(false)

  const truncateAddress = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`

  // Fetch creator's earnings from live listings data
  useEffect(() => {
    if (!address || !agentId) return

    const fetchCreatorStats = async () => {
      try {
        setLoadingStats(true)
        const res = await fetch(`/api/listings?creatorAddress=${address}`)
        if (res.ok) {
          const data = await res.json()
          const listings = data.listings || []
          
          // Calculate total earned and sales count from creator's listings
          const totalEarned = listings.reduce((sum: number, l: any) => sum + (l.totalEarnedUsdc || 0), 0)
          const totalSales = listings.reduce((sum: number, l: any) => sum + (l.salesCount || 0), 0)
          
          setCreatorStats({
            totalEarnedUsdc: totalEarned,
            salesCount: totalSales,
          })
        } else {
          setCreatorStats({ totalEarnedUsdc: 0, salesCount: 0 })
        }
      } catch (error) {
        console.error('[PassportView] Failed to fetch creator stats:', error)
        setCreatorStats({ totalEarnedUsdc: 0, salesCount: 0, error: 'Failed to load stats' })
      } finally {
        setLoadingStats(false)
      }
    }

    fetchCreatorStats()
    // Refresh stats every 30 seconds for live updates
    const interval = setInterval(fetchCreatorStats, 30000)
    return () => clearInterval(interval)
  }, [address, agentId])

  if (!agentId) {
    return (
      <section className="w-full bg-surface overflow-y-auto p-4 sm:p-6 lg:p-10">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 py-6 sm:py-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-4">
            <Shield className="h-10 w-10" />
          </div>
          <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl italic">Mint Your Agent Passport</h2>
          <p className="text-on-surface-variant max-w-xl mx-auto leading-relaxed">
            Your Passport is a verifiable on-chain identity for the Kite Agentic Economy. 
            It tracks your trade volume, reputation, and protocol capabilities to build trust with other agents.
          </p>
          <button
            onClick={onRegister}
            disabled={isRegistering}
            className="bg-primary text-on-primary px-10 py-4 rounded-xl font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xl shadow-primary/20"
          >
            {isRegistering ? 'Minting on Kite Testnet...' : 'Create My On-Chain Passport'}
          </button>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 pt-6 sm:pt-10 text-left">
            {[
              { icon: <Bot />, title: "Verifiable DID", desc: "did:kite:0x... based identity stored on-chain via ERC-8004." },
              { icon: <TrendingUp />, title: "Trade Tiers", desc: "Level up from Scout to Elite based on your USDC volume." },
              { icon: <Shield />, title: "Trust Scores", desc: "Cumulative reputation from every successful x402 transaction." },
            ].map(f => (
              <div key={f.title} className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                <div className="text-primary mb-3">{f.icon}</div>
                <h4 className="font-headline italic text-lg mb-1">{f.title}</h4>
                <p className="text-xs text-on-surface-variant opacity-60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const tier = calculateTier(creatorStats.totalEarnedUsdc)
  const nextTierThreshold = tier < TIER_NAMES.length - 1 ? TIER_THRESHOLDS[tier + 1] : TIER_THRESHOLDS[tier]

  return (
    <section className="w-full bg-surface overflow-y-auto p-4 sm:p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 sm:gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl italic">Agent Passport</h2>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${TIER_COLORS[tier]}`}>
                {TIER_NAMES[tier]} Tier
              </span>
            </div>
            <p className="text-sm font-mono opacity-50">{passport?.did || `did:kite:${address}`}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-2xl font-headline italic text-primary">${creatorStats.totalEarnedUsdc.toFixed(2)}</p>
              <p className="text-[10px] uppercase tracking-widest opacity-50">Total Volume (USDC)</p>
            </div>
            <div className="text-right border-l border-outline-variant/20 pl-4">
              <p className="text-2xl font-headline italic text-primary">{(4.0 + (creatorStats.salesCount * 0.1)).toFixed(1)}</p>
              <p className="text-[10px] uppercase tracking-widest opacity-50">Trust Score</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Identity Card */}
          <div className="lg:col-span-2 p-8 rounded-3xl bg-surface-container-low border border-outline-variant/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
              <Shield className="w-64 h-64" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-start">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Bot className="h-8 w-8" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Passport ID</p>
                  <p className="text-xl sm:text-3xl font-mono font-bold break-all">#{agentId}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                <div>
                  <label className="text-[10px] font-label uppercase tracking-widest opacity-40 block mb-1">Owner Address</label>
                  <p className="text-sm font-mono">{address ? truncateAddress(address) : '—'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-label uppercase tracking-widest opacity-40 block mb-1">CDP Agent Wallet</label>
                  <p className="text-sm font-mono">{address ? truncateAddress(address) : '—'}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-label uppercase tracking-widest opacity-40 block mb-3">Protocol Capabilities</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'x402', icon: <Zap className="h-3 w-3" /> },
                    { label: 'MCP', icon: <FileText className="h-3 w-3" /> },
                    { label: 'A2A', icon: <Bot className="h-3 w-3" /> },
                    { label: 'AP2', icon: <Shield className="h-3 w-3" /> },
                  ].map(p => (
                    <span key={p.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/10 text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-primary">{p.icon}</span> {p.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tier Progress */}
          <div className="p-8 rounded-3xl bg-surface-container-high border border-outline-variant/30 flex flex-col justify-between">
            <h3 className="font-headline text-xl italic mb-6">Tier Progression</h3>
            <div className="space-y-6">
              {TIER_NAMES.map((name, i) => (
                <div key={name} className={`flex items-center justify-between ${tier >= i ? 'opacity-100' : 'opacity-30'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${tier >= i ? 'bg-primary' : 'bg-outline-variant'}`} />
                    <span className="text-sm font-bold uppercase tracking-widest">{name}</span>
                  </div>
                  {tier >= i && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-outline-variant/10">
              <p className="text-[10px] text-on-surface-variant opacity-60 leading-relaxed">
                {tier >= TIER_NAMES.length - 1 ? (
                  <>You have reached Elite tier! 🎉</>
                ) : (
                  <>
                    Next Tier: <strong>{TIER_NAMES[tier + 1]}</strong><br />
                    Requires ${TIER_THRESHOLDS[tier + 1].toFixed(2)} volume. {creatorStats.totalEarnedUsdc >= TIER_THRESHOLDS[tier + 1] ? '✓ Unlocked!' : `${(TIER_THRESHOLDS[tier + 1] - creatorStats.totalEarnedUsdc).toFixed(2)} more to go.`}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
