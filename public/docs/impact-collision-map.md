# Collision Map

Defined in Module `public/lib/impact/collision-map.js`

`ig.CollisionMap` extends `ig.Map` with swept rectangle tracing against solid
tiles and slope definitions.

## Synopsis

```js
const result = ig.game.collisionMap.trace(
  entity.pos.x,
  entity.pos.y,
  entity.vel.x * ig.system.tick,
  entity.vel.y * ig.system.tick,
  entity.size.x,
  entity.size.y
);

entity.handleMovementTrace(result);
```

## Constructor

`new ig.CollisionMap(tilesize, data, tiledef)`

Creates a collision map. If `tiledef` is omitted, the default Impact slope table
is used.

## Properties

- `lastSlope` - highest tile id handled as a slope tile.
- `tiledef` - slope definition table.

## Methods

- `trace(x, y, vx, vy, objectWidth, objectHeight)` - returns a trace result after moving a box by `vx` and `vy`.
- `_traceStep(result, x, y, vx, vy, width, height, rvx, rvy, step)` - internal per-step solid tile and slope test.
- `_checkTileDef(result, tile, x, y, vx, vy, width, height, tileX, tileY)` - internal line-definition collision test.

## Trace Result

`trace()` returns:

```js
{
  collision: { x: false, y: false, slope: false },
  pos: { x, y },
  tile: { x: 0, y: 0 }
}
```

`collision.slope` is either false or an object with the slope vector and normal:
`{x, y, nx, ny}`.

## Constants

- `ig.CollisionMap.defaultTileDef` - built-in slope tile table. Tile `1` is fully solid. Slope ids are line definitions in tile-relative coordinates.
- `ig.CollisionMap.staticNoCollision` - dummy collision map whose `trace()` always returns the moved position.

## Notes

Large movements are split into smaller steps based on tile size. A small extra
movement amount is included in step calculation so movement aligned exactly to
tile boundaries still checks the first crossed tile.
