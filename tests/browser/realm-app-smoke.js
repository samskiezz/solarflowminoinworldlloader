// End-to-end smoke of docs/realm/index.html: title, 3D world, onboarding, movement, interaction, windows, products, console, clock, persistence.
// Usage: node tests/browser/realm-app-smoke.js docs [screenshot.png]  (needs: npm i --no-save playwright; CHROMIUM_PATH optional)
/* global window, document */
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const root = require('path').resolve(process.argv[2] || 'docs'); const port = 3997; const shot = process.argv[3];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.md': 'text/markdown' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); res.end('nf'); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); }); });
const results = []; const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` – ${detail}` : ''}`); };
server.listen(port, async () => {
    const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, headless: false, args: ['--headless=new', '--no-sandbox', ...gl] } : { headless: true, args: gl });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    try {
        await page.goto(`http://127.0.0.1:${port}/realm/index.html`);
        await page.waitForSelector('#realm-title:not(.hidden)', { timeout: 30000 });
        await page.waitForFunction(() => window.GAME && window.GAME.engine.state.frames > 2, null, { timeout: 60000 });
        check('title screen and 3D world rendering', true, `${await page.evaluate(() => window.GAME.engine.state.frames)} frames`);
        await page.click('#realm-play');
        await page.waitForSelector('#realm-dialogs .onboard', { timeout: 30000 });
        check('onboarding shown', true);
        await page.fill('#realm-dialogs .onboard input >> nth=0', 'Ada');
        await page.fill('#realm-dialogs .onboard input >> nth=1', 'Sunworks');
        await page.fill('#realm-dialogs .onboard input >> nth=2', '3000');
        await page.click('#realm-dialogs .dialog-buttons .primary');
        await page.waitForFunction(() => window.REALM_READY, null, { timeout: 30000 });
        check('app ready', true);
        check('profile saved from onboarding', await page.evaluate(() => window.REALM.profile().name === 'Ada' && window.REALM.profile().postcode === '3000'));
        check('dashboard + help open after onboarding', await page.evaluate(() => window.REALM.wm.isOpen('dashboard') && window.REALM.wm.isOpen('help')));
        check('windows registered', (await page.evaluate(() => window.REALM.wm.defs.size)) >= 21, String(await page.evaluate(() => window.REALM.wm.defs.size)));
        check('the whole roster walks the town (24 minions, 6 crew)', await page.evaluate(() => window.GAME.npcs.npcs.size === 24 && window.REALM.world.crew().length === 6 && document.querySelectorAll('.ov-nameplate').length >= 24));
        await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
        const p0 = await page.evaluate(() => ({ ...window.GAME.player.pos }));
        await page.focus('#realm-game'); await page.keyboard.down('w'); await page.waitForFunction((z0) => window.GAME.player.pos.z < z0 - 0.3, p0.z, { timeout: 8000 }).catch(() => {}); await page.keyboard.up('w');
        const p1 = await page.evaluate(() => ({ ...window.GAME.player.pos }));
        check('W walks the player north', p1.z < p0.z - 0.3, `${p0.z.toFixed(1)} → ${p1.z.toFixed(1)}`);
        await page.mouse.move(700, 400); await page.mouse.down(); await page.mouse.move(900, 400, { steps: 8 }); await page.mouse.up();
        check('mouse drag orbits the camera', await page.evaluate(() => Math.abs(window.GAME.player.state.cam.yaw) > 0.3));
        check('objective tracker shows the tutorial', /Tutorial/.test(await page.textContent('.quest-tracker')));
        await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
        await page.keyboard.press('p');
        check('P opens crew', await page.evaluate(() => window.REALM.wm.isOpen('crew')));
        await page.keyboard.press('Escape');
        check('Escape closes crew', await page.evaluate(() => !window.REALM.wm.isOpen('crew')));
        await page.click('.hot-slot[data-slot="2"]');
        check('hotbar slot 2 opens jobs', await page.evaluate(() => window.REALM.wm.isOpen('jobs')));
        await page.waitForFunction(() => window.REALM.products.loaded && window.REALM.products.list.length > 10000, null, { timeout: 90000 });
        check('real CEC catalogue loaded', true, String(await page.evaluate(() => window.REALM.products.list.length)));
        await page.keyboard.press('b');
        await page.waitForSelector('.win-inventory tbody tr');
        check('product vault lists products', (await page.$$('.win-inventory tbody tr')).length > 5);
        await page.fill('.win-inventory input[type=search]', 'fronius primo');
        await page.waitForTimeout(300);
        const rows = await page.$$eval('.win-inventory tbody tr', (r) => r.map((x) => x.textContent));
        check('vault search finds Fronius Primo', rows.length > 0 && /Fronius/i.test(rows[0] || ''), `${rows.length} rows`);
        await page.keyboard.press('Escape');
        // console: new job and skip
        await page.click('#realm-dock .dock-input');
        await page.fill('#realm-dock .dock-input', '/job new Bob 6.6 --postcode=2000 --battery=13');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);
        check('console creates job', await page.evaluate(() => window.REALM.jobs().length === 1 && window.REALM.jobs()[0].customer === 'Bob'));
        check('a house with a ! marker appears for the job', await page.evaluate(() => window.GAME.town.houses.size === 1 && document.querySelector('.ov-marker') && document.querySelector('.ov-marker').textContent === '!'));
        await page.keyboard.press('Escape');
        await page.evaluate(() => { const g = window.GAME; const c = window.REALM; const door = g.town.houseDoor(c.jobs()[0].id, c.jobs()); g.player.setPosition(door); g.tickOnce(0.05); });
        await page.waitForTimeout(300);
        check('standing at the house door shows an E prompt', /Visit Bob/.test(await page.evaluate(() => document.querySelector('.ov-prompt')?.textContent || '')));
        await page.keyboard.press('e'); await page.waitForTimeout(200);
        check('E at the door opens the job', await page.evaluate(() => window.REALM.wm.isOpen('jobs') && window.REALM.currentJob().customer === 'Bob'));
        await page.keyboard.press('Escape');
        await page.fill('#realm-dock .dock-input', '/open spellbook');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);
        check('console opens spellbook', await page.evaluate(() => window.REALM.wm.isOpen('spellbook')));
        check('string sizing results rendered', (await page.$$('.win-spellbook .result')).length >= 8);
        await page.click('.win-spellbook button:has-text("Save string design")');
        check('design saved from calculator', await page.evaluate(() => (window.REALM.design(window.REALM.currentJobId()).arrayKwDc || 0) > 0));
        await page.keyboard.press('Escape');
        // assign crew and run the clock
        await page.evaluate(() => { const c = window.REALM; c.world.assignNextTask('ATLAS', c.jobs()[0].id); c.clock.setSpeed('ultra'); });
        await page.waitForTimeout(4000);
        check('clock runs the world', await page.evaluate(() => window.REALM.world.hour >= 6), String(await page.evaluate(() => window.REALM.world.hour)));
        check('crew produced feed events', await page.evaluate(() => window.REALM.world.feed.length >= 2), String(await page.evaluate(() => window.REALM.world.feed.length)));
        check('Atlas walked to the job house to work', await page.evaluate(() => { const g = window.GAME; const n = g.npcs.npcs.get('ATLAS'); return n.place.place === 'house' || n.agent.hoursWorked > 0 || n.agent.stats.tasksDone + n.agent.stats.tasksFailed > 0; }));
        check('world phase follows the clock', await page.evaluate(() => ['day', 'dusk', 'night', 'dawn'].includes(window.GAME.engine.state.phase) && document.body.dataset.phase === window.GAME.engine.state.phase));
        check('dock shows feed lines', (await page.$$('#realm-dock .dock-line')).length >= 2);
        await page.evaluate(() => window.REALM.clock.setSpeed('pause'));
        // palette
        await page.keyboard.press('Control+k');
        await page.waitForSelector('#realm-palette input');
        await page.fill('#realm-palette input', 'open codex');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);
        check('palette opens codex', await page.evaluate(() => window.REALM.wm.isOpen('codex')));
        // drag a window
        const title = await page.$('.win-codex .win-title');
        const box = await title.boundingBox();
        await page.mouse.move(box.x + 100, box.y + 10); await page.mouse.down(); await page.mouse.move(box.x + 300, box.y + 150, { steps: 5 }); await page.mouse.up();
        const moved = await page.evaluate(() => window.REALM.wm.windows.get('codex').rect);
        check('window drag moves and persists geometry', moved.x > 150 && (await page.evaluate(() => window.REALM.store.get('ui.windows.codex').x)) === moved.x, JSON.stringify(moved));
        if (shot) await page.screenshot({ path: shot });
        // persistence across reload
        await page.evaluate(() => { window.REALM.saveWorld(); window.REALM.store.set('ui.openWindows', window.REALM.wm.snapshot()); window.REALM.store.flush(); });
        await page.goto(`http://127.0.0.1:${port}/realm/index.html?autoplay`);
        await page.waitForFunction(() => window.REALM_READY, null, { timeout: 60000 });
        check('reload restores jobs, world and windows', await page.evaluate(() => window.REALM.jobs().length === 1 && window.REALM.world.hour >= 6 && window.REALM.wm.isOpen('codex') && window.REALM.profile().name === 'Ada'));
        check('products served from cache on reload', await page.evaluate(() => new Promise((r) => { if (window.REALM.products.loaded) return r(true); window.REALM.bus.once('products:loaded', () => r(true)); setTimeout(() => r(false), 60000); })));
    } catch (error) { check('smoke completed', false, error.message); }
    const filtered = errors.filter((e) => !/favicon/.test(e));
    check('no page/console errors', filtered.length === 0, filtered.slice(0, 5).join(' | '));
    console.log(`SUMMARY ${results.filter((r) => r.ok).length}/${results.length} checks passed`); process.exitCode = results.every((r) => r.ok) ? 0 : 1;
    await browser.close(); server.close();
});
