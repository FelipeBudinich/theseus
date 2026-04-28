import { searchEnablesDebug } from './debug-query.js';

const wantsDebug = searchEnablesDebug(window.location.search);

if (wantsDebug) {
  await import('../impact/debug/debug.js');
}

await import('./main.js');
