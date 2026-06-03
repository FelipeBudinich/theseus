# Font

Defined in Module `public/lib/impact/font.js`

`ig.Font` extends `ig.Image` to draw Impact-compatible bitmap fonts. Font
metrics are read from the bottom line of the image, where opaque pixel runs
define character widths.

## Synopsis

```js
const font = new ig.Font('media/font.png');

font.draw('Score: 100', 8, 8);
font.draw('Paused', ig.system.width / 2, 40, ig.Font.ALIGN.CENTER);
```

## Constructor

`new ig.Font(path)`

Fonts use the inherited `ig.Image` constructor and loading behavior.

## Properties

- `widthMap` - measured width per character.
- `indices` - source x position per character.
- `firstChar` - character code for the first glyph, default `32`.
- `alpha` - temporary canvas alpha while drawing.
- `letterSpacing` - pixels inserted between characters.
- `lineSpacing` - pixels inserted between lines.

## Methods

- `onload(event)` - loads metrics, calls `ig.Image.onload()`, then removes the two metric rows from visual height.
- `widthForString(text)` - returns the width of one line or the widest line in multiline text.
- `_widthForLine(text)` - internal single-line width calculation.
- `heightForString(text)` - returns total multiline height.
- `draw(text, x, y, align)` - draws text with optional alignment.
- `_drawChar(charIndex, targetX, targetY)` - draws one glyph and returns advance width.
- `_loadMetrics(imageWidth, imageHeight)` - scans the bottom metric row and fills `widthMap` and `indices`.

## Constants

`ig.Font.ALIGN`:

- `LEFT`
- `RIGHT`
- `CENTER`

## Theseus Notes

When a font image is packed into a texture atlas, `onload()` and `_drawChar()`
use the atlas entry to read metrics and draw glyphs from the original source
rectangle rather than the full atlas page.
