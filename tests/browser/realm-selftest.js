// Runs docs/realm/selftest.html in Chromium and prints the registry summary.
// Usage: node tests/browser/realm-selftest.js docs [report.json]  (needs: npm i --no-save playwright; CHROMIUM_PATH optional)
/* global window */
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const root = require('path').resolve(process.argv[2] || 'docs'); const port = 3998; const reportPath = process.argv[3] || process.env.REALM_SELFTEST_REPORT || null;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); res.end('nf'); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); }); });
server.listen(port, async () => {
    const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, headless: false, args: ['--headless=new', '--no-sandbox', ...gl] } : { headless: true, args: gl });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${port}/realm/selftest.html`);
    await page.waitForFunction(() => window.__REALM_SELFTEST__, null, { timeout: 120000 });
    const r = await page.evaluate(() => window.__REALM_SELFTEST__);
    if (r.error) { console.log('CRASH', r.error, r.stack); }
    else { console.log(`total=${r.total} passed=${r.passed} failed=${r.failed} skipped=${r.skipped}`); for (const f of r.failures) console.log(`FAIL ${f.id}: ${f.error}`); }
    for (const e of errors) console.log(e);
    if (reportPath && !r.error) fs.writeFileSync(reportPath, JSON.stringify({ at: r.at, total: r.total, passed: r.passed, failed: r.failed, results: r.results.map((x) => ({ id: x.id, module: x.module, title: x.title, status: x.status })) }, null, 1));
    process.exitCode = r.error || r.failed || errors.length ? 1 : 0;
    await browser.close(); server.close();
});
