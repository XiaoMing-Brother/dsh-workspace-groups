// DOM probe for the DSH sidebar slot `sidebar.workspaces`.
// Usage: node tools/probe.mjs [--out tools/probe.json] [--shot tools/shots/x.png] [--port N] [--keep]
import { ensureBrowser, openGui, waitFor, screenshot, evaluate } from './dsh-page.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { WORKSPACE } from './dsh-page.mjs';

const argv = process.argv.slice(2);
const arg = (k, d = undefined) => {
  const i = argv.indexOf(`--${k}`);
  return i === -1 ? d : (argv[i + 1] ?? true);
};
const outPath = arg('out', 'tools/probe.json');
const shotPath = arg('shot', undefined);
const port = arg('port', undefined) ? Number(arg('port')) : undefined;
const keepOpen = Boolean(arg('keep', false));

const PROBE = String.raw`(() => {
  const cls = (el) => {
    if (!el) return null;
    const c = typeof el.className === 'string' ? el.className.trim() : (el.getAttribute?.('class') ?? '');
    return c ? c.split(/\s+/).slice(0, 4).join('.') : '';
  };
  const desc = (el) => {
    if (!el) return null;
    const parts = [el.tagName.toLowerCase()];
    const c = cls(el);
    if (c) parts[0] += '.' + c;
    for (const a of ['role', 'data-row-key', 'aria-label', 'aria-level', 'data-testid']) {
      const v = el.getAttribute?.(a);
      if (v) parts.push('[' + a + '="' + String(v).slice(0, 60) + '"]');
    }
    return parts.join('');
  };
  const chain = (el, n = 8) => {
    const out = [];
    let cur = el;
    for (let i = 0; i < n && cur && cur !== document.documentElement; i++) {
      out.push(desc(cur));
      cur = cur.parentElement;
    }
    if (cur === document.documentElement) out.push('html');
    return out;
  };
  const txt = (el, n = 40) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

  const rows = [...document.querySelectorAll('[data-row-key]')].map((el) => ({
    rowKey: el.getAttribute('data-row-key'),
    rowKeyType: (el.getAttribute('data-row-key') || '').split(':')[0],
    tag: el.tagName.toLowerCase(),
    class: el.className?.toString?.() ?? '',
    role: el.getAttribute('role'),
    ariaLevel: el.getAttribute('aria-level'),
    ariaSelected: el.getAttribute('aria-selected'),
    text: txt(el, 80),
    style: el.getAttribute('style'),
    rect: (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })(),
    children: [...el.children].map((c) => ({
      tag: c.tagName.toLowerCase(),
      class: c.className?.toString?.() ?? '',
      role: c.getAttribute('role'),
      ariaLabel: c.getAttribute('aria-label'),
      title: c.getAttribute('title'),
      text: txt(c, 40),
      childCount: c.children.length,
    })),
    ancestors: chain(el, 9),
  }));

  const trees = [...document.querySelectorAll('[role="tree"]')].map((el) => ({
    class: el.className?.toString?.() ?? '',
    ariaLabel: el.getAttribute('aria-label'),
    id: el.id,
    rowCount: el.querySelectorAll('[data-row-key]').length,
    ancestors: chain(el, 6),
  }));

  // container that directly holds rows, walking up from the first row
  const first = document.querySelector('[data-row-key]');
  const holders = [];
  if (first) {
    let cur = first.parentElement;
    for (let i = 0; i < 6 && cur; i++) {
      holders.push({ level: i + 1, desc: desc(cur), class: cur.className?.toString?.() ?? '', childCount: cur.children.length, rowCount: cur.querySelectorAll('[data-row-key]').length, scrollH: cur.scrollHeight, clientH: cur.clientHeight });
      cur = cur.parentElement;
    }
  }

  // sidebar header: smallest element whose trimmed text is exactly the header label
  const headerTexts = ['Workspaces', 'Workspace', '工作区', 'Projects', '项目'];
  const headers = [];
  for (const label of headerTexts) {
    const cands = [...document.querySelectorAll('body *')].filter((el) => (el.textContent || '').trim() === label && el.children.length <= 2);
    for (const el of cands.slice(0, 3)) {
      headers.push({
        label,
        desc: desc(el),
        class: el.className?.toString?.() ?? '',
        ancestors: chain(el, 5),
        parentChildren: [...(el.parentElement?.children ?? [])].map((c) => ({ tag: c.tagName.toLowerCase(), class: c.className?.toString?.() ?? '', ariaLabel: c.getAttribute('aria-label'), title: c.getAttribute('title'), text: txt(c, 24), role: c.getAttribute('role') })),
      });
    }
  }

  const aside = [...document.querySelectorAll('aside, [class*="sidebar" i], [data-slot]')].slice(0, 12).map((el) => ({
    desc: desc(el),
    class: el.className?.toString?.() ?? '',
    slot: el.getAttribute('data-slot'),
    rowCount: el.querySelectorAll('[data-row-key]').length,
  }));

  const slots = [...document.querySelectorAll('[data-slot], [data-dsh-slot], [data-plugin], [data-widget]')].slice(0, 20).map((el) => ({
    tag: el.tagName.toLowerCase(),
    class: el.className?.toString?.() ?? '',
    attrs: [...el.attributes].map((a) => a.name + '=' + String(a.value).slice(0, 40)),
  }));

  const g = (k) => {
    const v = window[k];
    if (v === undefined) return { present: false };
    const out = { present: true, type: typeof v };
    if (v && typeof v === 'object') {
      out.keys = Object.keys(v).slice(0, 40);
      if (out.keys.length <= 12) {
        out.entries = Object.fromEntries(out.keys.map((key) => {
          const val = v[key];
          const objShape = val && typeof val === 'object' ? '{' + Object.keys(val).slice(0, 8).join(',') + '}' : null;
          return [key, val === null ? 'null' : typeof val === 'function' ? 'function' : objShape ?? String(val).slice(0, 80)];
        }));
      }
    }
    return out;
  };

  const bootScripts = [...document.querySelectorAll('script:not([src])')].map((s) => s.textContent.slice(0, 200));

  return {
    url: location.href,
    title: document.title,
    readyState: document.readyState,
    viewport: { w: innerWidth, h: innerHeight },
    bodyClass: document.body?.className ?? '',
    rowCount: rows.length,
    rowsSample: rows.slice(0, 14),
    rowKeySamples: [...new Set(rows.map((r) => r.rowKey))].slice(0, 20),
    trees,
    holders,
    headers,
    aside,
    slots,
    globals: {
      __ModuleLoader__: g('__ModuleLoader__'),
      __DSH_BOOT__: g('__DSH_BOOT__'),
      __DSH_TRANSPORT__: g('__DSH_TRANSPORT__'),
      __DSH_CONTACT_CONFIG__: g('__DSH_CONTACT_CONFIG__'),
      __DSH_PLUGINS__: g('__DSH_PLUGINS__'),
    },
    bootScripts,
    domOutline: (() => {
      const root = document.querySelector('#root') ?? document.body;
      const walk = (el, depth) => {
        if (depth > 4 || !el) return '';
        const line = '  '.repeat(depth) + desc(el) + (el.children.length ? '' : ' :: ' + txt(el, 30)) + '\n';
        return line + [...el.children].slice(0, 12).map((c) => walk(c, depth + 1)).join('');
      };
      return walk(root, 0).slice(0, 8000);
    })(),
  };
})()`;

const { proc, port: devPort } = await ensureBrowser({ port });
try {
  const page = await openGui({ port: devPort });
  let rowsOk = 0;
  try {
    rowsOk = await waitFor(page, 'document.querySelectorAll("[data-row-key]").length', { timeout: 40000 });
  } catch (e) {
    console.error('WARN: no rows appeared:', e.message);
  }
  await new Promise((r) => setTimeout(r, 1200));
  const data = await evaluate(page, PROBE);
  const result = { capturedAt: new Date().toISOString(), devPort, rowsOk, ...data, console: page.consoleLines.slice(-60), errors: page.errors.slice(-30), failedRequests: page.failedRequests.slice(-20) };
  const abs = resolve(WORKSPACE, outPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(result, null, 2), 'utf8');
  if (shotPath) console.log('shot:', await screenshot(page, shotPath));
  console.log('probe:', abs);
  console.log('title:', result.title, '| rows:', result.rowCount, '| errors:', result.errors.length);
  console.log('rowKeys:', JSON.stringify(result.rowKeySamples));
  if (!keepOpen) await page.close();
} finally {
  if (proc) proc.kill();
}
