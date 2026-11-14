/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Ghaule Calculator - Full-Stack Server & Express REST API
 * Mounts:
 * - /api/v1/calendar/* REST endpoints
 * - Vite dev middleware in development OR static dist serving in production
 * - Port 3000
 */

import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calendarApiRouter, adminApiRouter } from './src/server/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security & CORS headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    app: 'Ghaule Calculator',
    timestamp: new Date().toISOString(),
    version: '5.0.0',
    mode: isProduction ? 'production' : 'development',
  });
});

// Mount Calendar REST API v1
app.use('/api/v1/calendar', calendarApiRouter);

// Mount Admin & RBAC Security REST API v1
app.use('/api/v1/admin', adminApiRouter);

function mountStaticDist(distPath: string) {
  // Ensure PWA manifest & service worker are accessible to PWABuilder / browsers with proper headers
  app.use((req, res, next) => {
    if (
      req.path === '/manifest.webmanifest' ||
      req.path === '/manifest.json' ||
      req.path === '/sw.js' ||
      req.path === '/registerSW.js' ||
      req.path.startsWith('/pwa-') ||
      req.path === '/apple-touch-icon.png'
    ) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    if (req.path === '/manifest.webmanifest' || req.path === '/manifest.json') {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (req.path === '/sw.js' || req.path === '/registerSW.js') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  });

  app.get('/manifest.json', (_req: Request, res: Response) => {
    const manifestFile = path.resolve(distPath, 'manifest.webmanifest');
    if (fs.existsSync(manifestFile)) {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.sendFile(manifestFile);
      return;
    }
    res.status(404).json({ error: 'Manifest not found' });
  });

  app.use(express.static(distPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

// Development / Production Frontend Serving
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDistBuild = fs.existsSync(path.resolve(distPath, 'index.html'));
  const forceStatic = isProduction || (process.env.npm_lifecycle_event === 'start' && hasDistBuild);

  if (!forceStatic) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true, allowedHosts: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('⚡ Vite dev server middleware mounted');
    } catch (e) {
      console.warn('Vite middleware could not be loaded directly, falling back to static/API mode', e);
      if (hasDistBuild) {
        mountStaticDist(distPath);
      }
    }
  } else {
    // Serve static files from dist
    mountStaticDist(distPath);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Ghaule Full-Stack Server listening on http://0.0.0.0:${PORT}`);
    console.log(`📡 Calendar REST API ready at http://0.0.0.0:${PORT}/api/v1/calendar`);
  });
}

// Start if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
