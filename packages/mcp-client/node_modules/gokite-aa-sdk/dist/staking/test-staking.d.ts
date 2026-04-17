/**
 * Test script for Delegator Staking SDK
 *
 * Usage:
 *   PRIVATE_KEY=0x... npx ts-node sdk/staking/test-staking.ts <command> [args]
 *
 * Environment variables:
 *   PRIVATE_KEY    - Required: Your wallet private key
 *   BACKEND_URL    - Optional: Backend API URL (default: https://staking-api.staging.gokite.ai)
 *   DELEGATION_ID  - Optional: Delegation ID for status/claim/remove commands
 *   VALIDATION_ID  - Optional: Validation ID for register command
 *
 * Make sure the backend API server is running:
 *   cd scripts/validator-manager/staking-api
 *   docker-compose up -d
 */
export {};
