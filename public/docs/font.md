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
font.draw('Wrapped label', 120, 80, {
  align: ig.Font.ALIGN.CENTER,
  verticalAlign: ig.Font.VALIGN.BOTTOM,
  maxWidth: 96,
  letterSpacing: 1,
  alpha: 0.9,
  lineSpacing: 4
});
```

## Constructor

`new ig.Font(path)`

Fonts use the inherited `ig.Image` constructor and loading behavior.

## Properties

- `widthMap` - measured width per character.
- `heightMap` - visible non-transparent pixel height per character.
- `indices` - source x position per character.
- `topMap` - first non-transparent pixel row per character.
- `bottomMap` - last non-transparent pixel row per character.
- `firstChar` - character code for the first glyph, default `32`.
- `alpha` - temporary canvas alpha while drawing.
- `letterSpacing` - pixels inserted between characters.
- `lineSpacing` - pixels inserted between lines.

## Methods

- `onload(event)` - loads metrics, calls `ig.Image.onload()`, then removes the two metric rows from visual height.
- `widthForString(text, options)` - returns the width of one line or the widest rendered line in multiline or wrapped text.
- `_widthForLine(text)` - internal single-line width calculation.
- `heightForString(text, options)` - returns total multiline or wrapped height.
- `draw(text, x, y, align)` - draws text with optional legacy horizontal alignment.
- `draw(text, x, y, options)` - draws text with horizontal alignment, vertical alignment, and optional word wrapping.
- `_drawChar(charIndex, targetX, targetY)` - draws one glyph and returns advance width.
- `_loadMetrics(imageWidth, imageHeight)` - scans the bottom metric row and fills `widthMap` and `indices`.
- `_loadVisualMetrics(imageWidth, imageHeight)` - scans the font image alpha data, excluding metric rows, for font-level visible ink bounds.
- `_loadGlyphVisualMetrics(imageWidth, imageHeight)` - scans each glyph slot for per-character visible ink bounds.

## Draw Options

`draw()`, `widthForString()`, and `heightForString()` accept an optional
options object:

```js
{
  align: ig.Font.ALIGN.LEFT,
  verticalAlign: ig.Font.VALIGN.FONT,
  maxWidth: 120,
  letterSpacing: 1,
  alpha: 1,
  lineSpacing: 0
}
```

- `align` - horizontal alignment. Defaults to `ig.Font.ALIGN.LEFT`.
- `verticalAlign` - visible ink alignment inside each line. Defaults to
  `ig.Font.VALIGN.FONT`.
- `maxWidth` - finite positive line width. When a word would exceed this width,
  it is moved to the next line.
- `letterSpacing` - finite per-call spacing between characters. Defaults to
  the font's `letterSpacing` property.
- `alpha` - finite per-call canvas alpha for drawing. Defaults to the font's
  `alpha` property.
- `lineSpacing` - finite per-call spacing between lines. Defaults to the
  font's `lineSpacing` property.

For wrapped or bounded text with `maxWidth`, `x` and `y` are the top-left corner
of the layout block and `align` places each line inside `maxWidth`. Without
`maxWidth`, legacy center and right alignment keep treating `x` as the center or
right anchor.

`y` is always the top of the text layout block. `verticalAlign` does not move the
block; it shifts glyph cells inside their line boxes. `TOP`, `MIDDLE`, and
`BOTTOM` use each character's own visible non-transparent pixels. `FONT`
preserves the legacy font-level bottom alignment based on the whole font image.

Explicit `\n` characters are preserved, and each source line wraps
independently. Wrapped lines drop leading whitespace. A single word wider than
`maxWidth` remains unbroken and may exceed the requested width.

`lineSpacing` is added only between line boxes; no extra spacing is added after
the final line. It does not change glyph cell height or `verticalAlign`
behavior.

`letterSpacing` affects drawing, measured width, horizontal alignment, and
wrapping. `alpha` only affects drawing; it does not change width, height, or
wrapping measurements.

## Constants

`ig.Font.ALIGN`:

- `LEFT`
- `RIGHT`
- `CENTER`

`ig.Font.VALIGN`:

- `TOP`
- `MIDDLE`
- `BOTTOM`
- `FONT`

## Theseus Notes

When a font image is packed into a texture atlas, `onload()` and `_drawChar()`
use the atlas entry to read metrics and draw glyphs from the original source
rectangle rather than the full atlas page.
