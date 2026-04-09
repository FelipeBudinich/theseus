import ig from '../impact/impact.js';
import wm, { getJQuery } from './wm.js';
import config from './config.js';
import './evented-input.js';
import './edit-map.js';
import './edit-entities.js';
import './select-file-dropdown.js';
import './modal-dialogs.js';
import './undo.js';
import {
  buildLevelSave,
  parseLevelSource
} from './level-format.js';

const $ = getJQuery();

const getDefaultLevelExtension = () =>
  config.project.outputFormat === 'json' ? '.json' : '.js';

const getUntitledFileName = () => `untitled${getDefaultLevelExtension()}`;
const getUntitledFilePath = () => `${config.project.levelPath}${getUntitledFileName()}`;

const resolveWeltmeisterModuleSpecifier = (moduleId) => {
  const modulePath = moduleId.replace(/\./g, '/');

  if (moduleId.startsWith('weltmeister.')) {
    return `./${modulePath.slice('weltmeister/'.length)}.js`;
  }

  return `../${modulePath}.js`;
};

const loadConfiguredPlugins = async () =>
  Promise.all(config.plugins.map((moduleId) => import(resolveWeltmeisterModuleSpecifier(moduleId))));

wm.entityFiles = wm.entityFiles || [];

const Weltmeister = (wm.Weltmeister = ig.Class.extend({
  mode: null,
  MODE: {
    DEFAULT: 0,
    DRAW: 1,
    TILESELECT: 2,
    ENTITYSELECT: 4
  },

  levelData: {},
  layers: [],
  entities: null,
  activeLayer: null,
  collisionLayer: null,
  selectedEntity: null,

  screen: { x: 0, y: 0 },
  _rscreen: { x: 0, y: 0 },
  mouseLast: { x: -1, y: -1 },
  waitForModeChange: false,

  tilesetSelectDialog: null,
  levelSavePathDialog: null,
  labelsStep: 32,

  collisionSolid: 1,

  loadDialog: null,
  saveDialog: null,
  loseChangesDialog: null,
  deleteLayerDialog: null,
  fileName: getUntitledFileName(),
  filePath: getUntitledFilePath(),
  modified: false,
  needsDraw: true,

  undo: null,

  init: function() {
    ig.game = ig.editor = this;

    ig.system.context.textBaseline = 'top';
    ig.system.context.font = config.labels.font;
    this.labelsStep = config.labels.step;

    this.loadDialog = new wm.ModalDialogPathSelect('Load Level', 'Load', 'scripts');
    this.loadDialog.onOk = this.load.bind(this);
    this.loadDialog.setPath(config.project.levelPath);
    $('#levelLoad').bind('click', this.showLoadDialog.bind(this));
    $('#levelNew').bind('click', this.showNewDialog.bind(this));

    this.saveDialog = new wm.ModalDialogPathSelect('Save Level', 'Save', 'scripts');
    this.saveDialog.onOk = this.save.bind(this);
    this.saveDialog.setPath(this.filePath);
    $('#levelSaveAs').bind('click', this.saveDialog.open.bind(this.saveDialog));
    $('#levelSave').bind('click', this.saveQuick.bind(this));

    this.loseChangesDialog = new wm.ModalDialog('Lose all changes?');
    this.deleteLayerDialog = new wm.ModalDialog('Delete Layer? NO UNDO!');
    this.deleteLayerDialog.onOk = this.removeLayer.bind(this);

    this.mode = this.MODE.DEFAULT;

    this.tilesetSelectDialog = new wm.SelectFileDropdown('#layerTileset', config.api.browse, 'images');
    this.entities = new wm.EditEntities($('#layerEntities'));

    $('#layers').sortable({
      update: this.reorderLayers.bind(this)
    });
    $('#layers').disableSelection();
    this.resetModified();

    if (config.touchScroll) {
      ig.system.canvas.addEventListener('wheel', this.touchScroll.bind(this), false);
      delete config.binds.MWHEEL_UP;
      delete config.binds.MWHEEL_DOWN;
    }

    for (var key in config.binds) {
      ig.input.bind(ig.KEY[key], config.binds[key]);
    }
    ig.input.keydownCallback = this.keydown.bind(this);
    ig.input.keyupCallback = this.keyup.bind(this);
    ig.input.mousemoveCallback = this.mousemove.bind(this);

    $(window).resize(this.resize.bind(this));
    $(window).bind('keydown', this.uikeydown.bind(this));
    $(window).bind('beforeunload', this.confirmClose.bind(this));

    $('#buttonAddLayer').bind('click', this.addLayer.bind(this));
    $('#buttonRemoveLayer').bind('click', this.deleteLayerDialog.open.bind(this.deleteLayerDialog));
    $('#buttonSaveLayerSettings').bind('click', this.saveLayerSettings.bind(this));
    $('#reloadImages').bind('click', ig.Image.reloadCache);
    $('#layerIsCollision').bind('change', this.toggleCollisionLayer.bind(this));

    $('input#toggleSidebar').click(function() {
      $('div#menu').slideToggle('fast');
      $('input#toggleSidebar').toggleClass('active');
    });

    $('#canvas').mousedown(function() {
      $('input:focus').blur();
    });

    this.undo = new wm.Undo(config.undoLevels);

    if (config.loadLastLevel) {
      var lastLevelPath = $.cookie('wmLastLevel');
      if (lastLevelPath) {
        void this.load(null, lastLevelPath);
      }
    }

    ig.setAnimation(this.drawIfNeeded.bind(this));
  },

  uikeydown: function(event) {
    if (event.target.type == 'text') {
      return;
    }

    var key = String.fromCharCode(event.which);
    if (key.match(/^\d$/)) {
      var index = parseInt(key, 10);
      var name = $('#layers div.layer:nth-child(' + index + ') span.name').text();

      var layer = name == 'entities'
        ? this.entities
        : this.getLayerWithName(name);

      if (layer) {
        if (event.shiftKey) {
          layer.toggleVisibility();
        } else {
          this.setActiveLayer(layer.name);
        }
      }
    }
  },

  showLoadDialog: function() {
    if (this.modified) {
      this.loseChangesDialog.onOk = this.loadDialog.open.bind(this.loadDialog);
      this.loseChangesDialog.open();
    } else {
      this.loadDialog.open();
    }
  },

  showNewDialog: function() {
    if (this.modified) {
      this.loseChangesDialog.onOk = this.loadNew.bind(this);
      this.loseChangesDialog.open();
    } else {
      this.loadNew();
    }
  },

  setModified: function() {
    if (!this.modified) {
      this.modified = true;
      this.setWindowTitle();
    }
  },

  resetModified: function() {
    this.modified = false;
    this.setWindowTitle();
  },

  setWindowTitle: function() {
    document.title = this.fileName + (this.modified ? ' * ' : ' - ') + 'Weltmeister';
    $('span.headerTitle').text(this.fileName);
    $('span.unsavedTitle').text(this.modified ? '*' : '');
  },

  setFilePath: function(filePath) {
    this.filePath = filePath;
    this.fileName = filePath.replace(/^.*\//, '');

    if (this.saveDialog) {
      this.saveDialog.setPath(filePath);
    }

    this.setWindowTitle();
  },

  confirmClose: function(event) {
    var returnValue = undefined;
    if (this.modified && config.askBeforeClose) {
      returnValue = 'There are some unsaved changes. Leave anyway?';
    }
    event.returnValue = returnValue;
    return returnValue;
  },

  resize: function() {
    ig.system.resize(
      Math.floor(wm.Weltmeister.getMaxWidth() / config.view.zoom),
      Math.floor(wm.Weltmeister.getMaxHeight() / config.view.zoom),
      config.view.zoom
    );
    ig.system.context.textBaseline = 'top';
    ig.system.context.font = config.labels.font;
    this.draw();
  },

  scroll: function(x, y) {
    this.screen.x -= x;
    this.screen.y -= y;

    this._rscreen.x = Math.round(this.screen.x * ig.system.scale) / ig.system.scale;
    this._rscreen.y = Math.round(this.screen.y * ig.system.scale) / ig.system.scale;
    for (var i = 0; i < this.layers.length; i++) {
      this.layers[i].setScreenPos(this.screen.x, this.screen.y);
    }
  },

  drag: function() {
    var dx = ig.input.mouse.x - this.mouseLast.x;
    var dy = ig.input.mouse.y - this.mouseLast.y;
    this.scroll(dx, dy);
  },

  touchScroll: function(event) {
    event.preventDefault();

    this.scroll(-event.deltaX / ig.system.scale, -event.deltaY / ig.system.scale);
    this.draw();
    return false;
  },

  zoom: function(delta) {
    var zoom = config.view.zoom;
    var mouseX = ig.input.mouse.x * zoom;
    var mouseY = ig.input.mouse.y * zoom;

    if (zoom <= 1) {
      if (delta < 0) {
        zoom /= 2;
      } else {
        zoom *= 2;
      }
    } else {
      zoom += delta;
    }

    config.view.zoom = zoom.limit(config.view.zoomMin, config.view.zoomMax);
    config.labels.step = Math.round(this.labelsStep / config.view.zoom);
    $('#zoomIndicator').text(config.view.zoom + 'x').stop(true, true).show().delay(300).fadeOut();

    ig.input.mouse.x = mouseX / config.view.zoom;
    ig.input.mouse.y = mouseY / config.view.zoom;
    this.drag();

    for (var imagePath in ig.Image.cache) {
      ig.Image.cache[imagePath].resize(config.view.zoom);
    }

    this.resize();
  },

  loadNew: function() {
    $.cookie('wmLastLevel', null);
    while (this.layers.length) {
      this.layers[0].destroy();
      this.layers.splice(0, 1);
    }
    this.screen = { x: 0, y: 0 };
    this.entities.clear();
    this.levelData = { entities: [], layer: [] };
    this.setFilePath(getUntitledFilePath());
    this.resetModified();
    this.draw();
  },

  load: async function(_dialog, filePath) {
    this.setFilePath(filePath);

    try {
      var data = await $.ajax({
        url: filePath + '?nocache=' + Math.random(),
        dataType: 'text'
      });
      this.loadResponse(data);
    } catch (error) {
      $.cookie('wmLastLevel', null);
      console.error('Failed to load Weltmeister level', error);
    }
  },

  loadResponse: function(data) {
    $.cookie('wmLastLevel', this.filePath);

    var levelData = parseLevelSource(data);
    this.levelData = levelData;

    while (this.layers.length) {
      this.layers[0].destroy();
      this.layers.splice(0, 1);
    }
    this.screen = { x: 0, y: 0 };
    this.entities.clear();

    for (var entityIndex = 0; entityIndex < levelData.entities.length; entityIndex++) {
      var entity = levelData.entities[entityIndex];
      this.entities.spawnEntity(entity.type, entity.x, entity.y, entity.settings);
    }

    for (var layerIndex = 0; layerIndex < levelData.layer.length; layerIndex++) {
      var layerData = levelData.layer[layerIndex];
      var newLayer = new wm.EditMap(
        layerData.name,
        layerData.tilesize,
        layerData.tilesetName,
        !!layerData.foreground
      );
      newLayer.resize(layerData.width, layerData.height);
      newLayer.linkWithCollision = layerData.linkWithCollision;
      newLayer.repeat = layerData.repeat;
      newLayer.preRender = !!layerData.preRender;
      newLayer.distance = layerData.distance;
      newLayer.visible = !layerData.visible;
      newLayer.data = layerData.data;
      newLayer.toggleVisibility();
      this.layers.push(newLayer);

      if (layerData.name == 'collision') {
        this.collisionLayer = newLayer;
      }

      this.setActiveLayer(layerData.name);
    }

    this.setActiveLayer('entities');

    this.reorderLayers();
    $('#layers').sortable('refresh');

    this.resetModified();
    this.undo.clear();
    this.draw();
  },

  saveQuick: function() {
    if (this.filePath == getUntitledFilePath()) {
      this.saveDialog.open();
    } else {
      void this.save(null, this.filePath);
    }
  },

  save: async function(_dialog, filePath) {
    var data = this.levelData;
    data.entities = this.entities.getSaveData();
    data.layer = [];

    for (var i = 0; i < this.layers.length; i++) {
      data.layer.push(this.layers[i].getSaveData());
    }

    var levelSave = buildLevelSave({
      filePath,
      levelData: data,
      outputFormat: config.project.outputFormat,
      prettyPrint: config.project.prettyPrint
    });

    this.setFilePath(levelSave.filePath);

    try {
      var response = await $.ajax({
        url: config.api.save,
        type: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify({
          path: levelSave.filePath,
          data: levelSave.source
        })
      });
      this.saveResponse(response);
    } catch (error) {
      var message =
        error && error.responseJSON && error.responseJSON.error
          ? error.responseJSON.error
          : 'Failed to save level';
      alert('Error: ' + message);
      console.error('Failed to save Weltmeister level', error);
    }
  },

  saveResponse: function(_data) {
    this.resetModified();
    $.cookie('wmLastLevel', this.filePath);
  },

  addLayer: function() {
    var name = 'new_layer_' + this.layers.length;
    var newLayer = new wm.EditMap(name, config.layerDefaults.tilesize);
    newLayer.resize(config.layerDefaults.width, config.layerDefaults.height);
    newLayer.setScreenPos(this.screen.x, this.screen.y);
    this.layers.push(newLayer);
    this.setActiveLayer(name);
    this.updateLayerSettings();

    this.reorderLayers();
    $('#layers').sortable('refresh');
  },

  removeLayer: function() {
    var name = this.activeLayer.name;
    if (name == 'entities') {
      return false;
    }
    this.activeLayer.destroy();
    for (var i = 0; i < this.layers.length; i++) {
      if (this.layers[i].name == name) {
        this.layers.splice(i, 1);
        this.reorderLayers();
        $('#layers').sortable('refresh');
        this.setActiveLayer('entities');
        return true;
      }
    }
    return false;
  },

  getLayerWithName: function(name) {
    for (var i = 0; i < this.layers.length; i++) {
      if (this.layers[i].name == name) {
        return this.layers[i];
      }
    }
    return null;
  },

  reorderLayers: function() {
    var newLayers = [];
    var isForegroundLayer = true;
    $('#layers div.layer span.name').each((function(newIndex, span) {
      var name = $(span).text();

      var layer = name == 'entities'
        ? this.entities
        : this.getLayerWithName(name);

      if (layer) {
        layer.setHotkey(newIndex + 1);
        if (layer.name == 'entities') {
          isForegroundLayer = false;
        } else {
          layer.foreground = isForegroundLayer;
          newLayers.unshift(layer);
        }
      }
    }).bind(this));
    this.layers = newLayers;
    this.setModified();
    this.draw();
  },

  updateLayerSettings: function() {
    $('#layerName').val(this.activeLayer.name);
    $('#layerTileset').val(this.activeLayer.tilesetName);
    $('#layerTilesize').val(this.activeLayer.tilesize);
    $('#layerWidth').val(this.activeLayer.width);
    $('#layerHeight').val(this.activeLayer.height);
    $('#layerPreRender').prop('checked', this.activeLayer.preRender);
    $('#layerRepeat').prop('checked', this.activeLayer.repeat);
    $('#layerLinkWithCollision').prop('checked', this.activeLayer.linkWithCollision);
    $('#layerDistance').val(this.activeLayer.distance);
  },

  saveLayerSettings: function() {
    var isCollision = $('#layerIsCollision').prop('checked');

    var newName = $('#layerName').val();
    var newWidth = Math.floor($('#layerWidth').val());
    var newHeight = Math.floor($('#layerHeight').val());

    if (newWidth != this.activeLayer.width || newHeight != this.activeLayer.height) {
      this.activeLayer.resize(newWidth, newHeight);
    }
    this.activeLayer.tilesize = Math.floor($('#layerTilesize').val());

    if (isCollision) {
      newName = 'collision';
      this.activeLayer.linkWithCollision = false;
      this.activeLayer.distance = 1;
      this.activeLayer.repeat = false;
      this.activeLayer.setCollisionTileset();
    } else {
      var newTilesetName = $('#layerTileset').val();
      if (newTilesetName != this.activeLayer.tilesetName) {
        this.activeLayer.setTileset(newTilesetName);
      }
      this.activeLayer.linkWithCollision = $('#layerLinkWithCollision').prop('checked');
      this.activeLayer.distance = parseFloat($('#layerDistance').val());
      this.activeLayer.repeat = $('#layerRepeat').prop('checked');
      this.activeLayer.preRender = $('#layerPreRender').prop('checked');
    }

    if (newName == 'collision') {
      this.collisionLayer = this.activeLayer;
    } else if (this.activeLayer.name == 'collision') {
      this.collisionLayer = null;
    }

    this.activeLayer.setName(newName);
    this.setModified();
    this.draw();
  },

  setActiveLayer: function(name) {
    var previousLayer = this.activeLayer;
    this.activeLayer = name == 'entities' ? this.entities : this.getLayerWithName(name);
    if (previousLayer == this.activeLayer) {
      return;
    }

    if (previousLayer) {
      previousLayer.setActive(false);
    }
    this.activeLayer.setActive(true);
    this.mode = this.MODE.DEFAULT;

    $('#layerIsCollision').prop('checked', name == 'collision');

    if (name == 'entities') {
      $('#layerSettings').fadeOut(100);
    } else {
      this.entities.selectEntity(null);
      this.toggleCollisionLayer();
      $('#layerSettings').fadeOut(100, this.updateLayerSettings.bind(this)).fadeIn(100);
    }
    this.draw();
  },

  toggleCollisionLayer: function() {
    var isCollision = $('#layerIsCollision').prop('checked');
    $('#layerLinkWithCollision,#layerDistance,#layerPreRender,#layerRepeat,#layerName,#layerTileset')
      .attr('disabled', isCollision);
  },

  mousemove: function() {
    if (!this.activeLayer) {
      return;
    }

    if (this.mode == this.MODE.DEFAULT) {
      if (ig.input.state('drag')) {
        this.drag();
      } else if (ig.input.state('draw')) {
        if (this.activeLayer == this.entities) {
          var entityX = ig.input.mouse.x + this.screen.x;
          var entityY = ig.input.mouse.y + this.screen.y;
          this.entities.dragOnSelectedEntity(entityX, entityY);
          this.setModified();
        } else if (!this.activeLayer.isSelecting) {
          this.setTileOnCurrentLayer();
        }
      } else if (this.activeLayer == this.entities) {
        var mouseX = ig.input.mouse.x + this.screen.x;
        var mouseY = ig.input.mouse.y + this.screen.y;
        this.entities.mousemove(mouseX, mouseY);
      }
    }

    this.mouseLast = { x: ig.input.mouse.x, y: ig.input.mouse.y };
    this.draw();
  },

  keydown: function(action) {
    if (!this.activeLayer) {
      return;
    }

    if (action == 'draw') {
      if (this.mode == this.MODE.DEFAULT) {
        if (this.activeLayer == this.entities) {
          var entityX = ig.input.mouse.x + this.screen.x;
          var entityY = ig.input.mouse.y + this.screen.y;
          var entity = this.entities.selectEntityAt(entityX, entityY);
          if (entity) {
            this.undo.beginEntityEdit(entity);
          }
        } else if (ig.input.state('select')) {
          this.activeLayer.beginSelecting(ig.input.mouse.x, ig.input.mouse.y);
        } else {
          this.undo.beginMapDraw();
          this.activeLayer.beginEditing();
          if (
            this.activeLayer.linkWithCollision &&
            this.collisionLayer &&
            this.collisionLayer != this.activeLayer
          ) {
            this.collisionLayer.beginEditing();
          }
          this.setTileOnCurrentLayer();
        }
      } else if (this.mode == this.MODE.TILESELECT && ig.input.state('select')) {
        this.activeLayer.tileSelect.beginSelecting(ig.input.mouse.x, ig.input.mouse.y);
      }
    }

    this.draw();
  },

  keyup: function(action) {
    if (!this.activeLayer) {
      return;
    }

    if (action == 'delete') {
      this.entities.deleteSelectedEntity();
      this.setModified();
    } else if (action == 'clone') {
      this.entities.cloneSelectedEntity();
      this.setModified();
    } else if (action == 'grid') {
      config.view.grid = !config.view.grid;
    } else if (action == 'menu') {
      if (this.mode != this.MODE.TILESELECT && this.mode != this.MODE.ENTITYSELECT) {
        if (this.activeLayer == this.entities) {
          this.mode = this.MODE.ENTITYSELECT;
          this.entities.showMenu(ig.input.mouse.x, ig.input.mouse.y);
        } else {
          this.mode = this.MODE.TILESELECT;
          this.activeLayer.tileSelect.setPosition(ig.input.mouse.x, ig.input.mouse.y);
        }
      } else {
        this.mode = this.MODE.DEFAULT;
        this.entities.hideMenu();
      }
    } else if (action == 'zoomin') {
      this.zoom(1);
    } else if (action == 'zoomout') {
      this.zoom(-1);
    }

    if (action == 'draw') {
      if (this.mode == this.MODE.TILESELECT) {
        this.activeLayer.brush = this.activeLayer.tileSelect.endSelecting(
          ig.input.mouse.x,
          ig.input.mouse.y
        );
        this.mode = this.MODE.DEFAULT;
      } else if (this.activeLayer == this.entities) {
        this.undo.endEntityEdit();
      } else if (this.activeLayer.isSelecting) {
        this.activeLayer.brush = this.activeLayer.endSelecting(
          ig.input.mouse.x,
          ig.input.mouse.y
        );
      } else {
        this.undo.endMapDraw();
      }
    }

    if (action == 'undo') {
      this.undo.undo();
    }

    if (action == 'redo') {
      this.undo.redo();
    }

    this.draw();
    this.mouseLast = { x: ig.input.mouse.x, y: ig.input.mouse.y };
  },

  setTileOnCurrentLayer: function() {
    if (!this.activeLayer || !this.activeLayer.scroll) {
      return;
    }

    var cursorOffset = this.activeLayer.getCursorOffset();
    var x = ig.input.mouse.x + this.activeLayer.scroll.x - cursorOffset.x;
    var y = ig.input.mouse.y + this.activeLayer.scroll.y - cursorOffset.y;

    var brush = this.activeLayer.brush;
    for (var by = 0; by < brush.length; by++) {
      var brushRow = brush[by];
      for (var bx = 0; bx < brushRow.length; bx++) {
        var mapx = x + bx * this.activeLayer.tilesize;
        var mapy = y + by * this.activeLayer.tilesize;

        var newTile = brushRow[bx];
        var oldTile = this.activeLayer.getOldTile(mapx, mapy);

        this.activeLayer.setTile(mapx, mapy, newTile);
        this.undo.pushMapDraw(this.activeLayer, mapx, mapy, oldTile, newTile);

        if (
          this.activeLayer.linkWithCollision &&
          this.collisionLayer &&
          this.collisionLayer != this.activeLayer
        ) {
          var collisionLayerTile = newTile > 0 ? this.collisionSolid : 0;

          var oldCollisionTile = this.collisionLayer.getOldTile(mapx, mapy);
          this.collisionLayer.setTile(mapx, mapy, collisionLayerTile);
          this.undo.pushMapDraw(
            this.collisionLayer,
            mapx,
            mapy,
            oldCollisionTile,
            collisionLayerTile
          );
        }
      }
    }

    this.setModified();
  },

  draw: function() {
    this.needsDraw = true;
  },

  drawIfNeeded: function() {
    if (!this.needsDraw) {
      return;
    }
    this.needsDraw = false;

    ig.system.clear(config.colors.clear);

    var entitiesDrawn = false;
    for (var i = 0; i < this.layers.length; i++) {
      var layer = this.layers[i];

      if (!entitiesDrawn && layer.foreground) {
        entitiesDrawn = true;
        this.entities.draw();
      }
      layer.draw();
    }

    if (!entitiesDrawn) {
      this.entities.draw();
    }

    if (this.activeLayer) {
      if (this.mode == this.MODE.TILESELECT) {
        this.activeLayer.tileSelect.draw();
        this.activeLayer.tileSelect.drawCursor(ig.input.mouse.x, ig.input.mouse.y);
      }

      if (this.mode == this.MODE.DEFAULT) {
        this.activeLayer.drawCursor(ig.input.mouse.x, ig.input.mouse.y);
      }
    }

    if (config.labels.draw) {
      this.drawLabels(config.labels.step);
    }
  },

  drawLabels: function(step) {
    ig.system.context.fillStyle = config.colors.primary;
    var xlabel = this.screen.x - this.screen.x % step - step;
    for (var tx = Math.floor(-this.screen.x % step); tx < ig.system.width; tx += step) {
      xlabel += step;
      ig.system.context.fillText(xlabel, tx * ig.system.scale, 0);
    }

    var ylabel = this.screen.y - this.screen.y % step - step;
    for (var ty = Math.floor(-this.screen.y % step); ty < ig.system.height; ty += step) {
      ylabel += step;
      ig.system.context.fillText(ylabel, 0, ty * ig.system.scale);
    }
  },

  getEntityByName: function(name) {
    return this.entities.getEntityByName(name);
  }
}));

wm.Weltmeister.getMaxWidth = function() {
  return $(window).width();
};

wm.Weltmeister.getMaxHeight = function() {
  return $(window).height() - $('#headerMenu').height();
};

ig.Image.inject({
  resize: function(scale) {
    if (!this.loaded) {
      return;
    }
    if (!this.scaleCache) {
      this.scaleCache = {};
    }
    if (this.scaleCache['x' + scale]) {
      this.data = this.scaleCache['x' + scale];
      return;
    }

    this.origData = this.data = this.origData || this.data;

    if (scale > 1) {
      this.parent(scale);
    } else {
      var scaled = ig.$new('canvas');
      scaled.width = Math.ceil(this.width * scale);
      scaled.height = Math.ceil(this.height * scale);
      var scaledContext = scaled.getContext('2d');
      scaledContext.drawImage(
        this.data,
        0,
        0,
        this.width,
        this.height,
        0,
        0,
        scaled.width,
        scaled.height
      );
      this.data = scaled;
    }

    this.scaleCache['x' + scale] = this.data;
  }
});

const Loader = (wm.Loader = ig.Loader.extend({
  end: function() {
    if (this.done) {
      return;
    }

    clearInterval(this._intervalId);
    this.done = true;
    ig.system.clear(config.colors.clear);
    ig.game = new (this.gameClass)();
  },

  loadResource: function(res) {
    if (res instanceof ig.Sound) {
      this._unloaded.erase(res.path);
    } else {
      this.parent(res);
    }
  }
}));

const bootWeltmeister = async () => {
  await loadConfiguredPlugins();

  ig.system = new ig.System(
    '#canvas',
    1,
    Math.floor(wm.Weltmeister.getMaxWidth() / config.view.zoom),
    Math.floor(wm.Weltmeister.getMaxHeight() / config.view.zoom),
    config.view.zoom
  );

  ig.input = new wm.EventedInput();
  ig.soundManager = new ig.SoundManager();
  ig.ready = true;

  var loader = new wm.Loader(wm.Weltmeister, ig.resources);
  loader.load();
};

export { Loader, Weltmeister, bootWeltmeister };
export default Weltmeister;
