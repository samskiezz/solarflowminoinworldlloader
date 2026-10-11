/**
 * UI toolkit: element builder, tooltips, toasts, dialogs, context menus,
 * tabs, sortable/filterable data tables, form fields and small charts.
 * The pure helpers (sorting, filtering, paging, formatting) are testable in
 * Node; the DOM pieces register `dom: true` self-tests that run in-browser.
 */

/* ---------- pure helpers ---------- */
export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
export function fmt(value, decimals = 1, unit = '') {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '–';
    const n = Number(value);
    return `${n.toLocaleString('en-AU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${unit ? ` ${unit}` : ''}`;
}
export function pct(value, decimals = 0) { return `${fmt(value, decimals)} %`; }

export function sortRows(rows, key, dir = 'asc') {
    if (!key) return [...rows];
    const sign = dir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
        const av = a[key]; const bv = b[key];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign;
        return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * sign;
    });
}
export function filterRows(rows, query, keys = null) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [...rows];
    const terms = q.split(/\s+/);
    return rows.filter((row) => {
        const hay = (keys || Object.keys(row)).map((k) => String(row[k] ?? '')).join(' ').toLowerCase();
        return terms.every((term) => hay.includes(term));
    });
}
export function paginate(rows, page = 1, pageSize = 25) {
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    const current = clamp(page, 1, pages);
    return { rows: rows.slice((current - 1) * pageSize, current * pageSize), page: current, pages, total: rows.length };
}
/** WoW-style rarity tiers used for skills, products and jobs. */
export function rarity(level) {
    if (level >= 18) return { id: 'legendary', label: 'Legendary', colour: '#ff8000' };
    if (level >= 14) return { id: 'epic', label: 'Epic', colour: '#a335ee' };
    if (level >= 10) return { id: 'rare', label: 'Rare', colour: '#0070dd' };
    if (level >= 5) return { id: 'uncommon', label: 'Uncommon', colour: '#1eff00' };
    return { id: 'common', label: 'Common', colour: '#d9d9d9' };
}
export function statusColour(status) {
    return { PASS: 'var(--ok)', pass: 'var(--ok)', FAIL: 'var(--bad)', fail: 'var(--bad)', DEFECTS: 'var(--warn)', INCOMPLETE: 'var(--muted)', pending: 'var(--muted)', na: 'var(--muted)', WARN: 'var(--warn)' }[status] || 'var(--muted)';
}

/* ---------- element builder ---------- */
export function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
        if (value === null || value === undefined || value === false) continue;
        if (key === 'class') el.className = value;
        else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
        else if (key === 'html') el.innerHTML = value;
        else if (key === 'tooltip') attachTooltip(el, value);
        else if (key in el && typeof value !== 'string' && key !== 'value') el[key] = value;
        else el.setAttribute(key, value === true ? '' : value);
    }
    append(el, children);
    return el;
}
function append(el, children) {
    for (const child of children.flat(Infinity)) {
        if (child === null || child === undefined || child === false) continue;
        el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
}
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
export function replace(el, ...children) { clear(el); append(el, children); return el; }

/* ---------- layers ---------- */
function layer(id, cls) {
    let el = document.getElementById(id);
    if (!el) { el = h('div', { id, class: cls }); document.body.append(el); }
    return el;
}

/* ---------- tooltips (WoW-style rich tooltip) ---------- */
let tooltipEl = null; let tooltipTarget = null;
export function attachTooltip(el, content) {
    el.dataset.tooltip = '1';
    el.__tooltip = content;
    el.addEventListener('mouseenter', () => showTooltip(el));
    el.addEventListener('mouseleave', hideTooltip);
    el.addEventListener('focus', () => showTooltip(el));
    el.addEventListener('blur', hideTooltip);
    return el;
}
export function showTooltip(el) {
    const content = typeof el.__tooltip === 'function' ? el.__tooltip() : el.__tooltip;
    if (!content) return;
    tooltipEl = tooltipEl || layer('realm-tooltip', 'realm-tooltip');
    replace(tooltipEl, typeof content === 'string' ? h('div', { class: 'tt-body' }, content) : content);
    tooltipEl.classList.add('visible');
    tooltipTarget = el;
    positionTooltip(el);
}
function positionTooltip(el) {
    const r = el.getBoundingClientRect();
    const tw = tooltipEl.offsetWidth; const th = tooltipEl.offsetHeight;
    let x = r.right + 8; let y = r.top;
    if (x + tw > window.innerWidth - 8) x = Math.max(8, r.left - tw - 8);
    if (y + th > window.innerHeight - 8) y = Math.max(8, window.innerHeight - th - 8);
    tooltipEl.style.left = `${x}px`; tooltipEl.style.top = `${y}px`;
}
export function hideTooltip() { if (tooltipEl) tooltipEl.classList.remove('visible'); tooltipTarget = null; }
/** Rich tooltip: title, coloured subtitle, lines and a footer (like an item tooltip). */
export function richTooltip({ title, subtitle, colour, lines = [], footer }) {
    return () => h('div', { class: 'tt-rich' },
        h('div', { class: 'tt-title', style: colour ? { color: colour } : null }, title),
        subtitle ? h('div', { class: 'tt-sub' }, subtitle) : null,
        lines.map((line) => (Array.isArray(line) ? h('div', { class: 'tt-line kv' }, h('span', {}, line[0]), h('span', {}, line[1])) : h('div', { class: 'tt-line' }, line))),
        footer ? h('div', { class: 'tt-footer' }, footer) : null);
}

/* ---------- toasts ---------- */
export function toast(message, { kind = 'info', timeout = 3500, title = null } = {}) {
    const host = layer('realm-toasts', 'realm-toasts');
    const el = h('div', { class: `toast toast-${kind}`, role: 'status' }, title ? h('strong', {}, title) : null, h('span', {}, message));
    host.append(el);
    requestAnimationFrame(() => el.classList.add('in'));
    const remove = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 250); };
    if (timeout > 0) setTimeout(remove, timeout);
    el.addEventListener('click', remove);
    return el;
}

