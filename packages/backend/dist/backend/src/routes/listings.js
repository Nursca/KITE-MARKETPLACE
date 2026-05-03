"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const listing_store_1 = require("../lib/listing-store");
const x402_sdk_1 = require("@kite/x402-sdk");
const router = (0, express_1.Router)();
/**
 * GET /api/listings
 */
router.get('/', async (req, res) => {
    const { type, maxPrice, creatorAddress } = req.query;
    const listings = await listing_store_1.listingStore.list({
        type: type || undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        creatorAddress: creatorAddress || undefined,
    });
    const publicListings = listings.map(({ content, ...rest }) => rest);
    res.json({
        success: true,
        count: publicListings.length,
        listings: publicListings,
    });
});
/**
 * POST /api/listings
 */
router.post('/', async (req, res) => {
    try {
        const { type, name, description, priceUsdc, content, preview, creatorAddress } = req.body;
        if (!type || !name || !priceUsdc || !content || !creatorAddress) {
            return res.status(400).json({ error: "Missing required fields: type, name, priceUsdc, content, creatorAddress" });
        }
        const listing = await listing_store_1.listingStore.create({
            type,
            name,
            description: description || "",
            priceUsdc: Number(priceUsdc),
            content,
            preview: preview || "",
            creatorAddress,
        });
        const baseUrl = process.env.KITE_MARKETPLACE_URL || "http://localhost:3000";
        res.status(201).json({
            success: true,
            listingId: listing.id,
            x402Url: `${baseUrl}/api/listings/${listing.id}/content`,
            message: `Listing "${name}" is now live! Buyers pay ${priceUsdc} USDC on Kite Testnet to access content.`,
            listing: {
                id: listing.id,
                name: listing.name,
                type: listing.type,
                priceUsdc: listing.priceUsdc,
                preview: listing.preview,
            }
        });
    }
    catch (error) {
        console.error("Create listing error:", error);
        res.status(500).json({ error: "Failed to create listing", message: error.message });
    }
});
/**
 * GET /api/listings/:id/content
 *
 * Includes Passport Tier Gating
 */
router.get('/:id/content', async (req, res) => {
    const { id } = req.params;
    const agentAddress = req.headers['x-agent-address'];
    const listing = await listing_store_1.listingStore.get(id);
    if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
    }
    // Tier Gating Logic: 
    // Premium listings (> 10 USDC) require Verified tier (2) or above
    if (listing.priceUsdc > 10 && agentAddress) {
        try {
            const client = new x402_sdk_1.ERC8004Client("0x0000000000000000000000000000000000000000000000000000000000000001");
            const agentId = await client.findAgentId(agentAddress);
            if (agentId) {
                const passport = await client.getPassport(agentId);
                if (passport.tier < 2) { // 2 = Verified
                    return res.status(403).json({
                        error: "Tier Locked",
                        message: "This premium resource requires a 'Verified' Passport tier. Increase your trade volume to upgrade.",
                        currentTier: passport.tier,
                        requiredTier: 2
                    });
                }
            }
        }
        catch (e) {
            console.warn("Passport check failed, defaulting to open access for demo:", e);
        }
    }
    // x402 Payment Check
    const isPaid = req.headers['x-payment-confirmed'] === 'true';
    if (!isPaid) {
        return res.status(402).json({
            error: "Payment Required",
            amount: listing.priceUsdc.toFixed(2),
            currency: "USDC",
            recipient: listing.creatorAddress,
            token: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
            chainId: 2368,
            message: `Pay ${listing.priceUsdc} USDC to unlock "${listing.name}"`
        });
    }
    res.json({
        success: true,
        content: listing.content,
        listing: { id: listing.id, name: listing.name }
    });
});
exports.default = router;
