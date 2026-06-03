# Entity Pool

Defined in Module `public/lib/impact/entity-pool.js`

`ig.EntityPool` is an opt-in object pool for entity instances. It injects
`staticInstantiate()` and `erase()` behavior into entity classes so killed
entities can be reused by later spawns.

## Synopsis

```js
ig.EntityPool.enableFor(EntityBullet);

ig.game.spawnEntity(EntityBullet, x, y, settings);
```

## Object ig.EntityPool

`ig.EntityPool` is a plain namespace object, not an `ig.Class` subclass.

## Properties

- `pools` - map of class id to reusable entity instances.
- `mixin` - injected methods used by pooled classes.

## Methods

- `enableFor(Class)` - injects pooling behavior into an entity class.
- `getFromPool(classId, x, y, settings)` - returns a reset instance or `null`.
- `putInPool(instance)` - stores an erased instance under its class id.
- `drainPool(classId)` - removes one class pool.
- `drainAllPools()` - clears all pools.

## Injected Methods

- `staticInstantiate(x, y, settings)` - asks the pool for an instance before construction.
- `erase()` - returns the instance to the pool after the game removes it.

## Notes

The module injects into `ig.Game.loadLevel()` and drains all pools before a new
level loads. Pooled entity classes must implement `reset()` correctly; the base
`ig.Entity.reset()` restores common runtime state.
