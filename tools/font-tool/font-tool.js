const GLYPH_SEPARATOR_WIDTH = 1;
const ATLAS_PREVIEW_SCALE = 8;
const VALIDATION_PREVIEW_SCALE = 4;
const PRINTABLE_SAMPLE_LIMIT = 48;
const PRINTABLE_SAMPLE_COLUMNS = 24;
const DEFAULT_FILL_COLOR = '#ffffff';

export const FONT_PRESETS = Object.freeze([
  { id: 'printable-ascii', label: 'Printable ASCII (32-126)', firstChar: 32, lastChar: 126 },
  { id: 'digits', label: 'Digits (48-57)', firstChar: 48, lastChar: 57 },
  { id: 'uppercase-ascii', label: 'Uppercase ASCII (65-90)', firstChar: 65, lastChar: 90 },
  { id: 'lowercase-ascii', label: 'Lowercase ASCII (97-122)', firstChar: 97, lastChar: 122 },
  { id: 'custom-range', label: 'Custom Range', firstChar: null, lastChar: null }
]);

const PRESET_BY_ID = new Map(FONT_PRESETS.map((preset) => [preset.id, preset]));

const normalizePathSlashes = (value) => String(value ?? '').replace(/\\/g, '/');

const isFiniteInteger = (value) => Number.isInteger(value) && Number.isFinite(value);

const clampMinimum = (value, minimum) => Math.max(minimum, value);

const parseOptionalInteger = (value) => {
  const trimmedValue = String(value ?? '').trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number.parseInt(trimmedValue, 10);
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
};

const parseRequiredInteger = (value) => Number.parseInt(String(value ?? '').trim(), 10);

const createCanvasElement = () => {
  if (typeof document === 'undefined') {
    throw new Error('Canvas rendering requires a browser document.');
  }

  return document.createElement('canvas');
};

const getCanvasContext = (canvas, options = {}) => {
  const context = canvas.getContext('2d', options);
  if (!context) {
    throw new Error('Unable to acquire a 2D canvas context.');
  }

  return context;
};

const applyTextContextSettings = (context, fontDeclaration, fillColor = DEFAULT_FILL_COLOR) => {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.font = fontDeclaration;
  context.fillStyle = fillColor;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';

  if ('fontKerning' in context) {
    context.fontKerning = 'none';
  }
};

const scanAlphaBounds = (pixelData, width, height) => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixelData[(y * width + x) * 4 + 3];
      if (!alpha) {
        continue;
      }

      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y > maxY) {
        maxY = y;
      }
    }
  }

  if (maxX === -1 || maxY === -1) {
    return null;
  }

  return { minX, minY, maxX, maxY };
};

const hexToRgb = (value) => {
  const normalizedValue = String(value ?? DEFAULT_FILL_COLOR).trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(normalizedValue);
  const hexValue = match ? match[1] : DEFAULT_FILL_COLOR.slice(1);

  return {
    r: Number.parseInt(hexValue.slice(0, 2), 16),
    g: Number.parseInt(hexValue.slice(2, 4), 16),
    b: Number.parseInt(hexValue.slice(4, 6), 16)
  };
};

const extractAlphaRow = (context, width, y) => {
  const imageData = context.getImageData(0, y, width, 1);
  const alphaValues = new Array(width);

  for (let x = 0; x < width; x += 1) {
    alphaValues[x] = imageData.data[x * 4 + 3];
  }

  return alphaValues;
};

const describeError = (error, fallbackMessage) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

const buildCanvasFontDeclaration = ({ cssFamily, fontSize, fontWeight = '400' }) =>
  `${fontWeight} ${fontSize}px ${cssFamily}`;

const copyImageDataToCanvas = (sourceContext, bounds) => {
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const cropCanvas = createCanvasElement();
  cropCanvas.width = width;
  cropCanvas.height = height;

  const cropContext = getCanvasContext(cropCanvas);
  cropContext.putImageData(
    sourceContext.getImageData(bounds.minX, bounds.minY, width, height),
    0,
    0
  );

  return cropCanvas;
};

const buildBlankGlyphWidth = ({ measuredWidth, spaceWidth }) =>
  clampMinimum(spaceWidth ?? Math.ceil(measuredWidth), 1);

