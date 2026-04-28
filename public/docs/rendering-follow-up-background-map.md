# Rendering Follow-Up: BackgroundMap Pre-Rendered Chunks

## Summary

The background-map pre-render cleanup removed the old Chrome 49 workaround that converted pre-rendered chunks through `canvas.toDataURL()` and an `Image` object before drawing. `public/lib/impact/background-map.js` now keeps pre-rendered chunks as off-DOM `HTMLCanvasElement` instances and draws them directly.

This avoids unnecessary serialization through `toDataURL()`, avoids rehydrating canvas pixels through an image load path, and keeps the existing Impact-style canvas renderer intact. The cleanup is intentionally narrow: it modernizes the pre-render chunk storage and draw path without changing the broader canvas abstraction.

## What changed

Previously, the pre-render path had this shape:

```js
canvas -> toDataURL() -> Image -> drawImage(image)
```

The current path is:

```js
canvas -> drawImage(canvas)
```

In the current implementation, `preRenderChunk()` creates each chunk with `ig.$new('canvas')`, sets `chunk.width`, `chunk.height`, and `chunk.retinaResolutionEnabled = false`, gets a 2D context from the chunk, and applies `ig.System.scaleMode(chunk, chunkContext)`.

While generating the chunk, `preRenderChunk()` temporarily swaps `ig.system.context` to the chunk context, draws the tiles into the chunk, restores the screen context, and returns the canvas chunk directly. Later, `drawPreRendered()` draws the returned chunk with:

```js
ig.system.context.drawImage(chunk, x, y);
```

`drawPreRendered()` also reads `chunk.width` and `chunk.height` when correcting repeat-map edge chunks, so keeping the chunk as a canvas preserves the dimensions already used by the renderer. Because the chunk is already a drawable canvas source, this also avoids async image-load concerns from the previous `Image` conversion path. The Canvas 2D `drawImage()` API accepts `HTMLCanvasElement` sources, and it also accepts `OffscreenCanvas` sources, which is relevant for future work but not part of this cleanup. [MDN documents the accepted image source types for `drawImage()`][3].

## Why OffscreenCanvas is separate

An `OffscreenCanvas` migration is a future rendering audit, not part of this cleanup. The idea is technically plausible because `drawImage()` accepts both `HTMLCanvasElement` and `OffscreenCanvas` sources, but it is not a drop-in refactor for Theseus. This path currently relies on DOM-canvas behavior and canvas element properties.

`OffscreenCanvas` should be evaluated separately because:

- `ig.System.scaleMode(canvas, context)` may assume DOM canvas behavior.
- The existing Ejecta opt-out uses `chunk.retinaResolutionEnabled = false`, which is a custom DOM-canvas-era assumption.
- `drawPreRendered()` reads `chunk.width` and `chunk.height`.
- Other code may expect chunk objects to behave like `HTMLCanvasElement`.
- `OffscreenCanvasRenderingContext2D` is similar to `CanvasRenderingContext2D`, but not identical; its `canvas` property points to an `OffscreenCanvas`, and some UI-related canvas features are absent. [MDN Web Docs][1]
- `transferControlToOffscreen()` has state constraints and can throw if a canvas already has a context, so any migration must be designed deliberately instead of applied mechanically. [MDN Web Docs][2]

Future OffscreenCanvas work should audit `ig.System.scaleMode()`, Ejecta compatibility assumptions, context ownership, debug rendering, chunk sizing, browser support, and any code that treats chunks as DOM canvas elements. It should not be implemented as a follow-up patch to this cleanup without that audit.

## Risks

1. **Scale mode regressions**
   Pre-rendered chunks are generated at `ig.system.scale`. Any change here can cause blurry tiles, seams, wrong pixel snapping, or incorrect high-DPI behavior.

2. **Chunk boundary seams**
   The pre-render path slices maps into chunks. Incorrect dimensions or draw positions can create visible 1px gaps, overlaps, or shimmering while scrolling.

3. **Repeat-map edge behavior**
   `drawPreRendered()` uses `chunk.width` and `chunk.height` to nudge partial edge chunks when `repeat` is enabled. Any future change to the chunk object must preserve those values.

4. **Ejecta compatibility assumptions**
   `retinaResolutionEnabled = false` is kept for Ejecta-style behavior. OffscreenCanvas may not support this custom property in a meaningful way.

5. **Context swapping risk**
   `preRenderChunk()` temporarily replaces `ig.system.context`. If an exception occurs during tile drawing, the screen context could remain wrong unless future work protects the swap.

6. **Memory behavior changes**
   Keeping canvases directly may use memory differently than serialized images. Large maps, large scale factors, and many layers should be checked.

7. **Browser rendering differences**
   Modern Chrome, Firefox, and Safari may differ in canvas scaling, image smoothing, and large-canvas limits.

8. **Debug overlay behavior**
   `debugChunks` draws chunk outlines after the chunk is drawn. The cleanup should not change debug visualization.

## Manual browser test plan

### Browsers

Manually test in:

- Chrome
- Safari
- Optional: Chrome with device scale factor / high-DPI display

### Test maps

Create or use maps that cover:

- A normal non-repeating background layer.
- A repeating background layer.
- A map smaller than `chunkSize`.
- A map larger than `chunkSize` in both dimensions.
- A map where the final chunk is partial width.
- A map where the final chunk is partial height.
- A map with `preRender = true`.
- A comparable map with `preRender = false`.

### Visual checks

Verify:

- No visible seams between chunks.
- No flicker when scrolling.
- No tile misalignment.
- No blurry pixel art at native scale.
- No blurry pixel art at scaled resolution.
- No missing edge chunks.
- Repeating maps wrap cleanly horizontally.
- Repeating maps wrap cleanly vertically.
- Foreground/background layer order remains correct.
- Animated tiles still render correctly in the non-pre-rendered path.

### Debug checks

With `debugChunks = true`, verify:

- Chunk outlines match chunk boundaries.
- Partial chunks at map edges have correct dimensions.
- Repeating maps do not show gaps where nudged chunks should appear.

### Performance checks

In browser devtools:

- Watch console for errors.
- Scroll around a large pre-rendered map.
- Confirm no repeated chunk regeneration after the initial pre-render unless the tileset/map changes.
- Compare frame behavior with `preRender = true` versus `preRender = false`.
- Check memory on a large map before and after entering the level.

### Regression checks

Verify:

- Weltmeister still loads maps using background layers.
- Baked/dist game still renders the same map.
- Asset loading still completes normally.
- No `toDataURL()` dependency remains in `public/lib/impact/background-map.js`.
- No new async image-loading path was introduced.

## Acceptance criteria

The document is complete when:

- It explains the cleanup clearly.
- It identifies why OffscreenCanvas is intentionally deferred.
- It lists the concrete risks above.
- It provides a browser manual-test checklist.
- It references `lib/impact/background-map.js`.
- It does not instruct the agent to implement OffscreenCanvas yet.

[1]: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvasRenderingContext2D
[2]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen
[3]: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
