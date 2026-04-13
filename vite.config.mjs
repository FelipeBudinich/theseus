import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

import { createTextureAtlasPlugin } from './tools/texture-atlas-plugin.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  base: '/dist/',
  publicDir: false,
  plugins: [createTextureAtlasPlugin()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: path.join(__dirname, 'index.html'),
    },
  },
});
