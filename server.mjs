import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWeltmeisterApiRouter } from './lib/weltmeister/api/node-api.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createApp = ({
  projectRoot = __dirname,
  staticRoot = __dirname,
  distRoot
} = {}) => {
  const app = express();
  const resolvedDistRoot = distRoot ?? path.join(staticRoot, 'dist');

  app.use('/lib/weltmeister/api', createWeltmeisterApiRouter({ projectRoot }));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(staticRoot, 'index.html'));
  });

  app.get('/dist.html', async (_req, res, next) => {
    const distIndexPath = path.join(resolvedDistRoot, 'index.html');

    try {
      await fs.access(distIndexPath);
      res.sendFile(distIndexPath);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        res
          .status(404)
          .type('text/plain')
          .send('No baked build found. Run `npm run bake`.');
        return;
      }

      next(error);
    }
  });

  app.use('/dist', express.static(resolvedDistRoot, { index: false }));
  app.use(express.static(staticRoot, { index: false }));

  return app;
};

const app = createApp();

const startServer = ({
  host = process.env.HOST || '127.0.0.1',
  port = Number(process.env.PORT) || 3000,
  projectRoot = __dirname,
  staticRoot = __dirname,
  distRoot
} = {}) => {
  const app = createApp({ projectRoot, staticRoot, distRoot });
  const server = app.listen(port, host, () => {
    const address = server.address();
    const actualPort =
      typeof address === 'object' && address ? address.port : port;

    console.log(`Impact baseline server listening on http://${host}:${actualPort}`);
  });

  return server;
};

if (process.argv[1] === __filename) {
  startServer();
}

export { app, createApp, startServer };