const sanitizeClientOutputPath = (value) =>
  normalizePathSlashes(value).replace(/^\.\//, '').replace(/^\/+/, '');

const renderGlyphPassOne = ({ character, fontDeclaration, fontSize, spaceWidth }) => {
  const measurementCanvas = createCanvasElement();
  measurementCanvas.width = 1;
  measurementCanvas.height = 1;
  const measurementContext = getCanvasContext(measurementCanvas);
  applyTextContextSettings(measurementContext, fontDeclaration);

  const textMetrics = measurementContext.measureText(character);
  const padding = Math.max(12, Math.ceil(fontSize * 2));
  const ascent = Math.ceil(textMetrics.actualBoundingBoxAscent || fontSize);
  const descent = Math.ceil(textMetrics.actualBoundingBoxDescent || Math.max(1, Math.ceil(fontSize * 0.5)));
  const left = Math.ceil(Math.max(0, textMetrics.actualBoundingBoxLeft || 0));
  const right = Math.ceil(
    Math.max(1, textMetrics.actualBoundingBoxRight || textMetrics.width || Math.ceil(fontSize * 0.75))
  );
  const scratchWidth = Math.max(left + right + padding * 2, Math.ceil(textMetrics.width) + padding * 2, fontSize * 4);
  const scratchHeight = Math.max(ascent + descent + padding * 2, fontSize * 4);
  const scratchCanvas = createCanvasElement();
  scratchCanvas.width = scratchWidth;
  scratchCanvas.height = scratchHeight;

  const scratchContext = getCanvasContext(scratchCanvas, { willReadFrequently: true });
  applyTextContextSettings(scratchContext, fontDeclaration);
  const drawX = padding + left;
  const drawY = padding + ascent;

  scratchContext.fillText(character, drawX, drawY);

  const imageData = scratchContext.getImageData(0, 0, scratchWidth, scratchHeight);
  const bounds = scanAlphaBounds(imageData.data, scratchWidth, scratchHeight);
  const measuredWidth = Math.max(1, Math.ceil(textMetrics.width || fontSize / 2));

  if (!bounds) {
    return {
      character,
      cropCanvas: null,
      minY: null,
      maxY: null,
      visibleWidth: buildBlankGlyphWidth({ measuredWidth, spaceWidth })
    };
  }

  return {
    character,
    cropCanvas: copyImageDataToCanvas(scratchContext, bounds),
    minY: bounds.minY,
    maxY: bounds.maxY,
    visibleWidth: bounds.maxX - bounds.minX + 1
  };
};

const tintVisibleGlyphRows = ({
  context,
  width,
  glyphHeight,
  fillColor,
  alphaThreshold,
  binaryAlpha
}) => {
  if (glyphHeight <= 0 || width <= 0) {
    return;
  }

  const imageData = context.getImageData(0, 0, width, glyphHeight);
  const { r, g, b } = hexToRgb(fillColor);

  for (let index = 0; index < imageData.data.length; index += 4) {
    const alpha = imageData.data[index + 3];
    if (!alpha) {
      continue;
    }

    imageData.data[index] = r;
    imageData.data[index + 1] = g;
    imageData.data[index + 2] = b;
    imageData.data[index + 3] = binaryAlpha
      ? alpha >= alphaThreshold
        ? 255
        : 0
      : alpha;
  }

  context.putImageData(imageData, 0, 0);
};

const applyPreviewScale = (canvas, scale) => {
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
};

const createStatusWriter = (element) => (message, tone = 'info') => {
  element.textContent = message;
  element.dataset.tone = tone;
};

const setText = (element, value) => {
  element.textContent = value;
};

const populateSelectOptions = (select, options, emptyLabel) => {
  select.replaceChildren();

  if (!options.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = emptyLabel;
    select.append(option);
    return;
  }

  for (const optionData of options) {
    const option = document.createElement('option');
    option.value = optionData.value;
    option.textContent = optionData.label;
    select.append(option);
  }
};

export const getExpectedGlyphCount = (firstChar, lastChar) =>
  isFiniteInteger(firstChar) && isFiniteInteger(lastChar) && lastChar >= firstChar
    ? lastChar - firstChar + 1
    : 0;

export const buildCharset = (firstChar, lastChar) => {
  const glyphCount = getExpectedGlyphCount(firstChar, lastChar);
  const characters = new Array(glyphCount);

  for (let index = 0; index < glyphCount; index += 1) {
    characters[index] = String.fromCharCode(firstChar + index);
  }

  return characters;
};

export const getPresetForRange = (firstChar, lastChar) =>
  FONT_PRESETS.find(
    (preset) =>
      preset.firstChar === firstChar &&
      preset.lastChar === lastChar &&
      preset.id !== 'custom-range'
  ) ?? PRESET_BY_ID.get('custom-range');

export const slugifyFontName = (value) => {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'font';
};

export const buildDefaultOutputPath = (value) => `media/${slugifyFontName(value)}.font.png`;

export const buildMetricAlphaRow = (slotWidths) => {
  const totalWidth =
    slotWidths.reduce((sum, slotWidth) => sum + clampMinimum(slotWidth, 1), 0) +
    Math.max(0, slotWidths.length - 1) * GLYPH_SEPARATOR_WIDTH;
  const alphaValues = new Array(totalWidth).fill(0);
  let cursor = 0;

  for (let index = 0; index < slotWidths.length; index += 1) {
    const slotWidth = clampMinimum(slotWidths[index], 1);
    for (let x = 0; x < slotWidth; x += 1) {
      alphaValues[cursor + x] = 255;
    }

    cursor += slotWidth;

    if (index < slotWidths.length - 1) {
      cursor += GLYPH_SEPARATOR_WIDTH;
    }
  }

  return alphaValues;
};

export const parseMetricAlphaRow = (alphaValues) => {
  const widthMap = [];
  const indices = [];
  let currentWidth = 0;
  let x = 0;

  for (; x < alphaValues.length; x += 1) {
    if ((alphaValues[x] ?? 0) > 127) {
      currentWidth += 1;
    } else if ((alphaValues[x] ?? 0) < 128 && currentWidth) {
      widthMap.push(currentWidth);
      indices.push(x - currentWidth);
      currentWidth = 0;
    }
  }

  widthMap.push(currentWidth);
  indices.push(x - currentWidth);

  return {
    widthMap,
    indices,
    endsWithOpaqueRun: currentWidth > 0
  };
};

export const validateAtlasMetrics = ({
  parsedMetrics,
  expectedGlyphCount,
  firstChar,
  lastChar,
  spacerRowAlphas
}) => {
  const glyphCountMatches = parsedMetrics.widthMap.length === expectedGlyphCount;
  const spacerRowTransparent = spacerRowAlphas.every((alpha) => alpha === 0);
  const lastMetricRunTouchesEdge = parsedMetrics.endsWithOpaqueRun;
  const includesSpace = firstChar <= 32 && lastChar >= 32;
  const spaceIndex = includesSpace ? 32 - firstChar : -1;
  const spaceWidthNonZero =
    !includesSpace || (parsedMetrics.widthMap[spaceIndex] ?? 0) > 0;

  return {
    ok:
      glyphCountMatches &&
      spacerRowTransparent &&
      lastMetricRunTouchesEdge &&
      spaceWidthNonZero,
    glyphCountMatches,
    spacerRowTransparent,
    lastMetricRunTouchesEdge,
    spaceWidthNonZero
  };
};

export const buildValidationSampleText = (firstChar, lastChar) => {
  const printableCodes = [];

  for (let code = firstChar; code <= lastChar; code += 1) {
    if (code >= 32 && code <= 126) {
      printableCodes.push(String.fromCharCode(code));
    }
  }

  if (!printableCodes.length) {
    return '';
  }

  const sampleCharacters = printableCodes.slice(0, PRINTABLE_SAMPLE_LIMIT);
  const lines = [];

  for (let index = 0; index < sampleCharacters.length; index += PRINTABLE_SAMPLE_COLUMNS) {
    lines.push(sampleCharacters.slice(index, index + PRINTABLE_SAMPLE_COLUMNS).join(''));
  }

  return lines.join('\n');
};

const renderFontAtlas = ({
  atlasCanvas,
  characters,
  fontDeclaration,
  fontSize,
  fillColor,
  spaceWidth,
  extraAdvance,
  alphaThreshold,
  binaryAlpha
}) => {
  let globalTop = Number.POSITIVE_INFINITY;
  let globalBottom = Number.NEGATIVE_INFINITY;

  const glyphs = characters.map((character) => {
    const glyph = renderGlyphPassOne({
      character,
      fontDeclaration,
      fontSize,
      spaceWidth
    });

    if (glyph.minY !== null && glyph.maxY !== null) {
      globalTop = Math.min(globalTop, glyph.minY);
      globalBottom = Math.max(globalBottom, glyph.maxY);
    }

    return {
      ...glyph,
      slotWidth: clampMinimum(glyph.visibleWidth + extraAdvance, 1)
    };
  });

  if (!Number.isFinite(globalTop) || !Number.isFinite(globalBottom)) {
    globalTop = 0;
    globalBottom = Math.max(0, Math.ceil(fontSize) - 1);
  }

  const glyphHeight = globalBottom - globalTop + 1;
  const finalWidth =
    glyphs.reduce((sum, glyph) => sum + glyph.slotWidth, 0) +
    Math.max(0, glyphs.length - 1) * GLYPH_SEPARATOR_WIDTH;
  const finalHeight = glyphHeight + 2;

  atlasCanvas.width = finalWidth;
  atlasCanvas.height = finalHeight;

  const atlasContext = getCanvasContext(atlasCanvas, { willReadFrequently: true });
  atlasContext.clearRect(0, 0, finalWidth, finalHeight);

  let cursor = 0;

  for (let index = 0; index < glyphs.length; index += 1) {
    const glyph = glyphs[index];

    if (glyph.cropCanvas && glyph.minY !== null) {
      atlasContext.drawImage(glyph.cropCanvas, cursor, glyph.minY - globalTop);
    }

    atlasContext.fillStyle = fillColor;
    atlasContext.fillRect(cursor, glyphHeight + 1, glyph.slotWidth, 1);

    cursor += glyph.slotWidth;
    if (index < glyphs.length - 1) {
      cursor += GLYPH_SEPARATOR_WIDTH;
    }
  }

  tintVisibleGlyphRows({
    context: atlasContext,
    width: finalWidth,
    glyphHeight,
    fillColor,
    alphaThreshold,
    binaryAlpha
  });

  return { glyphHeight, glyphs };
};

const parseAtlasCanvasMetrics = (atlasCanvas) => {
  const atlasContext = getCanvasContext(atlasCanvas, { willReadFrequently: true });
  const metricRowAlphas = extractAlphaRow(atlasContext, atlasCanvas.width, atlasCanvas.height - 1);

  return {
    parsedMetrics: parseMetricAlphaRow(metricRowAlphas),
    spacerRowAlphas: extractAlphaRow(atlasContext, atlasCanvas.width, atlasCanvas.height - 2)
  };
};

const buildValidationChecks = (validation, expectedGlyphCount, parsedGlyphCount, includesSpace) => {
  const checks = [
    validation.glyphCountMatches
      ? `Parsed glyph count matches expected range (${expectedGlyphCount}).`
      : `Parsed glyph count ${parsedGlyphCount} does not match expected ${expectedGlyphCount}.`,
    validation.lastMetricRunTouchesEdge
      ? 'Last metric run reaches the right edge.'
      : 'Last metric run does not reach the right edge.',
    validation.spacerRowTransparent
      ? 'Spacer row is fully transparent.'
      : 'Spacer row contains non-transparent pixels.'
  ];

  if (includesSpace) {
    checks.push(
      validation.spaceWidthNonZero
        ? 'Space width is non-zero.'
        : 'Space parsed as zero-width.'
    );
  }

  return checks.join('\n');
};

const renderValidationPreview = ({
  atlasCanvas,
  previewCanvas,
  glyphHeight,
  parsedMetrics,
  firstChar,
  lastChar
}) => {
  const sampleText = buildValidationSampleText(firstChar, lastChar);

  if (!sampleText) {
    previewCanvas.width = 1;
    previewCanvas.height = 1;
    applyPreviewScale(previewCanvas, VALIDATION_PREVIEW_SCALE);
    return {
      note: 'No printable characters in this range, so the preview stays empty.',
      sampleText: ''
    };
  }

  const lines = sampleText.split('\n');
  const letterSpacing = 1;
  const lineWidths = lines.map((line) => {
    let width = 0;
    for (let index = 0; index < line.length; index += 1) {
      const glyphIndex = line.charCodeAt(index) - firstChar;
      width += parsedMetrics.widthMap[glyphIndex] ?? 0;
    }

    if (line.length > 1) {
      width += letterSpacing * (line.length - 1);
    }

    return width;
  });

  previewCanvas.width = Math.max(1, ...lineWidths);
  previewCanvas.height = Math.max(1, lines.length * glyphHeight);

  const previewContext = getCanvasContext(previewCanvas);
  previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    let cursor = 0;

    for (let characterIndex = 0; characterIndex < line.length; characterIndex += 1) {
      const glyphIndex = line.charCodeAt(characterIndex) - firstChar;
      const glyphWidth = parsedMetrics.widthMap[glyphIndex] ?? 0;
      const glyphOffset = parsedMetrics.indices[glyphIndex] ?? 0;

      if (glyphWidth > 0) {
        previewContext.drawImage(
          atlasCanvas,
          glyphOffset,
          0,
          glyphWidth,
          glyphHeight,
          cursor,
          lineIndex * glyphHeight,
          glyphWidth,
          glyphHeight
        );
      }

      cursor += glyphWidth;
      if (characterIndex < line.length - 1) {
        cursor += letterSpacing;
      }
    }
  }

  applyPreviewScale(previewCanvas, VALIDATION_PREVIEW_SCALE);

  return {
    note: `Preview sample: ${sampleText.replace(/\n/g, ' / ')}`,
    sampleText
  };
};

