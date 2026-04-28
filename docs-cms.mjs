import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import c from 'highlight.js/lib/languages/c';
import javascript from 'highlight.js/lib/languages/javascript';
import php from 'highlight.js/lib/languages/php';
import sql from 'highlight.js/lib/languages/sql';

hljs.registerLanguage('c', c);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('php', php);
hljs.registerLanguage('sql', sql);

const dateFormat = 'M d, Y - H:i:s';
const highlightLanguages = ['c', 'javascript', 'js', 'php', 'sql'];
const markdownOptions = {
  gfm: true,
  breaks: false
};

const languageAliases = new Map([
  ['js', 'javascript'],
  ['node', 'javascript'],
  ['nodejs', 'javascript'],
  ['c++', 'cpp']
]);

const allowedJsonPaths = new Set(['docs', 'public/docs']);
const debugInfo = {
  selectorInfo: [],
  openedDocs: []
};
const indexCache = new Map();

let debugStartedAt = performance.now();
let lastFoundDocs = 0;

const markdown = new Marked(markdownOptions);
markdown.use({
  renderer: {
    code(token) {
      const code = token.text ?? '';
      const originalLang = normalizeLanguageName(token.lang);
      const language = languageAliases.get(originalLang) ?? originalLang;
      const langClass = originalLang ? ` language-${escapeAttribute(originalLang)}` : '';
      const allowedLanguages = new Set(highlightLanguages);

      if (language && allowedLanguages.has(language) && hljs.getLanguage(language)) {
        const highlighted = hljs.highlight(code, { language, ignoreIllegals: true }).value;
        return `<pre><code class="hljs${langClass}">${highlighted}</code></pre>\n`;
      }

      return `<pre><code${langClass ? ` class="${langClass.trim()}"` : ''}>${escapeHtml(code)}</code></pre>\n`;
    }
  }
});

export const createDocsRouter = ({
  docsRoot,
  docsBasePath = '/docs',
  docsIndexPath = '/docs.html',
  docsJsonPath = '/docs.json',
  siteTitle = 'Theseus Docs'
} = {}) => {
  if (!docsRoot) {
    throw new Error('createDocsRouter requires a docsRoot path.');
  }

  const resolvedDocsRoot = path.resolve(docsRoot);
  const router = express.Router();
  const docs = () => new Selector(resolvedDocsRoot);

  const renderLayout = (title, body) => layout({
    title,
    body,
    siteTitle,
    docsIndexPath,
    docsJsonPath
  });

  router.get(docsIndexPath, (req, res, next) => {
    withDebugInfo(next, () => {
      const page = parsePositiveInteger(req.query.page, 0);
      const notes = docs().newest(10, { page });

      res.send(renderDocListPage(notes, {
        title: 'Docs',
        heading: 'Docs',
        total: foundDocs(),
        page,
        pagePath: docsIndexPath,
        renderLayout,
        docsBasePath
      }));
    });
  });

  router.get(docsBasePath, (_req, res) => {
    res.redirect(301, docsIndexPath);
  });

  router.get(`${docsBasePath}/tag/:tag`, (req, res, next) => {
    withDebugInfo(next, () => {
      const tag = req.params.tag;
      const notes = docs().newest(0, { tags: [tag] });

      res.send(renderDocListPage(notes, {
        title: `Docs tagged ${tag}`,
        heading: `Docs tagged "${tag}"`,
        total: foundDocs(),
        page: 0,
        pagePath: `${docsBasePath}/tag/${encodeURIComponent(tag)}`,
        renderLayout,
        docsBasePath
      }));
    });
  });

  router.get(`${docsBasePath}/:keyword`, (req, res, next) => {
    if (req.params.keyword.endsWith('.md')) {
      next();
      return;
    }

    withDebugInfo(next, () => {
      const note = docs().one({ keyword: req.params.keyword });
      if (!note) {
        render404(res, renderLayout);
        return;
      }

      res.send(renderDocPage(note, { renderLayout, docsBasePath }));
    });
  });

  router.get(docsJsonPath, (req, res, next) => {
    withDebugInfo(next, () => {
      if (!isAllowedJsonPath(req.query.path)) {
        res.status(400).json({ error: 'JSON queries are limited to public/docs/.' });
        return;
      }

      renderJson(req, res, resolvedDocsRoot);
    });
  });

  router.get('/json', (req, res, next) => {
    withDebugInfo(next, () => {
      if (!isAllowedJsonPath(req.query.path)) {
        res.status(400).json({ error: 'JSON queries are limited to public/docs/.' });
        return;
      }

      renderJson(req, res, resolvedDocsRoot);
    });
  });

  return router;
};

