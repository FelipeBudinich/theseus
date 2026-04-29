import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { createTextureAtlasPlugin } from './texture-atlas-plugin.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const publicRoot = path.join(projectRoot, 'public');

export default defineConfig({
  root: publicRoot,
  base: '/dist/',
  publicDir: false,

  define: {
    'globalThis.__THESEUS_INCLUDE_DEBUG__': false
  },

  plugins: [createTextureAtlasPlugin()],

  build: {
    outDir: path.join(publicRoot, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(publicRoot, 'index.html')
    }
  }
});
