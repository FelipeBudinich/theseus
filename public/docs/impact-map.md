# Map

Defined in Module `public/lib/impact/map.js`

`ig.Map` is the base tile map class. It stores a 2D tile array, tile size, and
dimensions, and provides pixel-coordinate tile lookup and mutation.

## Synopsis

```js
const map = new ig.Map(16, [
  [0, 1, 0],
  [2, 2, 0]
]);

const tile = map.getTile(player.pos.x, player.pos.y);
map.setTile(32, 16, 5);
```

## Constructor

`new ig.Map(tilesize, data)`

Stores `tilesize` and the tile data array, then calculates tile and pixel
dimensions.

## Properties

- `tilesize` - size of one tile in pixels.
- `width` - number of columns.
- `height` - number of rows.
- `pxWidth` - width in pixels.
- `pxHeight` - height in pixels.
- `data` - 2D tile array in `[y][x]` order.
- `name` - optional map name.

## Methods

- `getTile(x, y)` - returns the tile at pixel coordinates or `0` outside the map.
- `setTile(x, y, tile)` - writes a tile at pixel coordinates when inside bounds.

## Notes

`ig.BackgroundMap` and `ig.CollisionMap` extend this class. `getTile()` and
`setTile()` use pixel coordinates, not tile indices.
