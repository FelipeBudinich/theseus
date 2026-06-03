# Entity

Defined in Module `public/lib/impact/entity.js`

`ig.Entity` is the base class for game objects. It handles position,
velocity, acceleration, friction, gravity, animation, health, entity checks, and
entity-to-entity collision response.

## Synopsis

```js
const EntityPlayer = ig.Entity.extend({
  size: { x: 16, y: 24 },
  animSheet: new ig.AnimationSheet('media/player.png', 16, 24),

  init(x, y, settings) {
    this.parent(x, y, settings);
    this.addAnim('idle', 0.2, [0, 1]);
  }
});

ig.registerClass('EntityPlayer', EntityPlayer);
```

## Constructor

`new ig.Entity(x, y, settings)`

Assigns a unique id, places the entity at `x` and `y`, and merges settings onto
the instance.

## Properties

- `id` - unique entity id.
- `settings` - default settings object.
- `size`, `offset` - collision box size and visual offset.
- `pos`, `last` - current and previous position.
- `vel`, `accel`, `friction`, `maxVel` - movement state.
- `zIndex` - sort value for `ig.Game.SORT.Z_INDEX`.
- `gravityFactor` - multiplier for `ig.game.gravity`.
- `standing` - true after floor or standable slope contact.
- `bounciness`, `minBounceVelocity` - bounce response settings.
- `anims`, `animSheet`, `currentAnim` - animation state.
- `health` - default health used by `receiveDamage()`.
- `type` - entity type bitmask.
- `checkAgainst` - type bitmask that triggers `check()`.
- `collides` - collision behavior.
- `slopeStanding` - angle range considered standable.

## Methods

- `reset(x, y, settings)` - restores pooled instance state and merges settings.
- `addAnim(name, frameTime, sequence, stop)` - creates and stores an `ig.Animation`.
- `update()` - applies gravity, acceleration, friction, collision trace, and animation update.
- `getNewVelocity(vel, accel, friction, max)` - calculates one axis of velocity.
- `handleMovementTrace(result)` - applies map collision result to position and velocity.
- `draw()` - draws `currentAnim` relative to the rounded screen.
- `kill()` - asks the game to remove the entity.
- `receiveDamage(amount, from)` - subtracts health and kills at zero.
- `touches(other)` - tests axis-aligned box overlap.
- `distanceTo(other)` - distance between entity centers.
- `angleTo(other)` - angle from this entity center to another.
- `check(other)` - callback for check interactions.
- `collideWith(other, axis)` - callback after entity collision response.
- `ready()` - callback after all level entities are spawned.
- `erase()` - callback when the entity leaves the game list.

## Static Methods

- `ig.Entity.checkPair(a, b)` - runs check callbacks and solves allowed collisions.
- `ig.Entity.solveCollision(a, b)` - chooses a separation axis from previous positions.
- `ig.Entity.seperateOnXAxis(left, right, weak)` - separates horizontal collision.
- `ig.Entity.seperateOnYAxis(top, bottom, weak)` - separates vertical collision.

## Constants

`ig.Entity.TYPE`:

- `NONE`
- `A`
- `B`
- `BOTH`

`ig.Entity.COLLIDES`:

- `NEVER`
- `LITE`
- `PASSIVE`
- `ACTIVE`
- `FIXED`

## Notes

String entity names in level data are resolved by `ig.Game.spawnEntity()` via
`ig.resolveClass()`, so ESM entity modules should call `ig.registerClass()`
when they need to be spawned by name.
