import { Request, Response } from "express";
/**
 * GET /api/listings/[id]/content
 *
 * x402 paywall — returns listing content after USDC payment on Kite Testnet.
 *
 * **CRITICAL**: This endpoint now verifies all payments on-chain using the Kite Testnet RPC.
 * Blank X-PAYMENT headers are rejected with 402. Invalid transaction hashes are rejected with 403.
 *
 * Flow:
 *  1. First request → returns 402 with payment requirements
 *  2. Agent/client pays on Kite Testnet, includes X-PAYMENT header with valid tx hash
 *  3. Endpoint verifies tx exists on-chain and is successful
 *  4. Second request with verified payment → returns content + receipt
 */
export declare function GET(req: Request, res: Response): Promise<void>;
