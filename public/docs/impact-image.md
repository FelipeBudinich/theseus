# Image

Defined in Module `public/lib/impact/image.js`

`ig.Image` loads, caches, scales, and draws images. Theseus adds texture atlas
support while preserving the classic Impact `draw()` and `drawTile()` API.

## Synopsis

```js
const image = new ig.Image('media/player.png');

image.draw(10, 20);
image.drawTile(10, 20, 3, 16, 16, true, false);
```

## Constructor

`new ig.Image(path)`

Creates or returns a cached image for `path`, then starts loading or registers
the image as a resource if the runtime is not ready yet.

## Properties

- `data` - underlying `Image` or scaled canvas.
- `width`, `height` - source image size in game pixels.
- `loaded` - true after load success.
- `failed` - true after load error.
- `loadCallback` - pending loader callback.
- `path` - original resource path.
- `atlasEntry` - texture atlas metadata when packed.
- `_dataScale` - scale represented by `data`.

## Methods

- `staticInstantiate(path)` - returns an existing cached image for the same path.
- `init(path)` - stores path and calls `load()`.
- `load(loadCallback)` - loads immediately when `ig.ready`, or queues as a resource.
- `loadUnpacked()` - loads the original image file.
- `loadFromTextureAtlas()` - loads the atlas page for a packed image.
- `reload()` - clears state and loads again.
- `onloadFromTextureAtlas(status, atlasPage)` - falls back to unpacked loading or forwards success to `onload()`.
- `onload(event)` - sets dimensions, loaded state, atlas data, and scale.
- `onerror(event)` - marks failure and calls the loader callback.
- `getSourceRect(sourceX, sourceY, width, height)` - returns scaled source coordinates, including atlas offset.
- `getImagePixels(x, y, width, height)` - returns pixels from this image or atlas region.
- `resize(scale)` - nearest-neighbor scales unpacked images or swaps to a cached scaled atlas page.
- `draw(targetX, targetY, sourceX, sourceY, width, height)` - draws all or part of the image.
- `drawTile(targetX, targetY, tile, tileWidth, tileHeight, flipX, flipY)` - draws one tile from a sheet.

## Static Properties And Methods

- `ig.Image.drawCount` - incremented by image, tile, font, and debug drawing paths.
- `ig.Image.cache` - path to `ig.Image` cache.
- `ig.Image.atlasCache` - atlas page cache.
- `ig.Image.reloadCache()` - clears atlas pages and reloads every cached image.

## Theseus Texture Atlas

When `globalThis.__THESEUS_TEXTURE_ATLAS_MANIFEST__` is present, images are
looked up by normalized original path. Packed images load an atlas page, keep
their logical source width and height, and translate source rectangles through
the atlas frame. If the atlas page fails, the image falls back to unpacked
loading.