export function foundDocs() {
  return lastFoundDocs;
}

export function getDebugInfo() {
  return {
    totalRuntime: performance.now() - debugStartedAt,
    selectorInfo: debugInfo.selectorInfo,
    openedDocs: debugInfo.openedDocs
  };
}

export function resetDebugInfo() {
  debugStartedAt = performance.now();
  debugInfo.selectorInfo.length = 0;
  debugInfo.openedDocs.length = 0;
}

class Selector {
  static SORT_ASC = 'asc';
  static SORT_DESC = 'desc';

  constructor(docsRoot) {
    const start = performance.now();
    this.path = docsRoot;

    debugInfo.selectorInfo.push({
      action: 'createSelector',
      path: this.path,
      ms: roundMs(performance.now() - start)
    });
  }

  one(params = {}, raw = false) {
    const notes = this.query('date', Selector.SORT_DESC, 1, params, raw);
    return notes[0] ?? null;
  }

  newest(count = 0, params = {}, raw = false) {
    return this.query('date', Selector.SORT_DESC, count, params, raw);
  }

  query(sort = 'date', order = Selector.SORT_DESC, count = 0, params = {}, raw = false) {
    const start = performance.now();
    let index = [...this.#getIndex()];
    const scanned = index.length;

    if (params.keyword) {
      const keyword = String(params.keyword);
      index = index.filter((note) => note.keyword === keyword);
    }

    if (params.date) {
      const [startMs, endMs] = dateRange(params.date);
      index = index.filter((note) => note.dateMs >= startMs && note.dateMs <= endMs);
    }

    if (params.tags) {
      const requiredTags = Array.isArray(params.tags)
        ? params.tags.map(String)
        : String(params.tags).split(',').map((tag) => tag.trim()).filter(Boolean);
      index = index.filter((note) => containsAllTags(note.tags, requiredTags));
    }

    if (params.meta && typeof params.meta === 'object') {
      const expectedMeta = params.meta;
      index = index.filter((note) => {
        for (const [key, value] of Object.entries(expectedMeta)) {
          if (note[key] !== value) return false;
        }
        return true;
      });
    }

    index.sort(compareBy(sort, order));
    lastFoundDocs = index.length;

    const limit = Number(count) || 0;
    if (limit > 0) {
      const page = Math.max(0, Number(params.page) || 0);
      index = index.slice(page * limit, page * limit + limit);
    }

    const notes = index.map((meta) => new Note(meta, raw));

    debugInfo.selectorInfo.push({
      action: 'query',
      path: this.path,
      ms: roundMs(performance.now() - start),
      scanned,
      returned: notes.length,
      params: scrubParams(params)
    });

    return notes;
  }

  #getIndex() {
    const start = performance.now();
    const files = listMarkdownFiles(this.path);
    const fingerprint = createDirectoryFingerprint(files);
    const cached = indexCache.get(this.path);

    if (cached && cached.fingerprint === fingerprint) {
      return cached.index;
    }

    const index = [];
    for (const filePath of files) {
      const meta = readMeta(filePath);
      if (meta.active !== false) {
        index.push(meta);
      }
    }
    index.sort(compareBy('date', Selector.SORT_DESC));
    indexCache.set(this.path, { fingerprint, index });

    debugInfo.selectorInfo.push({
      action: 'rebuildIndex',
      path: this.path,
      ms: roundMs(performance.now() - start),
      count: index.length
    });

    return index;
  }
}

class NoteDate {
  constructor(dateMs) {
    this.dateMs = dateMs;
    this.date = new Date(dateMs);
  }

