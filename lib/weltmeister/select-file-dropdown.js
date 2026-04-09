import ig from '../impact/impact.js';
import wm, { getJQuery } from './wm.js';

const $ = getJQuery();

const SelectFileDropdown = (wm.SelectFileDropdown = ig.Class.extend({
  input: null,
  boundShow: null,
  boundHide: null,
  div: null,
  fileListUrl: '',
  filetype: '',

  init: function(elementId, fileListUrl, filetype) {
    this.filetype = filetype || '';
    this.fileListUrl = fileListUrl;
    this.input = $(elementId);
    this.boundHide = this.hide.bind(this);
    this.input.bind('focus', this.show.bind(this));

    this.div = $('<div/>', { class: 'selectFileDialog' });
    this.input.after(this.div);
    this.div.bind('mousedown', this.noHide.bind(this));

    void this.loadDir('');
  },

  loadDir: async function(dir) {
    var requestPath =
      this.fileListUrl +
      '?dir=' +
      encodeURIComponent(dir || '') +
      '&type=' +
      this.filetype;

    try {
      var data = await $.ajax({
        url: requestPath,
        dataType: 'json'
      });
      this.showFiles(data);
    } catch (error) {
      console.error('Failed to browse files for Weltmeister', error);
    }
  },

  selectDir: function(event) {
    void this.loadDir($(event.target).attr('href'));
    return false;
  },

  selectFile: function(event) {
    this.input.val($(event.target).attr('href'));
    this.input.blur();
    this.hide();
    return false;
  },

  showFiles: function(data) {
    this.div.empty();
    if (data.parent !== false) {
      var parentDir = $('<a/>', {
        class: 'dir',
        href: data.parent,
        html: '&hellip;parent directory'
      });
      parentDir.bind('click', this.selectDir.bind(this));
      this.div.append(parentDir);
    }
    for (var i = 0; i < data.dirs.length; i++) {
      var dirName = data.dirs[i].match(/[^\/]*$/)[0] + '/';
      var dir = $('<a/>', {
        class: 'dir',
        href: data.dirs[i],
        html: dirName,
        title: dirName
      });
      dir.bind('click', this.selectDir.bind(this));
      this.div.append(dir);
    }
    for (var fileIndex = 0; fileIndex < data.files.length; fileIndex++) {
      var fileName = data.files[fileIndex].match(/[^\/]*$/)[0];
      var file = $('<a/>', {
        class: 'file',
        href: data.files[fileIndex],
        html: fileName,
        title: fileName
      });
      file.bind('click', this.selectFile.bind(this));
      this.div.append(file);
    }
  },

  noHide: function(event) {
    event.stopPropagation();
  },

  show: function() {
    var inputPos = this.input.position();
    var inputHeight =
      parseInt(this.input.innerHeight(), 10) + parseInt(this.input.css('margin-top'), 10);
    var inputWidth = this.input.innerWidth();
    $(document).bind('mousedown', this.boundHide);
    this.div.css({
      top: inputPos.top + inputHeight + 1,
      left: inputPos.left,
      width: inputWidth
    }).slideDown(100);
  },

  hide: function() {
    $(document).unbind('mousedown', this.boundHide);
    this.div.slideUp(100);
  }
}));

export { SelectFileDropdown };
export default SelectFileDropdown;
