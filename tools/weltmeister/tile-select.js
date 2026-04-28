import ig from '../../lib/impact/impact.js';
import wm from './wm.js';
import config from './config.js';

const TileSelect = (wm.TileSelect = ig.Class.extend({
  pos: { x: 0, y: 0 },

  layer: null,
  selectionBegin: null,

  init: function(layer) {
    this.layer = layer;
  },

  getCurrentTile: function() {
    var brush = this.layer.brush;
    if (brush.length == 1 && brush[0].length == 1) {
      return brush[0][0] - 1;
    }

    return -1;
  },

  setPosition: function(x, y) {
    this.selectionBegin = null;
    var tile = this.getCurrentTile();
    this.pos.x =
      Math.floor(x / this.layer.tilesize) * this.layer.tilesize -
      Math.floor(tile * this.layer.tilesize) % this.layer.tiles.width;

    this.pos.y =
      Math.floor(y / this.layer.tilesize) * this.layer.tilesize -
      Math.floor(tile * this.layer.tilesize / this.layer.tiles.width) * this.layer.tilesize -
      (tile == -1 ? this.layer.tilesize : 0);

    this.pos.x = this.pos.x.limit(
      0,
      ig.system.width - this.layer.tiles.width - (ig.system.width % this.layer.tilesize)
    );
    this.pos.y = this.pos.y.limit(
      0,
      ig.system.height - this.layer.tiles.height - (ig.system.height % this.layer.tilesize)
    );
  },

  beginSelecting: function(x, y) {
    this.selectionBegin = { x: x, y: y };
  },

  endSelecting: function(x, y) {
    var rect = this.getSelectionRect(x, y);
    var mapWidth = Math.floor(this.layer.tiles.width / this.layer.tilesize);
    var mapHeight = Math.floor(this.layer.tiles.height / this.layer.tilesize);

    var brush = [];
    for (var tileY = rect.y; tileY < rect.y + rect.h; tileY++) {
      var row = [];
      for (var tileX = rect.x; tileX < rect.x + rect.w; tileX++) {
        if (tileX < 0 || tileY < 0 || tileX >= mapWidth || tileY >= mapHeight) {
          row.push(0);
        } else {
          row.push(tileY * mapWidth + tileX + 1);
        }
      }
      brush.push(row);
    }
    this.selectionBegin = null;
    return brush;
  },

  getSelectionRect: function(x, y) {
    var startX = this.selectionBegin ? this.selectionBegin.x : x;
    var startY = this.selectionBegin ? this.selectionBegin.y : y;

    var tileBeginX = Math.floor((startX - this.pos.x) / this.layer.tilesize);
    var tileBeginY = Math.floor((startY - this.pos.y) / this.layer.tilesize);
    var tileEndX = Math.floor((x - this.pos.x) / this.layer.tilesize);
    var tileEndY = Math.floor((y - this.pos.y) / this.layer.tilesize);

    return {
      x: Math.min(tileBeginX, tileEndX),
      y: Math.min(tileBeginY, tileEndY),
      w: Math.abs(tileBeginX - tileEndX) + 1,
      h: Math.abs(tileBeginY - tileEndY) + 1
    };
  },

  draw: function() {
    ig.system.clear('rgba(0,0,0,0.8)');
    if (!this.layer.tiles.loaded) {
      return;
    }

    ig.system.context.lineWidth = 1;
    ig.system.context.strokeStyle = config.colors.secondary;
    ig.system.context.fillStyle = config.colors.clear;
    ig.system.context.fillRect(
      this.pos.x * ig.system.scale,
      this.pos.y * ig.system.scale,
      this.layer.tiles.width * ig.system.scale,
      this.layer.tiles.height * ig.system.scale
    );
    ig.system.context.strokeRect(
      this.pos.x * ig.system.scale - 0.5,
      this.pos.y * ig.system.scale - 0.5,
      this.layer.tiles.width * ig.system.scale + 1,
      this.layer.tiles.height * ig.system.scale + 1
    );

    this.layer.tiles.draw(this.pos.x, this.pos.y);

    var tile = this.getCurrentTile();
    var tileX = Math.floor(tile * this.layer.tilesize) % this.layer.tiles.width + this.pos.x;
    var tileY =
      Math.floor(tile * this.layer.tilesize / this.layer.tiles.width) * this.layer.tilesize +
      this.pos.y +
      (tile == -1 ? this.layer.tilesize : 0);

    ig.system.context.lineWidth = 1;
    ig.system.context.strokeStyle = config.colors.highlight;
    ig.system.context.strokeRect(
      tileX * ig.system.scale - 0.5,
      tileY * ig.system.scale - 0.5,
      this.layer.tilesize * ig.system.scale + 1,
      this.layer.tilesize * ig.system.scale + 1
    );
  },

  drawCursor: function(x, y) {
    var rect = this.getSelectionRect(x, y);

    ig.system.context.lineWidth = 1;
    ig.system.context.strokeStyle = config.colors.selection;
    ig.system.context.strokeRect(
      (rect.x * this.layer.tilesize + this.pos.x) * ig.system.scale - 0.5,
      (rect.y * this.layer.tilesize + this.pos.y) * ig.system.scale - 0.5,
      rect.w * this.layer.tilesize * ig.system.scale + 1,
      rect.h * this.layer.tilesize * ig.system.scale + 1
    );
  }
}));

export { TileSelect };
export default TileSelect;
