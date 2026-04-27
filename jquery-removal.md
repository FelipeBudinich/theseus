# Weltmeister jQuery Removal Plan

This document inventories every first-party Weltmeister feature that currently
depends on jQuery or jQuery UI, and outlines how to replace each use with
vanilla browser APIs.

## Current dependency surface

Weltmeister currently loads jQuery and jQuery UI directly from
`weltmeister.html`:

- `lib/weltmeister/jquery-1.7.1.min.js`
- `lib/weltmeister/jquery-ui-1.8.1.custom.min.js`

The ESM bridge in `lib/weltmeister/wm.js` exposes `getJQuery()`, and the
first-party modules below import it:

- `lib/weltmeister/weltmeister.js`
- `lib/weltmeister/edit-entities.js`
- `lib/weltmeister/edit-map.js`
- `lib/weltmeister/modal-dialogs.js`
- `lib/weltmeister/select-file-dropdown.js`

The only jQuery UI feature used by first-party code is `sortable()` on the
layer list. All other usage is core jQuery plus the bundled `$.cookie` plugin
that is appended to `jquery-1.7.1.min.js`.

## Feature Inventory And Vanilla Replacements

### Boot and dependency loading

Current usage:

- `weltmeister.html` loads jQuery, then jQuery UI, then `lib/weltmeister/main.js`.
- `wm.js` throws if `window.jQuery` or `window.$` is missing.
- Each jQuery-using module calls `const $ = getJQuery()`.

Replacement:

- Remove both script tags from `weltmeister.html`.
- Remove `getJQuery()` from `wm.js` after all callers have been migrated.
- Replace each module-level `$` constant with small local helpers or shared DOM
  helpers.

Suggested shared helper module:

```js
const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const on = (target, type, listener, options) => {
  target.addEventListener(type, listener, options);
  return () => target.removeEventListener(type, listener, options);
};
```

### DOM selection and traversal

Current usage:

- Single element lookup: `$('#levelLoad')`, `$('#layerName')`,
  `$('#entityDefinitions')`, `$('body')`, `$(window)`, `$(document)`.
- Multiple element lookup: `$('.entityDefinition')`,
  `$('#layers div.layer span.name')`.
- Child traversal: `this.div.children('.visible')`,
  `$(this).children('.key')`, `$(event.target).attr('href')`.
- Positional selector in `uikeydown()`:
  `#layers div.layer:nth-child(${index}) span.name`.

Replacement:

- Use `document.querySelector()` for single elements.
- Use `document.querySelectorAll()` plus `Array.from()` for lists.
- Use `element.querySelector()` or `:scope > .visible` for direct children.
- Use `event.currentTarget` where the handler is bound to the element, and
  `event.target.closest()` when delegation is appropriate.
- Keep the positional selector if desired because `querySelector()` supports
  `:nth-child()`, or replace it with `qsa('#layers .layer')[index - 1]`.

Example:

```js
const layer = document.querySelector(`#layers .layer:nth-child(${index}) .name`);
const name = layer ? layer.textContent : '';
```

### Event binding and unbinding

Current usage:

- `.bind('click' | 'mouseup' | 'mousedown' | 'keydown' | 'change', handler)`
- Shorthand `.click(handler)`
- `$(window).resize(handler)`
- `$(window).bind('beforeunload', handler)`
- `$(document).bind('mousedown', this.boundHide)` and `.unbind(...)` in the file
  dropdown.

Replacement:

- Use `addEventListener()` and `removeEventListener()`.
- Prefer `event.key === 'Enter'` over `event.which === 13` in new code, while
  preserving existing behavior where old Impact input code still depends on
  key codes.
- Use `window.addEventListener('resize', ...)`,
  `window.addEventListener('keydown', ...)`, and
  `window.addEventListener('beforeunload', ...)`.
- For repeated dynamic children, prefer event delegation on a stable parent to
  avoid rebinding after every `innerHTML` update.

Example:

```js
document.querySelector('#levelLoad')
  .addEventListener('click', this.showLoadDialog.bind(this));

