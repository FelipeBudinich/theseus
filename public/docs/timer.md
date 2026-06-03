# Timer

Defined in Module `public/lib/impact/timer.js`

`ig.Timer` provides global scaled time and instance timers used by animation,
music fades, and game logic.

## Synopsis

```js
const cooldown = new ig.Timer(0.5);

if (cooldown.delta() > 0) {
  fire();
  cooldown.reset();
}
```

## Constructor

`new ig.Timer(seconds)`

Stores the current global time as the base and sets the target offset in
seconds.

## Properties

- `target` - target seconds after the base.
- `base` - global time when the timer was set or reset.
- `last` - global time at the last `tick()`.
- `pausedAt` - global time when paused, or `0`.

## Methods

- `set(seconds)` - sets a new target and base.
- `reset()` - resets base while keeping the current target.
- `tick()` - returns elapsed time since the previous tick, or `0` while paused.
- `delta()` - returns elapsed time past the target; negative means time remains.
- `pause()` - freezes this timer.
- `unpause()` - shifts the base by the pause duration.

## Static Properties And Methods

- `ig.Timer.time` - global scaled runtime.
- `ig.Timer.timeScale` - multiplier applied to global time.
- `ig.Timer.maxStep` - maximum seconds added by one global step, default `0.05`.
- `ig.Timer.step()` - updates global time from `Date.now()`.

## Notes

`ig.System.run()` calls `ig.Timer.step()` once per frame before updating the
active delegate.
