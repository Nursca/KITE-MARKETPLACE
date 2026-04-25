'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import { ShoppingBag, Shield, Check } from 'lucide-react'

export default function ShopifyAuthMock() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F1F2F4] flex items-center justify-center">
        <p className="text-[#5c5f62]">Loading...</p>
      </div>
    }>
      <ShopifyAuthMockInner />
    </Suspense>
  )
}

function ShopifyAuthMockInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const shop = searchParams.get('shop') || 'your-store.myshopify.com'
  const name = searchParams.get('name')
  const description = searchParams.get('description')

  const handleInstall = () => {
    setLoading(true)
    // Simulate some network delay for "authorizing"
    setTimeout(() => {
      const callbackUrl = new URL('/api/shopify/callback', window.location.origin)
      callbackUrl.searchParams.set('code', 'mock_auth_code_' + Math.random().toString(36).substring(7))
      callbackUrl.searchParams.set('shop', shop)
      if (name) callbackUrl.searchParams.set('name', name)
      if (description) callbackUrl.searchParams.set('description', description)
      
      router.push(callbackUrl.toString())
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-[#F1F2F4] flex flex-col items-center py-12 px-6 font-sans">
      {/* Mock Shopify Admin Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="bg-[#008060] p-1.5 rounded-md">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl text-[#1a1c1d]">Shopify</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-[#5c5f62]">
          <span>{shop}</span>
          <div className="w-8 h-8 rounded-full bg-[#008060] flex items-center justify-center text-white text-xs">JS</div>
        </div>
      </div>

      <main className="w-full max-w-2xl bg-white rounded-lg shadow-sm border border-[#e1e3e5] overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center space-y-2">
              <div className="size-16 rounded-2xl bg-[#F1F2F4] flex items-center justify-center mx-auto border border-[#e1e3e5]">
                <ShoppingBag className="h-8 w-8 text-[#5c5f62]" />
              </div>
              <p className="text-xs font-medium text-[#1a1c1d]">{shop.split('.')[0]}</p>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <div className="h-[2px] w-20 bg-[#e1e3e5] relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                  <Check className="h-4 w-4 text-[#008060]" />
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="size-16 rounded-2xl bg-[#1a1c1d] flex items-center justify-center mx-auto">
                <div className="text-white font-headline italic font-bold">K</div>
              </div>
              <p className="text-xs font-medium text-[#1a1c1d]">Kite Marketplace</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-[#1a1c1d] mb-2">You are about to install Kite Marketplace</h1>
              <p className="text-[#5c5f62] text-sm">
                Kite Marketplace needs your permission to access data in your Shopify store.
              </p>
            </div>

            <div className="bg-[#f6f6f7] rounded-lg p-6 space-y-4">
              <h2 className="font-semibold text-[#1a1c1d] text-sm uppercase tracking-wider">Permissions</h2>
              <ul className="space-y-3">
                {[
                  { title: 'View products', desc: 'Read your product catalog and inventory levels' },
                  { title: 'Manage orders', desc: 'Create and fulfill orders placed by AI agents' },
                  { title: 'View store settings', desc: 'Access your store name, currency and locale' }
                ].map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <Check className="h-5 w-5 text-[#008060] shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#1a1c1d]">{p.title}</p>
                      <p className="text-xs text-[#5c5f62]">{p.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-start gap-3 bg-[#e7f3f0] p-4 rounded-lg border border-[#008060]/10">
              <Shield className="h-5 w-5 text-[#008060] shrink-0" />
              <p className="text-xs text-[#008060] leading-relaxed">
                Kite Marketplace is a verified partner. Your store data is protected and will only be used to facilitate agentic commerce on the Kite Network.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#f6f6f7] px-8 py-4 flex items-center justify-between border-t border-[#e1e3e5]">
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-semibold text-[#1a1c1d] hover:bg-[#ebebed] rounded-md transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleInstall}
            disabled={loading}
            className="bg-[#008060] text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-[#006e52] disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
          >
            {loading ? 'Installing...' : 'Install App'}
          </button>
        </div>
      </main>

      <div className="mt-8 flex items-center gap-6 text-xs text-[#5c5f62]">
        <a href="#" className="hover:underline">Privacy Policy</a>
        <a href="#" className="hover:underline">Terms of Service</a>
        <a href="#" className="hover:underline">Help Center</a>
      </div>
    </div>
  )
}