/* ---------- dialogs ---------- */
export function dialog({ title, body, buttons = [{ id: 'ok', label: 'OK', primary: true }], closeOnBackdrop = true }) {
    return new Promise((resolve) => {
        const host = layer('realm-dialogs', 'realm-dialogs');
        let box;
        const finish = (id) => { box.remove(); resolve(id); };
        box = h('div', { class: 'dialog-backdrop', onclick: (e) => { if (closeOnBackdrop && e.target === box) finish(null); } },
            h('div', { class: 'dialog', role: 'dialog', 'aria-label': title },
                h('div', { class: 'dialog-title' }, title),
                h('div', { class: 'dialog-body' }, body),
                h('div', { class: 'dialog-buttons' }, buttons.map((b) => h('button', { class: `btn ${b.primary ? 'primary' : ''}`, onclick: () => finish(b.id) }, b.label)))));
        host.append(box);
        const first = box.querySelector('input, select, textarea, button.primary, button');
        if (first) first.focus();
    });
}
export async function confirm(message, { title = 'Confirm', okLabel = 'OK', cancelLabel = 'Cancel' } = {}) {
    return (await dialog({ title, body: h('p', {}, message), buttons: [{ id: 'cancel', label: cancelLabel }, { id: 'ok', label: okLabel, primary: true }] })) === 'ok';
}
export async function promptText(message, { title = 'Input', value = '', placeholder = '' } = {}) {
    const input = h('input', { type: 'text', value, placeholder, class: 'input' });
    const result = await dialog({ title, body: h('div', {}, h('p', {}, message), input), buttons: [{ id: 'cancel', label: 'Cancel' }, { id: 'ok', label: 'OK', primary: true }] });
    return result === 'ok' ? input.value : null;
}

/* ---------- context menus ---------- */
export function contextMenu(x, y, items) {
    closeContextMenu();
    const host = layer('realm-menus', 'realm-menus');
    const menu = h('div', { class: 'context-menu', style: { left: `${x}px`, top: `${y}px` } },
        items.map((item) => (item === '-' ? h('div', { class: 'menu-sep' }) : h('button', { class: `menu-item ${item.disabled ? 'disabled' : ''}`, onclick: () => { if (!item.disabled) { closeContextMenu(); item.run(); } } }, item.icon ? h('span', { class: 'menu-icon' }, item.icon) : null, item.label, item.hint ? h('span', { class: 'menu-hint' }, item.hint) : null))));
    host.append(menu);
    const r = menu.getBoundingClientRect();
    if (r.right > window.innerWidth) menu.style.left = `${Math.max(0, window.innerWidth - r.width - 4)}px`;
    if (r.bottom > window.innerHeight) menu.style.top = `${Math.max(0, window.innerHeight - r.height - 4)}px`;
    setTimeout(() => document.addEventListener('pointerdown', onOutside, { once: true }), 0);
    function onOutside(e) { if (!menu.contains(e.target)) closeContextMenu(); }
    return menu;
}
export function closeContextMenu() { const host = document.getElementById('realm-menus'); if (host) clear(host); }

