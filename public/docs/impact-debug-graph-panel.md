# Debug Graph Panel

Defined in Module `public/lib/impact/debug/graph-panel.js`

The graph panel draws frame timing history and exposes `ig.graph` and
`ig.mark()` helpers.

## Synopsis

```js
ig.mark('spawn wave', '#fff');

ig.graph.beginClock('custom');
doWork();
ig.graph.endClock('custom');
```

## Class ig.DebugGraphPanel

### Constructor

`new ig.DebugGraphPanel(name, label)`

Creates a graph canvas, timing marks for 16ms and 33ms, default clocks for draw,
update, entity checks, and lag, then stores itself as `ig.graph`.

### Properties

- `clocks` - timing clock records by name.
- `marks` - one-frame visual markers.
- `textY` - rotating text y position for marker labels.
- `height` - graph height, default `128`.
- `ms` - vertical graph range in milliseconds, default `64`.
- `timeBeforeRun` - timestamp captured before the frame.
- `graph` - graph canvas.
- `ctx` - graph canvas context.

### Methods

- `addGraphMark(name, height)` - adds a horizontal label.
- `addClock(name, description, color)` - adds a timing clock and legend entry.
- `beginClock(name, offset)` - starts or offsets a named clock.
- `endClock(name)` - records elapsed time and smoothed average.
- `mark(message, color)` - queues a one-frame vertical marker while active.
- `beforeRun()` - ends the lag clock and records frame start time.
- `afterRun()` - scrolls the graph, draws clock bars, updates legend values, and draws marks.

## Injected Behavior

The module injects into `ig.Game.draw()`, `ig.Game.update()`, and
`ig.Game.checkEntities()` to time the default clocks.

## Registered Panel

The module registers a `Performance` panel named `graph`.

## Notes

Clock averages use a smoothing factor, so the legend shows recent trends rather
than only the last frame.
