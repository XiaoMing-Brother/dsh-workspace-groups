// Minimal CDP client over Node's built-in WebSocket (Node >= 22). No deps.
export async function browserEndpoint(port) {
  const res = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`devtools /json/version -> ${res.status}`);
  return (await res.json()).webSocketDebuggerUrl;
}

export async function connect(port) {
  const wsUrl = await browserEndpoint(port);
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = (e) => rej(new Error(`ws connect failed: ${e?.message ?? 'error'}`));
  });

  let seq = 0;
  const pending = new Map();
  const events = [];
  const subs = new Set();

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(Object.assign(new Error(`${msg.error.message} (${msg.error.code})`), { cdp: msg.error }));
      else res(msg.result);
      return;
    }
    if (msg.method) {
      events.push({ ts: Date.now(), ...msg });
      for (const fn of subs) fn(msg);
    }
  };

  const send = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const id = ++seq;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      setTimeout(() => {
        if (pending.has(id)) { pending.delete(id); rej(new Error(`CDP timeout: ${method}`)); }
      }, 60000).unref?.();
    });

  const once = (method, sessionId, ms = 30000) =>
    new Promise((res, rej) => {
      const t = setTimeout(() => { subs.delete(fn); rej(new Error(`event timeout: ${method}`)); }, ms);
      const fn = (m) => {
        if (m.method !== method) return;
        if (sessionId && m.sessionId !== sessionId) return;
        clearTimeout(t); subs.delete(fn); res(m.params);
      };
      subs.add(fn);
    });

  async function newPage(url = 'about:blank') {
    const { targetId } = await send('Target.createTarget', { url });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const call = (method, params) => send(method, params, sessionId);
    return { targetId, sessionId, call };
  }

  return { ws, send, once, newPage, events, close: () => ws.close() };
}

export async function evaluate(page, expression, { awaitPromise = false } = {}) {
  const r = await page.call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise,
    userGesture: true,
  });
  if (r.exceptionDetails) {
    throw new Error(`eval threw: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
  }
  return r.result?.value;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
