import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { createTextureAtlasPlugin } from './texture-atlas-plugin.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  root: projectRoot,
  base: '/dist/',
  publicDir: false,

  plugins: [createTextureAtlasPlugin()],

  build: {
    outDir: path.join(projectRoot, 'dist'),
    rollupOptions: {
      input: path.join(projectRoot, 'index.html'),
    },
  },
});
