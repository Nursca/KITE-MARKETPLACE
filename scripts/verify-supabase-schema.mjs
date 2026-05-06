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

console.log("");
console.log("=== Supabase Schema Verification ===");
console.log("");
console.log(`listings table: ${listings.exists ? "OK" : "MISSING"}`);
if (listings.exists) {
  console.log(`  rows: ${listings.count}`);
  if (listings.sample) {
    console.log(`  sample id: ${listings.sample.id}, name: ${listings.sample.name}`);
  }
} else {
  console.log(`  error: ${listings.error}`);
}

console.log("");
console.log(`sales table:    ${sales.exists ? "OK" : "MISSING"}`);
if (sales.exists) {
  console.log(`  rows: ${sales.count}`);
} else {
  console.log(`  error: ${sales.error}`);
}

console.log("");

if (listings.exists && sales.exists) {
  console.log("Schema is ready. listing-store.ts will use Supabase on next backend boot.");
  process.exit(0);
}

console.log("One or more tables are missing. Open the Supabase SQL Editor for your");
console.log("project and run the SQL in DATABASE.md (sections 1 and 2) to create them.");
process.exit(2);