/* ---------- widgets ---------- */
export function progressBar(value, { max = 100, label = null, colour = null, showValue = true, small = false } = {}) {
    const p = clamp((Number(value) / max) * 100, 0, 100);
    return h('div', { class: `bar ${small ? 'small' : ''}` },
        h('div', { class: 'bar-fill', style: { width: `${p}%`, background: colour || undefined } }),
        label || showValue ? h('span', { class: 'bar-label' }, [label, showValue ? `${Math.round(p)} %` : null].filter(Boolean).join(' ')) : null);
}
export function badge(text, kind = 'neutral') { return h('span', { class: `badge badge-${kind}` }, text); }
export function kv(pairs) { return h('dl', { class: 'kv-list' }, pairs.map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])); }
export function icon(glyph, label = null) { return h('span', { class: 'icon', 'aria-hidden': label ? null : 'true', title: label }, glyph); }
export function empty(message) { return h('div', { class: 'empty' }, message); }

export function field(label, control, { hint = null, inline = false } = {}) {
    return h('label', { class: `field ${inline ? 'inline' : ''}` }, h('span', { class: 'field-label' }, label), control, hint ? h('span', { class: 'field-hint' }, hint) : null);
}
export function numberInput(opts = {}) {
    const el = h('input', { type: 'number', class: 'input', step: opts.step ?? 'any', min: opts.min, max: opts.max, placeholder: opts.placeholder, name: opts.name });
    if (opts.value !== undefined) el.value = opts.value;
    if (opts.onchange) el.addEventListener('input', () => opts.onchange(Number(el.value)));
    return el;
}
export function textInput(opts = {}) {
    const el = h('input', { type: opts.type || 'text', class: 'input', placeholder: opts.placeholder, name: opts.name, list: opts.list });
    if (opts.value !== undefined) el.value = opts.value;
    if (opts.onchange) el.addEventListener('input', () => opts.onchange(el.value));
    return el;
}
export function select(options, opts = {}) {
    const el = h('select', { class: 'input', name: opts.name }, options.map((o) => { const v = typeof o === 'string' ? o : o.value; const l = typeof o === 'string' ? o : o.label; return h('option', { value: v }, l); }));
    if (opts.value !== undefined) el.value = String(opts.value);
    if (opts.onchange) el.addEventListener('change', () => opts.onchange(el.value));
    return el;
}
export function button(label, onclick, { kind = '', icon: glyph = null, title = null, small = false, disabled = false } = {}) {
    return h('button', { class: `btn ${kind} ${small ? 'small' : ''}`, onclick, title, disabled }, glyph ? h('span', { class: 'btn-icon' }, glyph) : null, label);
}

/** Tab strip; `tabs` = [{id,label,render(container)}]. Persists active id via onChange. */
export function tabs(spec, { active = null, onChange = null } = {}) {
    let current = active && spec.find((t) => t.id === active) ? active : spec[0].id;
    const strip = h('div', { class: 'tabs', role: 'tablist' });
    const panel = h('div', { class: 'tab-panel' });
    const root = h('div', { class: 'tabbed' }, strip, panel);
    const render = () => {
        replace(strip, spec.map((t) => h('button', { class: `tab ${t.id === current ? 'active' : ''}`, role: 'tab', 'aria-selected': t.id === current ? 'true' : 'false', onclick: () => { current = t.id; render(); if (onChange) onChange(t.id); } }, t.icon ? h('span', { class: 'tab-icon' }, t.icon) : null, t.label)));
        const tab = spec.find((t) => t.id === current);
        clear(panel);
        try { tab.render(panel); } catch (error) { panel.append(h('div', { class: 'error' }, `This tab failed to render: ${error.message}`)); }
    };
    render();
    return { el: root, get active() { return current; }, set(id) { if (spec.find((t) => t.id === id)) { current = id; render(); } }, refresh: render };
}

