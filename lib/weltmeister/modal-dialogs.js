import ig from '../impact/impact.js';
import wm from './wm.js';
import config from './config.js';
import { fadeIn, fadeOut } from './dom-helpers.js';
import './select-file-dropdown.js';

const ModalDialog = (wm.ModalDialog = ig.Class.extend({
  onOk: null,
  onCancel: null,

  text: '',
  okText: '',
  cancelText: '',

  background: null,
  dialogBox: null,
  buttonDiv: null,

  init: function(text, okText, cancelText) {
    this.text = text;
    this.okText = okText || 'OK';
    this.cancelText = cancelText || 'Cancel';

    this.background = document.createElement('div');
    this.background.className = 'modalDialogBackground';
    this.dialogBox = document.createElement('div');
    this.dialogBox.className = 'modalDialogBox';
    this.background.append(this.dialogBox);
    document.body.append(this.background);

    this.initDialog();
  },

  initDialog: function() {
    this.buttonDiv = document.createElement('div');
    this.buttonDiv.className = 'modalDialogButtons';
    var okButton = document.createElement('input');
    okButton.type = 'button';
    okButton.className = 'button';
    okButton.value = this.okText;
    var cancelButton = document.createElement('input');
    cancelButton.type = 'button';
    cancelButton.className = 'button';
    cancelButton.value = this.cancelText;

    okButton.addEventListener('click', this.clickOk.bind(this));
    cancelButton.addEventListener('click', this.clickCancel.bind(this));

    this.buttonDiv.append(okButton, cancelButton);

    var text = document.createElement('div');
    text.className = 'modalDialogText';
    text.textContent = this.text;
    this.dialogBox.replaceChildren(text);
    this.dialogBox.append(this.buttonDiv);
  },

  clickOk: function() {
    if (this.onOk) {
      this.onOk(this);
    }
    this.close();
  },

  clickCancel: function() {
    if (this.onCancel) {
      this.onCancel(this);
    }
    this.close();
  },

  open: function() {
    fadeIn(this.background, 100);
  },

  close: function() {
    fadeOut(this.background, 100);
  }
}));

const ModalDialogPathSelect = (wm.ModalDialogPathSelect = ModalDialog.extend({
  pathDropdown: null,
  pathInput: null,
  fileType: '',

  init: function(text, okText, type) {
    this.fileType = type || '';
    this.parent(text, okText || 'Select');
  },

  setPath: function(filePath) {
    var dir = filePath.replace(/\/[^\/]*$/, '');
    this.pathInput.value = filePath;
    void this.pathDropdown.loadDir(dir);
  },

  initDialog: function() {
    this.parent();
    this.pathInput = document.createElement('input');
    this.pathInput.type = 'text';
    this.pathInput.className = 'modalDialogPath';
    this.buttonDiv.before(this.pathInput);
    this.pathDropdown = new wm.SelectFileDropdown(this.pathInput, config.api.browse, this.fileType);
  },

  clickOk: function() {
    if (this.onOk) {
      this.onOk(this, this.pathInput.value);
    }
    this.close();
  }
}));

export { ModalDialog, ModalDialogPathSelect };
export default ModalDialog;
