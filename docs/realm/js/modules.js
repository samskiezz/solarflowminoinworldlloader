/**
 * Module manifest: every module that registers features. app.js and the
 * self-test page both import this so the registry is identical everywhere.
 */
import * as registry from './core/registry.js';

export const MODULE_PATHS = {
    'core/bus': () => import('./core/bus.js'), 'core/store': () => import('./core/store.js'), 'core/registry': () => import('./core/registry.js'), 'core/keybinds': () => import('./core/keybinds.js'),
    'core/i18n': () => import('./core/i18n.js'), 'core/clock': () => import('./core/clock.js'), 'core/ui': () => import('./core/ui.js'), 'core/wm': () => import('./core/wm.js'), 'core/commands': () => import('./core/commands.js'), 'core/context': () => import('./core/context.js'),
    'domain/pv': () => import('./domain/pv.js'), 'domain/ac': () => import('./domain/ac.js'), 'domain/battery': () => import('./domain/battery.js'), 'domain/incentives': () => import('./domain/incentives.js'), 'domain/yield': () => import('./domain/yield.js'), 'domain/loads': () => import('./domain/loads.js'),
    'domain/standards': () => import('./domain/standards.js'), 'domain/checklists': () => import('./domain/checklists.js'), 'domain/commissioning': () => import('./domain/commissioning.js'), 'domain/labels': () => import('./domain/labels.js'), 'domain/jobs': () => import('./domain/jobs.js'), 'domain/products': () => import('./domain/products.js'), 'domain/report': () => import('./domain/report.js'), 'domain/jurisdictions': () => import('./domain/jurisdictions.js'), 'domain/pricing': () => import('./domain/pricing.js'), 'domain/serials': () => import('./domain/serials.js'), 'domain/dnsp': () => import('./domain/dnsp.js'), 'domain/handover': () => import('./domain/handover.js'),
    'sim/needs': () => import('./sim/needs.js'), 'sim/traits': () => import('./sim/traits.js'), 'sim/skills': () => import('./sim/skills.js'), 'sim/memory': () => import('./sim/memory.js'), 'sim/planner': () => import('./sim/planner.js'), 'sim/dialogue': () => import('./sim/dialogue.js'), 'sim/economy': () => import('./sim/economy.js'), 'sim/events': () => import('./sim/events.js'), 'sim/agent': () => import('./sim/agent.js'), 'sim/world': () => import('./sim/world.js'), 'sim/suggestions': () => import('./sim/suggestions.js'),
    'windows/jobs': () => import('./windows/jobs.js'), 'windows/crew': () => import('./windows/crew.js'), 'windows/character': () => import('./windows/character.js'), 'windows/dashboard': () => import('./windows/dashboard.js'), 'windows/quests': () => import('./windows/quests.js'), 'windows/spellbook': () => import('./windows/spellbook.js'), 'windows/inventory': () => import('./windows/inventory.js'), 'windows/codex': () => import('./windows/codex.js'), 'windows/checklists': () => import('./windows/checklists.js'), 'windows/commissioning': () => import('./windows/commissioning.js'), 'windows/labels': () => import('./windows/labels.js'), 'windows/loads': () => import('./windows/loads.js'), 'windows/reports': () => import('./windows/reports.js'), 'windows/map': () => import('./windows/map.js'), 'windows/journal': () => import('./windows/journal.js'), 'windows/chat': () => import('./windows/chat.js'), 'windows/achievements': () => import('./windows/achievements.js'), 'windows/market': () => import('./windows/market.js'), 'windows/settings': () => import('./windows/settings.js'), 'windows/help': () => import('./windows/help.js'), 'windows/selftest': () => import('./windows/selftest.js'), 'windows/proposal': () => import('./windows/proposal.js'), 'windows/serials': () => import('./windows/serials.js'), 'windows/dnsp': () => import('./windows/dnsp.js'), 'windows/survey': () => import('./windows/survey.js'), 'windows/schedule': () => import('./windows/schedule.js'), 'windows/suggestions': () => import('./windows/suggestions.js'), 'windows/analytics': () => import('./windows/analytics.js'), 'windows/notifications': () => import('./windows/notifications.js'), 'windows/handover': () => import('./windows/handover.js'), 'windows/wizard': () => import('./windows/wizard.js'),
    'shell': () => import('./shell.js')
};

export const WINDOW_MODULES = Object.keys(MODULE_PATHS).filter((k) => k.startsWith('windows/'));

let loaded = null;
export async function loadAll() {
    if (loaded) return loaded;
    const modules = {};
    for (const [id, load] of Object.entries(MODULE_PATHS)) {
        const mod = await load();
        modules[id] = mod;
        if (Array.isArray(mod.FEATURES)) registry.register(id, mod.FEATURES);
    }
    loaded = modules;
    return modules;
}

export { registry };
