// Drive the grouped browser through real DOM events, then screenshot.
// Usage: node tools/act.mjs --url http://127.0.0.1:3080 --out tools/shots/grouped.png
import { ensureBrowser, openGui, screenshot, evaluate, sleep } from './dsh-page.mjs';
import { resolve, dirname } from 'node:path';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { WORKSPACE } from './dsh-page.mjs';

const argv = process.argv.slice(2);
const arg = (k, d = undefined) => {
  const i = argv.indexOf(`--${k}`);
  return i === -1 ? d : (argv[i + 1] ?? true);
};
const url = arg('url', 'http://127.0.0.1:3080');
const out = arg('out', 'tools/shots/grouped.png');
const diagOut = out.replace(/\.png$/, '.json');
const width = Number(arg('w', 1440));
const height = Number(arg('h', 960));

const HELPERS = String.raw`
window.__wg = {
  setValue(el, v) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  },
  click(el) { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); },
  key(el, key) { el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); },
  wsRow(name) {
    return [...document.querySelectorAll('.wg-ws-row')].find((r) => (r.querySelector('.wg-title')?.textContent ?? '').trim() === name) ?? null;
  },
  groupRow(name) {
    return [...document.querySelectorAll('.wg-group-row')].find((r) => (r.querySelector('.wg-title')?.textContent ?? '').trim() === name) ?? null;
  },
  menuItem(text) {
    return [...document.querySelectorAll('.wg-menu .wg-menu-item')].find((b) => b.textContent.includes(text)) ?? null;
  },
  moreBtn(row) {
    const btns = [...row.querySelectorAll('button.wg-iconbtn')];
    return btns.find((b) => b.title === '更多') ?? btns[btns.length - 1] ?? null;
  },
  async newGroup(name) {
    const add = [...document.querySelectorAll('button.wg-iconbtn')].find((b) => b.title === '新建分区');
    if (!add) return 'no-add-button';
    this.click(add);
    await new Promise((r) => setTimeout(r, 200));
    const input = document.querySelector('.wg-input');
    if (!input) return 'no-input';
    this.setValue(input, name);
    await new Promise((r) => setTimeout(r, 40));
    this.key(input, 'Enter');
    await new Promise((r) => setTimeout(r, 200));
    return 'ok';
  },
  async move(wsName, groupName) {
    const row = this.wsRow(wsName);
    if (!row) return 'no-row:' + wsName;
    const btn = this.moreBtn(row);
    if (!btn) return 'no-more';
    this.click(btn);
    await new Promise((r) => setTimeout(r, 220));
    const item = this.menuItem(groupName);
    if (!item) return 'no-group:' + groupName;
    this.click(item);
    await new Promise((r) => setTimeout(r, 200));
    return 'ok';
  },
};
'ready'
`;

const steps = [];
const planFile = arg('planfile', null);
const plan = planFile ? JSON.parse(readFileSync(resolve(WORKSPACE, planFile), 'utf8')) : JSON.parse(arg('plan', '[]'));
for (const step of plan) steps.push(step);

const br = await ensureBrowser({ width, height, profileDir: resolve(WORKSPACE, 'tools', `.chrome-run-${process.pid}`) });
try {
  const page = await openGui({ port: br.port, url, width, height });
  for (let i = 0; i < 80; i++) {
    const ready = await evaluate(page, `document.querySelectorAll('.wg-ws-row').length > 0`);
    if (ready) break;
    await sleep(250);
  }
  await evaluate(page, HELPERS);
  await sleep(500);

  const log = [];
  for (const step of steps) {
    if (step.js) {
      const value = await evaluate(page, step.js, { awaitPromise: true });
      log.push({ js: step.js, value });
    }
    await sleep(step.wait ?? 350);
  }

  const diag = await evaluate(page, String.raw`(() => ({
    groups: [...document.querySelectorAll('.wg-group-row .wg-title')].map((n) => n.textContent.trim()),
    workspaces: [...document.querySelectorAll('.wg-ws-row .wg-title')].map((n) => n.textContent.trim()),
    sessions: document.querySelectorAll('.wg-session-row').length,
    stored: localStorage.getItem('dsh.workspace.groups.v1'),
  }))()`);
  const result = { capturedAt: new Date().toISOString(), steps: log, diag, console: page.consoleLines.slice(-40), errors: page.errors.slice(-20) };
  const shot = await screenshot(page, out);
  let shot2 = null;
  if (arg('collapseall', false)) {
    await evaluate(page, `(() => { for (const r of document.querySelectorAll('.wg-group-row')) { if (r.getAttribute('aria-expanded') === 'true') r.dispatchEvent(new MouseEvent('click', { bubbles: true })); } return true; })()`);
    await sleep(700);
    shot2 = await screenshot(page, arg('out2', out.replace(/\.png$/, '-collapsed.png')));
  }
  if (arg('reload', false)) {
    await page.call('Page.reload', {});
    for (let i = 0; i < 60; i++) {
      const back = await evaluate(page, `document.querySelectorAll('.wg-group-row').length > 0`).catch(() => false);
      if (back) break;
      await sleep(250);
    }
    await sleep(800);
    result.afterReload = await evaluate(page, String.raw`(() => ({
      groups: [...document.querySelectorAll('.wg-group-row .wg-title')].map((n) => n.textContent.trim()),
      workspaces: [...document.querySelectorAll('.wg-ws-row .wg-title')].map((n) => n.textContent.trim()),
      sessions: document.querySelectorAll('.wg-session-row').length,
    }))()`);
  }
  const absDiag = resolve(WORKSPACE, diagOut);
  mkdirSync(dirname(absDiag), { recursive: true });
  writeFileSync(absDiag, JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify({ shot, shot2, diag: absDiag, groups: diag.groups, workspaces: diag.workspaces, sessions: diag.sessions, afterReload: result.afterReload, errors: result.errors.length }, null, 2));
  if (!arg('keepopen', false)) await page.close();
} finally {
  if (br.proc) br.proc.kill();
}
