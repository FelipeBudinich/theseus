import ig from '../impact/impact.js';
import wm from './wm.js';
import config from './config.js';
import { fadeOut, fadeSwap, hide, qs, show } from './dom-helpers.js';

const EditEntities = (wm.EditEntities = ig.Class.extend({
  visible: true,
  active: true,

  div: null,
  hotkey: -1,
  ignoreLastClick: false,
  name: 'entities',

  entities: [],
  namedEntities: {},
  selectedEntity: null,
  entityClasses: {},
  menu: null,
  selector: { size: { x: 2, y: 2 }, pos: { x: 0, y: 0 }, offset: { x: 0, y: 0 } },
  wasSelectedOnScaleBorder: false,
  gridSize: config.entityGrid,
  entityDefinitions: null,

  init: function(div) {
    this.div = div;
    div.addEventListener('mouseup', this.click.bind(this));
    this.div
      .querySelector('.visible')
      .addEventListener('mousedown', this.toggleVisibilityClick.bind(this));

    this.menu = qs('#entityMenu');
    this.importEntityClass(wm.entityModules);
    this.entityDefinitions = qs('#entityDefinitions');
    this.entityDefinitions.addEventListener('mouseup', this.selectEntitySetting.bind(this));

    qs('#entityKey').addEventListener('keydown', function(ev) {
      if (ev.key == 'Enter' || ev.which == 13) {
        qs('#entityValue').focus();
        ev.preventDefault();
      }
    });
    qs('#entityValue').addEventListener('keydown', this.setEntitySetting.bind(this));
  },

  clear: function() {
    this.entities = [];
    this.selectEntity(null);
  },

  sort: function() {
    this.entities.sort(ig.Game.SORT.Z_INDEX);
  },

  fileNameToClassName: function(name) {
    var typeName = '-' + name.replace(/^.*\/|\.js/g, '');
    typeName = typeName.replace(/-(\w)/g, function(match, character) {
      return character.toUpperCase();
    });
    return 'Entity' + typeName;
  },

  importEntityClass: function(modules) {
    var unloadedClasses = [];
    this.menu.replaceChildren();
    this.entityClasses = {};

    for (var moduleId in modules) {
      var className = this.fileNameToClassName(modules[moduleId]);
      var entityName = className.replace(/^Entity/, '');
      var entityClass = ig.getClass(className);

      if (className && entityClass) {
        if (!entityClass.prototype._wmIgnore) {
          var entityLink = document.createElement('div');
          entityLink.id = className;
          entityLink.textContent = entityName;
          entityLink.addEventListener('mouseup', this.newEntityClick.bind(this));
          this.menu.append(entityLink);
          this.entityClasses[className] = moduleId;
        }
      } else {
        unloadedClasses.push(modules[moduleId] + ' (expected name: ' + className + ')');
      }
    }

    if (unloadedClasses.length > 0) {
      var warning =
        'The following entity classes were not loaded due to\n' +
        'file and class name mismatches: \n\n' +
        unloadedClasses.join('\n');
      alert(warning);
    }
  },

  getEntityByName: function(name) {
    return this.namedEntities[name];
  },

  getSaveData: function() {
    var entities = [];
    for (var i = 0; i < this.entities.length; i++) {
      var entity = this.entities[i];
      var type = entity._wmClassName;
      var data = { type: type, x: entity.pos.x, y: entity.pos.y };

      var hasSettings = false;
      for (var property in entity._wmSettings) {
        hasSettings = true;
      }
      if (hasSettings) {
        data.settings = entity._wmSettings;
      }

      entities.push(data);
    }
    return entities;
  },

  selectEntityAt: function(x, y) {
    this.selector.pos = { x: x, y: y };

    var possibleSelections = [];
    for (var i = 0; i < this.entities.length; i++) {
      if (this.entities[i].touches(this.selector)) {
        possibleSelections.push(this.entities[i]);
      }
    }

    if (!possibleSelections.length) {
      this.selectEntity(null);
      return false;
    }

    var selectedIndex = possibleSelections.indexOf(this.selectedEntity);
    var nextSelection = (selectedIndex + 1) % possibleSelections.length;
    var entity = possibleSelections[nextSelection];

    this.selector.offset = {
      x: x - entity.pos.x + entity.offset.x,
      y: y - entity.pos.y + entity.offset.y
    };
    this.selectEntity(entity);
    this.wasSelectedOnScaleBorder = this.isOnScaleBorder(entity, this.selector);
    return entity;
  },

  selectEntity: function(entity) {
    var entitySettings = qs('#entitySettings');
    if (entity && entity != this.selectedEntity) {
      this.selectedEntity = entity;
      fadeSwap(entitySettings, this.loadEntitySettings.bind(this), 100);
    } else if (!entity) {
      fadeOut(entitySettings, 100);
      qs('#entityKey').blur();
      qs('#entityValue').blur();
    }

    this.selectedEntity = entity;
    qs('#entityKey').value = '';
    qs('#entityValue').value = '';
  },

  deleteSelectedEntity: function() {
    if (!this.selectedEntity) {
      return false;
    }

    ig.game.undo.commitEntityDelete(this.selectedEntity);

    this.removeEntity(this.selectedEntity);
    this.selectEntity(null);
    return true;
  },

  removeEntity: function(entity) {
    if (entity.name) {
      delete this.namedEntities[entity.name];
    }
    this.entities.erase(entity);
  },

  cloneSelectedEntity: function() {
    if (!this.selectedEntity) {
      return false;
    }

    var className = this.selectedEntity._wmClassName;
    var settings = ig.copy(this.selectedEntity._wmSettings);
    if (settings.name) {
      settings.name = settings.name + '_clone';
    }
    var x = this.selectedEntity.pos.x + this.gridSize;
    var y = this.selectedEntity.pos.y;
    var newEntity = this.spawnEntity(className, x, y, settings);
    newEntity._wmSettings = settings;
    this.selectEntity(newEntity);

    ig.game.undo.commitEntityCreate(newEntity);

    return true;
  },

  dragOnSelectedEntity: function(x, y) {
    if (!this.selectedEntity) {
      return false;
    }

    if (this.selectedEntity._wmScalable && this.wasSelectedOnScaleBorder) {
      this.scaleSelectedEntity(x, y);
    } else {
      this.moveSelectedEntity(x, y);
    }

    ig.game.undo.pushEntityEdit(this.selectedEntity);
    return true;
  },

  moveSelectedEntity: function(x, y) {
    x =
      Math.round((x - this.selector.offset.x) / this.gridSize) * this.gridSize +
      this.selectedEntity.offset.x;
    y =
      Math.round((y - this.selector.offset.y) / this.gridSize) * this.gridSize +
      this.selectedEntity.offset.y;

    if (this.selectedEntity.pos.x != x || this.selectedEntity.pos.y != y) {
      qs('#entityDefinitionPosX').textContent = x;
      qs('#entityDefinitionPosY').textContent = y;

      this.selectedEntity.pos.x = x;
      this.selectedEntity.pos.y = y;
    }
  },

  scaleSelectedEntity: function(x, y) {
    var scale = this.wasSelectedOnScaleBorder;

    if (!this.selectedEntity._wmSettings.size) {
      this.selectedEntity._wmSettings.size = {};
    }

    if (scale == 'n') {
      var northHeight =
        this.selectedEntity.pos.y - Math.round(y / this.gridSize) * this.gridSize;
      if (this.selectedEntity.size.y + northHeight <= this.gridSize) {
        northHeight = (this.selectedEntity.size.y - this.gridSize) * -1;
      }
      this.selectedEntity.size.y += northHeight;
      this.selectedEntity.pos.y -= northHeight;
    } else if (scale == 's') {
      var southHeight =
        Math.round(y / this.gridSize) * this.gridSize - this.selectedEntity.pos.y;
      this.selectedEntity.size.y = Math.max(this.gridSize, southHeight);
    } else if (scale == 'e') {
      var eastWidth =
        Math.round(x / this.gridSize) * this.gridSize - this.selectedEntity.pos.x;
      this.selectedEntity.size.x = Math.max(this.gridSize, eastWidth);
    } else if (scale == 'w') {
      var westWidth =
        this.selectedEntity.pos.x - Math.round(x / this.gridSize) * this.gridSize;
      if (this.selectedEntity.size.x + westWidth <= this.gridSize) {
        westWidth = (this.selectedEntity.size.x - this.gridSize) * -1;
      }
      this.selectedEntity.size.x += westWidth;
      this.selectedEntity.pos.x -= westWidth;
    }
    this.selectedEntity._wmSettings.size.x = this.selectedEntity.size.x;
    this.selectedEntity._wmSettings.size.y = this.selectedEntity.size.y;

    this.loadEntitySettings();
  },

  newEntityClick: function(ev) {
    this.hideMenu();
    var newEntity = this.spawnEntity(ev.target.id, 0, 0, {});
    this.selectEntity(newEntity);
    this.selector.offset.x = this.selector.offset.y = 0;
    this.moveSelectedEntity(this.selector.pos.x, this.selector.pos.y);
    ig.editor.setModified();

    ig.game.undo.commitEntityCreate(newEntity);
  },

  spawnEntity: function(className, x, y, settings) {
    settings = settings || {};
    var entityClass = ig.getClass(className);
    if (entityClass) {
      var newEntity = new (entityClass)(x, y, settings);
      newEntity._wmInEditor = true;
      newEntity._wmClassName = className;
      newEntity._wmSettings = {};
      for (var setting in settings) {
        newEntity._wmSettings[setting] = settings[setting];
      }
      this.entities.push(newEntity);
      if (settings.name) {
        this.namedEntities[settings.name] = newEntity;
      }
      this.sort();
      return newEntity;
    }
    return null;
  },

  isOnScaleBorder: function(entity, selector) {
    var border = 2;
    var width = selector.pos.x - entity.pos.x;
    var height = selector.pos.y - entity.pos.y;

    if (width < border) {
      return 'w';
    }
    if (width > entity.size.x - border) {
      return 'e';
    }
    if (height < border) {
      return 'n';
    }
    if (height > entity.size.y - border) {
      return 's';
    }

    return false;
  },

  loadEntitySettings: function() {
    if (!this.selectedEntity) {
      return;
    }
    var definitions = [
      this.createEntityDefinition('x', this.selectedEntity.pos.x, 'entityDefinitionPosX'),
      this.createEntityDefinition('y', this.selectedEntity.pos.y, 'entityDefinitionPosY')
    ];

    definitions = definitions.concat(
      this.loadEntitySettingsRecursive(this.selectedEntity._wmSettings)
    );
    this.entityDefinitions.replaceChildren.apply(this.entityDefinitions, definitions);

    var className = this.selectedEntity._wmClassName.replace(/^Entity/, '');
    qs('#entityClass').textContent = className;
  },

  loadEntitySettingsRecursive: function(settings, path) {
    path = path || '';
    var definitions = [];
    for (var key in settings) {
      var value = settings[key];
      if (value && typeof value == 'object') {
        definitions = definitions.concat(
          this.loadEntitySettingsRecursive(value, path + key + '.')
        );
      } else {
        definitions.push(this.createEntityDefinition(path + key, value));
      }
    }

    return definitions;
  },

  createEntityDefinition: function(key, value, valueId) {
    var definition = document.createElement('div');
    definition.className = 'entityDefinition';

    var keySpan = document.createElement('span');
    keySpan.className = 'key';
    keySpan.textContent = key;

    var valueSpan = document.createElement('span');
    valueSpan.className = 'value';
    if (valueId) {
      valueSpan.id = valueId;
    }
    valueSpan.textContent = value;

    definition.append(keySpan, ':', valueSpan);
    return definition;
  },

  setEntitySetting: function(ev) {
    if (ev.key != 'Enter' && ev.which != 13) {
      return true;
    }
    ev.preventDefault();
    var key = qs('#entityKey').value;
    var value = qs('#entityValue').value;
    var floatVal = parseFloat(value);
    if (value == floatVal) {
      value = floatVal;
    }

    if (key == 'name') {
      if (this.selectedEntity.name) {
        delete this.namedEntities[this.selectedEntity.name];
      }
      this.namedEntities[value] = this.selectedEntity;
    }

    if (key == 'x') {
      this.selectedEntity.pos.x = Math.round(value);
    } else if (key == 'y') {
      this.selectedEntity.pos.y = Math.round(value);
    } else {
      this.writeSettingAtPath(this.selectedEntity._wmSettings, key, value);
      ig.merge(this.selectedEntity, this.selectedEntity._wmSettings);
    }

    this.sort();

    ig.game.setModified();
    ig.game.draw();

    qs('#entityKey').value = '';
    qs('#entityValue').value = '';
    qs('#entityValue').blur();
    this.loadEntitySettings();

    qs('#entityKey').focus();
    return false;
  },

  writeSettingAtPath: function(root, settingPath, value) {
    settingPath = settingPath.split('.');
    var current = root;
    for (var i = 0; i < settingPath.length; i++) {
      var name = settingPath[i];
      if (i < settingPath.length - 1 && typeof current[name] != 'object') {
        current[name] = {};
      }

      if (i == settingPath.length - 1) {
        current[name] = value;
      }
      current = current[name];
    }

    this.trimObject(root);
  },

  trimObject: function(obj) {
    var isEmpty = true;
    for (var key in obj) {
      if (
        obj[key] === '' ||
        (typeof obj[key] == 'object' && this.trimObject(obj[key]))
      ) {
        delete obj[key];
      }

      if (typeof obj[key] != 'undefined') {
        isEmpty = false;
      }
    }

    return isEmpty;
  },

  selectEntitySetting: function(event) {
    var row = event.target.closest('.entityDefinition');
    if (!row || !this.entityDefinitions.contains(row)) {
      return;
    }

    qs('#entityKey').value = row.querySelector('.key').textContent;
    qs('#entityValue').value = row.querySelector('.value').textContent;
    qs('#entityValue').select();
  },

  setHotkey: function(hotkey) {
    this.hotkey = hotkey;
    this.div.title = 'Select Layer (' + this.hotkey + ')';
  },

  showMenu: function(x, y) {
    this.selector.pos = {
      x: Math.round((x + ig.editor.screen.x) / this.gridSize) * this.gridSize,
      y: Math.round((y + ig.editor.screen.y) / this.gridSize) * this.gridSize
    };
    this.menu.style.top = y * ig.system.scale + 2 + 'px';
    this.menu.style.left = x * ig.system.scale + 2 + 'px';
    show(this.menu);
  },

  hideMenu: function() {
    ig.editor.mode = ig.editor.MODE.DEFAULT;
    hide(this.menu);
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
    this.visible ^= 1;
    var visibleToggle = this.div.querySelector('.visible');
    if (this.visible) {
      visibleToggle.classList.add('checkedVis');
    } else {
      visibleToggle.classList.remove('checkedVis');
    }
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
    ig.editor.setActiveLayer('entities');
  },

  mousemove: function(x, y) {
    this.selector.pos = { x: x, y: y };

    if (this.selectedEntity) {
      if (this.selectedEntity._wmScalable && this.selectedEntity.touches(this.selector)) {
        var scale = this.isOnScaleBorder(this.selectedEntity, this.selector);
        if (scale == 'n' || scale == 's') {
          document.body.style.cursor = 'ns-resize';
          return;
        }
        if (scale == 'e' || scale == 'w') {
          document.body.style.cursor = 'ew-resize';
          return;
        }
      }
    }

    document.body.style.cursor = 'default';
  },

  draw: function() {
    if (this.visible) {
      for (var i = 0; i < this.entities.length; i++) {
        this.drawEntity(this.entities[i]);
      }
    }
  },

  drawEntity: function(entity) {
    entity.draw();

    if (entity._wmDrawBox) {
      ig.system.context.fillStyle = entity._wmBoxColor || 'rgba(128, 128, 128, 0.9)';
      ig.system.context.fillRect(
        ig.system.getDrawPos(entity.pos.x - ig.game.screen.x),
        ig.system.getDrawPos(entity.pos.y - ig.game.screen.y),
        entity.size.x * ig.system.scale,
        entity.size.y * ig.system.scale
      );
    }

    if (config.labels.draw) {
      var className = entity._wmClassName.replace(/^Entity/, '');
      var description = className + (entity.name ? ': ' + entity.name : '');

      ig.system.context.fillStyle = 'rgba(0,0,0,0.4)';
      ig.system.context.fillText(
        description,
        ig.system.getDrawPos(entity.pos.x - ig.game.screen.x),
        ig.system.getDrawPos(entity.pos.y - ig.game.screen.y + 0.5)
      );

      ig.system.context.fillStyle = config.colors.primary;
      ig.system.context.fillText(
        description,
        ig.system.getDrawPos(entity.pos.x - ig.game.screen.x),
        ig.system.getDrawPos(entity.pos.y - ig.game.screen.y)
      );
    }

    if (typeof entity.target == 'object') {
      for (var target in entity.target) {
        this.drawLineToTarget(entity, entity.target[target]);
      }
    }
  },

  drawLineToTarget: function(entity, target) {
    target = ig.game.getEntityByName(target);
    if (!target) {
      return;
    }

    ig.system.context.strokeStyle = '#fff';
    ig.system.context.lineWidth = 1;

    ig.system.context.beginPath();
    ig.system.context.moveTo(
      ig.system.getDrawPos(entity.pos.x + entity.size.x / 2 - ig.game.screen.x),
      ig.system.getDrawPos(entity.pos.y + entity.size.y / 2 - ig.game.screen.y)
    );
    ig.system.context.lineTo(
      ig.system.getDrawPos(target.pos.x + target.size.x / 2 - ig.game.screen.x),
      ig.system.getDrawPos(target.pos.y + target.size.y / 2 - ig.game.screen.y)
    );
    ig.system.context.stroke();
    ig.system.context.closePath();
  },

  drawCursor: function() {
    if (this.selectedEntity) {
      ig.system.context.lineWidth = 1;
      ig.system.context.strokeStyle = config.colors.highlight;
      ig.system.context.strokeRect(
        ig.system.getDrawPos(this.selectedEntity.pos.x - ig.editor.screen.x) - 0.5,
        ig.system.getDrawPos(this.selectedEntity.pos.y - ig.editor.screen.y) - 0.5,
        this.selectedEntity.size.x * ig.system.scale + 1,
        this.selectedEntity.size.y * ig.system.scale + 1
      );
    }
  }
}));

export { EditEntities };
export default EditEntities;
