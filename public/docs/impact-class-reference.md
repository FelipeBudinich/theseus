# Impact Runtime Class Reference

This reference documents the Theseus Impact runtime in `public/lib/impact`.
It follows the same compact class-reference style as the original ImpactJS
manual, but describes the local native ESM modules and Theseus additions.

## Core

- [ig Core](/docs/impact-ig) - shared `ig` object, class system, helpers, boot state, and debug loading.
- [Impact Entry](/docs/impact-impact) - the full engine entry point and `ig.main()`.
- [Class Timer](/docs/impact-timer) - global time stepping and instance timers.

## Game And Entities

- [Game](/docs/impact-game) - level loading, entity lists, maps, update and draw loop.
- [Entity](/docs/impact-entity) - movement, collision response, animation, and entity callbacks.
- [Entity Pool](/docs/impact-entity-pool) - opt-in reuse for killed entities.

## Maps And Collision

- [Map](/docs/impact-map) - base tile map data and tile lookup.
- [Background Map](/docs/impact-background-map) - scrolling, repeated, animated, pre-rendered tile layers.
- [Collision Map](/docs/impact-collision-map) - swept tile collision and slope tracing.

## Graphics And Resources

- [Image](/docs/impact-image) - image loading, drawing, tile drawing, cache, and texture atlas support.
- [Animation](/docs/impact-animation) - animation sheets and timed frame playback.
- [Font](/docs/impact-font) - bitmap font metrics and drawing.
- [Loader](/docs/impact-loader) - resource preload screen and transition into the game.

## Input, Sound, And System

- [Input](/docs/impact-input) - keyboard, mouse, touch, wheel, accelerometer, and gamepad-aware bindings.
- [System](/docs/impact-system) - canvas setup, scaling, draw modes, and run loop.
- [Sound](/docs/impact-sound) - sound manager, music, effects, WebAudio, HTML5 audio, and audio atlases.

## Debug Modules

- [Debug Entry](/docs/impact-debug-debug) - debug panel module aggregator.
- [Debug Menu](/docs/impact-debug-menu) - debug shell, panels, options, stats, and CSS injection.
- [Debug Entities Panel](/docs/impact-debug-entities-panel) - entity boxes, names, velocities, and collision toggles.
- [Debug Graph Panel](/docs/impact-debug-graph-panel) - frame timing graph, clocks, and marks.
- [Debug Maps Panel](/docs/impact-debug-maps-panel) - background map mini maps and layer controls.

## Notes

All runtime modules are native ES modules. Import `public/lib/impact/impact.js`
for the complete runtime, or import individual modules when building tests or
tools that need only part of the engine. Public APIs are still attached to the
shared `ig` object so existing Impact-style game code can continue to use
`ig.Game`, `ig.Entity`, `ig.Image`, and related symbols.
