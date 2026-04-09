const vendorPropertyNames = (attribute) => {
  const capitalized = attribute.charAt(0).toUpperCase() + attribute.slice(1);

  return [
    attribute,
    `ms${capitalized}`,
    `moz${capitalized}`,
    `webkit${capitalized}`,
    `o${capitalized}`
  ];
};

const setVendorAttribute = (element, attribute, value) => {
  for (const propertyName of vendorPropertyNames(attribute)) {
    element[propertyName] = value;
  }
};

const getVendorAttribute = (element, attribute) => {
  for (const propertyName of vendorPropertyNames(attribute)) {
    if (propertyName in element && element[propertyName]) {
      return element[propertyName];
    }
  }

  return undefined;
};

const normalizeVendorAttribute = (element, attribute) => {
  const prefixedValue = getVendorAttribute(element, attribute);

  if (!(attribute in element) && prefixedValue) {
    element[attribute] = prefixedValue;
  }

  return element[attribute];
};

const attachVendorAttributeHelpers = (ig) => {
  ig.setVendorAttribute = setVendorAttribute;
  ig.getVendorAttribute = getVendorAttribute;
  ig.normalizeVendorAttribute = normalizeVendorAttribute;

  return ig;
};

export {
  attachVendorAttributeHelpers,
  getVendorAttribute,
  normalizeVendorAttribute,
  setVendorAttribute
};
