import ig from '../impact/impact.js';
import wm, { getJQuery } from './wm.js';
import config from './config.js';
import './select-file-dropdown.js';

const $ = getJQuery();

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

    this.background = $('<div/>', { class: 'modalDialogBackground' });
    this.dialogBox = $('<div/>', { class: 'modalDialogBox' });
    this.background.append(this.dialogBox);
    $('body').append(this.background);

    this.initDialog();
  },

  initDialog: function() {
    this.buttonDiv = $('<div/>', { class: 'modalDialogButtons' });
    var okButton = $('<input/>', { type: 'button', class: 'button', value: this.okText });
    var cancelButton = $('<input/>', {
      type: 'button',
      class: 'button',
      value: this.cancelText
    });

    okButton.bind('click', this.clickOk.bind(this));
    cancelButton.bind('click', this.clickCancel.bind(this));

    this.buttonDiv.append(okButton).append(cancelButton);

    this.dialogBox.html('<div class="modalDialogText">' + this.text + '</div>');
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
    this.background.fadeIn(100);
  },

  close: function() {
    this.background.fadeOut(100);
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
    this.pathInput.val(filePath);
    void this.pathDropdown.loadDir(dir);
  },

  initDialog: function() {
    this.parent();
    this.pathInput = $('<input/>', { type: 'text', class: 'modalDialogPath' });
    this.buttonDiv.before(this.pathInput);
    this.pathDropdown = new wm.SelectFileDropdown(this.pathInput, config.api.browse, this.fileType);
  },

  clickOk: function() {
    if (this.onOk) {
      this.onOk(this, this.pathInput.val());
    }
    this.close();
  }
}));

export { ModalDialog, ModalDialogPathSelect };
export default ModalDialog;
