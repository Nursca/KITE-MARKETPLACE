#!/usr/bin/env node
/**
 * Verifies that the Kite Marketplace schema (listings + sales tables) exists in
 * the configured Supabase project. Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * from the environment.
 *
 * Run with:
 *   node --env-file-if-exists=/vercel/share/.env.project scripts/verify-supabase-schema.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

console.log(`Connecting to ${url} ...`);
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function checkTable(name, columns) {
  const { data, error, count } = await supabase
    .from(name)
    .select(columns, { count: "exact", head: false })
    .limit(1);

  if (error) {
    if (
      error.code === "42P01" ||
      /relation .* does not exist/i.test(error.message) ||
      /Could not find the table/i.test(error.message)
    ) {
      return { exists: false, error: error.message };
    }
    return { exists: false, error: `${error.code || ""} ${error.message}`.trim() };
  }

  return { exists: true, count: count ?? 0, sample: data?.[0] ?? null };
}

const listings = await checkTable(
  "listings",
  "id, name, type, price_usdc, creator_address, sales_count, total_earned_usdc"
);
const sales = await checkTable("sales", "id, listing_id, buyer_address, tx_hash, timestamp");

// Probe the record_sale RPC. We pass garbage args expecting either a
// "Listing not found" exception (RPC exists, schema applied) or a 404 from
// PostgREST (RPC missing, migration not yet run).
async function checkRpc() {
  const { error } = await supabase.rpc("record_sale", {
    p_listing_id: "__verify_probe_does_not_exist__",
    p_buyer_address: "0x0000000000000000000000000000000000000000",
    p_tx_hash: "0x" + "0".repeat(64),
  });
  if (!error) return { exists: true };
  // PostgREST returns PGRST202 / 404 when the function isn't defined.
  if (
    error.code === "PGRST202" ||
    /not find the function|does not exist/i.test(error.message)
  ) {
    return { exists: false, error: error.message };
  }
  // Any other error (e.g. our "Listing not found") means the function exists.
  return { exists: true };
}

const rpc = await checkRpc();

console.log("");
console.log("=== Supabase Schema Verification ===");
console.log("");
console.log(`listings table:    ${listings.exists ? "OK" : "MISSING"}`);
if (listings.exists) {
  console.log(`  rows: ${listings.count}`);
  if (listings.sample) {
    console.log(`  sample id: ${listings.sample.id}, name: ${listings.sample.name}`);
  }
} else {
  console.log(`  error: ${listings.error}`);
}

console.log("");
console.log(`sales table:       ${sales.exists ? "OK" : "MISSING"}`);
if (sales.exists) {
  console.log(`  rows: ${sales.count}`);
} else {
  console.log(`  error: ${sales.error}`);
}

console.log("");
console.log(`record_sale RPC:   ${rpc.exists ? "OK" : "MISSING"}`);
if (!rpc.exists) console.log(`  error: ${rpc.error}`);

console.log("");

if (listings.exists && sales.exists && rpc.exists) {
  console.log("Schema is fully applied. listing-store.ts will use Supabase on next backend boot.");
  process.exit(0);
}

console.log("Schema is incomplete. Apply scripts/supabase-schema.sql via either:");
console.log("  - node scripts/apply-supabase-schema.mjs   (with SUPABASE_DB_URL set), or");
console.log("  - Supabase Dashboard -> SQL Editor -> paste scripts/supabase-schema.sql.");
process.exit(2);
