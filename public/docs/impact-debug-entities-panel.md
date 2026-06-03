# Debug Entities Panel

Defined in Module `public/lib/impact/debug/entities-panel.js`

The entities panel adds debug drawing and collision toggles for `ig.Entity`.

## Synopsis

```js
// Loaded by the debug entry module.
ig.Entity._debugShowBoxes = true;
ig.Entity._debugShowVelocities = true;
```

## Description

This module injects into `ig.Entity.draw()` and wraps `ig.Entity.checkPair()`.
It registers an `Entities` panel with toggles for collision checks, collision
boxes, velocity vectors, and entity names or targets.

## Added Static Properties

- `ig.Entity._debugEnableChecks` - allows `ig.Entity.checkPair()` when true.
- `ig.Entity._debugShowBoxes` - draws entity collision boxes.
- `ig.Entity._debugShowVelocities` - draws velocity vectors.
- `ig.Entity._debugShowNames` - draws entity names and target links.

## Injected Entity Properties

- `debugColors.boxes` - collision box color.
- `debugColors.names` - name and target line color.
- `debugColors.velocities` - velocity vector color.

## Injected Methods

- `ig.Entity.draw()` - calls the original draw method, then optionally draws collision boxes, velocities, names, and target lines.
- `ig.Entity.checkPair(a, b)` - skips checks and collision solving when `_debugEnableChecks` is false.

## Panel Options

The registered panel uses `ig.DebugPanel` with these options:

- `Checks & Collisions`
- `Show Collision Boxes`
- `Show Velocities`
- `Show Names & Targets`

## Notes

Target lines are drawn for `this.target` object entries when matching named
entities exist in `ig.game`.
