const fnTest = /xyz/.test(() => {
  xyz;
})
  ? /\bparent\b/
  : /.*/;

let lastClassId = 0;

const attachClassSystem = (ig) => {
  if (ig.Class && typeof ig.Class.extend === 'function') {
    return ig.Class;
  }

  let initializing = false;

  const inject = function inject(properties) {
    const prototype = this.prototype;
    const parent = {};

    for (const name in properties) {
      const value = properties[name];

      if (
        typeof value === 'function' &&
        typeof prototype[name] === 'function' &&
        fnTest.test(value)
      ) {
        parent[name] = prototype[name];
        prototype[name] = ((methodName, method) => function injectedMethod(...args) {
          const previousParent = this.parent;
          this.parent = parent[methodName];
          const returnValue = method.apply(this, args);
          this.parent = previousParent;
          return returnValue;
        })(name, value);
      } else {
        prototype[name] = value;
      }
    }
  };

  const ImpactClass = function ImpactClass() {};

  ImpactClass.extend = function extend(properties = {}) {
    const parent = this.prototype;

    initializing = true;
    const prototype = new this();
    initializing = false;

    for (const name in properties) {
      const value = properties[name];

      if (
        typeof value === 'function' &&
        typeof parent[name] === 'function' &&
        fnTest.test(value)
      ) {
        prototype[name] = ((methodName, method) => function extendedMethod(...args) {
          const previousParent = this.parent;
          this.parent = parent[methodName];
          const returnValue = method.apply(this, args);
          this.parent = previousParent;
          return returnValue;
        })(name, value);
      } else {
        prototype[name] = value;
      }
    }

    function Class(...args) {
      if (!initializing) {
        if (this.staticInstantiate) {
          const instance = this.staticInstantiate(...args);

          if (instance) {
            return instance;
          }
        }

        for (const property in this) {
          if (typeof this[property] === 'object') {
            this[property] = ig.copy(this[property]);
          }
        }

        if (this.init) {
          this.init(...args);
        }
      }

      return this;
    }

    Class.prototype = prototype;
    Class.prototype.constructor = Class;
    Class.extend = ImpactClass.extend;
    Class.inject = inject;
    Class.classId = prototype.classId = ++lastClassId;

    return Class;
  };

  ig.Class = ImpactClass;
  return ig.Class;
};

export { attachClassSystem };
