/**
 * Frontend listings store — self-contained Supabase wrapper with a
 * `/tmp` JSON fallback for environments without DB credentials.
 *
 * This mirrors `packages/backend/src/lib/listing-store.ts` but is callable
 * from Next.js Route Handlers, so creates and reads work on Vercel without
 * needing the standalone Express backend at localhost:3001.
 *
 * Both stores read/write the same Supabase tables, so state is shared
 * regardless of which entry point services a request.
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface Listing {
  id: string
  type: 'api' | 'file' | 'article' | 'dataset' | 'code' | 'shopify'
  name: string
  description: string
  priceUsdc: number
  content: string
  preview: string
  creatorAddress: string
  createdAt: string
  salesCount: number
  totalEarnedUsdc: number
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

let supabase: SupabaseClient | null = null
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
}
const usingSupabase = supabase !== null

// /tmp is the only writable location on Vercel; fine for local fallback too.
const DATA_DIR = '/tmp/kite-listings'
const FILE_PATH = path.join(DATA_DIR, 'listings.json')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function loadLocal(): Listing[] {
  try {
    ensureDir()
    if (!fs.existsSync(FILE_PATH)) return []
    return JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8')) as Listing[]
  } catch {
    return []
  }
}

function saveLocal(listings: Listing[]) {
  try {
    ensureDir()
    fs.writeFileSync(FILE_PATH, JSON.stringify(listings, null, 2))
  } catch (err) {
    console.error('[listings-store] saveLocal failed:', err)
  }
}

function fromDb(row: any): Listing {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description ?? '',
    priceUsdc: Number(row.price_usdc),
    content: row.content ?? '',
    preview: row.preview ?? '',
    creatorAddress: row.creator_address,
    createdAt: row.created_at,
    salesCount: Number(row.sales_count ?? 0),
    totalEarnedUsdc: Number(row.total_earned_usdc ?? 0),
  }
}

function toDb(listing: Listing) {
  return {
    id: listing.id,
    type: listing.type,
    name: listing.name,
    description: listing.description,
    price_usdc: listing.priceUsdc,
    content: listing.content,
    preview: listing.preview,
    creator_address: listing.creatorAddress,
    created_at: listing.createdAt,
    sales_count: listing.salesCount,
    total_earned_usdc: listing.totalEarnedUsdc,
  }
}

export interface ListFilters {
  type?: string
  maxPrice?: number
  creatorAddress?: string
}

export async function listListings(filters: ListFilters = {}): Promise<Listing[]> {
  if (usingSupabase && supabase) {
    let query = supabase.from('listings').select('*')
    if (filters.type) query = query.eq('type', filters.type)
    if (filters.maxPrice !== undefined) query = query.lte('price_usdc', filters.maxPrice)
    if (filters.creatorAddress) query = query.ilike('creator_address', filters.creatorAddress)

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) {
      console.error('[listings-store] Supabase list error:', error)
      return []
    }
    return (data ?? []).map(fromDb)
  }

  let result = loadLocal()
  if (filters.type) result = result.filter(l => l.type === filters.type)
  if (filters.maxPrice !== undefined) {
    const cap = filters.maxPrice
    result = result.filter(l => l.priceUsdc <= cap)
  }
  if (filters.creatorAddress) {
    const target = filters.creatorAddress.toLowerCase()
    result = result.filter(l => l.creatorAddress.toLowerCase() === target)
  }
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getListing(id: string): Promise<Listing | null> {
  if (usingSupabase && supabase) {
    const { data, error } = await supabase.from('listings').select('*').eq('id', id).single()
    if (error || !data) return null
    return fromDb(data)
  }
  return loadLocal().find(l => l.id === id) ?? null
}

export interface CreateListingArgs {
  type: Listing['type']
  name: string
  description?: string
  priceUsdc: number
  content: string
  preview?: string
  creatorAddress: string
}

export async function createListing(args: CreateListingArgs): Promise<Listing> {
  const listing: Listing = {
    id: `lst_${Math.random().toString(36).substring(2, 9)}`,
    type: args.type,
    name: args.name,
    description: args.description ?? '',
    priceUsdc: Number(args.priceUsdc),
    content: args.content,
    preview: args.preview ?? '',
    creatorAddress: args.creatorAddress,
    createdAt: new Date().toISOString(),
    salesCount: 0,
    totalEarnedUsdc: 0,
  }

  if (usingSupabase && supabase) {
    const { error } = await supabase.from('listings').insert([toDb(listing)])
    if (error) {
      console.error('[listings-store] Supabase create error:', error)
      throw new Error(`Failed to persist listing: ${error.message}`)
    }
  } else {
    const all = loadLocal()
    all.push(listing)
    saveLocal(all)
  }

  return listing
}

export function isPersistent() {
  return usingSupabase
}
