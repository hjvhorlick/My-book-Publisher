const dns = require('node:dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const { initDatabase } = require('./db');
const authRoutes = require('./routes/authRoutes');
const { router: templateRoutes } = require('./routes/templateRoutes');
const { router: projectRoutes } = require('./routes/projectRoutes');
const chapterRoutes = require('./routes/chapterRoutes');
const noteRoutes = require('./routes/noteRoutes');
const assetRoutes = require('./routes/assetRoutes');
const aiRoutes = require('./routes/aiRoutes');
const imageProviderRoutes = require('./routes/imageProviderRoutes');
const publishingRoutes = require('./routes/publishingRoutes');

// Keep a strong reference to the listening server for embedded/dev process runners.
let activeHttpServer = null;

function createApp() {
  initDatabase();
  const app = express();

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Folio & Quill Book Publishing Studio', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/templates', templateRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/projects/:projectId/chapters', chapterRoutes);
  app.use('/api/projects/:projectId/notes', noteRoutes);
  app.use('/api/projects/:projectId/assets', assetRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/image-providers', imageProviderRoutes);
  app.use('/api/publishing', publishingRoutes);
  app.use('/api/projects', publishingRoutes);

  // Catch-all for unknown /api routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const isProd = process.env.NODE_ENV === 'production';
  const port = isProd && process.env.PORT ? Number(process.env.PORT) : 3000;
  const distPath = path.join(__dirname, '..', 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  activeHttpServer = app.listen(port, '0.0.0.0', () => {
    console.log(`Folio & Quill Book Publishing Studio listening on http://0.0.0.0:${port}`);
  });
  return activeHttpServer;
}

if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { createApp };
