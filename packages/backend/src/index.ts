import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import listingsRouter from './routes/listings';
import mcpRouter from './routes/mcp';
import a2aRouter from './routes/a2a';
import { listingStore } from './lib/listing-store';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/listings', listingsRouter);
app.use('/api/mcp', mcpRouter);
app.use('/api/a2a', a2aRouter);

// Basic stats route
app.get('/api/stats', (req, res) => {
  const stats = listingStore.getStats();
  res.json(stats);
});

// Start server
app.listen(port, () => {
  console.log(`Kite Backend listening at http://localhost:${port}`);
});
