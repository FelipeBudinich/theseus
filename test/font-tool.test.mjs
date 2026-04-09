import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDefaultOutputPath,
  buildMetricAlphaRow,
  buildValidationSampleText,
  getExpectedGlyphCount,
  parseMetricAlphaRow,
  slugifyFontName,
  validateAtlasMetrics
} from '../tools/font-tool.js';

test('getExpectedGlyphCount returns the contiguous range size', () => {
  assert.equal(getExpectedGlyphCount(32, 126), 95);
  assert.equal(getExpectedGlyphCount(48, 57), 10);
  assert.equal(getExpectedGlyphCount(90, 65), 0);
});

test('slugifyFontName and buildDefaultOutputPath create stable media font paths', () => {
  assert.equal(slugifyFontName('Fredoka One'), 'fredoka-one');
  assert.equal(slugifyFontName(' 04b03 '), '04b03');
  assert.equal(buildDefaultOutputPath('Fredoka One'), 'media/fredoka-one.font.png');
  assert.equal(buildDefaultOutputPath(''), 'media/font.font.png');
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
