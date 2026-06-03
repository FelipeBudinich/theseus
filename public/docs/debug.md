# Debug

Theseus keeps the Impact-style debug tooling in `public/lib/impact/debug`.
The debug entry module loads the shared menu and concrete panels, while each
panel injects focused runtime inspection behavior.

## Debug Entry

Defined in Module `public/lib/impact/debug/debug.js`

The debug entry module imports the concrete debug panels and exports nothing.
It exists so `ig.js` can load the whole debug suite with one dynamic import.

### Synopsis

```js
// Loaded automatically by ig.js when the URL uses ?debug or ?debug=true.
import '/lib/impact/debug/debug.js';
```

### Description

The module imports:

- `debug/entities-panel.js`
- `debug/maps-panel.js`
- `debug/graph-panel.js`

Each imported panel depends on `debug/menu.js`, which creates `ig.debug` and
the shared debug UI classes when needed.

### Public API

This module has no public classes or methods of its own. Its side effect is
installing debug injections and panels through the imported modules.

### Theseus Notes

`public/lib/impact/ig.js` loads this module only when debug is requested by URL
and `globalThis.__THESEUS_INCLUDE_DEBUG__` is not `false`. `impact.js` awaits
that decision before `ig.main()` is exposed to game code.

## Debug Menu

Defined in Module `public/lib/impact/debug/menu.js`

The debug menu module creates the debug shell, installs debug CSS, wraps the
system run loop, and defines reusable debug panel and option classes.

### Synopsis

```js
ig.debug.addPanel({
  type: ig.DebugPanel,
  name: 'custom',
  label: 'Custom',
  options: [
    { name: 'Enabled', object: someObject, property: 'enabled' }
  ]
});
```

### Class ig.Debug

#### Constructor

`new ig.Debug()`

Creates the bottom debug container, panel menu, stats area, console-backed
`ig.log()` and `ig.assert()`, and `ig.show()` number display helper. If no DOM
document exists, initialization exits early.

#### Properties

- `panels` - panel instances by name.
- `numbers` - stat display nodes by name.
- `container` - root debug element.
- `panelMenu` - top menu element.
- `numberContainer` - stat area.
- `activePanel` - currently open panel.
- `debugTime` - smoothed frame work time.
- `debugTickAvg` - smoothed frame interval.
- `debugRealTime` - timestamp used for timing.

#### Methods

- `addNumber(name)` - creates a stat display.
- `showNumber(name, number)` - creates or updates a stat.
- `addPanel(panelDef)` - creates a panel from `{type, name, label, options}` and inserts a menu button.
- `showPanel(name)` - toggles a named panel.
- `togglePanel(panel)` - opens or closes a panel and updates menu state.
- `ready()` - forwards game-ready notification to panels.
- `beforeRun()` - updates frame interval and calls the active panel hook.
- `afterRun()` - updates stats, calls the active panel hook, and resets `ig.Image.drawCount`.

### Class ig.DebugPanel

#### Constructor

`new ig.DebugPanel(name, label)`

Creates a panel container and stores its name and menu label.

#### Properties

- `active` - panel visibility state.
- `container` - panel DOM element.
- `options` - `ig.DebugOption` list.
- `panels` - child panels.
- `label` - menu label.
- `name` - panel id.

#### Methods

- `toggle(active)` - sets visibility.
- `addPanel(panel)` - appends a child panel.
- `addOption(option)` - appends a toggle option.
- `ready()` - hook for subclasses.
- `beforeRun()` - hook for subclasses.
- `afterRun()` - hook for subclasses.

### Class ig.DebugOption

#### Constructor

`new ig.DebugOption(name, object, property)`

Creates a button that toggles `object[property]`.

#### Properties

- `name` - displayed option name.
- `object` - target object.
- `property` - target boolean property.
- `label` - label span.
- `mark` - visual on/off mark.
- `container` - button element.
- `active` - current boolean state.

#### Methods

- `setLabel()` - updates the mark style.
- `click(event)` - toggles the target property and suppresses the browser event.

### Injected Behavior

The module injects into `ig.System.run()` to call `ig.debug.beforeRun()` and
`ig.debug.afterRun()`. It also injects into `ig.System.setGameNow()` so
`ig.debug.ready()` runs after a game switch.

### CSS

`debug/menu.js` injects `public/lib/impact/debug/debug.css` as a stylesheet
with id `theseus-debug-styles`. The stylesheet defines the fixed bottom panel,
menu buttons, stats, graph legend, options, and mini-map styling. It is not a
separate JavaScript module and is documented here.

## Debug Entities Panel

Defined in Module `public/lib/impact/debug/entities-panel.js`

