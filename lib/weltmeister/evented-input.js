import ig from '../impact/impact.js';
import wm from './wm.js';

const EventedInput = (wm.EventedInput = ig.Input.extend({
  mousemoveCallback: null,
  keyupCallback: null,
  keydownCallback: null,

  delayedKeyup: { push() {}, length: 0 },

  keydown: function(event) {
    var tag = event.target.tagName;
    if (tag == 'INPUT' || tag == 'TEXTAREA') {
      return;
    }

    var code = event.type == 'keydown'
      ? event.code
      : this.mouseInputCode(event);
    var action = this.bindings[code];
    if (action) {
      if (!this.actions[action]) {
        this.actions[action] = true;
        if (this.keydownCallback) {
          this.keydownCallback(action);
        }
      }
      event.stopPropagation();
      event.preventDefault();
    }
  },

  keyup: function(event) {
    var tag = event.target.tagName;
    if (tag == 'INPUT' || tag == 'TEXTAREA') {
      return;
    }

    var code = event.type == 'keyup'
      ? event.code
      : this.mouseInputCode(event);
    var action = this.bindings[code];
    if (action) {
      this.actions[action] = false;
      if (this.keyupCallback) {
        this.keyupCallback(action);
      }
      event.stopPropagation();
      event.preventDefault();
    }
  },

  mousewheel: function(event) {
    var code = event.deltaY < 0 ? 'WheelUp' : 'WheelDown';
    var action = this.bindings[code];
    if (action) {
      if (this.keyupCallback) {
        this.keyupCallback(action);
      }
      event.stopPropagation();
      event.preventDefault();
    }
  },

  mousemove: function(event) {
    this.parent(event);
    if (this.mousemoveCallback) {
      this.mousemoveCallback();
    }
  }
}));

export { EventedInput };
export default EventedInput;