const buildUsageSnippet = (filePath, firstChar) => {
  const comment =
    firstChar === 32
      ? '// optional: default printable range starts at space'
      : `// required: exported range starts at ${firstChar}`;

  return [
    `const font = new ig.Font('${filePath}');`,
    `font.firstChar = ${firstChar}; ${comment}`
  ].join('\n');
};

const createState = (elements) => ({
  elements,
  localFonts: new Map(),
  manualMode: false,
  outputPathDirty: false,
  activeTempFontFace: null,
  activeTempFontFamily: '',
  activeLocalFontKey: '',
  renderResult: null
});

const removeTemporaryFontFace = (state) => {
  if (state.activeTempFontFace) {
    document.fonts.delete(state.activeTempFontFace);
  }

  state.activeTempFontFace = null;
  state.activeTempFontFamily = '';
  state.activeLocalFontKey = '';
};

const updateOutputPathDefault = (state) => {
  if (state.outputPathDirty) {
    return;
  }

  const selectedLocalFont = state.localFonts.get(state.elements.localFontSelect.value);
  const manualFamily = state.elements.manualFamily.value.trim();
  const sourceName =
    (!state.manualMode && selectedLocalFont?.postscriptName) ||
    (state.manualMode && manualFamily) ||
    'font';

  state.elements.outputPath.value = buildDefaultOutputPath(sourceName);
};

