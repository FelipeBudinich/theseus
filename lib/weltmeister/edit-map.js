import ig from '../impact/impact.js';
import wm from './wm.js';
import config from './config.js';
import { qs } from './dom-helpers.js';
import './tile-select.js';

const EditMap = (wm.EditMap = ig.BackgroundMap.extend({
  name: '',
  visible: true,
  active: true,
  linkWithCollision: false,

  div: null,
  brush: [[0]],
  oldData: null,
  hotkey: -1,
  ignoreLastClick: false,
  tileSelect: null,

  isSelecting: false,
  selectionBegin: null,

  init: function(name, tilesize, tileset, foreground) {
    this.name = name;
    this.parent(tilesize, [[0]], tileset || '');
    this.foreground = foreground;

    this.div = document.createElement('div');
    this.div.className = 'layer layerActive';
    this.div.id = 'layer_' + name;
    this.div.addEventListener('mouseup', this.click.bind(this));
    this.setName(name);
    if (this.foreground) {
      qs('#layers').prepend(this.div);
    } else {
      qs('#layerEntities').after(this.div);
    }

    this.tileSelect = new wm.TileSelect(this);
  },

  getSaveData: function() {
    return {
      name: this.name,
      width: this.width,
      height: this.height,
      linkWithCollision: this.linkWithCollision,
      visible: this.visible,
      tilesetName: this.tilesetName,
      repeat: this.repeat,
      preRender: this.preRender,
      distance: this.distance,
      tilesize: this.tilesize,
      foreground: this.foreground,
      data: this.data
    };
  },

  resize: function(newWidth, newHeight) {
    var newData = new Array(newHeight);
    for (var y = 0; y < newHeight; y++) {
      newData[y] = new Array(newWidth);
      for (var x = 0; x < newWidth; x++) {
        newData[y][x] =
          x < this.width && y < this.height ? this.data[y][x] : 0;
      }
    }
    this.data = newData;
    this.width = newWidth;
    this.height = newHeight;

    this.resetDiv();
  },

  beginEditing: function() {
    this.oldData = ig.copy(this.data);
  },

  getOldTile: function(x, y) {
    var tx = Math.floor(x / this.tilesize);
    var ty = Math.floor(y / this.tilesize);
    if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
      return this.oldData[ty][tx];
    }

    return 0;
  },

  setTileset: function(tileset) {
    if (this.name == 'collision') {
      this.setCollisionTileset();
    } else {
      this.parent(tileset);
    }
  },

  setCollisionTileset: function() {
    var path = config.collisionTiles.path;
    var scale = this.tilesize / config.collisionTiles.tilesize;
    this.tiles = new ig.AutoResizedImage(path, scale);
  },

  setHotkey: function(hotkey) {
    this.hotkey = hotkey;
    this.setName(this.name);
  },

  setName: function(name) {
    this.name = name.replace(/[^0-9a-zA-Z]/g, '_');
    this.resetDiv();
  },

  resetDiv: function() {
    var visible = document.createElement('span');
    visible.className = 'visible' + (this.visible ? ' checkedVis' : '');
    visible.title = 'Toggle Visibility (Shift+' + this.hotkey + ')';
    visible.addEventListener('mousedown', this.toggleVisibilityClick.bind(this));

    var name = document.createElement('span');
    name.className = 'name';
    name.textContent = this.name;

    var size = document.createElement('span');
    size.className = 'size';
    size.textContent = ' (' + this.width + 'x' + this.height + ')';

    this.div.replaceChildren(visible, name, size);
    this.div.title = 'Select Layer (' + this.hotkey + ')';
  },

  setActive: function(active) {
    this.active = active;
    if (active) {
      this.div.classList.add('layerActive');
    } else {
      this.div.classList.remove('layerActive');
    }
  },

  toggleVisibility: function() {
    this.visible = !this.visible;
    this.resetDiv();
    ig.game.draw();
  },

  toggleVisibilityClick: function() {
    if (!this.active) {
      this.ignoreLastClick = true;
    }
    this.toggleVisibility();
  },

  click: function() {
    if (this.ignoreLastClick) {
      this.ignoreLastClick = false;
      return;
    }
    ig.editor.setActiveLayer(this.name);
  },

  destroy: function() {
    this.div.remove();
  },

  beginSelecting: function(x, y) {
    this.isSelecting = true;
    this.selectionBegin = { x: x, y: y };
  },

  endSelecting: function(x, y) {
    var rect = this.getSelectionRect(x, y);

    var brush = [];
    for (var tileY = rect.y; tileY < rect.y + rect.h; tileY++) {
      var row = [];
      for (var tileX = rect.x; tileX < rect.x + rect.w; tileX++) {
        if (tileX < 0 || tileY < 0 || tileX >= this.width || tileY >= this.height) {
          row.push(0);
        } else {
          row.push(this.data[tileY][tileX]);
        }
      }
      brush.push(row);
    }
    this.isSelecting = false;
    this.selectionBegin = null;
    return brush;
  },

  getSelectionRect: function(x, y) {
    var startX = this.selectionBegin ? this.selectionBegin.x : x;
    var startY = this.selectionBegin ? this.selectionBegin.y : y;

    var tileBeginX = Math.floor((startX + this.scroll.x) / this.tilesize);
    var tileBeginY = Math.floor((startY + this.scroll.y) / this.tilesize);
    var tileEndX = Math.floor((x + this.scroll.x) / this.tilesize);
    var tileEndY = Math.floor((y + this.scroll.y) / this.tilesize);

    return {
      x: Math.min(tileBeginX, tileEndX),
      y: Math.min(tileBeginY, tileEndY),
      w: Math.abs(tileBeginX - tileEndX) + 1,
      h: Math.abs(tileBeginY - tileEndY) + 1
    };
  },

  draw: function() {
    if (this.visible && !(config.view.zoom < 1 && this.repeat)) {
      this.drawTiled();
    }

    if (this.active && config.view.grid) {
      var x = -ig.system.getDrawPos(this.scroll.x % this.tilesize) - 0.5;
      var y = -ig.system.getDrawPos(this.scroll.y % this.tilesize) - 0.5;
      var step = this.tilesize * ig.system.scale;

      ig.system.context.beginPath();
      for (x; x < ig.system.realWidth; x += step) {
        ig.system.context.moveTo(x, 0);
        ig.system.context.lineTo(x, ig.system.realHeight);
      }
      for (y; y < ig.system.realHeight; y += step) {
        ig.system.context.moveTo(0, y);
        ig.system.context.lineTo(ig.system.realWidth, y);
      }
      ig.system.context.strokeStyle = config.colors.secondary;
      ig.system.context.stroke();
      ig.system.context.closePath();
      ig.system.context.beginPath();
    }

    if (this.active) {
      ig.system.context.lineWidth = 1;
      ig.system.context.strokeStyle = config.colors.primary;
      ig.system.context.strokeRect(
        -ig.system.getDrawPos(this.scroll.x) - 0.5,
        -ig.system.getDrawPos(this.scroll.y) - 0.5,
        this.width * this.tilesize * ig.system.scale + 1,
        this.height * this.tilesize * ig.system.scale + 1
      );
    }
  },

  getCursorOffset: function() {
    var width = this.brush[0].length;
    var height = this.brush.length;

    return {
      x: (width / 2 - 0.5).toInt() * this.tilesize,
      y: (height / 2 - 0.5).toInt() * this.tilesize
    };
  },

  drawCursor: function(x, y) {
    if (this.isSelecting) {
      var rect = this.getSelectionRect(x, y);

      ig.system.context.lineWidth = 1;
      ig.system.context.strokeStyle = config.colors.selection;
      ig.system.context.strokeRect(
        (rect.x * this.tilesize - this.scroll.x) * ig.system.scale - 0.5,
        (rect.y * this.tilesize - this.scroll.y) * ig.system.scale - 0.5,
        rect.w * this.tilesize * ig.system.scale + 1,
        rect.h * this.tilesize * ig.system.scale + 1
      );
    } else {
      var width = this.brush[0].length;
      var height = this.brush.length;

      var offset = this.getCursorOffset();

      var cursorX =
        Math.floor((x + this.scroll.x) / this.tilesize) * this.tilesize -
        this.scroll.x -
        offset.x;
      var cursorY =
        Math.floor((y + this.scroll.y) / this.tilesize) * this.tilesize -
        this.scroll.y -
        offset.y;

      ig.system.context.lineWidth = 1;
      ig.system.context.strokeStyle = config.colors.primary;
      ig.system.context.strokeRect(
        ig.system.getDrawPos(cursorX) - 0.5,
        ig.system.getDrawPos(cursorY) - 0.5,
        width * this.tilesize * ig.system.scale + 1,
        height * this.tilesize * ig.system.scale + 1
      );

      ig.system.context.globalAlpha = 0.5;
      for (var tileY = 0; tileY < height; tileY++) {
        for (var tileX = 0; tileX < width; tileX++) {
          var tile = this.brush[tileY][tileX];
          if (tile) {
            var pixelX = cursorX + tileX * this.tilesize;
            var pixelY = cursorY + tileY * this.tilesize;
            this.tiles.drawTile(pixelX, pixelY, tile - 1, this.tilesize);
          }
        }
      }
      ig.system.context.globalAlpha = 1;
    }
  }
}));

const AutoResizedImage = (ig.AutoResizedImage = ig.Image.extend({
  internalScale: 1,

  staticInstantiate: function() {
    return null;
  },

  init: function(imagePath, internalScale) {
    this.internalScale = internalScale;
    this.parent(imagePath);
  },

  onload: function() {
    this.width = Math.ceil(this.data.width * this.internalScale);
    this.height = Math.ceil(this.data.height * this.internalScale);

    if (this.internalScale != 1) {
      var scaled = ig.$new('canvas');
      scaled.width = this.width;
      scaled.height = this.height;
      var scaledContext = scaled.getContext('2d');

      scaledContext.drawImage(
        this.data,
        0,
        0,
        this.data.width,
        this.data.height,
        0,
        0,
        this.width,
        this.height
      );
      this.data = scaled;
    }

    this.loaded = true;
    if (ig.system.scale != 1) {
      this.resize(ig.system.scale);
    }

    if (this.loadCallback) {
      this.loadCallback(this.path, true);
    }
  }
}));

export { AutoResizedImage, EditMap };
export default EditMap;
