# Animation

Defined in Module `public/lib/impact/animation.js`

The animation module defines `ig.AnimationSheet` and `ig.Animation`.
Animations use an `ig.Timer` to choose frames from a tile sequence and draw
tiles from an `ig.Image`.

## Synopsis

```js
const sheet = new ig.AnimationSheet('media/player.png', 16, 16);
const run = new ig.Animation(sheet, 0.08, [0, 1, 2, 3]);

run.flip.x = true;
run.update();
run.draw(32, 48);
```

## Class ig.AnimationSheet

### Constructor

`new ig.AnimationSheet(path, width, height)`

Creates an image-backed sprite sheet. `width` and `height` describe one tile in
game pixels. The image itself is loaded through `ig.Image`, so texture atlas
support from `image.js` applies automatically.

### Properties

- `width` - tile width, default `8`.
- `height` - tile height, default `8`.
- `image` - `ig.Image` instance for the sheet path.

## Class ig.Animation

### Constructor

`new ig.Animation(sheet, frameTime, sequence, stop)`

Creates a timed animation over tile numbers in `sequence`. If `stop` is true,
the animation stays on the final sequence frame after one loop.

### Properties

- `sheet` - `ig.AnimationSheet` used for drawing.
- `timer` - `ig.Timer` used to calculate the current frame.
- `sequence` - tile numbers to play.
- `flip` - `{x, y}` booleans passed to `ig.Image.drawTile()`.
- `pivot` - rotation pivot, initialized to the tile center.
- `frameTime` - seconds per frame.
- `frame` - current index inside `sequence`.
- `tile` - current tile number.
- `stop` - whether to hold the final frame after one loop.
- `loopCount` - number of completed loops.
- `alpha` - temporary canvas alpha while drawing.
- `angle` - rotation in radians.

### Methods

- `rewind()` - resets timer, loop count, frame, and tile, then returns the animation.
- `gotoFrame(frame)` - offsets the timer so a specific frame becomes current.
- `gotoRandomFrame()` - jumps to a random frame in the sequence.
- `update()` - recalculates frame, tile, and loop count from elapsed time.
- `draw(targetX, targetY)` - draws the current tile if it intersects the screen.

## Notes

Rotation uses the canvas transform around `pivot`. Non-rotated frames draw
directly through `ig.Image.drawTile()`, which is faster and keeps draw counting
centralized in the image module.