The entities panel adds debug drawing and collision toggles for `ig.Entity`.

### Synopsis

```js
// Loaded by the debug entry module.
ig.Entity._debugShowBoxes = true;
ig.Entity._debugShowVelocities = true;
```

### Description

This module injects into `ig.Entity.draw()` and wraps `ig.Entity.checkPair()`.
It registers an `Entities` panel with toggles for collision checks, collision
boxes, velocity vectors, and entity names or targets.

### Added Static Properties

- `ig.Entity._debugEnableChecks` - allows `ig.Entity.checkPair()` when true.
- `ig.Entity._debugShowBoxes` - draws entity collision boxes.
- `ig.Entity._debugShowVelocities` - draws velocity vectors.
- `ig.Entity._debugShowNames` - draws entity names and target links.

### Injected Entity Properties

- `debugColors.boxes` - collision box color.
- `debugColors.names` - name and target line color.
- `debugColors.velocities` - velocity vector color.

### Injected Methods

- `ig.Entity.draw()` - calls the original draw method, then optionally draws collision boxes, velocities, names, and target lines.
- `ig.Entity.checkPair(a, b)` - skips checks and collision solving when `_debugEnableChecks` is false.

### Panel Options

The registered panel uses `ig.DebugPanel` with these options:

- `Checks & Collisions`
- `Show Collision Boxes`
- `Show Velocities`
- `Show Names & Targets`

### Notes

Target lines are drawn for `this.target` object entries when matching named
entities exist in `ig.game`.

## Debug Graph Panel

Defined in Module `public/lib/impact/debug/graph-panel.js`

The graph panel draws frame timing history and exposes `ig.graph` and
`ig.mark()` helpers.

### Synopsis

```js
ig.mark('spawn wave', '#fff');

ig.graph.beginClock('custom');
doWork();
ig.graph.endClock('custom');
```

### Class ig.DebugGraphPanel

#### Constructor

`new ig.DebugGraphPanel(name, label)`

Creates a graph canvas, timing marks for 16ms and 33ms, default clocks for draw,
update, entity checks, and lag, then stores itself as `ig.graph`.

#### Properties

- `clocks` - timing clock records by name.
- `marks` - one-frame visual markers.
- `textY` - rotating text y position for marker labels.
- `height` - graph height, default `128`.
- `ms` - vertical graph range in milliseconds, default `64`.
- `timeBeforeRun` - timestamp captured before the frame.
- `graph` - graph canvas.
- `ctx` - graph canvas context.

#### Methods

- `addGraphMark(name, height)` - adds a horizontal label.
- `addClock(name, description, color)` - adds a timing clock and legend entry.
- `beginClock(name, offset)` - starts or offsets a named clock.
- `endClock(name)` - records elapsed time and smoothed average.
- `mark(message, color)` - queues a one-frame vertical marker while active.
- `beforeRun()` - ends the lag clock and records frame start time.
- `afterRun()` - scrolls the graph, draws clock bars, updates legend values, and draws marks.

### Injected Behavior

The module injects into `ig.Game.draw()`, `ig.Game.update()`, and
`ig.Game.checkEntities()` to time the default clocks.

### Registered Panel

The module registers a `Performance` panel named `graph`.

### Notes

Clock averages use a smoothing factor, so the legend shows recent trends rather
than only the last frame.

## Debug Maps Panel

Defined in Module `public/lib/impact/debug/maps-panel.js`

The maps panel displays background map layers, exposes layer toggles, and shows
mini maps with the current screen rectangle.

### Synopsis

```js
// Loaded by the debug entry module.
ig.debug.showPanel('maps');
```

### Class ig.DebugMapsPanel

#### Constructor

`new ig.DebugMapsPanel(name, label)`

Creates the panel and immediately loads the current game maps when available.

#### Properties

- `maps` - current `ig.game.backgroundMaps` list.
- `mapScreens` - mini-map screen rectangle elements by layer.

#### Methods

- `load(game)` - rebuilds subpanels for a game's background maps.
- `generateMiniMap(panel, map, id)` - renders a miniature tile map and screen rectangle.
- `afterRun()` - updates mini-map screen rectangle positions from map scroll.

### Injected Behavior

The module injects into `ig.Game.loadLevel()`. After the original level load,
it refreshes the maps panel if the panel is installed.

### Registered Panel

The module registers a `Background Maps` panel named `maps`.

### Panel Options

Each map subpanel includes toggles for:

- `Enabled`
- `Pre Rendered`
- `Show Chunks`

### Notes

Mini-map generation understands packed texture-atlas images through
`map.tiles.getSourceRect()`. If no background maps are loaded, the panel displays
`No background maps loaded`.