document.addEventListener('mousedown', this.boundHide);
document.removeEventListener('mousedown', this.boundHide);
```

### DOM creation and insertion

Current usage:

- jQuery element creation with attributes and event handlers:
  `$('<div/>', { class: 'layer layerActive', id, mouseup })`
- Creating modal controls:
  `$('<input/>', { type: 'button', class: 'button', value })`
- Insertion methods:
  `.append()`, `.prepend()`, `.after()`, `.before()`, `.remove()`, `.empty()`.

Replacement:

- Use `document.createElement()`, `className` or `classList`, `id`,
  `setAttribute()`, and `addEventListener()`.
- Use `append()`, `prepend()`, `after()`, `before()`, `remove()`, and
  `replaceChildren()`.
- Prefer `textContent` when inserting user-visible strings from project data.
  Current code uses `html`/`innerHTML` in several places, which preserves old
  behavior but carries injection risk if level/entity metadata can contain
  markup.

Example:

```js
const layer = document.createElement('div');
layer.className = 'layer layerActive';
layer.id = `layer_${name}`;
layer.addEventListener('mouseup', this.click.bind(this));
document.querySelector('#layers').prepend(layer);
```

### Text, HTML, values, attributes, and properties

Current usage:

- Text reads/writes: `.text()`
- HTML writes: `.html(html)`
- Form values: `.val()`
- Attributes: `.attr('title', ...)`, `.attr('disabled', isCollision)`,
  `.attr('href')`
- Properties: `.prop('checked', ...)`
- Focus APIs: `.focus()`, `.blur()`, `.select()`

Replacement:

- Use `textContent` for text and `innerHTML` only where markup is intentionally
  generated.
- Use `HTMLInputElement.value` for text input values.
- Use `setAttribute()`, `getAttribute()`, and `removeAttribute()` for normal
  attributes.
- Use boolean DOM properties for checkboxes and disabled state:
  `input.checked = true`, `input.disabled = isCollision`.
- Use native `focus()`, `blur()`, and `select()`.

Important behavior note:

- jQuery `.attr('disabled', false)` in newer jQuery can differ from property
  assignment. The migrated code should explicitly set `.disabled = isCollision`
  on each affected input so the form actually re-enables correctly.

### Classes and visibility

Current usage:

- `.addClass('layerActive')`
- `.removeClass('layerActive')`
- `.toggleClass('active')`
- `.show()`, `.hide()`

Replacement:

- Use `element.classList.add()`, `.remove()`, `.toggle()`.
- Use a CSS class for hidden state, or direct `style.display`.
- Prefer a shared helper for jQuery-compatible visibility behavior:

```js
const show = (element) => {
  element.hidden = false;
};

const hide = (element) => {
  element.hidden = true;
};
```

If existing CSS display values matter, use a class rather than hard-coding
`display = 'block'`:

```css
.is-hidden {
  display: none !important;
}
```

### Animations and effects

Current usage:

- Sidebar: `$('div#menu').slideToggle('fast')`
- Zoom indicator: `.stop(true, true).show().delay(300).fadeOut()`
- Layer settings and entity settings: `.fadeOut(100, callback).fadeIn(100)`
- Modals: `.fadeIn(100)` and `.fadeOut(100)`
- File dropdown: `.slideDown(100)` and `.slideUp(100)`

Replacement:

- Move effects into CSS transitions or animations.
- Toggle state classes from JavaScript.
- Use `transitionend` or `setTimeout()` only where code currently relies on an
  animation completion callback before mutating content.
- For the zoom indicator, use a timer plus a CSS fade class; cancel the old
  timer when zoom changes to mimic `.stop(true, true)`.

Example zoom indicator strategy:

```js
zoomIndicator.textContent = `${config.view.zoom}x`;
zoomIndicator.classList.add('is-visible');
clearTimeout(this.zoomIndicatorTimer);
this.zoomIndicatorTimer = setTimeout(() => {
  zoomIndicator.classList.remove('is-visible');
}, 300);
```

For `fadeOut(100, update).fadeIn(100)`, create a helper:

```js
const fadeSwap = (element, update) => {
  element.classList.add('is-fading');
  setTimeout(() => {
    update();
    element.classList.remove('is-fading');
  }, 100);
};
```

A more robust version should listen for `transitionend` and fall back to a
timer.

### Ajax requests

Current usage:

- `$.ajax({ url, dataType: 'text' })` for level loading.
- `$.ajax({ url, dataType: 'json' })` for file browsing.
- `$.ajax({ url, type: 'POST', dataType: 'json', contentType:
  'application/json', data: JSON.stringify(...) })` for level saving.
- Save error handling reads `error.responseJSON.error`.

Replacement:

- Use `fetch()`.
- Use `response.text()` for level files and `response.json()` for JSON APIs.
- Check `response.ok` and throw an error object that carries parsed JSON when
  available, so save error behavior remains compatible.

Suggested helper:

```js
const requestJson = async (url, options) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(body?.error || response.statusText);
    error.responseJSON = body;
    throw error;
  }

  return body;
};
```

Level loading can be:

```js
const response = await fetch(`${filePath}?nocache=${Math.random()}`);
if (!response.ok) {
  throw new Error(response.statusText);
}
const data = await response.text();
```

### Cookies / last-level persistence

Current usage:

- `$.cookie('wmLastLevel')`
- `$.cookie('wmLastLevel', this.filePath)`
- `$.cookie('wmLastLevel', null)`

Replacement:

- Prefer `localStorage` because this is client-side editor state and does not
  need to be sent with every request.
- If cookie compatibility is important for users who already have
  `wmLastLevel`, read the cookie once as a fallback and then write to
  `localStorage`.

Suggested helpers:

```js
const LAST_LEVEL_KEY = 'wmLastLevel';

