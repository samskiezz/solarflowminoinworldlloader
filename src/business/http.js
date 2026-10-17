/** Small fetch helper for the connectors: JSON in/out, timeouts, retries on 429/5xx, basic/bearer auth. */
'use strict';

const config = require('../config');

async function fetchJson(url, { method = 'GET', headers = {}, body = null, auth = null, timeoutMs = config.business.requestTimeoutMs, retries = 2, fetchFn = globalThis.fetch, form = false } = {}) {
    const h = { accept: 'application/json', ...headers };
    if (auth && auth.bearer) h.authorization = `Bearer ${auth.bearer}`;
    if (auth && auth.basic) h.authorization = `Basic ${Buffer.from(auth.basic).toString('base64')}`;
    if (auth && auth.apiKey) h['x-api-key'] = auth.apiKey;
    let payload = null;
    if (body != null) { if (form) { h['content-type'] = 'application/x-www-form-urlencoded'; payload = new URLSearchParams(body).toString(); } else { h['content-type'] = 'application/json'; payload = JSON.stringify(body); } }
    let attempt = 0;
    for (;;) {
        const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetchFn(url, { method, headers: h, body: payload, signal: controller.signal });
            if ((res.status === 429 || res.status >= 500) && attempt < retries) { attempt++; await new Promise((r) => setTimeout(r, 500 * 2 ** attempt)); continue; }
            const text = await res.text();
            let json = null; try { json = text ? JSON.parse(text) : null; } catch { json = null; }
            if (!res.ok) { const err = new Error(`${method} ${url.replace(/\?.*$/, '')} -> ${res.status}${json && (json.error || json.Message || json.message) ? `: ${json.error || json.Message || json.message}` : ''}`); err.status = res.status; err.body = json || text; throw err; }
            return json;
        } finally { clearTimeout(timer); }
    }
}

module.exports = { fetchJson };