const setFallbackMode = (state, enabled, message) => {
  state.manualMode = enabled;
  state.elements.manualFallback.classList.toggle('is-hidden', !enabled);
  state.elements.localFontSelect.disabled = enabled || state.localFonts.size === 0;
  state.elements.localFontHint.textContent = message;

  if (enabled) {
    removeTemporaryFontFace(state);
  }

  updateOutputPathDefault(state);
};

const setRenderSummary = (state, message, widths = '') => {
  state.elements.validationSummary.textContent = message;
  state.elements.parsedWidths.textContent = widths;
};

const resetSaveOutcome = (state) => {
  state.elements.saveSummary.textContent = 'Save is disabled until validation passes.';
  state.elements.usageSnippet.textContent = '';
};

const updateSaveButtonState = (state) => {
  state.elements.saveAtlas.disabled = !(state.renderResult?.validation.ok && state.elements.atlasCanvas.width > 0);
};

const collectLocalFontEntries = (fontDataList) => {
  const uniqueFonts = new Map();

  for (const fontData of fontDataList) {
    const postscriptName = String(fontData.postscriptName || '').trim();
    if (!postscriptName || uniqueFonts.has(postscriptName)) {
      continue;
    }

    uniqueFonts.set(postscriptName, {
      fontData,
      postscriptName,
      fullName: String(fontData.fullName || postscriptName).trim() || postscriptName
    });
  }

  return [...uniqueFonts.values()].sort((left, right) => left.fullName.localeCompare(right.fullName));
};

