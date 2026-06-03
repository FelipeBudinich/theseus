# ig Core

Defined in Module `public/lib/impact/ig.js`

The `ig` module creates and exports the shared Impact namespace used by all
runtime modules. It installs the class system, browser helpers, user-agent
flags, native extensions, class registry helpers, and URL-controlled debug
loading.

## Synopsis

```js
import ig from '/lib/impact/ig.js';

const EntityPlayer = ig.Entity.extend({
  update() {
    this.parent();
  }
});

ig.registerClass('EntityPlayer', EntityPlayer);
```

## Description

`ig.js` is the first module imported by the runtime. It keeps a single global
`ig` object on `window` or `globalThis`, so ESM imports and Impact-style global
access share the same state. Calling `ig.boot()` is idempotent and refreshes the
environment once, including user-agent flags, animation helpers, and optional
`ImpactMixin` merging.

Theseus keeps the familiar Impact class system but replaces the old module
loader with native ES imports. The `ig.modules` object remains available for
compatibility, but dependency ordering is expressed through `import`
statements.

## Properties

- `ig.global` - the active global object.
- `ig.version` - Impact API version string, currently `1.24`.
- `ig.game` - active game instance after `ig.System.setGameNow()`.
- `ig.system` - active `ig.System` instance after `ig.main()`.
- `ig.input` - active `ig.Input` instance after `ig.main()`.
- `ig.soundManager` - active `ig.SoundManager` instance after `ig.main()`.
- `ig.music` - active `ig.Music` instance after `ig.main()`.
- `ig.classes` - registry used by `ig.registerClass()` and string entity lookup.
- `ig.resources` - resources waiting for `ig.Loader`.
- `ig.ready` - true once `ig.main()` has created system services.
- `ig.prefix` - path prefix used by resources.
- `ig.lib` - compatibility library path, default `lib/`.
- `ig.ua` - user-agent and viewport information populated by `ig.boot()`.
- `ig.nocache` - cache-busting query suffix or an empty string.
- `ig.debugReady` - promise that resolves after optional debug module loading.

## Methods

- `ig.boot()` - initializes the environment once and returns `ig`.
- `ig.namespace(path, root)` - creates and returns an object namespace. Paths starting with `ig.` are created under `ig`.
- `ig.copy(object)` - deep-copies plain objects and arrays, leaving DOM elements and Impact class instances intact.
- `ig.merge(original, extended)` - recursively merges plain object data into `original`.
- `ig.ksort(object)` - returns object values sorted by key.
- `ig.$(selector)` - returns a DOM element for `#id`, a tag collection, or the provided object.
- `ig.$new(name)` - creates a DOM element.
- `ig.addResource(resource)` - appends a loadable resource to `ig.resources`.
- `ig.registerClass(name, klass)` - stores a class by name and sets `klass.className` when needed.
- `ig.getClass(name)` - finds a registered or global class by string name.
- `ig.resolveClass(type)` - returns a class from a string name or passes through an existing class.
- `ig.setNocache(set)` - enables or clears a timestamp query suffix.
- `ig.getImagePixels(image, x, y, width, height)` - draws an image to an offscreen canvas and returns `ImageData`.
- `ig.setAnimation(callback)` - schedules a repeated callback with `requestAnimationFrame` or `setInterval`.
- `ig.clearAnimation(id)` - cancels an animation loop created by `ig.setAnimation()`.

## Class System

`ig.Class.extend(properties)` creates subclasses. Constructors call
`staticInstantiate()` first, deep-copy object properties for each instance, and
then call `init()`. Methods that reference `this.parent()` are wrapped so they
can call the parent implementation.

`Class.inject(properties)` adds or replaces prototype properties on an existing
class. Debug modules and plugins use injection to wrap runtime behavior without
rewriting the original classes.

## Native Extensions

The module installs Impact-compatible helpers when they do not already exist:

- `Number.map()`, `limit()`, `round()`, `floor()`, `ceil()`, `toInt()`, `toRad()`, `toDeg()`
- `Array.erase(item)` and `Array.random()`

## Theseus Notes

When the page URL contains `?debug` or `?debug=true`, and
`globalThis.__THESEUS_INCLUDE_DEBUG__` is not `false`, `ig.js` dynamically
imports the debug module and exposes the promise as `ig.debugReady`. Values such
as `?debug=false` do not enable the panel.
