"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const listing_store_1 = require("@/lib/listing-store");
exports.runtime = "nodejs";
/** GET /api/stats — live marketplace stats for the homepage counter */
async function GET() {
    const stats = listing_store_1.listingStore.getStats();
    return server_1.NextResponse.json({
        ...stats,
        timestamp: new Date().toISOString(),
    });
}
