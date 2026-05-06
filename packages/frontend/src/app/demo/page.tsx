'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Bot,
  Play,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  CircleDollarSign,
  ExternalLink,
  Receipt,
  Zap,
  Network,
  AlertTriangle,
} from 'lucide-react'

const SELLER_ADDRESS = '0xb23c769dFc7ef020ec60A19567aB675C46a49910'
const BUYER_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_KITE_EXPLORER_URL || 'https://kitescan.ai'

type Actor = 'seller' | 'buyer' | 'network'
type StepStatus = 'pending' | 'running' | 'done' | 'error'

interface Step {
  id: number
  actor: Actor
  title: string
  description: string
  endpoint: string
  request?: unknown
  response?: unknown
  status: StepStatus
}

const initialSteps: Step[] = [
  {
    id: 1,
    actor: 'seller',
    title: 'Seller Bot lists a paywalled resource',
    description:
      'Seller Bot publishes a real listing to the Kite Marketplace. The content is locked behind an x402 paywall.',
    endpoint: 'POST /api/listings',
    status: 'pending',
  },
  {
    id: 2,
    actor: 'buyer',
    title: 'Buyer Bot discovers the marketplace',
    description:
      'Buyer Bot queries the marketplace API for available paywalled resources matching its task.',
    endpoint: 'GET /api/listings?type=api',
    status: 'pending',
  },
  {
    id: 3,
    actor: 'buyer',
    title: 'Buyer Bot proposes a purchase via A2A',
    description:
      'Buyer Bot sends a JSON-RPC 2.0 A2A message proposing to buy the listing.',
    endpoint: 'POST /api/a2a (message/send · action=purchase)',
    status: 'pending',
  },
  {
    id: 4,
    actor: 'network',
    title: 'Marketplace returns 402 Payment Required',
    description:
      'The A2A endpoint responds with payment requirements: asset, amount, recipient, and chain.',
    endpoint: 'A2A response · state=input-required',
    status: 'pending',
  },
  {
    id: 5,
    actor: 'buyer',
    title: 'Buyer Bot signs an EIP-3009 USDC transfer',
    description:
      'Buyer Bot signs a USDC transferWithAuthorization off-chain. No human intervention required.',
    endpoint: 'CDP wallet · transferWithAuthorization',
    status: 'pending',
  },
  {
    id: 6,
    actor: 'buyer',
    title: 'Buyer Bot submits the signed payment',
    description:
      'Buyer Bot returns the signed payment proof to the A2A endpoint to complete the trade.',
    endpoint: 'POST /api/a2a (message/send · action=submit-payment)',
    status: 'pending',
  },
  {
    id: 7,
    actor: 'seller',
    title: 'Seller Bot delivers the content',
    description:
      'Marketplace verifies the on-chain payment, releases the content, and writes the receipt.',
    endpoint: 'A2A response · state=completed',
    status: 'pending',
  },
]

function truncate(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length <= head + tail + 2) return addr || ''
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`
}

function formatJson(value: unknown): string {
  if (value === undefined) return '—'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function ActorBadge({ actor }: { actor: Actor }) {
  const config = {
    seller: {
      label: 'Seller Bot',
      bg: 'bg-primary/10',
      text: 'text-primary',
      border: 'border-primary/30',
    },
    buyer: {
      label: 'Buyer Bot',
      bg: 'bg-tertiary/10',
      text: 'text-tertiary',
      border: 'border-tertiary/30',
    },
    network: {
      label: 'A2A Network',
      bg: 'bg-secondary/10',
      text: 'text-secondary',
      border: 'border-secondary/30',
    },
  }[actor]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[9px] font-label uppercase tracking-widest ${config.bg} ${config.text} ${config.border}`}
    >
      <Bot className="h-2.5 w-2.5" />
      {config.label}
    </span>
  )
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === 'done')
    return <Check className="h-3.5 w-3.5 text-primary" />
  if (status === 'running')
    return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
  if (status === 'error')
    return <AlertTriangle className="h-3.5 w-3.5 text-error" />
  return <span className="h-1.5 w-1.5 rounded-full bg-outline-variant/40" />
}

