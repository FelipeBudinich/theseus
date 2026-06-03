import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBaselineGlyphPlacement,
  buildDefaultOutputPath,
  buildMetricAlphaRow,
  buildSharedBaselineMetrics,
  buildValidationSampleText,
  getExpectedGlyphCount,
  normalizeGlyphTextMetrics,
  parseMetricAlphaRow,
  slugifyFontName,
  validateAtlasMetrics
} from '../tools/font-tool/font-tool.js';

test('getExpectedGlyphCount returns the contiguous range size', () => {
  assert.equal(getExpectedGlyphCount(32, 126), 95);
  assert.equal(getExpectedGlyphCount(48, 57), 10);
  assert.equal(getExpectedGlyphCount(90, 65), 0);
});

test('slugifyFontName and buildDefaultOutputPath create stable example media font paths', () => {
  assert.equal(slugifyFontName('Fredoka One'), 'fredoka-one');
  assert.equal(slugifyFontName(' 04b03 '), '04b03');
  assert.equal(
    buildDefaultOutputPath('Fredoka One'),
    'games/example/media/fredoka-one.font.png'
  );
  assert.equal(buildDefaultOutputPath(''), 'games/example/media/font.font.png');
});

test('parseMetricAlphaRow mirrors ig.Font metric parsing without a trailing separator', () => {
  const alphaRow = buildMetricAlphaRow([3, 1, 4]);
  const parsed = parseMetricAlphaRow(alphaRow);

  assert.deepEqual(parsed.widthMap, [3, 1, 4]);
  assert.deepEqual(parsed.indices, [0, 4, 6]);
  assert.equal(parsed.endsWithOpaqueRun, true);
});

test('parseMetricAlphaRow exposes the classic extra zero-width glyph caused by a trailing separator', () => {
  const alphaRowWithTrailingSeparator = [...buildMetricAlphaRow([2, 5]), 0];
  const parsed = parseMetricAlphaRow(alphaRowWithTrailingSeparator);

  assert.deepEqual(parsed.widthMap, [2, 5, 0]);
  assert.deepEqual(parsed.indices, [0, 3, 9]);
  assert.equal(parsed.endsWithOpaqueRun, false);
});

test('shared baseline metrics use one baseline for glyphs with different ascents', () => {
  const fontSize = 16;
  const tallGlyph = normalizeGlyphTextMetrics({
    width: 9,
    actualBoundingBoxAscent: 12,
    actualBoundingBoxDescent: 2,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: 9
  }, fontSize);
  const lowGlyph = normalizeGlyphTextMetrics({
    width: 8,
    actualBoundingBoxAscent: 7,
    actualBoundingBoxDescent: 5,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: 8
  }, fontSize);
  const baseline = buildSharedBaselineMetrics([tallGlyph, lowGlyph], fontSize);
  const tallPlacement = buildBaselineGlyphPlacement({
    glyphMetrics: tallGlyph,
    baselineMetrics: baseline,
    fontSize
  });
  const lowPlacement = buildBaselineGlyphPlacement({
    glyphMetrics: lowGlyph,
    baselineMetrics: baseline,
    fontSize
  });

  assert.equal(baseline.ascent, 12);
  assert.equal(baseline.descent, 5);
  assert.equal(tallPlacement.drawY, lowPlacement.drawY);
});

test('baseline placement preserves descenders below the shared baseline', () => {
  const fontSize = 16;
  const capGlyph = normalizeGlyphTextMetrics({
    width: 10,
    actualBoundingBoxAscent: 12,
    actualBoundingBoxDescent: 0,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: 10
  }, fontSize);
  const descenderGlyph = normalizeGlyphTextMetrics({
    width: 8,
    actualBoundingBoxAscent: 7,
    actualBoundingBoxDescent: 5,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: 8
  }, fontSize);
  const baseline = buildSharedBaselineMetrics([capGlyph, descenderGlyph], fontSize);
  const capPlacement = buildBaselineGlyphPlacement({
    glyphMetrics: capGlyph,
    baselineMetrics: baseline,
    fontSize
  });
  const descenderPlacement = buildBaselineGlyphPlacement({
    glyphMetrics: descenderGlyph,
    baselineMetrics: baseline,
    fontSize
  });

  assert.equal(capPlacement.drawY, descenderPlacement.drawY);
  assert.notEqual(capPlacement.expectedMinY, descenderPlacement.expectedMinY);
  assert.ok(descenderPlacement.expectedMinY > capPlacement.expectedMinY);
  assert.ok(descenderPlacement.expectedMaxY > capPlacement.expectedMaxY);
});

test('glyph metric normalization falls back when text bounds are missing', () => {
  const fontSize = 16;
  const glyphMetrics = normalizeGlyphTextMetrics({ width: 0 }, fontSize);
  const baseline = buildSharedBaselineMetrics([glyphMetrics], fontSize);

  assert.deepEqual(glyphMetrics, {
    ascent: 16,
    descent: 8,
    left: 0,
    measuredWidth: 8,
    padding: 32,
    right: 12
  });
  assert.equal(baseline.ascent, 16);
  assert.equal(baseline.descent, 8);
  assert.equal(baseline.baselineY, 48);
});

test('validateAtlasMetrics rejects spacing and count problems that would break runtime parsing', () => {
  const parsedMetrics = parseMetricAlphaRow(buildMetricAlphaRow([2, 3, 4]));

  assert.deepEqual(
    validateAtlasMetrics({
      parsedMetrics,
      expectedGlyphCount: 3,
      firstChar: 48,
      lastChar: 50,
      spacerRowAlphas: [0, 0, 0, 0]
    }),
    {
      ok: true,
      glyphCountMatches: true,
      spacerRowTransparent: true,
      lastMetricRunTouchesEdge: true,
      spaceWidthNonZero: true
    }
  );

  assert.deepEqual(
    validateAtlasMetrics({
      parsedMetrics: parseMetricAlphaRow([...buildMetricAlphaRow([2, 3, 4]), 0]),
      expectedGlyphCount: 3,
      firstChar: 48,
      lastChar: 50,
      spacerRowAlphas: [0, 0, 0, 0]
    }),
    {
      ok: false,
      glyphCountMatches: false,
      spacerRowTransparent: true,
      lastMetricRunTouchesEdge: false,
      spaceWidthNonZero: true
    }
  );

  assert.deepEqual(
    validateAtlasMetrics({
      parsedMetrics: {
        widthMap: [0, 3, 4],
        indices: [0, 1, 5],
        endsWithOpaqueRun: true
      },
      expectedGlyphCount: 3,
      firstChar: 32,
      lastChar: 34,
      spacerRowAlphas: [0, 0, 0, 0]
    }),
    {
      ok: false,
      glyphCountMatches: true,
      spacerRowTransparent: true,
      lastMetricRunTouchesEdge: true,
      spaceWidthNonZero: false
    }
  );
});

test('buildValidationSampleText only uses printable characters from the exported range', () => {
  assert.equal(buildValidationSampleText(48, 57), '0123456789');
  assert.equal(buildValidationSampleText(10, 13), '');
});
