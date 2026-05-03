"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kiteTestnet = void 0;
const viem_1 = require("viem");
exports.kiteTestnet = (0, viem_1.defineChain)({
    id: 2368,
    name: 'Kite Testnet',
    nativeCurrency: {
        name: 'KITE',
        symbol: 'KITE',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: [
                (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_KITE_RPC : undefined) ??
                    'https://rpc-testnet.gokite.ai/'
            ],
        },
    },
    blockExplorers: {
        default: {
            name: 'Kite Explorer',
            url: 'https://testnet.kiteexplorer.com', // Placeholder URL
        },
    },
    testnet: true,
});
