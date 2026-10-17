/** Site survey: roof faces, shading, switchboard and site details captured before design. */
import { h, button, badge, toast } from '../core/ui.js';
import { orientationFactor, arrayLayout } from '../domain/pv.js';
import { section, row, grid, jobPicker, statCard, form } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export const ROOF_TYPES = ['Tile', 'Colorbond / metal', 'Tin (corrugated)', 'Slate', 'Flat membrane', 'Kliplok'];
export const SURVEY_CHECKS = [['meterAccess', 'Meter and switchboard accessible'], ['mainsSize', 'Mains / service capacity confirmed'], ['earthing', 'Main earth and MEN link checked'], ['roofCondition', 'Roof condition suitable (no asbestos, sound structure)'], ['shadingSurveyed', 'Shading surveyed (trees, neighbouring structures)'], ['batteryLocationChecked', 'Battery location candidates identified'], ['photosTaken', 'Site photos taken (roof, switchboard, meter, battery location)'], ['customerBriefed', 'Customer briefed on works and access']];

export function faceSummary(face) { const f = orientationFactor(face.tiltDeg, face.azimuthDeg); const layout = arrayLayout({ roofWidthM: face.widthM, roofDepthM: face.depthM, portrait: true }); return { factor: f, modules: layout.modules, shaded: Number(face.shadingPct) || 0 }; }
export function bestFaces(faces) { return [...faces].map((f) => ({ ...f, ...faceSummary(f) })).sort((a, b) => (b.factor * (1 - b.shaded / 100)) - (a.factor * (1 - a.shaded / 100))); }

export function def(ctx) {
    return {
        id: 'survey', title: 'Site survey', icon: '📐', hotkey: null, width: 880, height: 640,
        render(body) {
            body.append(jobPicker(ctx, { onChange: () => ctx.refresh('survey') }));
            const job = ctx.currentJob(); if (!job) return;
            const d = ctx.design(job.id);
            const survey = d.survey || { faces: [], checks: {}, roofType: 'Tile', storeys: 1, switchboard: '', notes: '' };
            const save = () => ctx.saveDesign(job.id, { survey });
            const general = form([{ key: 'roofType', label: 'Roof type', type: 'select', options: ROOF_TYPES, value: survey.roofType }, { key: 'storeys', label: 'Storeys', value: survey.storeys, step: 1 }, { key: 'switchboard', label: 'Switchboard location / type', type: 'text', value: survey.switchboard }, { key: 'notes', label: 'Site notes', type: 'textarea', value: survey.notes }], { columns: 2, onChange: (v) => { Object.assign(survey, v); save(); } });
            const facesEl = h('div');
            const renderFaces = () => { const ranked = bestFaces(survey.faces); facesEl.replaceChildren(survey.faces.length ? h('table', { class: 'data-table compact faces' }, h('thead', {}, h('tr', {}, h('th', {}, 'Face'), h('th', {}, 'Tilt °'), h('th', {}, 'Azimuth °'), h('th', {}, 'Width m'), h('th', {}, 'Depth m'), h('th', {}, 'Shading %'), h('th', {}, 'Factor'), h('th', {}, 'Fits'), h('th', {}, ''))), h('tbody', {}, survey.faces.map((face, i) => { const s = faceSummary(face); const cell = (key, step = 1) => h('td', {}, h('input', { type: 'number', class: 'input tiny', value: face[key], step, onchange: (e) => { face[key] = Number(e.target.value) || 0; save(); renderFaces(); } })); return h('tr', { class: ranked[0] && ranked[0].name === face.name ? 'best' : '' }, h('td', {}, h('input', { class: 'input small', value: face.name, onchange: (e) => { face.name = e.target.value; save(); } })), cell('tiltDeg'), cell('azimuthDeg'), cell('widthM', 0.1), cell('depthM', 0.1), cell('shadingPct'), h('td', {}, String(s.factor)), h('td', {}, String(s.modules)), h('td', {}, h('button', { class: 'btn tiny', onclick: () => { survey.faces.splice(i, 1); save(); renderFaces(); } }, '✕'))); }))) : h('div', { class: 'empty' }, 'Add a roof face')); };
            renderFaces();
            const checks = h('div', { class: 'grid cols-2' }, SURVEY_CHECKS.map(([k, l]) => h('label', { class: 'field inline' }, h('input', { type: 'checkbox', checked: survey.checks[k] ? '' : null, onchange: (e) => { survey.checks[k] = e.target.checked; save(); } }), ' ', l)));
            body.append(section('Site', general.el), section('Roof faces', facesEl, row(button('＋ Add face', () => { survey.faces.push({ name: `Face ${survey.faces.length + 1}`, tiltDeg: 22, azimuthDeg: 0, widthM: 8, depthM: 4, shadingPct: 0 }); save(); renderFaces(); }, { small: true }), button('Use best face in design', () => { const best = bestFaces(survey.faces)[0]; if (!best) { toast('Add a face first', { kind: 'warn' }); return; } ctx.saveDesign(job.id, { tiltDeg: best.tiltDeg, azimuthDeg: best.azimuthDeg, orientationFactor: best.factor, shadingLossPct: best.shaded, roofFace: best.name }); const key = 'lead:Capture site address and postcode'; if (key in job.tasks) job.tasks[key] = true; ctx.saveWorld(); toast(`${best.name} (×${best.factor}) set for the design`, { kind: 'ok' }); }, { kind: 'primary', small: true }))), section('Survey checklist', checks, h('div', { class: 'muted' }, `${Object.values(survey.checks).filter(Boolean).length}/${SURVEY_CHECKS.length} complete`)));
        }
    };
}

export const FEATURES = [
    { id: 'win.survey.faces', title: 'Add roof faces with orientation factor and fit', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent.includes('Add face')).click(); const s = t.ctx.design(t.job.id).survey; const ok = s.faces.length === 1 && qa(b, 'table.faces tbody tr').length === 1 && /0\.99|1$/.test(qa(b, 'table.faces tbody td')[6].textContent); t.done(); return ok; } },
    { id: 'win.survey.best', title: 'Best face (orientation × shading) feeds the design', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { survey: { faces: [{ name: 'West', tiltDeg: 22, azimuthDeg: 90, widthM: 8, depthM: 4, shadingPct: 0 }, { name: 'North', tiltDeg: 22, azimuthDeg: 0, widthM: 8, depthM: 4, shadingPct: 5 }], checks: {}, roofType: 'Tile', storeys: 1 } }); const b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent.startsWith('Use best face')).click(); const d = t.ctx.design(t.job.id); const ok = d.roofFace === 'North' && d.azimuthDeg === 0 && d.shadingLossPct === 5; t.done(); return ok; } },
    { id: 'win.survey.checks', title: 'Survey checklist persists', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const cb = qa(b, 'input[type=checkbox]')[0]; cb.checked = true; fire(cb, 'change'); const ok = t.ctx.design(t.job.id).survey.checks.meterAccess === true; t.done(); return ok; } },
    { id: 'win.survey.general', title: 'Site details persist', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const sel = qa(b, 'select')[1]; sel.value = 'Kliplok'; fire(sel, 'change'); const ok = t.ctx.design(t.job.id).survey.roofType === 'Kliplok'; t.done(); return ok; } },
    { id: 'win.survey.ranking', title: 'Face ranking helper', test: () => bestFaces([{ name: 'S', tiltDeg: 30, azimuthDeg: 180, widthM: 5, depthM: 5 }, { name: 'N', tiltDeg: 30, azimuthDeg: 0, widthM: 5, depthM: 5 }])[0].name === 'N' }
];
