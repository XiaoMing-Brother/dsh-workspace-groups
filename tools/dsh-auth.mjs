// Derive the DSH browser-session cookie for the local web GUI, read-only.
// Sources (both read, never written):
//   - COOKIE_PREFIX token  : <DSH install>/dsh/node_modules/@deepseek-ai/dsh-client-connection/lib/index.js
//   - signing secret       : %USERPROFILE%\.dsh\.credentials.yaml  (records["client-connection/browser-session"].payload.secret)
// Cookie shape (see encodeCookie): `v1.<base64url(JSON payload)>.<base64url(hmac-sha256(body, secret))>`
//   payload = { version: 1, authority, issuedAt, expiresAt }
// Name shape (see cookieName): COOKIE_PREFIX + base64url(sha256(authority without :port))
import { createHash, createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DSH_HOMES = [
  process.env.DSH_HOME,
  join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'npm', 'node_modules', '@deepseek-ai', 'dsh'),
  join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Programs', 'DeepSeek Harness', 'resources', 'app', 'dsh'),
].filter(Boolean);

const DSH_DEFAULT_HOME = DSH_HOMES.find((dir) => existsSync(join(dir, 'node_modules', '@deepseek-ai', 'dsh-client-connection', 'lib', 'index.js'))) ?? DSH_HOMES[0];

const b64url = (buf) => Buffer.from(buf).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

function readCookiePrefix(dshHome = DSH_DEFAULT_HOME) {
  const file = join(dshHome, 'node_modules', '@deepseek-ai', 'dsh-client-connection', 'lib', 'index.js');
  const src = readFileSync(file, 'utf8');
  const m = src.match(/const COOKIE_PREFIX = "([^"]+)"/);
  if (!m) throw new Error(`COOKIE_PREFIX not found in ${file}`);
  return m[1];
}

function readSecret() {
  const file = join(homedir(), '.dsh', '.credentials.yaml');
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  let inBlock = false;
  let blockIndent = 0;
  for (const line of lines) {
    if (/^\s*client-connection\/browser-session:\s*$/.test(line)) {
      inBlock = true;
      blockIndent = line.length - line.trimStart().length;
      continue;
    }
    if (!inBlock) continue;
    const indent = line.length - line.trimStart().length;
    if (line.trim() && indent <= blockIndent) break; // left the block
    const m = line.match(/^\s*secret:\s*(\S+)\s*$/);
    if (m) return m[1];
  }
  throw new Error(`browser-session secret not found in ${file}`);
}

/**
 * @param {object} [opts]
 * @param {string} [opts.host] default 127.0.0.1
 * @param {number} [opts.port] default 37072
 * @param {number} [opts.maxAgeDays] default 30
 * @returns {{name: string, value: string, url: string, host: string, expires: number}}
 */
export function dshSessionCookie({ host = '127.0.0.1', port = 37072, maxAgeDays = 30 } = {}) {
  const prefix = readCookiePrefix();
  // storedSecret() -> canonicalSecret() decodes the YAML secret from base64url to 32 raw bytes,
  // and that Buffer is the HMAC key. Do not use the YAML string directly.
  const secret = Buffer.from(readSecret().replaceAll('-', '+').replaceAll('_', '/'), 'base64');
  const url = `http://${host}:${port}`;
  const authority = `${host}:${port}`; // requestAudience -> url.host
  const name = prefix + b64url(createHash('sha256').update(authority).digest());
  const now = Date.now();
  const expiresAt = now + maxAgeDays * 86400_000;
  const payload = { version: 1, authority, issuedAt: now, expiresAt };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = b64url(createHmac('sha256', secret).update(body).digest());
  return { name, value: `v1.${body}.${sig}`, url, host, expires: expiresAt };
}
