/**
 * Mainnet Integration Test: Full x402 Buy Content Flow
 *
 * Tests the complete end-to-end flow on kite_mainnet:
 * 1. Setup AA wallet (deploy + addSupportedToken + setMasterBudgetRules)
 * 2. Create session with agent and spending rules
 * 3. Request protected content (receive 402 + PaymentRequirements)
 * 4. Sign EIP-712 transfer authorization
 * 5. Send payment via X-Payment header, receive content
 *
 * Environment variables (from ../../.env):
 *   PRIVATE_KEY          - Owner private key (also used as agent for this test)
 *   SERVICE_URL          - x402 protected service URL
 *   FACILITATOR_URL      - x402 facilitator URL
 */
export {};