const getLastLevel = () => localStorage.getItem(LAST_LEVEL_KEY) || readCookie(LAST_LEVEL_KEY);
const setLastLevel = (path) => localStorage.setItem(LAST_LEVEL_KEY, path);
const clearLastLevel = () => localStorage.removeItem(LAST_LEVEL_KEY);
```

If keeping cookies instead, implement `document.cookie` parsing and deletion
directly. Deletion requires setting an expired cookie with the same path used
for writes.

### Layer sorting / drag reorder

Current usage:

- `$('#layers').sortable({ update: this.reorderLayers.bind(this) })`
- `$('#layers').sortable('refresh')`
- `$('#layers').disableSelection()`

This is the only jQuery UI dependency.

Replacement options:

- Native HTML Drag and Drop on `.layer` rows.
- Pointer-event based custom sorting.
- A very small first-party `SortableLayers` helper scoped only to Weltmeister's
  needs.

Recommended approach:

- Implement a small `LayerSorter` helper instead of pulling in another
  dependency. Weltmeister only needs vertical reordering of existing layer rows
  and an `onUpdate` callback.
- Mark draggable layer rows with `draggable = true`, except any row that should
  not initiate drag from the visibility toggle.
- On `dragstart`, store the dragged row.
- On `dragover`, prevent default and insert before/after the row under the
  pointer based on pointer Y relative to the target midpoint.
- On `dragend` or `drop`, call `reorderLayers()`.
- Replace `sortable('refresh')` with either no-op behavior or a
  `layerSorter.refresh()` method that reattaches draggable attributes after
  rows are recreated.
- Replace `disableSelection()` with CSS:

```css
#layers {
  user-select: none;
}
```

Risk to preserve:

- The current order in the DOM is semantically meaningful. `reorderLayers()`
  reads `#layers div.layer span.name` in DOM order and updates foreground state
  based on whether each row appears before or after the special `entities`
  layer. The replacement sorter must keep the DOM order as the source of truth.

### Layout measurement

Current usage:

- `$(window).width()`
- `$(window).height()`
- `$('#headerMenu').height()`
- Dropdown placement uses `.position()`, `.innerHeight()`, `.innerWidth()`, and
  `.css('margin-top')`.

Replacement:

- Use `window.innerWidth` and `window.innerHeight`.
- Use `element.offsetHeight` or `getBoundingClientRect().height` for visible
  element height.
- For dropdown placement, use `getBoundingClientRect()` plus scroll offsets and
  `getComputedStyle()`.

Example:

```js
const rect = input.getBoundingClientRect();
const styles = getComputedStyle(input);
const top = rect.top + window.scrollY + input.offsetHeight + parseFloat(styles.marginTop) + 1;
const left = rect.left + window.scrollX;
const width = rect.width;
```

Note that jQuery `.position()` is offset-parent-relative, while
`getBoundingClientRect()` is viewport-relative. Because the dropdown is inserted
next to the input, either coordinate system can work, but the replacement should
be tested against the current CSS positioning context.

### Body cursor control

Current usage:

- `$('body').css('cursor', 'ns-resize')`
- `$('body').css('cursor', 'ew-resize')`
- `$('body').css('cursor', 'default')`

Replacement:

- Use `document.body.style.cursor = 'ns-resize'`, `'ew-resize'`, or `'default'`.

### Entity menu and entity setting editor

Current usage:

- Entity class links are generated with `$('<div/>', { id, href, html,
  mouseup })`.
- Entity settings are rebuilt with string HTML and inserted via `.html(html)`.
- Setting rows bind `mouseup` after every rebuild.
- Clicking a setting row reads child `.key` and `.value` text into inputs.

Replacement:

- Generate entity menu items with `document.createElement('div')`.
- Use `textContent` for entity names.
- Prefer generating entity setting rows as DOM nodes to avoid string escaping
  issues.
- Bind one delegated event listener on `#entityDefinitions`:

```js
entityDefinitions.addEventListener('mouseup', (event) => {
  const row = event.target.closest('.entityDefinition');
  if (!row) {
    return;
  }
  entityKey.value = row.querySelector('.key').textContent;
  entityValue.value = row.querySelector('.value').textContent;
  entityValue.select();
});
```

### Modal dialogs

Current usage:

- Modal background and box are created with jQuery.
- Buttons are appended through jQuery.
- Dialog text is inserted with `.html()`.
- Opening/closing uses fade effects.

Replacement:

- Create modal DOM with `document.createElement()`.
- Use `textContent` for `this.text` unless the dialog intentionally supports
  markup.
- Append with native `append()`.
- Use CSS classes for open/closed/fading state.

### File path dropdown