  format(format = dateFormat) {
    const d = this.date;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const replacements = {
      Y: String(d.getFullYear()),
      y: String(d.getFullYear()).slice(-2),
      m: pad(d.getMonth() + 1),
      n: String(d.getMonth() + 1),
      d: pad(d.getDate()),
      j: String(d.getDate()),
      H: pad(d.getHours()),
      G: String(d.getHours()),
      i: pad(d.getMinutes()),
      s: pad(d.getSeconds()),
      M: monthNames[d.getMonth()],
      F: fullMonthNames[d.getMonth()]
    };

    return String(format).replace(/Y|y|m|n|d|j|H|G|i|s|M|F/g, (token) => replacements[token]);
  }

  valueOf() {
    return Math.floor(this.dateMs / 1000);
  }

  toJSON() {
    return Math.floor(this.dateMs / 1000);
  }

  toString() {
    return this.format();
  }
}

class Note {
  constructor(meta, raw = false) {
    this.path = meta.path;
    this.keyword = meta.keyword;
    this.raw = raw;
    this._meta = meta;
    this._body = null;
    this.tags = raw ? [...meta.tags] : meta.tags.map(escapeHtml);
    this.date = raw ? Math.floor(meta.dateMs / 1000) : new NoteDate(meta.dateMs);
    this.title = raw ? meta.title : escapeHtml(meta.title);

    return new Proxy(this, {
      get(target, property, receiver) {
        if (property in target) {
          return Reflect.get(target, property, receiver);
        }
        if (typeof property === 'string' && property in target._meta) {
          const value = target._meta[property];
          if (raw) return value;
          return typeof value === 'string' ? escapeHtml(value) : value;
        }
        return undefined;
      }
    });
  }

  get body() {
    if (this._body !== null) return this._body;

    debugInfo.openedDocs.push(this.path);
    const markdownText = readContent(this.path);
    const bodyMarkdown = this.raw || this._meta.titleSource !== 'heading'
      ? markdownText
      : stripFirstH1(markdownText);
    this._body = this.raw ? markdownText : renderMarkdown(bodyMarkdown);
    return this._body;
  }

  hasTag(tag) {
    return this._meta.tags.includes(tag);
  }

  toJSON() {
    return {
      keyword: this.keyword,
      title: this.title,
      date: this.date,
      tags: this.tags,
      body: this.body
    };
  }
}

function readMeta(filePath) {
  const { meta } = parseDocFile(filePath);
  return meta;
}

function readContent(filePath) {
  const { body } = parseDocFile(filePath);
  return body;
}

function parseDocFile(filePath) {
  const start = performance.now();
  const file = fs.readFileSync(filePath, 'utf8').replace(/\r\n?/g, '\n');
  const keyword = path.basename(filePath, '.md');
  const stat = fs.statSync(filePath);
  const { header, body } = splitHeader(file);
  const meta = { keyword, path: filePath };
  const headerLinePattern = /^(\w+):(.*)$/gm;
  let match;

  while ((match = headerLinePattern.exec(header)) !== null) {
    meta[match[1]] = match[2].trim();
  }

  meta.tags = typeof meta.tags === 'string'
    ? meta.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    : [];

  const titleFromHeader = typeof meta.title === 'string' && meta.title.length > 0;
  const headingTitle = findFirstH1Title(body);
  if (!titleFromHeader) {
    meta.title = headingTitle ?? keyword;
  }
  meta.titleSource = titleFromHeader ? 'header' : headingTitle ? 'heading' : 'keyword';

  meta.dateMs = parseDocDate(meta.date, stat.mtimeMs);
  meta.date = Math.floor(meta.dateMs / 1000);
  meta.active = meta.active === undefined || meta.active !== 'false';

  debugInfo.selectorInfo.push({
    action: 'parseDocFile',
    path: filePath,
    ms: roundMs(performance.now() - start)
  });

  return { meta, body };
}

function splitHeader(file) {
  if (file.startsWith('---\n')) {
    const frontmatterMatch = file.match(/^---\s*\n([\s\S]*?)^---\s*$(?:\n)?([\s\S]*)/m);
    if (frontmatterMatch) {
      return {
        header: frontmatterMatch[1],
        body: frontmatterMatch[2]
      };
    }
  }

  const pagenoteHeaderMatch = file.match(/^((?:\w+:.*\n)+)\s*---\s*(?:\n|$)([\s\S]*)$/);
  if (pagenoteHeaderMatch) {
    return {
      header: pagenoteHeaderMatch[1],
      body: pagenoteHeaderMatch[2]
    };
  }

  return { header: '', body: file };
}

