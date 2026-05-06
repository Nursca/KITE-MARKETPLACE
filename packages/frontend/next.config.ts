import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/listings/:path*",
        destination: "http://localhost:3001/api/listings/:path*",
      },
      {
        source: "/api/listings",
        destination: "http://localhost:3001/api/listings",
      },
      {
        source: "/api/stats",
        destination: "http://localhost:3001/api/stats",
      },
      {
        source: "/api/mcp",
        destination: "http://localhost:3001/api/mcp",
      },
      {
        source: "/api/a2a",
        destination: "http://localhost:3001/api/a2a",
      }
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        accounts: false,
      };

      // Ignore unused wagmi connectors that require missing peer dependencies
      // We only use injected() connector, so we can safely ignore these
      config.externals = {
        ...config.externals,
        '@coinbase/wallet-sdk': 'commonjs @coinbase/wallet-sdk',
        '@metamask/connect-evm': 'commonjs @metamask/connect-evm',
        'porto': 'commonjs porto',
        '@walletconnect/ethereum-provider': 'commonjs @walletconnect/ethereum-provider',
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "example.com",
      },
    ],
  },
};

export default nextConfig;