Current usage:

- Constructor accepts either a selector string or jQuery object and normalizes
  it with `$(elementId)`.
- The dropdown is inserted with `.after()`.
- Directory and file entries are generated with jQuery anchor creation.
- Browse API calls use `$.ajax`.
- Open/close uses document mousedown binding plus slide effects.

Replacement:

- Normalize with:

```js
this.input = typeof elementId === 'string'
  ? document.querySelector(elementId)
  : elementId;
```

- Use `fetch()` for `loadDir()`.
- Create anchors with `document.createElement('a')`, `className`, `href`, and
  `textContent`.
- Use `event.preventDefault()` in `selectDir()` and `selectFile()`.
- Use `event.currentTarget.getAttribute('href')` rather than wrapping the event
  target.
- Toggle CSS classes for slide-open state.

### Layer sidebar and layer rows

Current usage:

- `EditMap` creates and updates layer row HTML with jQuery.
- Visibility toggles are rebound after every `resetDiv()`.
- Active state uses jQuery class helpers.
- Destroying a layer calls `.remove()`.

Replacement:

- Keep a persistent row element on each `EditMap`.
- Rebuild children with `replaceChildren()` and real spans.
- Bind the visibility handler either once through event delegation on the row
  or once to the newly created visibility span.
- Use `classList` for active and checked visibility classes.
- Use native `remove()`.

### Header title, unsaved state, zoom indicator, and form fields

Current usage:

- Header and unsaved markers use `.text()`.
- Zoom indicator uses chained jQuery effects.
- Layer settings use many `.val()` and `.prop('checked')` calls.

Replacement:

- Cache DOM references during `Weltmeister.init()` or in a small `dom` object.
- Use `textContent`, `value`, `checked`, and `disabled`.
- Avoid repeated selector lookups in hot paths such as zooming and layer
  settings updates.

## Suggested Migration Sequence

1. Add small DOM, animation, request, and storage helpers under
   `lib/weltmeister/`, covered by focused unit tests where practical.
2. Convert `select-file-dropdown.js` to vanilla DOM and `fetch()`. It is
   self-contained and exercises selection, insertion, Ajax, measurement, and
   show/hide behavior.
3. Convert `modal-dialogs.js`. This removes simple DOM construction and fade
   dependencies.
4. Convert `edit-map.js` and `edit-entities.js`, including delegated entity
   setting clicks and native class/visibility handling.
5. Convert most of `weltmeister.js`: events, cookies/localStorage, fetch calls,
   form fields, title updates, sizing, cursor control, and zoom indicator.
6. Replace jQuery UI sortable with a first-party layer sorter and remove
   `sortable('refresh')` calls.
7. Remove `getJQuery()` from `wm.js`, remove the two script tags from
   `weltmeister.html`, delete the bundled jQuery files, and update tests/docs
   that currently assert jQuery is present.

## Test Updates Needed

The current HTML test expects these scripts to be present:

- `lib/weltmeister/jquery-1.7.1.min.js`
- `lib/weltmeister/jquery-ui-1.8.1.custom.min.js`

After migration, update `test/weltmeister-html.test.mjs` to assert that those
scripts are absent and that `lib/weltmeister/main.js` remains the module entry.

Existing docs that mention the jQuery-driven UI should also be updated:

- `README.md`
- `docs/esm-migration.md`
- `docs/v2-status.md`

## Compatibility Risks

- jQuery UI sortable is behaviorally larger than the current code suggests.
  The replacement must preserve DOM order, drag affordances, and foreground vs.
  background semantics around the special `entities` layer.
- jQuery animation queues currently hide race conditions by serializing effects.
  CSS-based replacements should explicitly cancel pending timers or transitions
  for zoom, modal, and settings-panel interactions.
- jQuery `.html()` currently inserts strings directly. Migrating to DOM nodes
  may expose places where the old code accepted markup-like values. This is
  usually a security improvement, but entity setting display should be checked
  against existing projects.
- jQuery Ajax rejects with jqXHR objects. Any `fetch()` helper should preserve
  the small part of that shape currently used by save error handling:
  `error.responseJSON.error`.
- Cookie removal can change persistence behavior. `localStorage` is better for
  editor state, but a one-time cookie fallback will make the migration gentler.

## Definition Of Done

- No first-party module imports or calls `getJQuery()`.
- `weltmeister.html` no longer loads jQuery or jQuery UI.
- `lib/weltmeister/jquery-1.7.1.min.js` and
  `lib/weltmeister/jquery-ui-1.8.1.custom.min.js` can be deleted.
- Layer reordering, modals, file dropdowns, entity settings, level load/save,
  last-level persistence, sidebar toggling, zoom indicator, and settings-panel
  transitions work without `window.$` or `window.jQuery`.
- Tests and docs no longer describe Weltmeister as jQuery-driven.