function renderMarkdown(markdownText) {
  return markdown.parse(markdownText ?? '');
}

function layout({ title, body, siteTitle, docsIndexPath, docsJsonPath }) {
  const pageTitle = title || siteTitle;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <link rel="stylesheet" href="/hljs/github.min.css">
  <link rel="stylesheet" href="/docs.css">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="${docsIndexPath}">${escapeHtml(siteTitle)}</a>
    <nav>
      <a href="/">Game</a>
      <a href="${docsIndexPath}">Docs</a>
      <a href="${docsJsonPath}?fields=keyword,title,date,tags">JSON</a>
    </nav>
  </header>
  <main class="content">
    ${body}
  </main>
  <footer class="site-footer">
    rendered in ${Math.round(getDebugInfo().totalRuntime * 100) / 100}ms
  </footer>
</body>
</html>`;
}

function renderDocPage(note, { renderLayout, docsBasePath }) {
  const tags = note.tags.length
    ? `<span>Tags: ${note.tags.map((tag) => `<a href="${docsBasePath}/tag/${encodeURIComponent(tag)}">${tag}</a>`).join(', ')}</span>`
    : '';

  return renderLayout(note.title, `<article class="note">
    <h1>${note.title}</h1>
    ${note.body}
    <p class="note-meta">
      <span>Created at ${note.date.format('Y.m.d')}</span>
      ${tags}
    </p>
  </article>`);
}

function renderDocListPage(notes, {
  title,
  heading,
  total,
  page,
  pagePath,
  renderLayout,
  docsBasePath
}) {
  const items = notes.map((note) => `<li>
    <a href="${docsBasePath}/${encodeURIComponent(note.keyword)}">${note.title ?? note.keyword}</a>
    <small>${note.date.format('Y.m.d')}</small>
  </li>`).join('');

  const pagination = `<nav class="pagination">
    ${page > 0 ? `<a href="${pagePath}?page=${page - 1}">Previous</a>` : ''}
    ${(page + 1) * 10 < total ? `<a href="${pagePath}?page=${page + 1}">Next</a>` : ''}
  </nav>`;

  return renderLayout(title, `<section class="note-list">
    <h1>${escapeHtml(heading)}</h1>
    <p>${total} matching ${total === 1 ? 'doc' : 'docs'}.</p>
    <ul>${items || '<li>No docs found.</li>'}</ul>
    ${pagination}
  </section>`);
}

function render404(res, renderLayout) {
  res.status(404).send(renderLayout('Not Found', `<section class="not-found">
    <h1>Not Found</h1>
    <p>The doc you requested could not be found.</p>
  </section>`));
}

function renderJson(req, res, docsRoot) {
  const startedAt = performance.now();
  const fields = String(req.query.fields ?? 'keyword')
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);

  const notes = new Selector(docsRoot).query(
    String(req.query.sort ?? 'date'),
    String(req.query.order ?? 'desc'),
    parsePositiveInteger(req.query.count, 0),
    {
      keyword: req.query.keyword,
      date: parseDateQuery(req.query),
      tags: req.query.tags,
      meta: parseMetaQuery(req.query),
      page: parsePositiveInteger(req.query.page, 0)
    },
    true
  );

  res.json({
    notes: notes.map((note) => serializeNote(note, fields)),
    info: {
      totalRuntime: performance.now() - startedAt
    }
  });
}

function serializeNote(note, fields) {
  const output = {};
  for (const field of fields) {
    const value = note[field];
    if (typeof value !== 'function') {
      output[field] = value;
    }
  }
  return output;
}

function isAllowedJsonPath(pathValue) {
  if (pathValue === undefined || pathValue === null || pathValue === '') {
    return true;
  }

  const normalized = String(pathValue).replace(/\\/g, '/').replace(/\/+$/, '');
  return allowedJsonPaths.has(normalized);
}

function listMarkdownFiles(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return [];
  }

  return fs.readdirSync(directory)
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.join(directory, file))
    .filter((filePath) => fs.statSync(filePath).isFile());
}

function createDirectoryFingerprint(files) {
  const hash = crypto.createHash('sha1');
  for (const filePath of files) {
    const stat = fs.statSync(filePath);
    hash.update(filePath);
    hash.update(String(stat.mtimeMs));
    hash.update(String(stat.size));
  }
  return hash.digest('hex');
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseMetaQuery(query) {
  const meta = {};
  for (const [key, value] of Object.entries(query)) {
    const match = key.match(/^meta\[(\w+)\]$/);
    if (match) {
      meta[match[1]] = String(value);
    }
  }
  return Object.keys(meta).length ? meta : undefined;
}

function parseDateQuery(query) {
  if (query.date) return query.date;
  const date = [];
  for (const [key, value] of Object.entries(query)) {
    const match = key.match(/^date\[(\d+)]$/);
    if (match) {
      date[Number(match[1])] = value;
    }
  }
  return date.length ? date : undefined;
}

function dateRange(dateParam) {
  let y;
  let m;
  let d;

  if (Array.isArray(dateParam)) {
    [y, m, d] = dateParam;
  } else if (typeof dateParam === 'string') {
    const match = dateParam.match(/^(\d{4})(?:[.-](\d{1,2}))?(?:[.-](\d{1,2}))?/);
    if (!match) throw new Error(`Invalid date filter: ${dateParam}`);
    [, y, m, d] = match;
  } else {
    y = dateParam;
  }

  y = Number(y);
  m = m ? Number(m) : undefined;
  d = d ? Number(d) : undefined;

  if (!Number.isFinite(y)) throw new Error(`Invalid date filter: ${dateParam}`);

  const start = new Date(y, m ? m - 1 : 0, d || 1, 0, 0, 0, 0);
  let end;
  if (d) {
    end = new Date(y, m - 1, d, 23, 59, 59, 999);
  } else if (m) {
    end = new Date(y, m, 0, 23, 59, 59, 999);
  } else {
    end = new Date(y, 11, 31, 23, 59, 59, 999);
  }
  return [start.getTime(), end.getTime()];
}

function parseDocDate(value, fallbackMs) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (match) {
      const [, y, m, d, h = '0', i = '0'] = match;
      return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(i), 0, 0).getTime();
    }
  }
  return fallbackMs;
}

function containsAllTags(noteTags, requiredTags) {
  const lowerNoteTags = new Set(noteTags.map((tag) => tag.toLowerCase()));
  return requiredTags.every((tag) => lowerNoteTags.has(tag.toLowerCase()));
}

function compareBy(sort, order) {
  const direction = order === Selector.SORT_ASC ? 1 : -1;
  return (a, b) => {
    const av = sort === 'date' ? a.dateMs : a[sort];
    const bv = sort === 'date' ? b.dateMs : b[sort];

    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;

    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * direction;
    }
    return String(av).localeCompare(String(bv)) * direction;
  };
}

function findFirstH1Title(markdownText) {
  const lines = String(markdownText ?? '').split('\n');
  for (const line of lines) {
    const match = line.match(/^#\s+(.+?)\s*#*\s*$/);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function stripFirstH1(markdownText) {
  const lines = String(markdownText ?? '').split('\n');
  const index = lines.findIndex((line) => /^#\s+(.+?)\s*#*\s*$/.test(line));
  if (index === -1) {
    return markdownText;
  }

  lines.splice(index, 1);
  if (lines[index] === '') {
    lines.splice(index, 1);
  }
  return lines.join('\n');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function normalizeLanguageName(language) {
  return String(language ?? '').trim().split(/\s+/)[0].toLowerCase();
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function roundMs(ms) {
  return Math.round(ms * 1000) / 1000;
}

function scrubParams(params) {
  const result = { ...params };
  if (typeof result.filter === 'function') {
    result.filter = '[Function]';
  }
  return result;
}

function withDebugInfo(next, callback) {
  resetDebugInfo();

  try {
    callback();
  } catch (error) {
    next(error);
  }
}
