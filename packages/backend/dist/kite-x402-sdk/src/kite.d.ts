export declare const kiteTestnet: {
    blockExplorers: {
        readonly default: {
            readonly name: "Kite Explorer";
            readonly url: "https://testnet.kiteexplorer.com";
        };
    };
    blockTime?: number | undefined | undefined;
    contracts?: {
        [x: string]: import("node_modules/viem/_types").ChainContract | {
            [sourceId: number]: import("node_modules/viem/_types").ChainContract | undefined;
        } | undefined;
        ensRegistry?: import("node_modules/viem/_types").ChainContract | undefined;
        ensUniversalResolver?: import("node_modules/viem/_types").ChainContract | undefined;
        multicall3?: import("node_modules/viem/_types").ChainContract | undefined;
        erc6492Verifier?: import("node_modules/viem/_types").ChainContract | undefined;
    } | undefined;
    ensTlds?: readonly string[] | undefined;
    id: 2368;
    name: "Kite Testnet";
    nativeCurrency: {
        readonly name: "KITE";
        readonly symbol: "KITE";
        readonly decimals: 18;
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly [string];
        };
    };
    sourceId?: number | undefined | undefined;
    testnet: true;
    custom?: Record<string, unknown> | undefined;
    extendSchema?: Record<string, unknown> | undefined;
    fees?: import("node_modules/viem/_types").ChainFees<undefined> | undefined;
    formatters?: undefined;
    prepareTransactionRequest?: ((args: import("node_modules/viem/_types").PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<import("node_modules/viem/_types").PrepareTransactionRequestParameters>) | [fn: ((args: import("node_modules/viem/_types").PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<import("node_modules/viem/_types").PrepareTransactionRequestParameters>) | undefined, options: {
        runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
    }] | undefined;
    serializers?: import("node_modules/viem/_types").ChainSerializers<undefined, import("node_modules/viem/_types").TransactionSerializable> | undefined;
    verifyHash?: ((client: import("node_modules/viem/_types").Client, parameters: import("node_modules/viem/_types").VerifyHashActionParameters) => Promise<import("node_modules/viem/_types").VerifyHashActionReturnType>) | undefined;
};
