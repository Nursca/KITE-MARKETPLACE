import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });
if (!process.env.WALLET_PRIVATE_KEY) {
  dotenv.config({ path: path.join(process.cwd(), '.env') });
}

import express from 'express';
import cors from 'cors';
import listingsRouter from './routes/listings';
import mcpRouter from './routes/mcp';
import a2aRouter from './routes/a2a';
import { listingStore } from './lib/listing-store';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/listings', listingsRouter);
app.use('/api/mcp', mcpRouter);
app.use('/api/a2a', a2aRouter);

// Basic stats route
app.get('/api/stats', async (req, res) => {
  const stats = await listingStore.getStats();
  res.json(stats);
});

// Recent sales feed — drives homepage live transaction ticker (polled every 8s)
app.get('/api/sales/recent', async (req, res) => {
  const requestedLimit = req.query.limit ? Number(req.query.limit) : 20;
  const limit = Math.max(1, Math.min(50, isNaN(requestedLimit) ? 20 : requestedLimit));
  const sales = await listingStore.getRecentSales(limit);
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
