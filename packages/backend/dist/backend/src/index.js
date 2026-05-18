"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '../../.env') });
if (!process.env.WALLET_PRIVATE_KEY) {
    dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '.env') });
}
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const listings_1 = __importDefault(require("./routes/listings"));
const mcp_1 = __importDefault(require("./routes/mcp"));
const a2a_1 = __importDefault(require("./routes/a2a"));
const listing_store_1 = require("./lib/listing-store");
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// API Routes
app.use('/api/listings', listings_1.default);
app.use('/api/mcp', mcp_1.default);
app.use('/api/a2a', a2a_1.default);
// Basic stats route
app.get('/api/stats', async (req, res) => {
    const stats = await listing_store_1.listingStore.getStats();
    res.json(stats);
});
// Recent sales feed — drives homepage live transaction ticker (polled every 8s)
app.get('/api/sales/recent', async (req, res) => {
    const requestedLimit = req.query.limit ? Number(req.query.limit) : 20;
    const limit = Math.max(1, Math.min(50, isNaN(requestedLimit) ? 20 : requestedLimit));
    const sales = await listing_store_1.listingStore.getRecentSales(limit);
    res.json({
        success: true,
        count: sales.length,
        sales,
        timestamp: new Date().toISOString(),
    });
});
// Start server
app.listen(port, () => {
    console.log(`Kite Backend listening at http://localhost:${port}`);
});
