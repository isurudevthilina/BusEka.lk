// src/worker/index.ts
// Hono root — mounts all API routes; static assets served by Cloudflare

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { fleet } from './routes/fleet.js';
import { groups } from './routes/groups.js';
import { drive } from './routes/drive.js';
import { trains } from './routes/trains.js';
import { aiRoutes } from './routes/ai.js';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors());

// Health
app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now(), service: 'BusEka' }));

// Mount routes
app.route('/', fleet);
app.route('/', groups);
app.route('/', drive);
app.route('/', trains);
app.route('/', aiRoutes);

// Catch-all for unknown API paths
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'API endpoint not found.' } }, 404);
  }
  // Let Cloudflare SPA fallback handle frontend routes
  return c.notFound();
});

export default app;
