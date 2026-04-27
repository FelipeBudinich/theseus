const getLayerRows = (container) =>
  Array.from(container.querySelectorAll(':scope > .layer'));

const getLayerNames = (container) =>
  getLayerRows(container)
    .map((row) => row.querySelector('.name'))
    .filter(Boolean)
    .map((span) => span.textContent);

const computeLayerOrder = ({ names, entities, getLayerWithName }) => {
  var newLayers = [];
  var isForegroundLayer = true;

  names.forEach((name, index) => {
    var layer = name == 'entities'
      ? entities
      : getLayerWithName(name);

    if (!layer) {
      return;
    }

    layer.setHotkey(index + 1);

    if (layer.name == 'entities') {
      isForegroundLayer = false;
    } else {
      layer.foreground = isForegroundLayer;
      newLayers.unshift(layer);
    }
  });

  return newLayers;
};

class LayerSorter {
  constructor(container, { onUpdate } = {}) {
    this.container = container;
    this.onUpdate = onUpdate || function() {};
    this.draggedRow = null;
    this.startOrder = [];

    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);

    this.container.addEventListener('dragstart', this.handleDragStart);
    this.container.addEventListener('dragover', this.handleDragOver);
    this.container.addEventListener('drop', this.handleDrop);
    this.container.addEventListener('dragend', this.handleDragEnd);
    this.refresh();
  }

  refresh() {
    getLayerRows(this.container).forEach((row) => {
      row.draggable = true;
    });
  }

  destroy() {
    this.container.removeEventListener('dragstart', this.handleDragStart);
    this.container.removeEventListener('dragover', this.handleDragOver);
    this.container.removeEventListener('drop', this.handleDrop);
    this.container.removeEventListener('dragend', this.handleDragEnd);
  }

  getEventLayerRow(event) {
    if (!event.target || typeof event.target.closest !== 'function') {
      return null;
    }

    var row = event.target.closest('.layer');
    return row && this.container.contains(row) ? row : null;
  }

  handleDragStart(event) {
    var row = this.getEventLayerRow(event);
    if (!row || event.target.closest('.visible')) {
      event.preventDefault();
      return;
    }

    this.draggedRow = row;
    this.startOrder = getLayerNames(this.container);
    row.classList.add('layerDragging');

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', row.id || '');
    }
  }

  handleDragOver(event) {
    if (!this.draggedRow) {
      return;
    }

    event.preventDefault();
    var targetRow = this.getEventLayerRow(event);

    if (!targetRow || targetRow === this.draggedRow) {
      return;
    }

    var rect = targetRow.getBoundingClientRect();
    var insertAfter = event.clientY > rect.top + rect.height / 2;
    this.container.insertBefore(
      this.draggedRow,
      insertAfter ? targetRow.nextSibling : targetRow
    );
  }

  handleDrop(event) {
    if (!this.draggedRow) {
      return;
    }

    event.preventDefault();
    this.finishDrag();
  }

  handleDragEnd() {
    this.finishDrag();
  }

  finishDrag() {
    if (!this.draggedRow) {
      return;
    }

    this.draggedRow.classList.remove('layerDragging');
    this.refresh();

    var nextOrder = getLayerNames(this.container);
    var changed = nextOrder.join('\n') !== this.startOrder.join('\n');
    this.draggedRow = null;
    this.startOrder = [];

    if (changed) {
      this.onUpdate();
    }
  }
}

export { LayerSorter, computeLayerOrder, getLayerNames, getLayerRows };
