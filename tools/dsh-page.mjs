// Shared DSH GUI page harness: launch/attach Chrome over CDP, authenticate, probe.
import { connect, evaluate, sleep } from './cdp.mjs';
import { dshSessionCookie } from './dsh-auth.mjs';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const TOOLS = HERE;
export const WORKSPACE = resolve(HERE, '..');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
  join(process.env.LOCALAPPDATA ?? '', 'Microsoft\\Edge\\Application\\msedge.exe'),
];

function chromePath() {
  const explicit = process.env.DSH_SHOT_CHROME;
  if (explicit && existsSync(explicit)) return explicit;
  for (const p of CHROME_CANDIDATES) if (p && existsSync(p)) return p;
  throw new Error('no Chrome/Edge binary found; set DSH_SHOT_CHROME');
}

/** Launch a private headless Chrome; returns {port, proc, profileDir} or attaches to `attachPort`. */
export async function ensureBrowser({ profileDir = join(TOOLS, '.chrome-profile'), width = 1600, height = 1000, port } = {}) {
  if (port) return { port, external: true };
  mkdirSync(profileDir, { recursive: true });
  for (const stale of ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'DevToolsActivePort']) {
    try { rmSync(join(profileDir, stale), { force: true }); } catch {}
  }
  const proc = spawn(chromePath(), [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    `--window-size=${width},${height}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate,MediaRouter',
    '--force-color-profile=srgb',
    'about:blank',
  ], { stdio: 'ignore', detached: false });

  const portFile = join(profileDir, 'DevToolsActivePort');
  let devPort;
  for (let i = 0; i < 100; i++) {
    if (existsSync(portFile)) {
      const txt = readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
      if (txt[0]) { devPort = Number(txt[0]); break; }
    }
    await sleep(100);
  }
  if (!devPort) { proc.kill(); throw new Error('Chrome did not expose DevToolsActivePort'); }
  return { port: devPort, proc, profileDir };
}

/**
 * Open the DSH GUI in a fresh tab, authenticated by the local session cookie.
 * @returns page with .call/.sessionId, console buffers, and helpers
 */
export async function openGui({ port, url = 'http://127.0.0.1:37072', width = 1600, height = 1000, cookieFromPort = undefined }) {
  const br = await connect(port);
  const { targetId } = await br.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await br.send('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => br.send(method, params, sessionId);
  const page = { call, sessionId, targetId, br };

  const consoleLines = [];
  const errors = [];
  const failedRequests = [];
  const subs = [];
  page.onEvent = (fn) => subs.push(fn);

  // The browser-level ws already dispatches session-scoped events; re-subscribe through events buffer.
  const drain = setInterval(() => {
    while (br.events.length) {
      const m = br.events.shift();
      if (m.sessionId && m.sessionId !== sessionId) continue;
      if (m.method === 'Runtime.consoleAPICalled') {
        const text = (m.params.args ?? []).map((a) => a.value ?? a.description ?? a.type).join(' ');
        consoleLines.push({ type: m.params.type, text });
        if (m.params.type === 'error') errors.push({ source: 'console.error', text });
      } else if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails;
        errors.push({ source: 'exception', text: d.exception?.description ?? d.text });
      } else if (m.method === 'Log.entryAdded') {
        const e = m.params.entry;
        consoleLines.push({ type: e.level, text: e.text });
        if (e.level === 'error') errors.push({ source: `log:${e.source}`, text: e.text, url: e.url });
      } else if (m.method === 'Network.loadingFailed') {
        failedRequests.push({ requestId: m.params.requestId, error: m.params.errorText, type: m.params.type });
      }
      for (const fn of subs) fn(m);
    }
  }, 50);
  drain.unref?.();

  await call('Runtime.enable', {});
  await call('Log.enable', {});
  await call('Network.enable', {});
  await call('Page.enable', {});
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

  const cookie = dshSessionCookie({ port: cookieFromPort ?? Number(new URL(url).port) });
  const host = new URL(url).hostname;
  await call('Network.setCookie', {
    name: cookie.name,
    value: cookie.value,
    url: `${new URL(url).origin}/`,
    path: '/',
    domain: host,
    httpOnly: true,
    sameSite: 'Strict',
  });

  await call('Page.navigate', { url: `${new URL(url).origin}/` });
  page.consoleLines = consoleLines;
  page.errors = errors;
  page.failedRequests = failedRequests;
  page.close = async () => { clearInterval(drain); try { await br.send('Target.closeTarget', { targetId }); } catch {} br.close(); };
  return page;
}

export async function waitFor(page, expression, { timeout = 30000, interval = 250 } = {}) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeout) {
    try {
      last = await evaluate(page, expression);
      if (last) return last;
    } catch (e) { last = e.message; }
    await sleep(interval);
  }
  throw new Error(`waitFor timeout (${timeout}ms): ${expression} last=${JSON.stringify(last)}`);
}

export async function screenshot(page, outPath) {
  const abs = resolve(WORKSPACE, outPath);
  mkdirSync(dirname(abs), { recursive: true });
  const { data } = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const { writeFileSync } = await import('node:fs');
  writeFileSync(abs, Buffer.from(data, 'base64'));
  return abs;
}

export { evaluate, sleep };
