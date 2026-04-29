import express from 'express';

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDocsRouter } from './tools/docs-cms/docs-cms.mjs';
import { createWeltmeisterApiRouter } from './tools/weltmeister/api/node-api.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createApp = ({
  projectRoot = __dirname,
  staticRoot = path.join(projectRoot, 'public'),
  toolsRoot = path.join(projectRoot, 'tools'),
  distRoot,
  nodeModulesRoot = path.join(projectRoot, 'node_modules')
} = {}) => {
  const app = express();

  const resolvedDistRoot = distRoot ?? path.join(staticRoot, 'dist');

  app.use(
    '/tools/weltmeister/api',
    createWeltmeisterApiRouter({ projectRoot: staticRoot })
  );

  app.get('/tools/weltmeister.html', (_req, res) => {
    res.sendFile(path.join(toolsRoot, 'weltmeister.html'));
  });

  app.get('/tools/font-tool.html', (_req, res) => {
    res.sendFile(path.join(toolsRoot, 'font-tool.html'));
  });

  app.use(
    '/tools/weltmeister',
    (req, res, next) => {
      if (
        req.path.startsWith('/api/') ||
        req.path === '/build-weltmeister-entity-manifest.mjs'
      ) {
        res.sendStatus(404);
        return;
      }

      next();
    },
    express.static(path.join(toolsRoot, 'weltmeister'), { index: false })
  );

  app.use(
    '/tools/font-tool',
    express.static(path.join(toolsRoot, 'font-tool'), { index: false })
  );

  app.use(
    '/hljs',
    express.static(path.join(nodeModulesRoot, 'highlight.js/styles'), { index: false })
  );

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

  app.use(createDocsRouter({ docsRoot: path.join(staticRoot, 'docs') }));

  app.use(express.static(staticRoot, { index: false }));

  return app;
};

const startServer = ({
  host = process.env.HOST || '127.0.0.1',
  port = Number(process.env.PORT) || 3000,
  projectRoot = __dirname,
  staticRoot = path.join(projectRoot, 'public'),
  toolsRoot = path.join(projectRoot, 'tools'),
  distRoot,
  nodeModulesRoot = path.join(projectRoot, 'node_modules')
} = {}) => {
  const app = createApp({ projectRoot, staticRoot, toolsRoot, distRoot, nodeModulesRoot });

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

export { createApp, startServer };
