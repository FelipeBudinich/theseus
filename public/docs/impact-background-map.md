# Background Map

Defined in Module `public/lib/impact/background-map.js`

`ig.BackgroundMap` extends `ig.Map` with a tileset image, scroll position,
parallax distance, wrapping, foreground ordering, animated tiles, and optional
pre-rendered chunks.

## Synopsis

```js
const map = new ig.BackgroundMap(16, levelLayer.data, 'media/tiles.png');
map.repeat = true;
map.distance = 2;
map.setScreenPos(ig.game.screen.x, ig.game.screen.y);
map.draw();
```

## Constructor

`new ig.BackgroundMap(tilesize, data, tileset)`

Creates a tile map and calls `setTileset()`. `tileset` may be a path or an
`ig.Image` instance.

## Properties

- `tiles` - `ig.Image` instance used for tile drawing.
- `scroll` - `{x, y}` scroll offset after parallax distance is applied.
- `distance` - parallax divisor; larger values move the layer more slowly.
- `repeat` - wraps tile lookup in both axes when true.
- `tilesetName` - original tileset path.
- `foreground` - layers with this flag draw after entities.
- `enabled` - skips drawing when false.
- `preRender` - draws through cached canvas chunks when true.
- `preRenderedChunks` - 2D chunk canvas array.
- `chunkSize` - maximum chunk size in real canvas pixels.
- `debugChunks` - draws chunk outlines in pre-render mode.
- `anims` - map of tile index to `ig.Animation` for animated tiles.

## Methods

- `setTileset(tileset)` - stores the tileset path, creates an `ig.Image`, and clears cached chunks.
- `setScreenPos(x, y)` - applies `distance` to game screen coordinates.
- `preRenderMapToChunks()` - creates the chunk canvas grid for the full map.
- `preRenderChunk(cx, cy, width, height)` - renders a chunk into an offscreen canvas.
- `draw()` - skips unloaded or disabled maps, then selects pre-rendered or tiled drawing.
- `drawPreRendered()` - draws visible chunks, including repeat wrapping and optional chunk outlines.
- `drawTiled()` - walks visible tile coordinates and draws static or animated tiles.

## Notes

Pre-rendering trades memory for fewer tile draw calls. It is useful for large
static layers, while animated tiles and frequently changed layers should use
normal tiled drawing.
