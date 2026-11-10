// Screenshot + DOM diagnostics for the DSH sidebar at an arbitrary GUI URL.
// Usage: node tools/shot.mjs --url http://127.0.0.1:3080 --out tools/shots/after.png [--keepopen]
import { ensureBrowser, openGui, screenshot, evaluate, sleep } from './dsh-page.mjs';
import { resolve, dirname } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { WORKSPACE } from './dsh-page.mjs';

const argv = process.argv.slice(2);
const arg = (k, d = undefined) => {
  const i = argv.indexOf(`--${k}`);
  return i === -1 ? d : (argv[i + 1] ?? true);
};
const url = arg('url', 'http://127.0.0.1:3080');
const out = arg('out', 'tools/shots/after.png');
const diagOut = arg('diag', out.replace(/\.png$/, '.json'));
const width = Number(arg('w', 1440));
const height = Number(arg('h', 960));
const expression = arg('eval', null);

const DIAG = String.raw`(() => {
  const q = (sel) => document.querySelectorAll(sel).length;
  const txt = (sel, n = 200) => (document.querySelector(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
  const bootPlugins = (() => {
    const b = window.__DSH_BOOT__;
    if (!b) return null;
    const plugins = b.plugins ?? b.entries ?? b.modules ?? null;
    if (Array.isArray(plugins)) return plugins.map((p) => p && (p.id ?? p.name ?? p.moduleName)).filter(Boolean).slice(0, 200);
    return Object.keys(b);
  })();
  return {
    url: location.href,
    title: document.title,
    rootChildren: document.querySelector('#root')?.children?.length ?? 0,
    wgRoot: q('.wg-root'),
    wgGroups: q('.wg-group-row'),
    wgRows: q('.wg-ws-row'),
    wgSessions: q('.wg-session-row'),
    builtinRows: q('[data-row-key]'),
    sidebarText: txt('aside') || txt('[class*="sidebar" i]'),
    bodyText: txt('body', 400),
    hasModuleLoader: typeof window.__ModuleLoader__ !== 'undefined',
    bootKeys: window.__DSH_BOOT__ ? Object.keys(window.__DSH_BOOT__) : null,
    bootPlugins,
    pluginsHasOurs: Array.isArray(bootPlugins) ? bootPlugins.some((x) => String(x).includes('workspace-groups')) : null,
  };
})()`;

const br = await ensureBrowser({ width, height, profileDir: resolve(WORKSPACE, 'tools', `.chrome-run-${process.pid}`) });
try {
  const page = await openGui({ port: br.port, url, width, height });
  // Wait for the shell to settle.
  for (let i = 0; i < 80; i++) {
    const ready = await evaluate(page, `document.querySelector('#root') && document.querySelector('#root').children.length > 0`);
    if (ready) break;
    await sleep(250);
  }
  await sleep(2500);
  const diag = await evaluate(page, DIAG);
  let extra = null;
  if (expression) {
    try { extra = await evaluate(page, expression, { awaitPromise: true }); } catch (e) { extra = { evalError: String(e.message) }; }
  }
  const result = { capturedAt: new Date().toISOString(), devPort: br.port, ...diag, extra, console: page.consoleLines.slice(-80), errors: page.errors.slice(-40), failedRequests: page.failedRequests.slice(-20) };
  const absDiag = resolve(WORKSPACE, diagOut);
  mkdirSync(dirname(absDiag), { recursive: true });
  writeFileSync(absDiag, JSON.stringify(result, null, 2), 'utf8');
  const shot = await screenshot(page, out);
  console.log(JSON.stringify({ shot, diag: absDiag, wgRoot: diag.wgRoot, wgGroups: diag.wgGroups, wgRows: diag.wgRows, builtinRows: diag.builtinRows, pluginsHasOurs: diag.pluginsHasOurs, errors: result.errors.length }, null, 2));
  if (!arg('keepopen', false)) await page.close();
} finally {
  if (br.proc) br.proc.kill();
}
