// Runs docs/realm/selftest.html in Chromium and prints the registry summary.
// Usage: node tests/browser/realm-selftest.js docs [screenshot.png]  (needs: npm i --no-save playwright; CHROMIUM_PATH optional)
/* global window */
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const root = require('path').resolve(process.argv[2] || 'docs'); const port = 3998;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); res.end('nf'); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); }); });
server.listen(port, async () => {
    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, headless: false, args: ['--headless=new', '--no-sandbox'] } : { headless: true });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${port}/realm/selftest.html`);
    await page.waitForFunction(() => window.__REALM_SELFTEST__, null, { timeout: 120000 });
    const r = await page.evaluate(() => window.__REALM_SELFTEST__); process.exitCode = r.error || r.failed || errors.length ? 1 : 0;
    if (r.error) { console.log('CRASH', r.error, r.stack); }
    else { console.log(`total=${r.total} passed=${r.passed} failed=${r.failed} skipped=${r.skipped}`); for (const f of r.failures) console.log(`FAIL ${f.id}: ${f.error}`); }
    for (const e of errors) console.log(e);
    if (process.argv[3]) await page.screenshot({ path: process.argv[3] });
    await browser.close(); server.close();
});