const loadSelectedLocalFontFace = async (state) => {
  const selectedKey = state.elements.localFontSelect.value;
  if (!selectedKey) {
    throw new Error('Select a local font face first.');
  }

  if (state.activeLocalFontKey === selectedKey && state.activeTempFontFamily) {
    return state.activeTempFontFamily;
  }

  const selectedFont = state.localFonts.get(selectedKey);
  if (!selectedFont) {
    throw new Error('The selected font face is no longer available.');
  }

  const blob = await selectedFont.fontData.blob();
  const binaryData = await blob.arrayBuffer();
  const temporaryFamily = `font-tool-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fontFace = new FontFace(temporaryFamily, binaryData);

  removeTemporaryFontFace(state);
  await fontFace.load();
  document.fonts.add(fontFace);
  await document.fonts.load(`16px ${temporaryFamily}`);

  state.activeTempFontFace = fontFace;
  state.activeTempFontFamily = temporaryFamily;
  state.activeLocalFontKey = selectedKey;

  return temporaryFamily;
};

const resolveFontDeclaration = async (state, fontSize) => {
  if (!state.manualMode && state.localFonts.size > 0 && state.elements.localFontSelect.value) {
    const cssFamily = await loadSelectedLocalFontFace(state);
    return {
      sourceLabel: state.localFonts.get(state.elements.localFontSelect.value)?.postscriptName ?? cssFamily,
      fontDeclaration: buildCanvasFontDeclaration({
        cssFamily,
        fontSize,
        fontWeight: '400'
      })
    };
  }

  const manualFamily = state.elements.manualFamily.value.trim();
  if (!manualFamily) {
    throw new Error(
      state.manualMode
        ? 'Enter a CSS font family for the fallback renderer.'
        : 'Load local fonts first.'
    );
  }

  return {
    sourceLabel: manualFamily,
    fontDeclaration: buildCanvasFontDeclaration({
      cssFamily: manualFamily,
      fontSize,
      fontWeight: state.elements.manualBold.checked ? '700' : '400'
    })
  };
};

const collectRenderSettings = async (state) => {
  const firstChar = parseRequiredInteger(state.elements.firstChar.value);
  const lastChar = parseRequiredInteger(state.elements.lastChar.value);
  const fontSize = parseRequiredInteger(state.elements.fontSize.value);
  const extraAdvance = parseRequiredInteger(state.elements.extraAdvance.value);
  const alphaThreshold = parseRequiredInteger(state.elements.alphaThreshold.value);
  const spaceWidth = parseOptionalInteger(state.elements.spaceWidth.value);
  const fillColor = state.elements.fillColor.value || DEFAULT_FILL_COLOR;

  if (!Number.isFinite(firstChar) || !Number.isFinite(lastChar)) {
    throw new Error('First and last character codes must be integers.');
  }

  if (firstChar < 0 || lastChar > 65535 || firstChar > lastChar) {
    throw new Error('Character range must stay within 0-65535 and firstChar must be <= lastChar.');
  }

  if (!Number.isFinite(fontSize) || fontSize <= 0) {
    throw new Error('Font size must be a positive integer.');
  }

  if (!Number.isFinite(extraAdvance) || extraAdvance < 0) {
    throw new Error('extraAdvance must be an integer greater than or equal to 0.');
  }

  if (!Number.isFinite(alphaThreshold) || alphaThreshold < 0 || alphaThreshold > 255) {
    throw new Error('alphaThreshold must be an integer between 0 and 255.');
  }

  if (spaceWidth !== null && (!Number.isFinite(spaceWidth) || spaceWidth < 1)) {
    throw new Error('spaceWidth must be blank or an integer greater than or equal to 1.');
  }

  const { sourceLabel, fontDeclaration } = await resolveFontDeclaration(state, fontSize);

  return {
    firstChar,
    lastChar,
    characters: buildCharset(firstChar, lastChar),
    fontSize,
    fontDeclaration,
    sourceLabel,
    fillColor,
    spaceWidth,
    extraAdvance,
    alphaThreshold,
    binaryAlpha: state.elements.binaryAlpha.checked
  };
};

const renderAtlasAndValidation = async (state) => {
  const settings = await collectRenderSettings(state);
  resetSaveOutcome(state);

  const atlasCanvas = state.elements.atlasCanvas;
  const { glyphHeight, glyphs } = renderFontAtlas({
    atlasCanvas,
    characters: settings.characters,
    fontDeclaration: settings.fontDeclaration,
    fontSize: settings.fontSize,
    fillColor: settings.fillColor,
    spaceWidth: settings.spaceWidth,
    extraAdvance: settings.extraAdvance,
    alphaThreshold: settings.alphaThreshold,
    binaryAlpha: settings.binaryAlpha
  });

  applyPreviewScale(atlasCanvas, ATLAS_PREVIEW_SCALE);

  const { parsedMetrics, spacerRowAlphas } = parseAtlasCanvasMetrics(atlasCanvas);
  const expectedGlyphCount = getExpectedGlyphCount(settings.firstChar, settings.lastChar);
  const validation = validateAtlasMetrics({
    parsedMetrics,
    expectedGlyphCount,
    firstChar: settings.firstChar,
    lastChar: settings.lastChar,
    spacerRowAlphas
  });
  const validationPreview = renderValidationPreview({
    atlasCanvas,
    previewCanvas: state.elements.validationCanvas,
    glyphHeight,
    parsedMetrics,
    firstChar: settings.firstChar,
    lastChar: settings.lastChar
  });
  const includesSpace = settings.firstChar <= 32 && settings.lastChar >= 32;

  setText(
    state.elements.atlasMeta,
    `${atlasCanvas.width}x${atlasCanvas.height}px atlas, glyph height ${glyphHeight}px, ${glyphs.length} slots`
  );
  setText(
    state.elements.validationNote,
    validationPreview.note
  );
  setRenderSummary(
    state,
    validation.ok ? 'Validation passed. Save is unlocked.' : 'Validation failed. Fix the atlas before saving.',
    `Parsed glyph count: ${parsedMetrics.widthMap.length}/${expectedGlyphCount}\n` +
      `${buildValidationChecks(
        validation,
        expectedGlyphCount,
        parsedMetrics.widthMap.length,
        includesSpace
      )}\n\n` +
      `Parsed widths:\n[${parsedMetrics.widthMap.join(', ')}]`
  );

  state.renderResult = {
    settings,
    glyphHeight,
    parsedMetrics,
    validation
  };
  updateSaveButtonState(state);

  return validation;
};

const saveRenderedAtlas = async (state) => {
  const outputPath = sanitizeClientOutputPath(state.elements.outputPath.value.trim());

  if (!state.renderResult?.validation.ok) {
    throw new Error('Render and validation must succeed before saving.');
  }

  if (!outputPath.startsWith('media/') || !outputPath.toLowerCase().endsWith('.png') || outputPath.includes('..')) {
    throw new Error('Output path must stay inside media/ and end with .png.');
  }

  const payload = {
    path: outputPath,
    data: state.elements.atlasCanvas.toDataURL('image/png')
  };
  const response = await fetch('/tools/weltmeister/api/save-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const responseBody = await response.json().catch(() => ({
    error: `Unexpected response (${response.status})`
  }));

  if (!response.ok) {
    throw new Error(responseBody.error || `Save failed with status ${response.status}.`);
  }

  return responseBody;
};

export const initFontTool = (root = document) => {
  if (!root || typeof root.querySelector !== 'function') {
    throw new Error('Font tool init requires a browser document root.');
  }

  const elements = {
    loadLocalFonts: root.querySelector('#loadLocalFonts'),
    localFontSelect: root.querySelector('#localFontSelect'),
    localFontHint: root.querySelector('#localFontHint'),
    manualFallback: root.querySelector('#manualFallback'),
    manualFamily: root.querySelector('#manualFamily'),
    manualBold: root.querySelector('#manualBold'),
    preset: root.querySelector('#preset'),
    firstChar: root.querySelector('#firstChar'),
    lastChar: root.querySelector('#lastChar'),
    fontSize: root.querySelector('#fontSize'),
    fillColor: root.querySelector('#fillColor'),
    spaceWidth: root.querySelector('#spaceWidth'),
    extraAdvance: root.querySelector('#extraAdvance'),
    alphaThreshold: root.querySelector('#alphaThreshold'),
    binaryAlpha: root.querySelector('#binaryAlpha'),
    outputPath: root.querySelector('#outputPath'),
    renderAtlas: root.querySelector('#renderAtlas'),
    saveAtlas: root.querySelector('#saveAtlas'),
    status: root.querySelector('#status'),
    atlasCanvas: root.querySelector('#atlasCanvas'),
    atlasMeta: root.querySelector('#atlasMeta'),
    validationCanvas: root.querySelector('#validationCanvas'),
    validationNote: root.querySelector('#validationNote'),
    validationSummary: root.querySelector('#validationSummary'),
    parsedWidths: root.querySelector('#parsedWidths'),
    saveSummary: root.querySelector('#saveSummary'),
    usageSnippet: root.querySelector('#usageSnippet')
  };

  const state = createState(elements);
  const writeStatus = createStatusWriter(elements.status);

  populateSelectOptions(
    elements.preset,
    FONT_PRESETS.map((preset) => ({ value: preset.id, label: preset.label })),
    'Custom Range'
  );
  elements.preset.value = 'printable-ascii';
  elements.firstChar.value = '32';
  elements.lastChar.value = '126';
  elements.outputPath.value = buildDefaultOutputPath('font');
  applyPreviewScale(elements.atlasCanvas, ATLAS_PREVIEW_SCALE);
  applyPreviewScale(elements.validationCanvas, VALIDATION_PREVIEW_SCALE);
  setFallbackMode(
    state,
    typeof window.queryLocalFonts !== 'function',
    typeof window.queryLocalFonts === 'function'
      ? 'Click “Load local fonts” to query installed faces.'
      : 'This browser does not support queryLocalFonts(); use the manual CSS family fallback.'
  );
  resetSaveOutcome(state);
  updateSaveButtonState(state);

  const syncPreset = () => {
    const preset = getPresetForRange(
      parseRequiredInteger(elements.firstChar.value),
      parseRequiredInteger(elements.lastChar.value)
    );
    elements.preset.value = preset.id;
  };

  elements.loadLocalFonts.addEventListener('click', async () => {
    if (typeof window.queryLocalFonts !== 'function') {
      setFallbackMode(
        state,
        true,
        'This browser does not support queryLocalFonts(); use the manual CSS family fallback.'
      );
      writeStatus('Local font access is unavailable, so manual fallback mode is enabled.', 'warning');
      return;
    }

    writeStatus('Loading local fonts…', 'info');

    try {
      const localFonts = collectLocalFontEntries(await window.queryLocalFonts());
      if (!localFonts.length) {
        state.localFonts.clear();
        populateSelectOptions(elements.localFontSelect, [], 'No local fonts returned');
        setFallbackMode(
          state,
          true,
          'No local fonts were returned. Enter a manual CSS font family below.'
        );
        writeStatus('No local fonts were returned, so manual fallback mode is enabled.', 'warning');
        return;
      }

      state.localFonts = new Map(localFonts.map((entry) => [entry.postscriptName, entry]));
      populateSelectOptions(
        elements.localFontSelect,
        localFonts.map((entry) => ({ value: entry.postscriptName, label: entry.fullName })),
        'No local fonts loaded'
      );
      elements.localFontSelect.value = localFonts[0].postscriptName;
      setFallbackMode(
        state,
        false,
        `Loaded ${localFonts.length} local font face${localFonts.length === 1 ? '' : 's'}.`
      );
      updateOutputPathDefault(state);
      await loadSelectedLocalFontFace(state);
      writeStatus('Local fonts loaded. Render to build an atlas.', 'success');
    } catch (error) {
      state.localFonts.clear();
      populateSelectOptions(elements.localFontSelect, [], 'Local font access failed');
      setFallbackMode(
        state,
        true,
        `Local font access failed. ${describeError(error, 'Enter a manual CSS font family below.')}`
      );
      writeStatus(
        `Local font access failed: ${describeError(error, 'Unknown error')}`,
        'warning'
      );
    }
  });

  elements.localFontSelect.addEventListener('change', async () => {
    updateOutputPathDefault(state);

    if (state.manualMode || !elements.localFontSelect.value) {
      return;
    }

    try {
      writeStatus('Preparing the selected local face…', 'info');
      await loadSelectedLocalFontFace(state);
      writeStatus('Selected local face is ready to render.', 'success');
    } catch (error) {
      setFallbackMode(
        state,
        true,
        `The selected local face could not be loaded. ${describeError(
          error,
          'Enter a manual CSS font family below.'
        )}`
      );
      writeStatus(
        `The selected local face could not be loaded: ${describeError(error, 'Unknown error')}`,
        'warning'
      );
    }
  });

  elements.manualFamily.addEventListener('input', () => {
    updateOutputPathDefault(state);
  });

  elements.outputPath.addEventListener('input', () => {
    state.outputPathDirty = true;
  });

  elements.preset.addEventListener('change', () => {
    const preset = PRESET_BY_ID.get(elements.preset.value);
    if (!preset || preset.id === 'custom-range') {
      return;
    }

    elements.firstChar.value = String(preset.firstChar);
    elements.lastChar.value = String(preset.lastChar);
  });

  for (const input of [elements.firstChar, elements.lastChar]) {
    input.addEventListener('input', syncPreset);
  }

  elements.renderAtlas.addEventListener('click', async () => {
    try {
      writeStatus('Rendering atlas…', 'info');
      const validation = await renderAtlasAndValidation(state);
      writeStatus(
        validation.ok
          ? 'Atlas rendered and validated.'
          : 'Atlas rendered, but validation failed. Save remains locked.',
        validation.ok ? 'success' : 'warning'
      );
    } catch (error) {
      state.renderResult = null;
      updateSaveButtonState(state);
      setRenderSummary(
        state,
        'Render failed.',
        describeError(error, 'The atlas could not be rendered.')
      );
      writeStatus(
        `Render failed: ${describeError(error, 'Unknown error')}`,
        'error'
      );
    }
  });

  elements.saveAtlas.addEventListener('click', async () => {
    try {
      writeStatus('Saving PNG…', 'info');
      const saveResult = await saveRenderedAtlas(state);
      state.elements.saveSummary.textContent = `Saved atlas to ${saveResult.path}.`;
      state.elements.usageSnippet.textContent = buildUsageSnippet(
        saveResult.path,
        state.renderResult.settings.firstChar
      );
      writeStatus('PNG saved successfully.', 'success');
    } catch (error) {
      state.elements.saveSummary.textContent = describeError(
        error,
        'The PNG could not be saved.'
      );
      writeStatus(
        `Save failed: ${describeError(error, 'Unknown error')}`,
        'error'
      );
    }
  });

  return state;
};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const bootFontTool = () => {
    if (document.body?.dataset.fontToolInitialized === 'true') {
      return;
    }

    if (document.body) {
      document.body.dataset.fontToolInitialized = 'true';
    }

    initFontTool(document);
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootFontTool, { once: true });
  } else {
    bootFontTool();
  }
}
