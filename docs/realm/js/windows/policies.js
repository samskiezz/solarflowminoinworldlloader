/** Policies: the organisation's configurable rules by domain, feature flags with expiry, the change history and the drift from defaults. Changes apply immediately (accessibility hooks, quiet hours, run mode). */
import { h, button, badge, select, empty, download, toast } from '../core/ui.js';
import { POLICY_DEFS, POLICY_DOMAINS, FLAG_DEFS } from '../core/policies.js';
import { section, row, grid, statCard } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

const DOMAIN_LABEL = { accounts: 'Accounts and sessions', projects: 'Projects', compliance: 'Compliance', documents: 'Documents', automation: 'Automation and minions', knowledge: 'Knowledge', realm: 'Realm and accessibility', notifications: 'Notifications and workflows', reports: 'Reports', mobile: 'Mobile and offline', integrations: 'Integrations', security: 'Security and governance', reliability: 'Reliability', testing: 'Product administration' };

function control(ctx, d) {
    const p = ctx.policies; const v = p.get(d.id);
    const apply = (value) => { const r = p.set(d.id, value); if (!r.ok) { toast(`${d.title}: ${r.error}`, { kind: 'warn' }); ctx.refresh('policies'); return; } if (r.changed) { ctx.bus.emit('policies:changed', { id: d.id, value: r.value }); toast(`${d.title} → ${String(r.value)}`, { kind: 'ok', timeout: 1200 }); ctx.refresh('policies'); } };
    if (d.type === 'bool') { const c = h('input', { type: 'checkbox', class: 'checkbox policy-input', 'data-policy': d.id }); c.checked = Boolean(v); c.addEventListener('change', () => apply(c.checked)); return c; }
    if (d.type === 'select') { const s = select(d.options.map((o) => ({ value: o, label: o })), { value: v }); s.classList.add('policy-input'); s.dataset.policy = d.id; s.addEventListener('change', () => apply(s.value)); return s; }
    const i = h('input', { type: d.type === 'number' ? 'number' : 'text', class: 'input policy-input', 'data-policy': d.id, min: d.min, max: d.max, step: d.step ?? (d.type === 'number' ? 'any' : null) }); i.value = String(v); i.addEventListener('change', () => apply(i.value)); return i;
}

function renderPolicies(body, ctx) {
    const p = ctx.policies; const s = p.summary(); const dom = ctx.store.get('ui.policyDomain', 'automation');
    const picker = select(POLICY_DOMAINS.map((d) => ({ value: d, label: DOMAIN_LABEL[d] || d })), { value: dom }); picker.classList.add('policy-domain'); picker.addEventListener('change', () => { ctx.store.set('ui.policyDomain', picker.value); ctx.refresh('policies'); });
    body.append(grid(4, statCard('Policies', s.policies, `${s.changed} changed from default`), statCard('Flags', s.flags, `${s.flagsOn} on`), statCard('Programme items', s.items, 'implemented as policies'), statCard('Changes', s.history, 'in the history')));
    body.append(section(null, row(picker, badge(p.automationAllowed() ? 'automation running' : 'automation stopped', p.automationAllowed() ? 'ok' : 'bad'), h('span', { class: 'muted small' }, 'Changes apply at once and are journaled.'))));
    body.append(section(DOMAIN_LABEL[dom] || dom, h('table', { class: 'data-table policy-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Policy'), h('th', {}, 'Value'), h('th', {}, 'Default'), h('th', {}, 'Items'), h('th', {}, ''))), h('tbody', {}, p.list(dom).map((d) => h('tr', { class: `policy-row ${d.isDefault ? '' : 'changed'}` }, h('td', {}, d.title, d.unit ? h('span', { class: 'muted small' }, ` (${d.unit})`) : null), h('td', {}, control(ctx, d)), h('td', { class: 'muted small' }, String(d.default)), h('td', { class: 'muted small' }, d.items.map((n) => `#${n}`).join(' ')), h('td', {}, d.isDefault ? '' : button('Reset', () => { p.reset(d.id); ctx.bus.emit('policies:changed', { id: d.id, value: p.get(d.id) }); ctx.refresh('policies'); }, { small: true }))))))));
}