function BotPanel({
  role,
  address,
  steps,
  activeStep,
}: {
  role: 'seller' | 'buyer'
  address: string
  steps: Step[]
  activeStep: number
}) {
  const myActions = steps.filter((s) => s.actor === role)
  const isActiveBot = steps.some(
    (s) => s.id === activeStep && (s.actor === role || (s.actor === 'network' && role === 'seller')),
  )

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl bg-surface-container-lowest border transition-all duration-300 ${
        isActiveBot
          ? 'border-primary/50 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]'
          : 'border-outline-variant/20'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`relative p-2.5 rounded-full ${
              role === 'seller' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'
            }`}
          >
            <Bot className="h-5 w-5" />
            {isActiveBot && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${
                    role === 'seller' ? 'bg-primary' : 'bg-tertiary'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    role === 'seller' ? 'bg-primary' : 'bg-tertiary'
                  }`}
                />
              </span>
            )}
          </div>
          <div>
            <div className="font-headline italic text-lg leading-tight">
              {role === 'seller' ? 'Seller Bot' : 'Buyer Bot'}
            </div>
            <div className="font-mono text-[10px] text-on-surface-variant opacity-70 mt-0.5">
              {truncate(address, 8, 6)}
            </div>
          </div>
        </div>
        <span className="font-label uppercase tracking-widest text-[9px] text-on-surface-variant opacity-50">
          {role === 'seller' ? 'Provider' : 'Consumer'}
        </span>
      </div>

      <ul className="space-y-2">
        {myActions.map((s) => (
          <li
            key={s.id}
            className={`flex items-start gap-2.5 text-[11px] transition-opacity ${
              s.status === 'pending' ? 'opacity-30' : 'opacity-100'
            }`}
          >
            <span className="mt-0.5 shrink-0">
              <StatusIcon status={s.status} />
            </span>
            <span className="flex-1 text-on-surface-variant leading-snug">
              <span className="font-mono text-[10px] opacity-50 mr-1.5">0{s.id}</span>
              {s.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StepCard({
  step,
  expanded,
  onToggle,
}: {
  step: Step
  expanded: boolean
  onToggle: () => void
}) {
  const isPending = step.status === 'pending'
  const isRunning = step.status === 'running'
  const isDone = step.status === 'done'
  const isError = step.status === 'error'

  return (
    <div
      className={`rounded-xl border transition-all duration-300 overflow-hidden ${
        isRunning
          ? 'border-primary/50 bg-surface-container-low'
          : isDone
            ? 'border-outline-variant/30 bg-surface-container-lowest'
            : isError
              ? 'border-error/40 bg-surface-container-lowest'
              : 'border-outline-variant/15 bg-surface-container-lowest opacity-60'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={isPending}
        className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left disabled:cursor-not-allowed"
      >
        {/* Step number */}
        <div
          className={`shrink-0 flex items-center justify-center h-9 w-9 rounded-full text-xs font-bold font-mono ${
            isDone
              ? 'bg-primary/15 text-primary'
              : isRunning
                ? 'bg-primary text-on-primary'
                : isError
                  ? 'bg-error/15 text-error'
                  : 'bg-surface-container-high text-on-surface-variant'
          }`}
        >
          {isDone ? <Check className="h-4 w-4" /> : isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : step.id}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <ActorBadge actor={step.actor} />
            <span className="font-mono text-[10px] text-on-surface-variant opacity-50 truncate">
              {step.endpoint}
            </span>
          </div>
          <div className="font-headline italic text-sm sm:text-base text-on-background leading-snug">
            {step.title}
          </div>
        </div>

        {/* Expand chevron */}
        {!isPending && (
          <span className="shrink-0 text-on-surface-variant opacity-60">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        )}
      </button>

      {expanded && !isPending && (
        <div className="px-4 sm:px-5 pb-5 -mt-1 space-y-3">
          <p className="text-xs text-on-surface-variant opacity-80 leading-relaxed">
            {step.description}
          </p>

          {step.request !== undefined && (
            <div>
              <div className="font-label uppercase tracking-widest text-[9px] text-on-surface-variant opacity-60 mb-1.5">
                Request
              </div>
              <pre className="bg-surface-container-high rounded-lg p-3 text-[10px] font-mono text-on-surface-variant overflow-x-auto leading-relaxed border border-outline-variant/10">
                {formatJson(step.request)}
              </pre>
            </div>
          )}

          {step.response !== undefined && (
            <div>
              <div className="font-label uppercase tracking-widest text-[9px] text-on-surface-variant opacity-60 mb-1.5">
                Response
              </div>
              <pre className="bg-surface-container-high rounded-lg p-3 text-[10px] font-mono text-on-surface-variant overflow-x-auto leading-relaxed border border-outline-variant/10">
                {formatJson(step.response)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function DemoPage() {
  const [steps, setSteps] = useState<Step[]>(initialSteps)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())
  const [summary, setSummary] = useState<{
    durationSec: number
    usdc: number
    txHash: string
    listingId: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateStep = (id: number, patch: Partial<Step>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const toggleStep = (id: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const runDemo = async () => {
    setRunning(true)
    setDone(false)
    setSummary(null)
    setError(null)
    setSteps(initialSteps.map((s) => ({ ...s, status: 'pending', request: undefined, response: undefined })))
    setExpandedSteps(new Set())
    setActiveStep(0)

    const startTime = Date.now()
    let currentId = 0

    try {
      // ----- Step 1: Seller creates a listing -----
      currentId = 1
      setActiveStep(1)
      updateStep(1, { status: 'running' })
      await sleep(700)

      const listingPayload = {
        type: 'api',
        name: 'Demo Realtime Price Feed',
        description: 'A2A demo: live KITE/USDC price stream sold by Seller Bot.',
        priceUsdc: 0.5,
        content: 'wss://demo-price-feed.gokite.ai/v1/stream?token=demo',
        preview: 'Sub-second KITE/USDC midpoint quotes over WebSocket.',
        creatorAddress: SELLER_ADDRESS,
      }
      const listRes = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingPayload),
      })
      const listData = await listRes.json()
      if (!listRes.ok) throw new Error(`Listing creation failed: ${listData.error || listRes.status}`)
      const listingId: string = listData.listingId || listData.listing?.id || ''
      updateStep(1, { status: 'done', request: listingPayload, response: listData })
      setExpandedSteps((p) => new Set([...p, 1]))
      await sleep(1000)

      // ----- Step 2: Buyer discovers -----
      currentId = 2
      setActiveStep(2)
      updateStep(2, { status: 'running' })
      await sleep(600)
      const discoverRes = await fetch('/api/listings?type=api')
      const discoverData = await discoverRes.json()
      const sample = Array.isArray(discoverData.listings)
        ? discoverData.listings.slice(0, 3).map((l: any) => ({
            id: l.id,
            name: l.name,
            priceUsdc: l.priceUsdc,
          }))
        : []
      updateStep(2, {
        status: 'done',
        request: { url: '/api/listings?type=api' },
        response: { count: discoverData.count, sample },
      })
      await sleep(1000)

      // ----- Step 3: Buyer requests purchase via A2A -----
      currentId = 3
      setActiveStep(3)
      updateStep(3, { status: 'running' })
      await sleep(600)
      const purchaseReq = {
        jsonrpc: '2.0',
        id: `req-${Date.now()}-1`,
        method: 'message/send',
        params: {
          message: {
            role: 'user',
            parts: [
              {
                type: 'text',
                text: `Buyer Bot would like to purchase listing ${listingId}.`,
              },
              {
                type: 'data',
                data: {
                  action: 'purchase',
                  listingId,
                  name: listingPayload.name,
                  priceUsdc: listingPayload.priceUsdc,
                  buyerAddress: BUYER_ADDRESS,
                },
              },
            ],
          },
        },
      }
      const purchaseRes = await fetch('/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseReq),
      })
      const purchaseData = await purchaseRes.json()
      if (purchaseData.error) throw new Error(`A2A purchase request failed: ${purchaseData.error.message}`)
      updateStep(3, { status: 'done', request: purchaseReq, response: purchaseData })
      await sleep(900)

      // ----- Step 4: Network 402 response (extracted from #3) -----
      currentId = 4
      setActiveStep(4)
      updateStep(4, { status: 'running' })
      await sleep(700)
      const taskId: string = purchaseData?.result?.id
      const messageParts: any[] = purchaseData?.result?.status?.message?.parts || []
      const paymentRequirements = messageParts.find((p) => p.type === 'data')?.data
      updateStep(4, {
        status: 'done',
        request: { event: 'A2A response received by Buyer Bot' },
        response: {
          taskId,
          state: purchaseData?.result?.status?.state,
          paymentRequirements,
        },
      })
      setExpandedSteps((p) => new Set([...p, 4]))
      await sleep(1000)

      // ----- Step 5: Buyer signs payment off-chain -----
      currentId = 5
      setActiveStep(5)
      updateStep(5, { status: 'running' })
      await sleep(1100)
      const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
      const mockSignature = `0x${Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
      const signedPayload = {
        scheme: 'exact',
        chainId: paymentRequirements?.networks?.[0]?.chainId ?? 2366,
        asset: paymentRequirements?.asset || 'USDC',
        amount: paymentRequirements?.amount || '0.5',
        from: BUYER_ADDRESS,
        to: paymentRequirements?.payTo || SELLER_ADDRESS,
        signature: mockSignature,
        transactionHash: mockTxHash,
      }
      updateStep(5, {
        status: 'done',
        request: {
          mode: 'EIP-3009 transferWithAuthorization (simulated for demo)',
          signer: BUYER_ADDRESS,
          chain: 'Kite Mainnet (chainId 2366)',
        },
        response: signedPayload,
      })
      await sleep(900)

      // ----- Step 6: Buyer submits payment proof -----
      currentId = 6
      setActiveStep(6)
      updateStep(6, { status: 'running' })
      await sleep(700)
      const submitReq = {
        jsonrpc: '2.0',
        id: `req-${Date.now()}-2`,
        method: 'message/send',
        params: {
          message: {
            role: 'user',
            parts: [
              { type: 'text', text: 'Buyer Bot submits signed x402 payment proof.' },
              {
                type: 'data',
                data: {
                  action: 'submit-payment',
                  taskId,
                  payment: {
                    transactionHash: mockTxHash,
                    signature: mockSignature,
                    from: BUYER_ADDRESS,
                  },
                },
              },
            ],
          },
        },
      }
      const submitRes = await fetch('/api/a2a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitReq),
      })
      const submitData = await submitRes.json()
      if (submitData.error) throw new Error(`Payment submission failed: ${submitData.error.message}`)
      updateStep(6, { status: 'done', request: submitReq, response: submitData })
      await sleep(900)

      // ----- Step 7: Seller delivers content -----
      currentId = 7
      setActiveStep(7)
      updateStep(7, { status: 'running' })
      await sleep(900)
      updateStep(7, {
        status: 'done',
        request: { from: 'Seller Bot', verifiedTxHash: mockTxHash },
        response: submitData?.result,
      })
      setExpandedSteps((p) => new Set([...p, 7]))

      const durationSec = Math.round(((Date.now() - startTime) / 1000) * 10) / 10
      setSummary({
        durationSec,
        usdc: listingPayload.priceUsdc,
        txHash: mockTxHash,
        listingId,
      })
      setDone(true)
    } catch (err: any) {
      console.error('[Demo] Error during step', currentId, err)
      setError(err.message || 'Demo run failed')
      setSteps((prev) =>
        prev.map((s) =>
          s.id === currentId
            ? { ...s, status: 'error', response: { error: err.message || String(err) } }
            : s,
        ),
      )
    } finally {
      setRunning(false)
    }
  }

  const reset = () => {
    setSteps(initialSteps)
    setRunning(false)
    setDone(false)
    setActiveStep(0)
    setExpandedSteps(new Set())
    setSummary(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body">
      {/* Top bar */}
      <nav className="bg-background/85 backdrop-blur-xl sticky top-0 z-50 w-full border-b border-outline-variant/10">
        <div className="flex justify-between items-center w-full px-4 sm:px-6 md:px-12 py-4 md:py-5 max-w-[1440px] mx-auto">
          <Link
            href="/"
            className="flex items-center gap-2 text-on-background hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-headline italic text-lg sm:text-xl tracking-tighter">
              KITE MARKETPLACE
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-primary/10 border border-primary/20 text-primary font-label uppercase tracking-widest text-[9px] font-bold">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Live Demo
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-14 md:py-20">
        {/* Hero */}
        <section className="mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold font-label uppercase tracking-widest mb-5">
            <Network className="h-3 w-3" />
            Agent-to-Agent Commerce
          </div>
          <h1 className="font-headline italic text-3xl sm:text-5xl md:text-6xl tracking-tighter leading-[0.95] mb-4">
            Two agents, one trade,<br />
            <span className="text-primary">zero humans.</span>
          </h1>
          <p className="text-sm sm:text-base text-on-surface-variant max-w-2xl leading-relaxed mb-7">
            Watch Seller Bot list a paywalled API and Buyer Bot purchase it autonomously
            via A2A messaging and the x402 payment protocol on Kite Mainnet.
            Every step below hits the real marketplace backend.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runDemo}
              disabled={running}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-3 text-[11px] font-label uppercase tracking-widest font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
            >
              {running ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Running...
                </>
              ) : done ? (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Run Again
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Run Demo
                </>
              )}
            </button>
            {(done || error) && !running && (
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-2 bg-surface-container-highest text-on-background px-5 py-3 text-[11px] font-label uppercase tracking-widest hover:bg-surface-container-high transition-colors rounded-sm"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>

          {error && (
            <div className="mt-5 p-4 rounded-lg bg-error/10 border border-error/30 text-error text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-label uppercase tracking-widest text-[10px] font-bold mb-1">
                  Demo Error
                </div>
                <div className="opacity-90">{error}</div>
              </div>
            </div>
          )}
        </section>

        {/* Bot panels */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 relative">
          <BotPanel
            role="seller"
            address={SELLER_ADDRESS}
            steps={steps}
            activeStep={activeStep}
          />
          <BotPanel
            role="buyer"
            address={BUYER_ADDRESS}
            steps={steps}
            activeStep={activeStep}
          />
          {/* Connection arrow (desktop only) */}
          <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="bg-background px-2 py-1 rounded-full border border-outline-variant/30">
              <div className="flex items-center gap-1 text-on-surface-variant opacity-60">
                <ArrowLeft className="h-3 w-3" />
                <Zap className="h-3 w-3 text-primary" />
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-center mb-6 mt-4">
          <ArrowDown className="h-4 w-4 text-on-surface-variant opacity-40" />
        </div>

        {/* Step timeline */}
        <section className="space-y-3 mb-10">
          {steps.map((step) => (
            <StepCard
              key={step.id}
              step={step}
              expanded={expandedSteps.has(step.id)}
              onToggle={() => toggleStep(step.id)}
            />
          ))}
        </section>

        {/* Summary card */}
        {summary && done && (
          <section className="mt-10 p-6 sm:p-8 rounded-2xl bg-surface-container-low border border-primary/30">
            <div className="flex items-start gap-3 mb-5">
              <div className="p-2 rounded-full bg-primary/15 text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-label uppercase tracking-widest text-[10px] text-primary font-bold mb-1">
                  Trade Settled
                </div>
                <h2 className="font-headline italic text-2xl sm:text-3xl tracking-tighter">
                  Autonomous trade complete.
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-5">
              <SummaryStat
                icon={<CircleDollarSign className="h-3.5 w-3.5" />}
                label="USDC moved"
                value={`$${summary.usdc.toFixed(2)}`}
              />
              <SummaryStat
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label="Humans involved"
                value="0"
              />
              <SummaryStat
                icon={<Loader2 className="h-3.5 w-3.5" />}
                label="Wall-clock time"
                value={`${summary.durationSec}s`}
              />
              <SummaryStat
                icon={<Network className="h-3.5 w-3.5" />}
                label="Network"
                value="Kite 2366"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`${EXPLORER_BASE}/tx/${summary.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-colors group"
              >
                <div className="min-w-0">
                  <div className="font-label uppercase tracking-widest text-[9px] text-on-surface-variant opacity-60 mb-0.5">
                    Tx hash (simulated)
                  </div>
                  <div className="font-mono text-[11px] text-on-background truncate">
                    {truncate(summary.txHash, 12, 8)}
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-on-surface-variant group-hover:text-primary transition-colors shrink-0" />
              </a>
              <a
                href={`/api/listings/${summary.listingId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-colors group"
              >
                <div className="min-w-0">
                  <div className="font-label uppercase tracking-widest text-[9px] text-on-surface-variant opacity-60 mb-0.5">
                    Listing ID
                  </div>
                  <div className="font-mono text-[11px] text-on-background truncate">
                    {summary.listingId}
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-on-surface-variant group-hover:text-primary transition-colors shrink-0" />
              </a>
            </div>

            <p className="mt-5 text-xs text-on-surface-variant opacity-70 leading-relaxed">
              Note: For demo determinism, the EIP-3009 signature and tx hash in step 5
              are generated client-side. The marketplace listing creation and A2A flow
              (steps 1-4, 6, 7) hit the real backend endpoints.
            </p>
          </section>
        )}

        {/* Empty state guidance */}
        {!running && !done && !error && (
          <section className="mt-12 text-center">
            <p className="font-label uppercase tracking-widest text-[10px] text-on-surface-variant opacity-50">
              Click <span className="text-primary font-bold">Run Demo</span> above to start the agent-to-agent trade.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

function SummaryStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-on-surface-variant opacity-60 mb-1.5">
        {icon}
        <span className="font-label uppercase tracking-widest text-[9px]">{label}</span>
      </div>
      <div className="font-headline italic text-xl sm:text-2xl text-on-background tracking-tighter">
        {value}
      </div>
    </div>
  )
}
