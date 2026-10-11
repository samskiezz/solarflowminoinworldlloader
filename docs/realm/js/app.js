/** SolarFlow Realm Workstation – bootstrap. */
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
    if (!storage) toast('Browser storage is unavailable – progress will not persist', { kind: 'warn', timeout: 8000 });
    if (!ctx.store.get('onboarding.done')) await showOnboarding(ctx);
    else { restoreSession(ctx); toast(ctx.t('toast.welcome', { name: ctx.profile().name }), { kind: 'ok', timeout: 2500 }); }
    startAutosave(ctx);
    ctx.clock.start();
    window.REALM_READY = true;
}

boot().catch((error) => {
    console.error(error);
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0d1220;color:#ff5f6d;font-family:sans-serif;padding:20px;text-align:center';
    el.innerHTML = `<div><h2>SolarFlow Realm failed to start</h2><p>${String(error && error.message || error).replace(/</g, '&lt;')}</p><p>Try a current browser (ES modules) and reload.</p></div>`;
    document.body.append(el);
});
