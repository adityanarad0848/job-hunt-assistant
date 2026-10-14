// Tiny promise-based HTTP helper using only Node built-ins (no dependencies).
const https = require('https');
const { URL } = require('url');

function request(urlStr, { method = 'GET', headers = {}, body = null, timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(urlStr);
    } catch (e) {
      return reject(new Error(`Invalid URL: ${urlStr}`));
    }

    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const opts = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Accept': 'application/json',
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers,
      },
    };

    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode} for ${urlStr}: ${text.slice(0, 200)}`));
        }
        resolve({ status: res.statusCode, text });
      });
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms: ${urlStr}`));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

async function getJson(url, opts = {}) {
  const { text } = await request(url, opts);
  return JSON.parse(text);
}

async function postJson(url, body, opts = {}) {
  const { text } = await request(url, { ...opts, method: 'POST', body });
  return JSON.parse(text);
}

module.exports = { request, getJson, postJson };
