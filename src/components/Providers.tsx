'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig, projectId, kiteTestnet, wagmiAdapter } from '@/lib/wagmi'
import { useState } from 'react'
import { createAppKit } from '@reown/appkit/react'

// Create AppKit
createAppKit({
  adapters: [wagmiAdapter],
  networks: [kiteTestnet],
  defaultNetwork: kiteTestnet,
  projectId,
  metadata: {
    name: 'Kite Marketplace',
    description: 'The Editorial Intelligence - AI Shopping built on Kite AI',
    url: 'https://kite.xyz', // Update to your domain
    icons: ['https://avatars.githubusercontent.com/u/179229932']
  },
  features: {
    analytics: true
  }
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