/** Sortable, filterable, paged table. columns = [{key,label,render?,sortable?,align?,width?}]. */
export function dataTable({ columns, rows = [], pageSize = 25, searchable = true, searchKeys = null, onRow = null, emptyText = 'Nothing to show', rowClass = null, initialSort = null }) {
    let state = { query: '', sortKey: initialSort ? initialSort.key : null, sortDir: initialSort ? initialSort.dir : 'asc', page: 1, rows };
    const search = h('input', { type: 'search', class: 'input table-search', placeholder: 'Filter…', oninput: () => { state.query = search.value; state.page = 1; render(); } });
    const table = h('table', { class: 'data-table' });
    const pager = h('div', { class: 'pager' });
    const root = h('div', { class: 'table-wrap' }, searchable ? h('div', { class: 'table-tools' }, search) : null, h('div', { class: 'table-scroll' }, table), pager);
    const render = () => {
        const filtered = filterRows(state.rows, state.query, searchKeys);
        const sorted = sortRows(filtered, state.sortKey, state.sortDir);
        const page = paginate(sorted, state.page, pageSize);
        const head = h('thead', {}, h('tr', {}, columns.map((c) => h('th', { style: { textAlign: c.align || 'left', width: c.width }, class: c.sortable === false ? '' : 'sortable', onclick: c.sortable === false ? null : () => { if (state.sortKey === c.key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; else { state.sortKey = c.key; state.sortDir = 'asc'; } render(); } }, c.label, state.sortKey === c.key ? h('span', { class: 'sort-ind' }, state.sortDir === 'asc' ? ' ▲' : ' ▼') : null))));
        const body = h('tbody', {}, page.rows.length ? page.rows.map((row) => h('tr', { class: rowClass ? rowClass(row) : null, onclick: onRow ? () => onRow(row) : null, tabindex: onRow ? 0 : null }, columns.map((c) => h('td', { style: { textAlign: c.align || 'left' } }, c.render ? c.render(row) : (row[c.key] ?? '–'))))) : h('tr', {}, h('td', { colspan: columns.length, class: 'empty' }, emptyText)));
        replace(table, head, body);
        replace(pager, h('span', {}, `${page.total} row${page.total === 1 ? '' : 's'}`), page.pages > 1 ? [h('button', { class: 'btn small', disabled: page.page <= 1, onclick: () => { state.page--; render(); } }, '‹'), h('span', {}, `${page.page} / ${page.pages}`), h('button', { class: 'btn small', disabled: page.page >= page.pages, onclick: () => { state.page++; render(); } }, '›')] : null);
    };
    render();
    return { el: root, update(nextRows) { state.rows = nextRows; state.page = 1; render(); }, get state() { return { ...state }; }, render };
}

/** Inline SVG sparkline. */
export function sparkline(values, { width = 160, height = 36, colour = 'var(--accent)' } = {}) {
    const max = Math.max(...values, 1); const min = Math.min(...values, 0);
    const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * width},${height - ((v - min) / (max - min || 1)) * (height - 2) - 1}`).join(' ');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('class', 'sparkline'); svg.setAttribute('width', width); svg.setAttribute('height', height);
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', pts); poly.setAttribute('fill', 'none'); poly.setAttribute('stroke', colour); poly.setAttribute('stroke-width', '2');
    svg.append(poly);
    return svg;
}
/** Simple bar chart (values -> bars with labels). */
export function barChart(items, { height = 120, colour = 'var(--accent)' } = {}) {
    const max = Math.max(...items.map((i) => i.value), 1);
    return h('div', { class: 'bar-chart', style: { height: `${height}px` } }, items.map((i) => h('div', { class: 'bar-col', tooltip: `${i.label}: ${fmt(i.value, 1)}` }, h('div', { class: 'bar-col-fill', style: { height: `${(i.value / max) * 100}%`, background: i.colour || colour } }), h('span', { class: 'bar-col-label' }, i.label))));
}

export function download(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return filename;
}
export function printHtml(html, title = 'Report') {
    const w = window.open('', '_blank');
    if (!w) return false;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
    return true;
}

const sample = [{ n: 'b', v: 2 }, { n: 'a', v: 10 }, { n: 'c', v: 1 }];
export const FEATURES = [
    { id: 'core.ui.escape', title: 'HTML escaping', test: () => escapeHtml('<a href="x">&</a>') === '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;' },
    { id: 'core.ui.fmt', title: 'Number/percent formatting', test: () => fmt(1234.567, 2, 'V') === '1,234.57 V' && fmt(null) === '–' && pct(33.3) === '33 %' },
    { id: 'core.ui.sort', title: 'Natural sort with null handling', test: () => sortRows(sample, 'v', 'desc').map((r) => r.n).join('') === 'abc' && sortRows([{ n: 'x10' }, { n: 'x2' }, { n: null }], 'n').map((r) => r.n).join() === 'x2,x10,' },
    { id: 'core.ui.filter', title: 'Multi-term row filtering', test: () => filterRows([{ a: 'Fronius Primo 5', b: 'inverter' }, { a: 'Tesla', b: 'battery' }], 'fron inv').length === 1 && filterRows(sample, '').length === 3 },
    { id: 'core.ui.paginate', title: 'Pagination with clamping', test: () => { const p = paginate([1, 2, 3, 4, 5], 9, 2); return p.page === 3 && p.pages === 3 && p.rows.join() === '5'; } },
    { id: 'core.ui.rarity', title: 'Rarity tiers (common → legendary)', test: () => rarity(1).id === 'common' && rarity(10).id === 'rare' && rarity(19).id === 'legendary' },
    { id: 'core.ui.h', title: 'Element builder with events/attributes', dom: true, test: () => { let hit = 0; const el = h('button', { class: 'x', dataset: { k: 'v' }, onclick: () => hit++ }, 'Hi', null, [h('b', {}, '!')]); el.click(); return el.className === 'x' && el.dataset.k === 'v' && el.textContent === 'Hi!' && hit === 1; } },
    { id: 'core.ui.tooltip', title: 'Rich tooltips show on hover', dom: true, test: () => { const el = h('span', { tooltip: richTooltip({ title: 'T', lines: ['L1', ['k', 'v']] }) }, 'x'); document.body.append(el); showTooltip(el); const ok = document.getElementById('realm-tooltip').classList.contains('visible') && document.getElementById('realm-tooltip').textContent.includes('L1'); hideTooltip(); el.remove(); return ok; } },
    { id: 'core.ui.toast', title: 'Toast notifications', dom: true, test: () => { const el = toast('hello', { timeout: 10 }); const ok = el.textContent === 'hello' && document.getElementById('realm-toasts').contains(el); return ok; } },
    { id: 'core.ui.dialog', title: 'Modal dialog resolves with the chosen button', dom: true, test: async () => { const p = dialog({ title: 'Q', body: 'b', buttons: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B', primary: true }] }); document.querySelector('#realm-dialogs .dialog-buttons button.primary').click(); return (await p) === 'b'; } },
    { id: 'core.ui.contextMenu', title: 'Context menus', dom: true, test: () => { let ran = false; contextMenu(10, 10, [{ label: 'Do', run: () => { ran = true; } }, '-', { label: 'No', run: () => {}, disabled: true }]); document.querySelector('#realm-menus .menu-item').click(); return ran && !document.querySelector('#realm-menus .menu-item'); } },
    { id: 'core.ui.tabs', title: 'Tab strips with persistence callback', dom: true, test: () => { let changed = null; const t = tabs([{ id: 'a', label: 'A', render: (c) => c.append('A!') }, { id: 'b', label: 'B', render: (c) => c.append('B!') }], { onChange: (id) => { changed = id; } }); t.el.querySelectorAll('.tab')[1].click(); return t.active === 'b' && changed === 'b' && t.el.querySelector('.tab-panel').textContent === 'B!'; } },
    { id: 'core.ui.table', title: 'Sortable, filterable, paged data table', dom: true, test: () => { const t = dataTable({ columns: [{ key: 'n', label: 'N' }, { key: 'v', label: 'V' }], rows: sample, pageSize: 2 }); t.el.querySelectorAll('th')[1].click(); const first = t.el.querySelector('tbody tr td').textContent; t.el.querySelector('.table-search').value = 'b'; t.el.querySelector('.table-search').dispatchEvent(new Event('input')); return first === 'c' && t.el.querySelectorAll('tbody tr').length === 1; } },
    { id: 'core.ui.progress', title: 'Progress bars', dom: true, test: () => progressBar(40).querySelector('.bar-fill').style.width === '40%' },
    { id: 'core.ui.forms', title: 'Form fields (number/text/select)', dom: true, test: () => { let v = 0; const n = numberInput({ value: 3, onchange: (x) => { v = x; } }); n.value = '7'; n.dispatchEvent(new Event('input')); const s = select([{ value: 'a', label: 'A' }, 'b'], { value: 'b' }); return v === 7 && s.value === 'b' && field('L', n).querySelector('.field-label').textContent === 'L'; } },
    { id: 'core.ui.charts', title: 'Sparkline and bar chart', dom: true, test: () => sparkline([1, 3, 2]).tagName.toLowerCase() === 'svg' && barChart([{ label: 'a', value: 1 }, { label: 'b', value: 2 }]).querySelectorAll('.bar-col').length === 2 }
];
