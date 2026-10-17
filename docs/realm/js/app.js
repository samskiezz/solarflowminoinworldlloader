/** SolarFlow Realm – bootstrap: the 3D game plus the window system as its UI. */
import { createContext } from './core/context.js';
import { loadAll } from './modules.js';
import { registerWindows, mountShell, restoreSession, showOnboarding, startAutosave } from './shell.js';
import { toast } from './core/ui.js';

async function boot() {
    const root = document.getElementById('realm-desktop');
    let storage = null;
    try { storage = window.localStorage; storage.setItem('__realm_probe', '1'); storage.removeItem('__realm_probe'); } catch (error) { storage = null; }
    const ctx = createContext({ storage, root });
    window.REALM = ctx;
    const modules = await loadAll();
    registerWindows(ctx, modules);
    mountShell(ctx, { top: document.getElementById('realm-top'), bottom: document.getElementById('realm-bottom'), minimap: document.getElementById('realm-minimap'), dock: document.getElementById('realm-dock') });
    ctx.store.set('stats.sessions', (ctx.store.get('stats.sessions') || 0) + 1);
    ctx.loadProducts('../data/cec-products.json');
    ctx.loadLibrary('../data/knowledge');
    // A sealed real-business snapshot shipped next to the site: offer to unseal it until a model is loaded.
    ctx.business.probeShipped().then((url) => { if (url && !ctx.business.model) { ctx.refresh(); toast('Your sealed business snapshot is here – open Business (Shift+B) and unseal it with your passphrase', { kind: 'info', timeout: 9000 }); } });
    // The real business: model from the server (or the cached/imported snapshot), mirrored into the world as houses and quests.
    ctx.business.load().then((model) => { if (model) { const r = ctx.business.syncWorld(); ctx.saveWorld(); if (r.created) toast(`${r.created} real sites added to Solarhaven`, { kind: 'ok' }); ctx.refresh(); } }).catch((error) => console.warn('business model unavailable', error));
    ctx.bus.on('business:loaded', () => { const r = ctx.business.syncWorld(); ctx.saveWorld(); ctx.refresh(); if (r.created) toast(`${r.created} real sites added to Solarhaven`, { kind: 'ok' }); });
    if (!storage) toast('Browser storage is unavailable – progress will not persist', { kind: 'warn', timeout: 8000 });

    // The world
    let game = null;
    const title = document.getElementById('realm-title'); const play = document.getElementById('realm-play'); const loading = document.getElementById('realm-loading');
    try {
        const { startGame } = await import('./game/game.js');
        game = startGame(ctx, { canvas: document.getElementById('realm-game'), overlayHost: document.getElementById('realm-overlay'), minimapHost: document.getElementById('realm-minimap'), trackerHost: document.getElementById('realm-tracker') });
        window.GAME = game;
        loading.textContent = `World ready · ${ctx.world.agents.length} crew in town`;
    } catch (error) {
        console.error(error);
        document.body.classList.remove('game');
        loading.textContent = `3D world unavailable (${error.message}). The workstation still works.`;
    }
    const enter = async () => {
        title.classList.add('hidden');
        document.getElementById('realm-game').focus();
        if (!ctx.store.get('onboarding.done')) await showOnboarding(ctx);
        else { restoreSession(ctx); toast(ctx.t('toast.welcome', { name: ctx.profile().name }), { kind: 'ok', timeout: 2500 }); }
        startAutosave(ctx);
        ctx.clock.start();
        window.REALM_READY = true;
    };
    play.addEventListener('click', enter);
    if (new URLSearchParams(location.search).has('autoplay')) enter();
}

boot().catch((error) => {
    console.error(error);
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0d1220;color:#ff5f6d;font-family:sans-serif;padding:20px;text-align:center;z-index:99';
    el.innerHTML = `<div><h2>SolarFlow Realm failed to start</h2><p>${String(error && error.message || error).replace(/</g, '&lt;')}</p><p>Try a current browser (ES modules, WebGL) and reload.</p></div>`;
    document.body.append(el);
});
