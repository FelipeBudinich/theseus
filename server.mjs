import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(__dirname, { index: false }));

const startServer = ({
  host = process.env.HOST || '127.0.0.1',
  port = Number(process.env.PORT) || 3000
} = {}) => {
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

export { app, startServer };
