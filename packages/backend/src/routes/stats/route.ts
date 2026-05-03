import { NextResponse } from "next/server";
import { listingStore } from "@/lib/listing-store";

export const runtime = "nodejs";

/** GET /api/stats — live marketplace stats for the homepage counter */
export async function GET() {
  const stats = await listingStore.getStats();
  return NextResponse.json({
    ...stats,
    timestamp: new Date().toISOString(),
  });
}
