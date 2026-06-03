# Debug Maps Panel

Defined in Module `public/lib/impact/debug/maps-panel.js`

The maps panel displays background map layers, exposes layer toggles, and shows
mini maps with the current screen rectangle.

## Synopsis

```js
// Loaded by the debug entry module.
ig.debug.showPanel('maps');
```

## Class ig.DebugMapsPanel

### Constructor

`new ig.DebugMapsPanel(name, label)`

Creates the panel and immediately loads the current game maps when available.

### Properties

- `maps` - current `ig.game.backgroundMaps` list.
- `mapScreens` - mini-map screen rectangle elements by layer.

### Methods

- `load(game)` - rebuilds subpanels for a game's background maps.
- `generateMiniMap(panel, map, id)` - renders a miniature tile map and screen rectangle.
- `afterRun()` - updates mini-map screen rectangle positions from map scroll.

## Injected Behavior

The module injects into `ig.Game.loadLevel()`. After the original level load,
it refreshes the maps panel if the panel is installed.

## Registered Panel

The module registers a `Background Maps` panel named `maps`.

## Panel Options

Each map subpanel includes toggles for:

- `Enabled`
- `Pre Rendered`
- `Show Chunks`

## Notes

Mini-map generation understands packed texture-atlas images through
`map.tiles.getSourceRect()`. If no background maps are loaded, the panel displays
`No background maps loaded`.
