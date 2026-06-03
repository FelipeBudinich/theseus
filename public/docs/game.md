# Game

Defined in Module `public/lib/impact/game.js`

`ig.Game` is the base game delegate. It owns entities, maps, level loading,
entity checks, sorting, updates, and drawing.

## Synopsis

```js
const MyGame = ig.Game.extend({
  gravity: 800,

  init() {
    this.loadLevel(LevelGrasslands);
  },

  update() {
    this.parent();
  }
});
```

## Constructor

`new ig.Game()`

`staticInstantiate()` sets a default sort function and assigns the new game to
`ig.game` before normal initialization continues.

## Properties

- `clearColor` - canvas fill color before drawing, default black.
- `gravity` - vertical acceleration applied by entities.
- `screen` - game camera position.
- `_rscreen` - rounded screen position used for synchronized drawing.
- `entities` - active entity list.
- `namedEntities` - map of entity name to instance.
- `collisionMap` - active `ig.CollisionMap`.
- `backgroundMaps` - `ig.BackgroundMap` layers.
- `backgroundAnims` - tile animations keyed by tileset.
- `autoSort` - sorts entities after each update when true.
- `sortBy` - comparison function used by `sortEntities()`.
- `cellSize` - spatial hash cell size for entity checks.

## Methods

- `loadLevel(data)` - clears state, spawns entities, creates maps, and calls each entity's `ready()`.
- `loadLevelDeferred(data)` - schedules a level to load at the start of the next update.
- `getMapByName(name)` - returns the collision map or a named background map.
- `getEntityByName(name)` - returns a named entity.
- `getLevelByName(name)` - returns a registered level.
- `getEntitiesByType(type)` - returns live entities that are instances of a class or class name.
- `spawnEntity(type, x, y, settings)` - resolves a class, constructs it, stores it, and indexes it by name.
- `sortEntities()` - immediately sorts the entity list.
- `sortEntitiesDeferred()` - requests sorting after the update pass.
- `removeEntity(entity)` - marks an entity killed and queues deferred removal.
- `run()` - calls `update()` and `draw()`.
- `update()` - loads deferred levels, updates entities, checks entities, removes killed entities, sorts, and updates background animations.
- `updateEntities()` - calls `update()` on each live entity.
- `draw()` - clears the screen, draws background layers, entities, then foreground layers.
- `drawEntities()` - calls `draw()` on each entity.
- `checkEntities()` - uses a spatial hash to call `ig.Entity.checkPair()` for overlapping candidates.

## Static Methods

- `ig.Game.normalizeLevelName(name)` - removes a leading `Level` and lowercases the first letter.
- `ig.Game.registerLevel(name, levelData)` - stores level data by normalized name.
- `ig.Game.getLevelByName(name)` - returns level data by normalized name.

## Constants

`ig.Game.SORT`:

- `Z_INDEX`
- `POS_X`
- `POS_Y`

## Theseus Notes

The level registry supports native ESM level modules. A level module can call
`ig.Game.registerLevel('LevelGrasslands', data)` and game code can later use
`this.getLevelByName('grasslands')` or `this.getLevelByName('LevelGrasslands')`.
