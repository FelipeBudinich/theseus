# Debug Menu

Defined in Module `public/lib/impact/debug/menu.js`

The debug menu module creates the debug shell, installs debug CSS, wraps the
system run loop, and defines reusable debug panel and option classes.

## Synopsis

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

## Class ig.Debug

### Constructor

`new ig.Debug()`

Creates the bottom debug container, panel menu, stats area, console-backed
`ig.log()` and `ig.assert()`, and `ig.show()` number display helper. If no DOM
document exists, initialization exits early.

### Properties

- `panels` - panel instances by name.
- `numbers` - stat display nodes by name.
- `container` - root debug element.
- `panelMenu` - top menu element.
- `numberContainer` - stat area.
- `activePanel` - currently open panel.
- `debugTime` - smoothed frame work time.
- `debugTickAvg` - smoothed frame interval.
- `debugRealTime` - timestamp used for timing.

### Methods

- `addNumber(name)` - creates a stat display.
- `showNumber(name, number)` - creates or updates a stat.
- `addPanel(panelDef)` - creates a panel from `{type, name, label, options}` and inserts a menu button.
- `showPanel(name)` - toggles a named panel.
- `togglePanel(panel)` - opens or closes a panel and updates menu state.
- `ready()` - forwards game-ready notification to panels.
- `beforeRun()` - updates frame interval and calls the active panel hook.
- `afterRun()` - updates stats, calls the active panel hook, and resets `ig.Image.drawCount`.

## Class ig.DebugPanel

### Constructor

`new ig.DebugPanel(name, label)`

Creates a panel container and stores its name and menu label.

### Properties

- `active` - panel visibility state.
- `container` - panel DOM element.
- `options` - `ig.DebugOption` list.
- `panels` - child panels.
- `label` - menu label.
- `name` - panel id.

### Methods

- `toggle(active)` - sets visibility.
- `addPanel(panel)` - appends a child panel.
- `addOption(option)` - appends a toggle option.
- `ready()` - hook for subclasses.
- `beforeRun()` - hook for subclasses.
- `afterRun()` - hook for subclasses.

## Class ig.DebugOption

### Constructor

`new ig.DebugOption(name, object, property)`

Creates a button that toggles `object[property]`.

### Properties

- `name` - displayed option name.
- `object` - target object.
- `property` - target boolean property.
- `label` - label span.
- `mark` - visual on/off mark.
- `container` - button element.
- `active` - current boolean state.

### Methods

- `setLabel()` - updates the mark style.
- `click(event)` - toggles the target property and suppresses the browser event.

## Injected Behavior

The module injects into `ig.System.run()` to call `ig.debug.beforeRun()` and
`ig.debug.afterRun()`. It also injects into `ig.System.setGameNow()` so
`ig.debug.ready()` runs after a game switch.

## CSS

`debug/menu.js` injects `public/lib/impact/debug/debug.css` as a stylesheet
with id `theseus-debug-styles`. The stylesheet defines the fixed bottom panel,
menu buttons, stats, graph legend, options, and mini-map styling. It is not a
separate JavaScript module and is documented here.
