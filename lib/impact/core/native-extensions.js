const installNativeExtensions = () => {
  if (!Number.prototype.map) {
    Number.prototype.map = function map(istart, istop, ostart, ostop) {
      return ostart + (ostop - ostart) * ((this - istart) / (istop - istart));
    };
  }

  if (!Number.prototype.limit) {
    Number.prototype.limit = function limit(min, max) {
      return Math.min(max, Math.max(min, this));
    };
  }

  if (!Number.prototype.round) {
    Number.prototype.round = function round(precision) {
      const multiplier = Math.pow(10, precision || 0);
      return Math.round(this * multiplier) / multiplier;
    };
  }

  if (!Number.prototype.floor) {
    Number.prototype.floor = function floor() {
      return Math.floor(this);
    };
  }

  if (!Number.prototype.ceil) {
    Number.prototype.ceil = function ceil() {
      return Math.ceil(this);
    };
  }

  if (!Number.prototype.toInt) {
    Number.prototype.toInt = function toInt() {
      return this | 0;
    };
  }

  if (!Number.prototype.toRad) {
    Number.prototype.toRad = function toRad() {
      return (this / 180) * Math.PI;
    };
  }

  if (!Number.prototype.toDeg) {
    Number.prototype.toDeg = function toDeg() {
      return (this * 180) / Math.PI;
    };
  }

  if (!Object.prototype.hasOwnProperty.call(Array.prototype, 'erase')) {
    Object.defineProperty(Array.prototype, 'erase', {
      value(item) {
        for (let index = this.length; index--;) {
          if (this[index] === item) {
            this.splice(index, 1);
          }
        }

        return this;
      }
    });
  }

  if (!Object.prototype.hasOwnProperty.call(Array.prototype, 'random')) {
    Object.defineProperty(Array.prototype, 'random', {
      value() {
        return this[Math.floor(Math.random() * this.length)];
      }
    });
  }

  if (!Function.prototype.bind) {
    Function.prototype.bind = function bind(oThis, ...boundArgs) {
      if (typeof this !== 'function') {
        throw new TypeError('Function.prototype.bind - target is not callable');
      }

      const target = this;

      const Nop = function Nop() {};
      const Bound = function Bound(...runtimeArgs) {
        return target.apply(
          this instanceof Nop && oThis ? this : oThis,
          boundArgs.concat(runtimeArgs)
        );
      };

      Nop.prototype = this.prototype;
      Bound.prototype = new Nop();

      return Bound;
    };
  }
};

export { installNativeExtensions };
