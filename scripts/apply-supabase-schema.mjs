#!/usr/bin/env node
/**
 * Apply scripts/supabase-schema.sql to your Supabase project.
 *
 * Modes (auto-detected, in priority order):
 *   1. SUPABASE_DB_URL  — Postgres connection string (postgresql://…).
 *      This mode runs the full DDL script. Required if your project doesn't
 *      yet have an `exec_sql` RPC.
 *   2. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — uses an `exec_sql` RPC if it
 *      exists. Most fresh projects don't, so mode 1 is the recommended path.
 *
 * If neither mode is available, the script prints the SQL block and a
 * one-line dashboard URL so you can paste it manually.
 *
 * Usage:
 *   node scripts/apply-supabase-schema.mjs
 *   SUPABASE_DB_URL=postgresql://… node scripts/apply-supabase-schema.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, 'supabase-schema.sql');
const sql = readFileSync(sqlPath, 'utf-8');

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyViaPg(connectionString) {
  let pg;
  try {
    pg = await import('pg');
  } catch {
    console.error('[apply-schema] `pg` is not installed in this workspace.');
    console.error('[apply-schema] Install it once with:');
    console.error('               cd packages/backend && pnpm add -D pg');
    console.error('[apply-schema] Then re-run this script.');
    process.exit(1);
  }

  const { Client } = pg.default;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log('[apply-schema] Connecting to Postgres…');
  await client.connect();
  console.log('[apply-schema] Running migration…');
  await client.query(sql);
  await client.end();
  console.log('[apply-schema] OK — listings, sales, indexes, record_sale RPC, and RLS policies applied.');
}

async function applyViaRpc(supabaseUrl, serviceKey) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Try the conventional `exec_sql` RPC if the project happens to have one.
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    throw new Error(
      'No exec_sql RPC found on this project. Use mode 1 (SUPABASE_DB_URL) ' +
      'or paste the SQL into the Supabase SQL editor.'
    );
  }
  console.log('[apply-schema] OK — applied via exec_sql RPC.');
}

function printManualInstructions() {
  console.log('────────────────────────────────────────────────────────────');
  console.log('No automated migration path is available with the current env.');
  console.log('To apply the schema, choose ONE of:');
  console.log('');
  console.log('  A) Set SUPABASE_DB_URL and re-run:');
  console.log('     export SUPABASE_DB_URL="postgresql://postgres:<PWD>@db.<PROJECT>.supabase.co:5432/postgres"');
  console.log('     node scripts/apply-supabase-schema.mjs');
  console.log('');
  console.log('  B) Open Supabase → SQL Editor and paste:');
  console.log('     scripts/supabase-schema.sql');
  console.log('────────────────────────────────────────────────────────────');
}

async function main() {
  if (SUPABASE_DB_URL) {
    await applyViaPg(SUPABASE_DB_URL);
    return;
  }

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      await applyViaRpc(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      return;
    } catch (err) {
      console.warn('[apply-schema] RPC mode failed:', err.message);
    }
  }

  printManualInstructions();
  process.exit(1);
}

main().catch((err) => {
  console.error('[apply-schema] Fatal:', err.message || err);
  process.exit(1);
});
