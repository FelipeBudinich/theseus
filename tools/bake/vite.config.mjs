import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { createMusicAtlasPlugin } from './music-atlas-plugin.mjs';
import { createSfxAtlasPlugin } from './sfx-atlas-plugin.mjs';
import { createTextureAtlasPlugin } from './texture-atlas-plugin.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const publicRoot = path.join(projectRoot, 'public');
const exampleGameIndex = 'games/example/index.html';

const createRootIndexOutputPlugin = () => ({
  name: 'theseus-root-index-output',
  async closeBundle() {
    const distRoot = path.join(publicRoot, 'dist');
    const nestedIndex = path.join(distRoot, exampleGameIndex);
    const rootIndex = path.join(distRoot, 'index.html');

    await fs.rename(nestedIndex, rootIndex);
    await fs.rm(path.join(distRoot, 'games'), { recursive: true, force: true });
  }
});

export default defineConfig({
  root: publicRoot,
  base: '/dist/',
  publicDir: false,

  define: {
    'globalThis.__THESEUS_INCLUDE_DEBUG__': false
  },

  plugins: [
    createTextureAtlasPlugin({
      sourceDir: 'games/example/media',
      outputDir: 'assets',
      injectManifestIntoHtml: false,
      prependManifestToJavaScript: true,
    }),
    createSfxAtlasPlugin({
      sourceDir: 'games/example/media/sounds',
      atlasName: 'sfx-atlas',
      outputDir: 'assets',
      injectManifestIntoHtml: false,
      prependManifestToJavaScript: true
    }),
    createMusicAtlasPlugin({
      sourceDir: 'games/example/media/music',
      atlasName: 'music-atlas',
      outputDir: 'assets',
      injectManifestIntoHtml: false,
      prependManifestToJavaScript: true
    }),
    createRootIndexOutputPlugin()
  ],

  build: {
    outDir: path.join(publicRoot, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(publicRoot, exampleGameIndex)
    }
  }
});
