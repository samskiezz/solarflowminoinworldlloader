/** Market intel: incentive and price assumptions, quote benchmarking, lead-farm economics and the watchlist. */
import { h, button, badge, empty } from '../core/ui.js';
import { section, row, grid, statCard, money, form } from './_shared.js';
import { needsModel, link, makeBusinessCtx } from './_business.js';
import { MARKET_DEFAULTS, incentives, benchmarkQuote, funnelEconomics } from '../business/market.js';
import { openWindow, q, qa, fire } from './_testing.js';

export function def(ctx) {
    return {
        id: 'intel', title: 'Market intel', icon: '📡', hotkey: 'Shift+M', width: 940, height: 660,
        tabs: [{ id: 'benchmark', label: 'Benchmark a quote', icon: '⚖' }, { id: 'funnel', label: 'Lead funnel', icon: '🎯' }, { id: 'assumptions', label: 'Assumptions', icon: '📐' }, { id: 'watch', label: 'Watchlist', icon: '👁' }],
        render(body, { tab }) { if (needsModel(ctx, body)) return; ({ funnel: renderFunnel, assumptions: renderAssumptions, watch: renderWatch }[tab] || renderBenchmark)(body, ctx); }
    };
}
const market = (ctx) => ctx.business.model?.market || MARKET_DEFAULTS;
function renderBenchmark(body, ctx) {
    const mk = market(ctx); const saved = ctx.store.get('ui.benchmark', { pvKw: 10, batteryKwh: 20, evChargers: 0, price: 24000, postcode: '2000' });
    const out = h('div', { class: 'benchmark-out' });
    const f = form([{ key: 'pvKw', label: 'PV (kW)', value: saved.pvKw, step: 0.1 }, { key: 'batteryKwh', label: 'Battery (kWh)', value: saved.batteryKwh, step: 0.1 }, { key: 'evChargers', label: 'EV chargers', value: saved.evChargers }, { key: 'price', label: 'Quoted price ($ inc GST, after incentives)', value: saved.price }, { key: 'postcode', label: 'Postcode', value: saved.postcode, type: 'text' }], { columns: 5, onChange: (v) => { ctx.store.set('ui.benchmark', v); render(v); } });
    const render = (v) => { const b = benchmarkQuote({ pvKw: Number(v.pvKw) || 0, batteryKwh: Number(v.batteryKwh) || 0, evChargers: Number(v.evChargers) || 0, price: Number(v.price) || 0 }, mk); const inc = incentives({ pvKw: Number(v.pvKw) || 0, batteryKwh: Number(v.batteryKwh) || 0, postcode: v.postcode || '2000' }, mk); out.replaceChildren(grid(4, statCard('Verdict', b.verdict, b.deltaPct != null ? `${b.deltaPct > 0 ? '+' : ''}${b.deltaPct} % vs mid` : '', b.verdict === 'competitive' ? 'var(--ok)' : b.verdict === 'unknown' ? null : 'var(--warn)'), statCard('Market band', `${money(b.low)} – ${money(b.high)}`, `mid ${money(b.mid)}`), statCard('Incentives', money(inc.total), `${inc.pvStcs} + ${inc.batteryStcs} STCs`), statCard('Gross price', money((Number(v.price) || 0) + inc.total), 'before incentives')), b.parts.length ? h('ul', { class: 'notes' }, b.parts.map((p) => h('li', {}, `${p.label}: ${money(p.low)} – ${money(p.high)} (mid ${money(p.mid)})`))) : null); };
    render(saved);
    body.append(section('Benchmark a quote against the market', f.el, out, h('p', { class: 'muted small' }, `Bands as at ${mk.asOf} (${mk.region}); edit them on the Assumptions tab.`)));
    const quoted = (ctx.business.model?.jobs || []).filter((j) => j.isSite && j.invoiceAmount > 0 && (j.system.pvKw || j.system.batteryKwh)).slice(0, 15);
    if (quoted.length) body.append(section('Your priced jobs against the bands', h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'System'), h('th', {}, 'Price'), h('th', {}, 'Mid band'), h('th', {}, 'Verdict'))), h('tbody', {}, quoted.map((j) => { const b = benchmarkQuote({ pvKw: j.system.pvKw || 0, batteryKwh: j.system.batteryKwh || 0, evChargers: j.kind === 'ev' ? 1 : 0, price: j.invoiceAmount }, mk); return h('tr', {}, h('td', {}, j.number), h('td', {}, `${j.system.pvKw || 0} kW / ${j.system.batteryKwh || 0} kWh`), h('td', {}, money(j.invoiceAmount)), h('td', {}, money(b.mid)), h('td', {}, badge(b.verdict, b.verdict === 'competitive' ? 'ok' : 'warn'))); })))));
}
function renderFunnel(body, ctx) {
    const mk = market(ctx); const k = ctx.business.model?.finance?.kpis || {}; const seed = mk.funnel || { spendPerWeek: 6000, leadsPerWeek: 70, pickupPct: 40, closePct: 28 };
    const saved = ctx.store.get('ui.funnel', { ...seed, avgSale: k.avgInvoice || 12000, grossMarginPct: k.grossMarginPct || 30 });
    const out = h('div');
    const render = (v) => { const e = funnelEconomics(Object.fromEntries(Object.entries(v).map(([a, b]) => [a, Number(b) || 0]))); out.replaceChildren(grid(4, statCard('Sales / week', e.salesPerWeek), statCard('Cost per sale', money(e.costPerSale)), statCard('Revenue / week', money(e.revenuePerWeek), `ROAS ${e.roas}x`), statCard('Margin after ads / week', money(e.marginAfterAds), `break-even close ${e.breakEvenClosePct} %`, e.marginAfterAds < 0 ? 'var(--bad)' : 'var(--ok)'))); };
    body.append(section('Lead-farm economics', form([{ key: 'spendPerWeek', label: 'Ad spend / week ($)', value: saved.spendPerWeek }, { key: 'leadsPerWeek', label: 'Leads / week', value: saved.leadsPerWeek }, { key: 'pickupPct', label: 'Pickup rate (%)', value: saved.pickupPct }, { key: 'closePct', label: 'Close rate on pickups (%)', value: saved.closePct }, { key: 'avgSale', label: 'Average sale ($)', value: saved.avgSale }, { key: 'grossMarginPct', label: 'Gross margin (%)', value: saved.grossMarginPct }], { columns: 3, onChange: (v) => { ctx.store.set('ui.funnel', v); render(v); } }).el, out, h('p', { class: 'muted small' }, mk.funnel ? 'Seeded from the sales-call notes in your calendar.' : 'Enter the numbers from your lead provider.')));
    render(saved);
}
function renderAssumptions(body, ctx) {
    const mk = market(ctx); const over = ctx.store.get('business.market', {});
    const save = (patch) => { const next = { ...over, ...patch }; ctx.store.set('business.market', next); if (ctx.business.model) Object.assign(ctx.business.model.market, next, { priceBands: { ...mk.priceBands, ...(next.priceBands || {}) } }); ctx.refresh('intel'); };
    body.append(section(`Assumptions as at ${mk.asOf}`, form([{ key: 'stc', label: 'STC price ($)', value: mk.stc.price }, { key: 'batteryFactor', label: 'Battery STC factor (STC/kWh)', value: mk.batteryStcFactor.value, step: 0.1 }, { key: 'pvMid', label: 'PV mid band ($/kW installed)', value: mk.priceBands.pvPerKw.mid }, { key: 'batMid', label: 'Battery mid band ($/kWh installed)', value: mk.priceBands.batteryPerKwh.mid }, { key: 'asOf', label: 'As at (date)', value: mk.asOf, type: 'text' }], { columns: 5, onChange: (v) => save({ stc: { ...mk.stc, price: Number(v.stc) || mk.stc.price }, batteryStcFactor: { ...mk.batteryStcFactor, value: Number(v.batteryFactor) || mk.batteryStcFactor.value }, priceBands: { ...mk.priceBands, pvPerKw: { ...mk.priceBands.pvPerKw, mid: Number(v.pvMid) || mk.priceBands.pvPerKw.mid }, batteryPerKwh: { ...mk.priceBands.batteryPerKwh, mid: Number(v.batMid) || mk.priceBands.batteryPerKwh.mid } }, asOf: v.asOf || mk.asOf }) }).el,
        h('ul', { class: 'notes' }, h('li', {}, h('strong', {}, 'STC: '), mk.stc.note), h('li', {}, h('strong', {}, 'Battery factor: '), mk.batteryStcFactor.note), h('li', {}, h('strong', {}, 'Wholesale: '), `panels ${money(mk.wholesale.panelPerW.value, 2)}/W · battery ${money(mk.wholesale.batteryPerKwh.value)}/kWh · hybrid inverter ${money(mk.wholesale.hybridInverterPerKw.value)}/kW (ex GST)`), h('li', {}, h('strong', {}, 'Demand: '), `${mk.demand.batteryAttachRatePct} % battery attach rate. ${mk.demand.note}`)),
        h('p', { class: 'muted small' }, 'These are assumptions to verify, not facts. Each change is saved and applied to benchmarks and findings.')));
}
function renderWatch(body, ctx) {
    const mk = market(ctx);
    body.append(section('What to watch and why', h('table', { class: 'data-table watch' }, h('thead', {}, h('tr', {}, h('th', {}, 'Item'), h('th', {}, 'Cadence'), h('th', {}, 'Why it matters'), h('th', {}, ''))), h('tbody', {}, mk.watchlist.map((w) => h('tr', {}, h('td', {}, w.title), h('td', {}, badge(w.cadence, 'neutral')), h('td', { class: 'muted small' }, w.why), h('td', {}, link('Source', w.url))))))));
}

export const FEATURES = [
    { id: 'win.intel.benchmark', title: 'Benchmark a quote: verdict, band, incentives, and your priced jobs against the market', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = /Verdict/.test(b.textContent) && /STCs/.test(b.textContent) && qa(b, 'tbody tr').length >= 1; t.done(); return ok; } },
    { id: 'win.intel.funnel', title: 'Lead funnel tab models spend, leads, pickup and close into margin after ads', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'funnel' }); const ok = /Cost per sale/.test(b.textContent) && /break-even close/.test(b.textContent) && /Seeded from the sales-call notes/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.intel.assumptions', title: 'Assumptions tab edits STC price, battery factor and price bands and persists them', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'assumptions' }); const inp = qa(b, 'input')[0]; inp.value = '41'; fire(inp); const ok = t.ctx.store.get('business.market').stc.price === 41 && t.ctx.business.model.market.stc.price === 41; t.done(); return ok; } },
    { id: 'win.intel.watch', title: 'Watchlist tab lists sources with cadence and reasons', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'watch' }); const ok = qa(b, 'table.watch tbody tr').length >= 7; t.done(); return ok; } }
];
