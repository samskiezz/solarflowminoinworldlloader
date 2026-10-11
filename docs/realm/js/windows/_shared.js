/** Helpers shared by windows. */
import { h, progressBar, badge, button, select, fmt } from '../core/ui.js';
import { NEED_DEFINITIONS, mood } from '../sim/needs.js';
import { STAGES } from '../domain/jobs.js';
import { rarity } from '../core/ui.js';

export function section(title, ...children) { return h('section', { class: 'panel' }, title ? h('h3', { class: 'panel-title' }, title) : null, ...children); }
export function statCard(label, value, sub = null, colour = null) { return h('div', { class: 'stat' }, h('div', { class: 'stat-value', style: colour ? { color: colour } : null }, value), h('div', { class: 'stat-label' }, label), sub ? h('div', { class: 'stat-sub' }, sub) : null); }
export function grid(cols, ...children) { return h('div', { class: `grid cols-${cols}` }, ...children); }
export function row(...children) { return h('div', { class: 'row' }, ...children); }

export function needColour(value) { return value < 25 ? 'var(--bad)' : value < 50 ? 'var(--warn)' : 'var(--ok)'; }
export function needBars(agent, { small = true } = {}) {
    return h('div', { class: 'needs' }, NEED_DEFINITIONS.map((d) => h('div', { class: 'need', tooltip: `${d.label}: ${d.description || ''}` }, h('span', { class: 'need-label' }, d.label), progressBar(agent.needs[d.key], { small, colour: needColour(agent.needs[d.key]), showValue: false }), h('span', { class: 'need-value' }, Math.round(agent.needs[d.key])))));
}
export function moodBadge(agent) { const m = mood(agent.needs); return badge(`${m.label} ${m.score}`, m.score >= 60 ? 'ok' : m.score >= 40 ? 'warn' : 'bad'); }
export function avatar(agent, size = 'md') { return h('span', { class: `avatar ${size}`, style: { background: hueFor(agent.id) } }, agent.avatar || agent.name.slice(0, 1)); }
export function hueFor(text) { let x = 0; for (const c of String(text)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return `hsl(${x % 360} 45% 32%)`; }

export function stageBadge(stageId) { const s = STAGES.find((x) => x.id === stageId); const idx = STAGES.findIndex((x) => x.id === stageId); return badge(s ? s.title : stageId, idx >= 8 ? 'ok' : idx >= 5 ? 'accent' : 'neutral'); }

export function jobPicker(ctx, { onChange = null, allowNone = false } = {}) {
    const jobs = ctx.jobs();
    if (!jobs.length) return h('div', { class: 'empty inline' }, 'No jobs yet – create one in the Jobs window (O).', ' ', button('Open Jobs', () => ctx.open('jobs'), { small: true }));
    const current = ctx.currentJobId();
    const options = jobs.map((j) => ({ value: j.id, label: `${j.id} · ${j.customer} · ${j.systemKw} kW` }));
    if (allowNone) options.unshift({ value: '', label: '— no job —' });
    return h('div', { class: 'job-picker' }, h('span', { class: 'field-label' }, 'Job'), select(options, { value: current || '', onchange: (id) => { ctx.setCurrentJob(id); if (onChange) onChange(id); } }));
}

export function clauseRef(ctx, reference) {
    return h('a', { class: 'clause', href: '#', onclick: (e) => { e.preventDefault(); ctx.open('codex', { tab: 'search', context: { query: reference } }); ctx.world.recordStat('clausesViewed'); } }, reference);
}
export function skillBadge(level) { const r = rarity(level); return h('span', { class: 'skill-rank', style: { color: r.colour, borderColor: r.colour } }, `L${level} ${r.label}`); }
export function money(value, decimals = 0) { return Number.isFinite(Number(value)) ? `$${fmt(value, decimals)}` : '–'; }

/** Form builder: returns { el, values() } from field specs [{key,label,type,value,options,hint,min,max,step}]. */
export function form(specs, { onChange = null, columns = 2 } = {}) {
    const inputs = {};
    const el = h('div', { class: `form grid cols-${columns}` }, specs.map((s) => {
        let input;
        if (s.type === 'select') input = select(s.options, { value: s.value });
        else if (s.type === 'checkbox') { input = h('input', { type: 'checkbox', class: 'checkbox' }); input.checked = Boolean(s.value); }
        else if (s.type === 'textarea') { input = h('textarea', { class: 'input', rows: s.rows || 3 }); input.value = s.value ?? ''; }
        else { input = h('input', { type: s.type || 'number', class: 'input', step: s.step ?? 'any', min: s.min, max: s.max, placeholder: s.placeholder }); input.value = s.value ?? ''; }
        inputs[s.key] = { input, spec: s };
        input.addEventListener(s.type === 'select' || s.type === 'checkbox' ? 'change' : 'input', () => { if (onChange) onChange(values(), s.key); });
        return h('label', { class: `field ${s.type === 'checkbox' ? 'inline' : ''}` }, h('span', { class: 'field-label' }, s.label), input, s.hint ? h('span', { class: 'field-hint' }, s.hint) : null);
    }));
    function values() {
        const out = {};
        for (const [key, { input, spec }] of Object.entries(inputs)) {
            if (spec.type === 'checkbox') out[key] = input.checked;
            else if (spec.type === 'select' || spec.type === 'text' || spec.type === 'textarea' || spec.type === 'date') out[key] = input.value;
            else out[key] = input.value === '' ? undefined : Number(input.value);
        }
        return out;
    }
    return { el, values, set(key, value) { const f = inputs[key]; if (!f) return; if (f.spec.type === 'checkbox') f.input.checked = Boolean(value); else f.input.value = value ?? ''; }, inputs };
}

export function resultList(items) {
    return h('ul', { class: 'results' }, items.map((i) => h('li', { class: `result ${i.ok === false ? 'bad' : i.ok === true ? 'ok' : ''}` }, h('span', { class: 'result-label' }, i.label), h('span', { class: 'result-value' }, i.value), i.ref ? h('span', { class: 'result-ref' }, i.ref) : null)));
}
export function issueList(issues, okText = 'No issues') {
    return issues.length ? h('ul', { class: 'issues' }, issues.map((i) => h('li', { class: 'issue' }, '⚠ ', i))) : h('div', { class: 'ok-line' }, '✔ ', okText);
}
