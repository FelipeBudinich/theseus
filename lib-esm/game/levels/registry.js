const levels = Object.create(null);

const normalizeLevelName = (name) => {
  if (!name) {
    return '';
  }

  return name
    .replace(/^Level/, '')
    .replace(/^([A-Z])/, (_match, first) => first.toLowerCase());
};

const registerLevel = (name, levelData) => {
  const normalizedName = normalizeLevelName(name);

  if (!normalizedName || !levelData) {
    return levelData ?? null;
  }

  levels[normalizedName] = levelData;
  return levelData;
};

const getLevelByName = (name) => levels[normalizeLevelName(name)] ?? null;

export { getLevelByName, normalizeLevelName, registerLevel };
