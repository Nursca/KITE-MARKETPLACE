/**
 * Execute an autonomous purchase using the Agent's CDP Wallet and x402 retry flow.
 */
export declare function executeAgentPurchase(productId: string, amount: number): Promise<{
    type: string;
    intent: string;
    status: string;
    outcome: string;
    cost: string;
    currency: string;
    txHash: any;
    explorerUrl: any;
    timestamp: any;
    productId: string;
    agentAddress: any;
    ownerAddress: string;
}>;
