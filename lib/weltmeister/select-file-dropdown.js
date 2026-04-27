import ig from '../impact/impact.js';
import wm from './wm.js';
import { hide, positionBelow, resolveElement, show } from './dom-helpers.js';
import { requestJson } from './request.js';

const SelectFileDropdown = (wm.SelectFileDropdown = ig.Class.extend({
  input: null,
  boundShow: null,
  boundHide: null,
  bindHideTimer: null,
  div: null,
  fileListUrl: '',
  filetype: '',
  loadSequence: 0,

  init: function(elementId, fileListUrl, filetype) {
    this.filetype = filetype || '';
    this.fileListUrl = fileListUrl;
    this.input = resolveElement(elementId);
    this.boundHide = this.hide.bind(this);
    this.boundShow = this.show.bind(this);
    this.input.addEventListener('focus', this.boundShow);

    this.div = document.createElement('div');
    this.div.className = 'selectFileDialog';
    this.input.after(this.div);
    this.div.addEventListener('mousedown', this.noHide.bind(this));

    void this.loadDir('');
  },

  loadDir: async function(dir) {
    var sequence = ++this.loadSequence;
    var requestPath =
      this.fileListUrl +
      '?dir=' +
      encodeURIComponent(dir || '') +
      '&type=' +
      this.filetype;

    try {
      var data = await requestJson(requestPath);
      if (sequence == this.loadSequence) {
        this.showFiles(data);
      }
    } catch (error) {
      console.error('Failed to browse files for Weltmeister', error);
    }
  },

  selectDir: function(event) {
    event.preventDefault();
    void this.loadDir(event.currentTarget.getAttribute('href'));
  },

  selectFile: function(event) {
    event.preventDefault();
    this.input.value = event.currentTarget.getAttribute('href');
    this.input.blur();
    this.hide();
  },

  showFiles: function(data) {
    this.div.replaceChildren();
    if (data.parent !== false) {
      var parentDir = this.createFileLink('dir', data.parent, '...parent directory');
      parentDir.addEventListener('click', this.selectDir.bind(this));
      this.div.append(parentDir);
    }
    for (var i = 0; i < data.dirs.length; i++) {
      var dirName = data.dirs[i].match(/[^\/]*$/)[0] + '/';
      var dir = this.createFileLink('dir', data.dirs[i], dirName);
      dir.title = dirName;
      dir.addEventListener('click', this.selectDir.bind(this));
      this.div.append(dir);
    }
    for (var fileIndex = 0; fileIndex < data.files.length; fileIndex++) {
      var fileName = data.files[fileIndex].match(/[^\/]*$/)[0];
      var file = this.createFileLink('file', data.files[fileIndex], fileName);
      file.title = fileName;
      file.addEventListener('click', this.selectFile.bind(this));
      this.div.append(file);
    }
  },

  createFileLink: function(className, href, text) {
    var link = document.createElement('a');
    link.className = className;
    link.href = href;
    link.textContent = text;
    return link;
  },

  noHide: function(event) {
    event.stopPropagation();
  },

  show: function() {
    positionBelow(this.input, this.div);
    show(this.div);
    clearTimeout(this.bindHideTimer);
    this.bindHideTimer = setTimeout(() => {
      document.addEventListener('mousedown', this.boundHide);
    }, 0);
  },

  hide: function() {
    clearTimeout(this.bindHideTimer);
    document.removeEventListener('mousedown', this.boundHide);
    hide(this.div);
  }
}));

export { SelectFileDropdown };
export default SelectFileDropdown;
