/** Shared pieces for the business windows: empty state, severity badges, finding cards, test model. */
import { h, button, badge, dataTable } from '../core/ui.js';
import { section, row, grid, statCard, money } from './_shared.js';
import { SAMPLE_RAW, buildModel } from '../business/model.js';
import { makeTestCtx } from './_testing.js';

export const SEV_KIND = { critical: 'bad', high: 'bad', medium: 'warn', low: 'neutral', info: 'ok' };
export function sevBadge(sev) { return badge(sev, SEV_KIND[sev] || 'neutral'); }
export function fmtDate(d) { if (!d) return '–'; const x = new Date(d); return Number.isNaN(x.getTime()) ? String(d).slice(0, 10) : x.toISOString().slice(0, 10); }
export function link(label, url) { return url ? h('a', { href: url, target: '_blank', rel: 'noopener', class: 'ext-link' }, label, ' ↗') : null; }

/** Shown by every business window until a model is loaded. */
export function needsModel(ctx, body) {
    if (ctx.business.model) return false;
    body.append(section('No business data loaded yet', h('p', { class: 'muted' }, 'The business windows read the model built from ServiceM8, Xero, Gmail, Drive, Calendar and the bank feed. Connect the server (Settings › Business) or import a snapshot file.'),
        row(button('Open Settings › Business', () => ctx.open('settings', { tab: 'business' }), { kind: 'primary', small: true }), button('Load the example business', () => { ctx.business.setModel(SAMPLE_RAW()); ctx.refresh(); }, { small: true }), button('Try the server now', async () => { try { const m = await ctx.business.pullServer(); if (!m) throw new Error('No model on the server yet'); ctx.refresh(); } catch (e) { const { toast } = await import('../core/ui.js'); toast(e.message, { kind: 'warn' }); } }, { small: true }))));
    return true;
}

export function findingCard(ctx, f, { compact = false } = {}) {
    const owner = ctx.world.agent(f.owner);
    const head = h('div', { class: 'finding-head' }, sevBadge(f.severity), h('strong', {}, f.title), f.impact ? h('span', { class: 'gold' }, ` ${money(f.impact)}`) : null);
    if (compact) return h('div', { class: `finding compact sev-${f.severity}`, onclick: () => { ctx.store.set('ui.selectedFinding', f.id); ctx.open('insights'); } }, head, h('div', { class: 'muted small' }, owner ? `${owner.name} · ` : '', f.category));
    return h('div', { class: `finding sev-${f.severity}` }, head,
        h('div', { class: 'finding-detail' }, f.detail || ''),
        f.evidence?.length ? h('ul', { class: 'finding-evidence' }, f.evidence.map((e) => h('li', {}, e))) : null,
        h('div', { class: 'finding-action' }, h('strong', {}, 'Do: '), f.action || ''),
        row(owner ? h('span', { class: 'muted' }, `Owner ${owner.name} (${owner.meta?.title || owner.role})`) : null, ...(f.links || []).map((l) => link(l.label, l.url)), f.entity?.type === 'job' && ctx.job(f.entity.id) ? button('Open job', () => { ctx.setCurrentJob(f.entity.id); ctx.open('jobs', { tab: 'detail' }); }, { small: true }) : null,
            button('Resolve (+credits)', () => { ctx.business.resolve(f.id); ctx.saveWorld(); ctx.refresh(); }, { kind: 'primary', small: true }), button('Snooze 7 d', () => { ctx.business.snooze(f.id, 7); ctx.refresh(); }, { small: true }),
            f.owner && owner ? button(`Ask ${owner.name}`, () => { ctx.store.set('ui.chatAgent', f.owner); ctx.store.set('ui.chatSeed', `About "${f.title}": ${f.detail} What should we do first?`); ctx.open('chat', { tab: 'talk' }); }, { small: true }) : null));
}

export function kpiGrid(items) { return grid(Math.min(4, Math.max(2, items.length)), ...items.map(([label, value, sub, colour]) => statCard(label, value, sub, colour))); }

/** A test context with the example business loaded and mirrored into the world. */
export function makeBusinessCtx() {
    const t = makeTestCtx({ withJob: false });
    t.ctx.business.setModel(buildModel(SAMPLE_RAW(), { now: new Date('2026-10-12T00:00:00Z') }), { persist: false });
    t.ctx.business.syncWorld();
    return t;
}

/** dataTable with value-first cell renderers; returns the element. */
export function table(spec) { return dataTable({ ...spec, columns: spec.columns.map((c) => (c.render ? { ...c, render: (row) => c.render(row[c.key], row) } : c)) }).el; }
