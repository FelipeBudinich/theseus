import wm from './wm.js';

const config = (wm.config ??= {
  project: {
    // The prefix path of this project's ESM source tree.
    modulePath: 'lib-esm/',

    // Legacy entity globbing is no longer used on the ESM editor path.
    entityFiles: 'lib-esm/game/entities/**/*.js',

    // Weltmeister now edits the native ESM level tree by default.
    levelPath: 'lib-esm/game/levels/',

    // New levels default to native ESM `.js` files. Saving to a `.json`
    // path writes plain JSON instead.
    outputFormat: 'esm',

    // Pretty-print JSON payloads inside generated level files.
    prettyPrint: true
  },

  plugins: [],

  layerDefaults: {
    width: 30,
    height: 20,
    tilesize: 8
  },

  askBeforeClose: true,
  loadLastLevel: true,
  entityGrid: 4,
  undoLevels: 50,

  binds: {
    MOUSE1: 'draw',
    MOUSE2: 'drag',
    SHIFT: 'select',
    CTRL: 'drag',
    SPACE: 'menu',
    DELETE: 'delete',
    BACKSPACE: 'delete',
    G: 'grid',
    C: 'clone',
    Z: 'undo',
    Y: 'redo',
    MWHEEL_UP: 'zoomin',
    PLUS: 'zoomin',
    MWHEEL_DOWN: 'zoomout',
    MINUS: 'zoomout'
  },

  touchScroll: false,

  view: {
    zoom: 1,
    zoomMax: 4,
    zoomMin: 0.125,
    grid: false
  },

  labels: {
    draw: true,
    step: 32,
    font: '10px Bitstream Vera Sans Mono, Monaco, sans-serif'
  },

  colors: {
    clear: '#000000',
    highlight: '#ceff36',
    primary: '#ffffff',
    secondary: '#555555',
    selection: '#ff9933'
  },

  collisionTiles: {
    path: 'lib/weltmeister/collisiontiles-64.png',
    tilesize: 64
  },

  api: {
    save: 'lib/weltmeister/api/save.php',
    browse: 'lib/weltmeister/api/browse.php',
    glob: 'lib/weltmeister/api/glob.php'
  }
});

export { config };
export default config;