function renderFlags(body, ctx) {
    const p = ctx.policies;
    body.append(section('Feature flags', h('table', { class: 'data-table flag-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Flag'), h('th', {}, 'On'), h('th', {}, 'Owner'), h('th', {}, 'Expires'), h('th', {}, ''))), h('tbody', {}, p.flags().map((f) => { const c = h('input', { type: 'checkbox', class: 'checkbox flag-input', 'data-flag': f.id }); c.checked = f.on; c.addEventListener('change', () => { p.setFlag(f.id, c.checked, { expiresInDays: 90 }); ctx.bus.emit('policies:changed', { id: f.id, value: c.checked }); ctx.refresh('policies'); }); return h('tr', { class: 'flag-row' }, h('td', {}, f.title, h('span', { class: 'muted small' }, ` ${f.id}`)), h('td', {}, c), h('td', { class: 'small' }, f.set ? f.set.owner : 'default'), h('td', { class: 'small' }, f.set && f.set.expires ? [new Date(f.set.expires).toISOString().slice(0, 10), f.expired ? badge('expired', 'bad') : f.expiringSoon ? badge('expiring', 'warn') : null] : '–'), h('td', {}, f.set ? button('Clear', () => { ctx.store.set(`policies.flags.${f.id}`, undefined); ctx.refresh('policies'); }, { small: true }) : '')); }))),
        h('p', { class: 'muted small' }, 'A flag switched here expires in 90 days so stale flags surface; the Programme, Registers and Policies windows and the crowd, bloom and language-model dialogue are behind flags.')));
}

function renderHistory(body, ctx) {
    const p = ctx.policies; const drift = p.drift(); const hist = p.history().slice().reverse();
    body.append(section('Drift from defaults', drift.length ? h('table', { class: 'data-table drift-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Policy'), h('th', {}, 'Value'), h('th', {}, 'Default'), h('th', {}, 'Changed by'))), h('tbody', {}, drift.map((d) => h('tr', { class: 'drift-row' }, h('td', {}, d.title), h('td', {}, String(d.value)), h('td', { class: 'muted' }, String(d.default)), h('td', { class: 'small' }, d.by ? `${d.by} · ${new Date(d.at).toISOString().slice(0, 10)}` : '–'))))) : empty('Every policy is at its default.'),
        row(button('Export policies', () => download('policies.json', p.export(), 'application/json'), { small: true }))));
    body.append(section('Change history', hist.length ? h('ul', { class: 'feed policy-history' }, hist.slice(0, 120).map((e) => h('li', { class: 'feed-item' }, h('span', { class: 'feed-icon' }, e.reason === 'flag' ? '⚑' : e.reason === 'reset' ? '↺' : '✎'), h('span', {}, `${e.id}: ${String(e.from)} → ${String(e.to)}`), h('span', { class: 'muted small' }, `${e.by} · ${new Date(e.at).toISOString().slice(0, 16).replace('T', ' ')}`)))) : empty('No changes yet.')));
}

export function def(ctx) {
    return {
        id: 'policies', title: 'Policies', icon: '⚖', hotkey: null, width: 960, height: 660,
        tabs: [{ id: 'policies', label: 'Policies', icon: '⚖' }, { id: 'flags', label: 'Flags', icon: '⚑' }, { id: 'history', label: 'History', icon: '🕓' }],
        render(body, { tab }) { if (tab === 'flags') return renderFlags(body, ctx); if (tab === 'history') return renderHistory(body, ctx); return renderPolicies(body, ctx); }
    };
}

export const FEATURES = [
    { id: 'win.policies.edit', title: 'Policies render by domain with live controls; a change applies, journals and shows as drift', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('ui.policyDomain', 'accounts'); let b = openWindow(t.ctx, def(t.ctx)); const inp = q(b, '[data-policy="session.timeoutMinutes"]'); inp.value = '45'; fire(inp, 'change'); const set = t.ctx.policies.get('session.timeoutMinutes') === 45; b = openWindow(t.ctx, def(t.ctx), { tab: 'history' }); const ok = set && qa(b, '.drift-row').length === 1 && qa(b, '.policy-history .feed-item').length === 1; t.done(); return ok; } },
    { id: 'win.policies.bounds', title: 'Out-of-range values are refused and the control snaps back', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('ui.policyDomain', 'accounts'); let b = openWindow(t.ctx, def(t.ctx)); const inp = q(b, '[data-policy="session.timeoutMinutes"]'); inp.value = '2'; fire(inp, 'change'); b = t.ctx.wm.windows.get('policies').body; const ok = t.ctx.policies.get('session.timeoutMinutes') === 60 && q(b, '[data-policy="session.timeoutMinutes"]').value === '60'; t.done(); return ok; } },
    { id: 'win.policies.flags', title: 'Flags switch with an expiry and show their owner', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx), { tab: 'flags' }); const c = q(b, '[data-flag="flag.twoDRealm"]'); c.checked = true; fire(c, 'change'); b = t.ctx.wm.windows.get('policies').body; const ok = t.ctx.policies.flag('flag.twoDRealm') && /expir|20\d\d-/.test(b.textContent) && qa(b, '.flag-row').length === FLAG_DEFS.length; t.done(); return ok; } }
];
