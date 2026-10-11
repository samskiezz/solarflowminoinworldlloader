/** Spellbook: the engineering calculators. Every result cites its clause and can be saved into the current job's design. */
import { h, button, badge, toast, barChart, empty } from '../core/ui.js';
import { stringSizing, dcAcRatio, stringCableCurrent, selectDcCable, dcVoltageDrop, arrayLayout, orientationFactor, SYSTEM_VOLTAGE_LIMITS, round } from '../domain/pv.js';
import { inverterCurrent, voltageRise, selectAcCable, maxCableLength, checkPhaseBalance, checkSinglePhaseCapacity, inverterMainSwitchRule, checkExportLimit, CABLE_SIZES } from '../domain/ac.js';
import { assessBatteryLocation, sizeBattery, backupCapability, batteryStcs, RESTRICTED_LOCATIONS, BATTERY_STC_SCHEDULE } from '../domain/battery.js';
import { solarStcs, zoneForPostcode, stateFromPostcode, STATE_PROGRAMS } from '../domain/incentives.js';
import { annualYield, monthlyYield, financials, co2Offset, selfConsumption, CITY_YIELD_KWH_PER_KW_DAY, DEFAULT_TARIFF_C_PER_KWH, DEFAULT_FIT_C_PER_KWH } from '../domain/yield.js';
import { section, grid, row, form, resultList, issueList, jobPicker, clauseRef, money } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export const TABS = [
    { id: 'strings', label: 'String sizing', icon: '🔗' }, { id: 'acrise', label: 'Voltage rise', icon: '⚡' }, { id: 'dccable', label: 'DC cable', icon: '🧵' }, { id: 'battery', label: 'Battery', icon: '🔋' },
    { id: 'stc', label: 'STCs & rebates', icon: '💰' }, { id: 'yield', label: 'Yield & finance', icon: '☀' }, { id: 'phases', label: 'Phases & switches', icon: '⚖' }, { id: 'layout', label: 'Roof layout', icon: '🏠' }
];

export function def(ctx) {
    return {
        id: 'spellbook', title: ctx.t('nav.spellbook'), icon: '📖', hotkey: 'K', width: 900, height: 620, tabs: TABS,
        render(body, { tab }) {
            body.append(jobPicker(ctx, { onChange: () => ctx.refresh('spellbook') }));
            ({ strings: renderStrings, acrise: renderAcRise, dccable: renderDcCable, battery: renderBattery, stc: renderStc, yield: renderYield, phases: renderPhases, layout: renderLayout }[tab] || renderStrings)(body, ctx);
        }
    };
}

function productSpecs(ctx, id) { const p = id ? ctx.products.byId.get(id) : null; return p ? { product: p, s: p.specifications || {} } : null; }
function saveButton(ctx, label, getPatch) {
    return button(label, () => { const job = ctx.currentJob(); if (!job) { toast('Select or create a job first', { kind: 'warn' }); return; } const patch = getPatch(); if (!patch) { toast('Run the calculation first', { kind: 'warn' }); return; } ctx.saveDesign(job.id, patch); toast(`Saved to ${job.id} design`, { kind: 'ok' }); }, { kind: 'primary', small: true });
}
function live(f, out, compute) { const run = () => { out.replaceChildren(); try { compute(f.values(), out); } catch (error) { out.append(h('div', { class: 'error' }, error.message)); } }; for (const { input } of Object.values(f.inputs)) input.addEventListener('input', run), input.addEventListener('change', run); run(); return run; }

/* ---- String sizing ---- */
function renderStrings(body, ctx) {
    const d = ctx.design(); const mod = productSpecs(ctx, d.moduleId); const inv = productSpecs(ctx, d.inverterId); const profile = ctx.profile();
    let last = null;
    const f = form([
        { key: 'voc', label: 'Module Voc (V)', value: mod?.s.voc ?? 49.5 }, { key: 'vmp', label: 'Module Vmp (V)', value: mod?.s.vmp ?? 41.2 }, { key: 'isc', label: 'Module Isc (A)', value: mod?.s.isc ?? 11.3 }, { key: 'watts', label: 'Module power (W)', value: mod?.s.power_watts ?? 440 },
        { key: 'tempCoeffVoc', label: 'Temp. coeff. Voc (%/°C)', value: mod?.s.temp_coeff_voc ?? -0.27, step: 0.01 }, { key: 'tempCoeffPmax', label: 'Temp. coeff. Pmax (%/°C)', value: mod?.s.temp_coeff_pmax ?? -0.34, step: 0.01 },
        { key: 'maxDcVoltage', label: 'Inverter max d.c. voltage (V)', value: inv?.s.max_dc_voltage ?? 600 }, { key: 'mpptMin', label: 'MPPT min (V)', value: inv?.s.mppt_min ?? 90 }, { key: 'mpptMax', label: 'MPPT max (V)', value: inv?.s.mppt_max ?? 560 }, { key: 'maxInputCurrent', label: 'MPPT max input current (A)', value: inv?.s.max_input_current ?? 16 },
        { key: 'inverterKw', label: 'Inverter a.c. (kW)', value: inv?.s.ac_power_kw ?? 5 }, { key: 'tMin', label: 'Site minimum temperature (°C)', value: profile.city === 'Darwin' ? 15 : 0 }, { key: 'tAmbientMax', label: 'Site max ambient (°C)', value: 40 },
        { key: 'installationClass', label: 'Installation class', type: 'select', options: Object.keys(SYSTEM_VOLTAGE_LIMITS).map((k) => ({ value: k, label: `${k} (${SYSTEM_VOLTAGE_LIMITS[k].limit} V)` })), value: 'domestic' },
        { key: 'strings', label: 'Strings in parallel', value: 2, min: 1, step: 1 }, { key: 'modulesPerString', label: 'Modules per string (chosen)', value: d.modulesPerString ?? 0, min: 0, step: 1, hint: '0 = use recommended' }
    ], { columns: 4 });
    const out = h('div');
    body.append(section('String sizing – AS/NZS 5033:2021 Cl 4.2 / inverter MPPT window', mod ? h('div', { class: 'muted' }, `Prefilled from ${mod.product.manufacturer} ${mod.product.model}${inv ? ` and ${inv.product.manufacturer} ${inv.product.model}` : ''}`) : h('div', { class: 'muted' }, 'Tip: pick a module and inverter in the Product vault (B) to prefill.'), f.el, out));
    live(f, out, (v, o) => {
        const r = stringSizing({ module: { voc: v.voc, vmp: v.vmp, isc: v.isc, tempCoeffVoc: v.tempCoeffVoc, tempCoeffPmax: v.tempCoeffPmax }, inverter: { maxDcVoltage: v.maxDcVoltage, mpptMin: v.mpptMin, mpptMax: v.mpptMax, maxInputCurrent: v.maxInputCurrent }, site: { tMin: v.tMin, tAmbientMax: v.tAmbientMax }, installationClass: v.installationClass });
        const n = v.modulesPerString || r.recommended || 0; const total = n * (v.strings || 1); const kw = (total * (v.watts || 0)) / 1000; const ratio = dcAcRatio(kw, v.inverterKw); const cable = stringCableCurrent(v.isc, v.strings || 1);
        last = { modulesPerString: n, strings: v.strings || 1, moduleCount: total, arrayKwDc: round(kw, 2), arrayVocV: round(n * r.vocCold, 1), arrayIscA: round((v.strings || 1) * v.isc, 1), maxArrayVoltage: round(n * r.vocCold, 1), stringCableMinA: cable.stringCableMinA, arrayCableMinA: cable.arrayCableMinA, dcAcRatio: ratio.ratio, tMin: v.tMin, highVoltage: n * r.vocCold > 600 };
        o.append(resultList([
            { label: 'Voc at site minimum (cold)', value: `${r.vocCold} V per module`, ref: r.reference }, { label: 'Vmp at hot cell temperature', value: `${r.vmpHot} V (cell ${r.tCellMax} °C)` },
            { label: 'Voltage ceiling', value: `${r.voltageCeiling} V – ${r.voltageCeilingSource}` }, { label: 'Max modules per string', value: `${r.maxModules} (voltage ${r.limits.maxByVoltage}, MPPT ${Number.isFinite(r.limits.maxByMppt) ? r.limits.maxByMppt : '∞'})`, ok: r.feasible },
            { label: 'Min modules per string (MPPT hot)', value: String(r.minModules) }, { label: 'Chosen string', value: `${n} modules × ${v.strings || 1} strings = ${total} modules (${round(kw, 2)} kW d.c.)`, ok: n >= r.minModules && n <= r.maxModules },
            { label: 'Array maximum voltage', value: `${round(n * r.vocCold, 1)} V`, ok: n * r.vocCold <= r.voltageCeiling }, { label: 'DC/AC ratio', value: `${ratio.ratio} (limit 1.33 for STCs)`, ok: ratio.withinLimit },
            { label: 'String / array cable minimum rating', value: `${cable.stringCableMinA} A string, ${cable.arrayCableMinA} A array (1.25 × Isc)`, ref: 'AS/NZS 5033:2021 Cl 4.3' }]),
        r.warnings.length ? issueList(r.warnings) : null, row(saveButton(ctx, 'Save string design', () => { if (last && last.highVoltage) ctx.world.recordStat('highVoltageDesigns'); return last; }), clauseRef(ctx, 'AS/NZS 5033:2021 Cl 4.2')));
    });
}

/* ---- AC voltage rise ---- */
function renderAcRise(body, ctx) {
    const d = ctx.design(); const inv = productSpecs(ctx, d.inverterId); const job = ctx.currentJob();
    let last = null;
    const f = form([
        { key: 'kw', label: 'Inverter a.c. (kW)', value: inv?.s.ac_power_kw ?? job?.systemKw ?? 5 }, { key: 'phases', label: 'Phases', type: 'select', options: ['1', '3'], value: String(inv?.s.phases ?? job?.phases ?? 1) }, { key: 'powerFactor', label: 'Power factor', value: 1, step: 0.01 },
        { key: 'len1', label: 'Inverter → switchboard (m)', value: 20 }, { key: 'len2', label: 'Switchboard → point of supply (m)', value: 10 }, { key: 'ambientC', label: 'Ambient (°C)', type: 'select', options: ['25', '30', '35', '40', '45', '50'], value: '40' }, { key: 'grouping', label: 'Grouped circuits', type: 'select', options: ['1', '2', '3', '4'], value: '1' }, { key: 'cable', label: 'Try cable (mm²)', type: 'select', options: ['auto', ...CABLE_SIZES.map(String)], value: d.acCableMm2 ? String(d.acCableMm2) : 'auto' }
    ], { columns: 4 });
    const out = h('div');
    body.append(section('Voltage rise – AS/NZS 4777.1:2024 (≤ 2 % point of supply → inverter), AS/NZS 3008 mV/A·m', f.el, out));
    live(f, out, (v, o) => {
        const phases = Number(v.phases); const current = inverterCurrent({ kw: v.kw, phases, powerFactor: v.powerFactor });
        const auto = selectAcCable({ currentA: current, lengthM: (v.len1 || 0) + (v.len2 || 0), phases, ambientC: Number(v.ambientC), grouping: Number(v.grouping), powerFactor: v.powerFactor });
        const size = v.cable === 'auto' ? auto.cableMm2 : Number(v.cable);
        const seg1 = size ? voltageRise({ currentA: current, lengthM: v.len1 || 0, cableMm2: size, phases, powerFactor: v.powerFactor }) : null;
        const seg2 = size ? voltageRise({ currentA: current, lengthM: v.len2 || 0, cableMm2: size, phases, powerFactor: v.powerFactor }) : null;
        const total = seg1 && seg2 ? round(seg1.pct + seg2.pct, 2) : null;
        const maxLen = size ? maxCableLength({ currentA: current, cableMm2: size, phases, powerFactor: v.powerFactor }) : null;
        last = size ? { acCableMm2: size, voltageRisePct: total, inverterCurrentA: current, acRunM: (v.len1 || 0) + (v.len2 || 0) } : null;
        o.append(resultList([
            { label: 'Inverter current', value: `${current} A (${phases === 3 ? '400 V 3φ' : '230 V 1φ'})` }, { label: 'Auto-selected cable', value: auto.cableMm2 ? `${auto.cableMm2} mm² (rating ${auto.ratingA} A, governed by ${auto.governedBy})` : auto.error, ok: Boolean(auto.cableMm2) },
            seg1 ? { label: 'Segment 1 rise', value: `${seg1.pct} % (${seg1.volts} V)` } : null, seg2 ? { label: 'Segment 2 rise', value: `${seg2.pct} %` } : null,
            total !== null ? { label: 'Total voltage rise', value: `${total} % (limit 2 %)`, ok: total <= 2, ref: 'AS/NZS 4777.1:2024' } : null, maxLen ? { label: `Max run at ${size} mm² for 2 %`, value: `${maxLen} m` } : null].filter(Boolean)),
        row(saveButton(ctx, 'Save a.c. cable design', () => last), clauseRef(ctx, 'AS/NZS 4777.1:2024'), clauseRef(ctx, 'AS/NZS 3008.1.1')));
    });
}

/* ---- DC cable ---- */
function renderDcCable(body, ctx) {
    const d = ctx.design();
    let last = null;
    const f = form([{ key: 'isc', label: 'String Isc (A)', value: d.arrayIscA && d.strings ? round(d.arrayIscA / d.strings, 2) : 11.3 }, { key: 'strings', label: 'Strings on this cable', value: 1, min: 1, step: 1 }, { key: 'lengthM', label: 'Route length one way (m)', value: 30 }, { key: 'voltageV', label: 'String Vmp (V)', value: d.modulesPerString ? round(d.modulesPerString * 41, 0) : 400 }, { key: 'maxDropPct', label: 'Max drop (%)', value: 3, step: 0.5 }], { columns: 5 });
    const out = h('div');
    body.append(section('DC string cable – 1.25 × Isc, ≤ 3 % drop (AS/NZS 5033:2021 Cl 4.3 / CEC guideline)', f.el, out));
    live(f, out, (v, o) => {
        const current = stringCableCurrent(v.isc, v.strings || 1); const amps = current.arrayCableMinA;
        const pick = selectDcCable({ currentA: amps, lengthM: v.lengthM, voltageV: v.voltageV, maxDropPct: v.maxDropPct });
        const table = [2.5, 4, 6, 10].map((mm) => ({ mm, ...dcVoltageDrop({ currentA: amps, lengthM: v.lengthM, cableMm2: mm, voltageV: v.voltageV }) }));
        last = pick.cableMm2 ? { dcCableMm2: pick.cableMm2, dcDropPct: pick.dropPct, dcDesignCurrentA: round(amps, 2) } : null;
        o.append(resultList([{ label: 'Design current (1.25 × Isc × strings)', value: `${round(amps, 2)} A`, ref: 'AS/NZS 5033:2021 Cl 4.3' }, { label: 'Selected cable', value: pick.cableMm2 ? `${pick.cableMm2} mm² → ${pick.dropPct} % drop (${pick.dropV} V)` : pick.reference, ok: Boolean(pick.cableMm2) }]),
            h('table', { class: 'data-table compact' }, h('thead', {}, h('tr', {}, h('th', {}, 'mm²'), h('th', {}, 'Drop %'), h('th', {}, 'OK'))), h('tbody', {}, table.map((t) => h('tr', {}, h('td', {}, t.mm), h('td', {}, `${t.dropPct} %`), h('td', {}, t.dropPct <= v.maxDropPct ? '✔' : '✗'))))),
            row(saveButton(ctx, 'Save d.c. cable', () => last)));
    });
}

/* ---- Battery ---- */
function renderBattery(body, ctx) {
    const d = ctx.design(); const job = ctx.currentJob(); const bat = productSpecs(ctx, d.batteryId);
    let lastLoc = null; let lastSize = null;
    const loc = form([
        { key: 'locationType', label: 'Location', type: 'select', options: [{ value: 'garage', label: 'Garage (non-habitable)' }, { value: 'external_wall', label: 'External wall' }, { value: 'carport', label: 'Carport / driveway' }, { value: 'dedicated_room', label: 'Dedicated plant room' }, ...RESTRICTED_LOCATIONS.map((r) => ({ value: r.id, label: `⛔ ${r.label}` }))], value: d.batteryLocationType || 'garage' },
        { key: 'distanceToExitMm', label: 'Distance to exit/door (mm)', value: 1000 }, { key: 'distanceToWindowMm', label: 'Distance to window/vent (mm)', value: 1000 }, { key: 'distanceToHotWaterMm', label: 'Distance to HWS / AC unit (mm)', value: 1000 }, { key: 'heightAboveFloorMm', label: 'Height above floor (mm)', value: 300 },
        { key: 'wallCombustible', label: 'Wall is combustible', type: 'checkbox', value: false }, { key: 'adjoinsHabitableRoom', label: 'Wall adjoins habitable room', type: 'checkbox', value: false }, { key: 'barrierInstalled', label: 'Non-combustible barrier fitted', type: 'checkbox', value: false }, { key: 'weatherProtected', label: 'Weather protected (external)', type: 'checkbox', value: true }, { key: 'impactProtected', label: 'Bollard / impact protection', type: 'checkbox', value: false }
    ], { columns: 5 });
    const locOut = h('div');
    body.append(section('Battery location – AS/NZS 5139:2019 Section 4', loc.el, locOut));
    live(loc, locOut, (v, o) => { const r = assessBatteryLocation(v); lastLoc = { batteryLocationType: v.locationType, batteryLocationStatus: r.status }; o.append(h('div', { class: `status-line ${r.status}` }, badge(r.status, r.status === 'PASS' ? 'ok' : r.status === 'WARNING' ? 'warn' : 'bad'), ' ', r.reference), r.findings.length ? h('ul', { class: 'issues' }, r.findings.map((x) => h('li', { class: `issue ${x.level}` }, x.level === 'fail' ? '✗ ' : '⚠ ', x.text, ' ', h('span', { class: 'muted' }, x.reference)))) : h('div', { class: 'ok-line' }, '✔ No location findings'), row(saveButton(ctx, 'Save location assessment', () => { if (lastLoc && lastLoc.batteryLocationStatus === 'PASS') ctx.world.recordStat('batteryAssessmentsPassed'); return lastLoc; }), clauseRef(ctx, 'AS/NZS 5139:2019'))); });
    const size = form([{ key: 'dailyKwh', label: 'Daily consumption (kWh)', value: d.dailyKwh ?? 20 }, { key: 'eveningSharePct', label: 'Evening/overnight share (%)', value: d.eveningSharePct ?? 60 }, { key: 'autonomyDays', label: 'Autonomy (days)', value: 1, step: 0.5 }, { key: 'depthOfDischargePct', label: 'Depth of discharge (%)', value: 90 }, { key: 'usableKwh', label: 'Candidate usable (kWh)', value: bat?.s.usable_capacity_kwh ?? job?.batteryKwh ?? 13 }, { key: 'nominalKwh', label: 'Candidate nominal (kWh)', value: bat?.s.nominal_capacity_kwh ?? job?.batteryKwh ?? 13.5 }, { key: 'continuousKw', label: 'Backup inverter continuous (kW)', value: 5 }, { key: 'backupLoadKw', label: 'Backup load (kW)', value: 1.2 }, { key: 'installDate', label: 'Install date', type: 'date', value: new Date(ctx.now()).toISOString().slice(0, 10) }], { columns: 5 });
    const sizeOut = h('div');
    body.append(section('Battery sizing, backup and Cheaper Home Batteries STCs', size.el, sizeOut));
    live(size, sizeOut, (v, o) => { const s = sizeBattery(v); const b = backupCapability({ usableKwh: v.usableKwh, continuousKw: v.continuousKw, loads: [{ watts: (v.backupLoadKw || 0) * 1000 }] }); const stc = batteryStcs({ usableKwh: v.usableKwh, nominalKwh: v.nominalKwh, dateIso: v.installDate }); lastSize = { batteryUsableKwh: v.usableKwh, batteryNominalKwh: v.nominalKwh, batteryStcs: stc.stcs, batteryStcValueAud: stc.valueAud, dailyKwh: v.dailyKwh, eveningSharePct: v.eveningSharePct };
        o.append(resultList([{ label: 'Evening energy to cover', value: `${s.eveningKwh} kWh` }, { label: 'Usable capacity required', value: `${s.usableKwhRequired} kWh → recommend ${s.recommendedUsableKwh} kWh`, ok: v.usableKwh >= s.usableKwhRequired }, { label: 'Nominal required (DoD, reserve)', value: `${s.nominalKwhRequired} kWh` }, { label: 'Backup runtime', value: b.hours === null ? '∞' : `${b.hours} h at ${b.loadKw} kW`, ok: b.withinInverterRating }, { label: 'Battery STCs', value: stc.eligible ? `${stc.stcs} STCs ≈ ${money(stc.valueAud)} (factor ${stc.factor})` : 'Not eligible: nominal capacity outside 5–100 kWh or the scheme has ended', ok: stc.eligible, ref: stc.reference }]), row(saveButton(ctx, 'Save battery sizing', () => lastSize))); });
    body.append(section('Battery STC factor schedule', h('table', { class: 'data-table compact' }, h('thead', {}, h('tr', {}, h('th', {}, 'From'), h('th', {}, 'STCs per usable kWh'))), h('tbody', {}, BATTERY_STC_SCHEDULE.map((r) => h('tr', {}, h('td', {}, r.from), h('td', {}, r.factor)))))));
}

/* ---- STCs & rebates ---- */
function renderStc(body, ctx) {
    const job = ctx.currentJob(); const d = ctx.design(); const profile = ctx.profile();
    let last = null;
    const f = form([{ key: 'kw', label: 'PV capacity (kW)', value: d.arrayKwDc ?? job?.systemKw ?? 6.6 }, { key: 'postcode', label: 'Postcode', type: 'text', value: job?.postcode ?? profile.postcode }, { key: 'installYear', label: 'Install year', value: new Date(ctx.now()).getFullYear(), step: 1 }, { key: 'stcPrice', label: 'STC price ($)', value: 37 }], { columns: 4 });
    const out = h('div');
    body.append(section('Small-scale technology certificates (SRES) – kW × zone rating × deeming years', f.el, out));
    live(f, out, (v, o) => { const r = solarStcs(v); if (r.error) { o.append(h('div', { class: 'error' }, r.error)); last = null; return; } const state = stateFromPostcode(v.postcode); last = { stcs: r.stcs, stcValueAud: r.valueAud, stcZone: r.zone, deemingYears: r.deemingYears };
        o.append(resultList([{ label: 'STC zone', value: `Zone ${r.zone} (rating ${r.rating})` }, { label: 'Deeming period', value: `${r.deemingYears} years (scheme ends 2030)` }, { label: 'STCs', value: `${r.stcs} certificates`, ok: r.eligible }, { label: 'Point-of-sale value', value: `${money(r.valueAud)} at $${Math.min(v.stcPrice, 40)}`, ref: r.reference }]),
            h('h4', {}, `State programs${state ? ` – ${state}` : ''}`), h('ul', { class: 'notes' }, STATE_PROGRAMS.filter((p) => !state || p.state === state).map((p) => h('li', {}, h('strong', {}, p.name), ` – ${p.note} `, h('a', { href: p.url, target: '_blank', rel: 'noopener' }, 'site')))), STATE_PROGRAMS.some((p) => p.state === state) ? null : h('div', { class: 'muted' }, 'No state-specific program recorded for this state; the federal SRES still applies.'), row(saveButton(ctx, 'Save STC estimate', () => last))); });
}

/* ---- Yield & finance ---- */
function renderYield(body, ctx) {
    const job = ctx.currentJob(); const d = ctx.design(); const profile = ctx.profile(); const state = stateFromPostcode(job?.postcode || profile.postcode) || 'NSW';
    let last = null;
    const f = form([{ key: 'kw', label: 'Array (kW d.c.)', value: d.arrayKwDc ?? job?.systemKw ?? 6.6 }, { key: 'city', label: 'City', type: 'select', options: Object.keys(CITY_YIELD_KWH_PER_KW_DAY), value: profile.city }, { key: 'tiltDeg', label: 'Tilt (°)', value: 22 }, { key: 'azimuthDeg', label: 'Azimuth (° from north)', value: 0 }, { key: 'shadingLossPct', label: 'Shading loss (%)', value: 3 },
        { key: 'dailyLoadKwh', label: 'Daily load (kWh)', value: d.dailyKwh ?? 20 }, { key: 'daytimeLoadSharePct', label: 'Daytime load share (%)', value: 35 }, { key: 'batteryUsableKwh', label: 'Battery usable (kWh)', value: d.batteryUsableKwh ?? job?.batteryKwh ?? 0 }, { key: 'tariffC', label: 'Tariff (c/kWh)', value: DEFAULT_TARIFF_C_PER_KWH[state] }, { key: 'fitC', label: 'Feed-in (c/kWh)', value: DEFAULT_FIT_C_PER_KWH[state] },
        { key: 'systemCost', label: 'Net system cost ($)', value: 9000 }, { key: 'years', label: 'Analysis years', value: 25, step: 1 }, { key: 'discountPct', label: 'Discount rate (%)', value: 5 }, { key: 'escalationPct', label: 'Tariff escalation (%)', value: 3 }, { key: 'maintenancePerYear', label: 'Maintenance ($/yr)', value: 50 }], { columns: 5 });
    const out = h('div');
    body.append(section('Yield, self-consumption and finance (CEC design-guide yields, NPV/IRR/LCOE)', f.el, out));
    live(f, out, (v, o) => { const y = annualYield(v); const sc = selfConsumption({ dailyGenKwh: y.dailyKwh, dailyLoadKwh: v.dailyLoadKwh, daytimeLoadSharePct: v.daytimeLoadSharePct, batteryUsableKwh: v.batteryUsableKwh }); const fin = financials({ annualKwh: y.annualKwh, selfConsumptionPct: sc.selfConsumptionPct, tariffC: v.tariffC, fitC: v.fitC, systemCost: v.systemCost, years: v.years, discountPct: v.discountPct, escalationPct: v.escalationPct, maintenancePerYear: v.maintenancePerYear }); const co2 = co2Offset(y.annualKwh); const months = monthlyYield(y.annualKwh);
        last = { annualKwh: y.annualKwh, specificYield: y.specificYield, selfConsumptionPct: sc.selfConsumptionPct, paybackYears: fin.paybackYears, npvAud: fin.npvAud, year1SavingsAud: fin.year1SavingsAud, orientationFactor: y.orientationFactor };
        o.append(grid(2, resultList([{ label: 'Annual generation', value: `${y.annualKwh} kWh (${y.specificYield} kWh/kW, orientation ×${y.orientationFactor})` }, { label: 'Daily average', value: `${y.dailyKwh} kWh` }, { label: 'Self-consumption', value: `${sc.selfConsumptionPct} % (direct ${sc.directKwh}, stored ${sc.storedKwh}, export ${sc.exportedKwh} kWh/day)` }, { label: 'Grid import remaining', value: `${sc.gridImportKwh} kWh/day` }, { label: 'CO₂ offset', value: `${co2.tonnesPerYear} t/yr (${co2.treesEquivalent} trees)` }]),
            resultList([{ label: 'Year-1 savings', value: money(fin.year1SavingsAud) }, { label: 'Simple payback', value: fin.paybackYears === null ? 'beyond analysis period' : `${fin.paybackYears} years`, ok: fin.paybackYears !== null && fin.paybackYears < 10 }, { label: 'NPV', value: money(fin.npvAud), ok: fin.npvAud > 0 }, { label: 'IRR', value: `${fin.irrPct} %` }, { label: 'LCOE', value: `${fin.lcoeCPerKwh} c/kWh` }, { label: 'Lifetime net benefit', value: money(fin.netBenefitAud) }])),
            barChart(months.map((m, i) => ({ label: 'JFMAMJJASOND'[i], value: m })), { height: 90 }), row(saveButton(ctx, 'Save yield & finance', () => last))); });
}

/* ---- Phases & switches ---- */
function renderPhases(body, ctx) {
    const job = ctx.currentJob();
    const f = form([{ key: 'A', label: 'Phase A inverters (kVA)', value: 5 }, { key: 'B', label: 'Phase B (kVA)', value: 0 }, { key: 'C', label: 'Phase C (kVA)', value: 0 }, { key: 'singleKva', label: 'Single-phase total (kVA)', value: job?.systemKw ?? 5 }, { key: 'mainSwitches', label: 'Inverter main switches on board', value: 1, step: 1 }, { key: 'boardHasLoads', label: 'Board also has loads', type: 'checkbox', value: true }, { key: 'inverterKw', label: 'Inverter a.c. (kW)', value: job?.systemKw ?? 5 }, { key: 'exportLimitKw', label: 'DNSP export limit (kW)', value: job?.phases === 3 ? 15 : 5 }, { key: 'phases', label: 'Supply phases', type: 'select', options: ['1', '3'], value: String(job?.phases ?? 1) }], { columns: 5 });
    const out = h('div');
    body.append(section('Phase balance, single-phase capacity, inverter main switches and export limits – AS/NZS 4777.1:2024', f.el, out));
    live(f, out, (v, o) => { const pb = checkPhaseBalance({ A: v.A, B: v.B, C: v.C }); const sp = checkSinglePhaseCapacity(v.singleKva); const ms = inverterMainSwitchRule(v.mainSwitches, v.boardHasLoads); const ex = checkExportLimit({ inverterKw: v.inverterKw, exportLimitKw: v.exportLimitKw, phases: Number(v.phases) });
        o.append(resultList([{ label: 'Phase imbalance', value: `${pb.imbalanceKva} kVA (${pb.imbalanceA} A) – limit ${pb.limitKva} kVA${pb.suggestion ? `; ${pb.suggestion}` : ''}`, ok: pb.withinLimit, ref: pb.reference }, { label: 'Single-phase capacity', value: `${sp.kva} kVA vs ${sp.limitKva} kVA – ${sp.note}`, ok: sp.withinLimit, ref: sp.reference }, { label: 'Inverter main switches', value: ms.masterSwitchRequired ? `${ms.count} switches: a master switch isolating all inverters is required` : `${ms.count} switch(es): compliant`, ok: ms.compliant, ref: ms.reference }, { label: 'Export limiting', value: ex.exportLimitingRequired ? `Required: ${ex.inverterKw} kW > ${ex.exportLimitKw} kW allowance` : `Not required (${ex.inverterKw} kW ≤ ${ex.exportLimitKw} kW)`, ok: true, ref: ex.reference }]), row(saveButton(ctx, 'Save switchboard checks', () => ({ inverterMainSwitches: v.mainSwitches, exportLimitKw: v.exportLimitKw, exportLimitingRequired: ex.exportLimitingRequired, phaseBalanceOk: pb.withinLimit })), clauseRef(ctx, 'AS/NZS 4777.1:2024 Cl 3'))); });
}

/* ---- Roof layout ---- */
function renderLayout(body, ctx) {
    const d = ctx.design(); const mod = productSpecs(ctx, d.moduleId);
    const f = form([{ key: 'roofWidthM', label: 'Roof face width (m)', value: 9 }, { key: 'roofDepthM', label: 'Roof face depth (m)', value: 5 }, { key: 'moduleWidthM', label: 'Module width (m)', value: mod?.s.width_m ?? 1.134, step: 0.001 }, { key: 'moduleLengthM', label: 'Module length (m)', value: mod?.s.length_m ?? 1.722, step: 0.001 }, { key: 'marginM', label: 'Edge margin (m)', value: 0.2, step: 0.05 }, { key: 'portrait', label: 'Portrait', type: 'checkbox', value: true }, { key: 'tiltDeg', label: 'Roof pitch (°)', value: 22 }, { key: 'azimuthDeg', label: 'Azimuth (° from north)', value: 0 }], { columns: 4 });
    const out = h('div');
    body.append(section('Roof layout and orientation factor', f.el, out));
    live(f, out, (v, o) => { const l = arrayLayout(v); const of = orientationFactor(v.tiltDeg, v.azimuthDeg); const kw = mod ? round((l.modules * (mod.s.power_watts || 0)) / 1000, 2) : null;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const scale = 40; svg.setAttribute('viewBox', `0 0 ${v.roofWidthM * scale} ${v.roofDepthM * scale}`); svg.setAttribute('class', 'roof'); svg.setAttribute('width', Math.min(600, v.roofWidthM * scale)); svg.setAttribute('height', Math.min(340, v.roofDepthM * scale));
        const rect = (x, y, w, hh, cls) => { const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', hh); r.setAttribute('class', cls); svg.append(r); };
        rect(0, 0, v.roofWidthM * scale, v.roofDepthM * scale, 'roof-face'); const mw = (v.portrait ? v.moduleWidthM : v.moduleLengthM) * scale; const ml = (v.portrait ? v.moduleLengthM : v.moduleWidthM) * scale;
        for (let r = 0; r < l.rows; r++) for (let c = 0; c < l.columns; c++) rect(v.marginM * scale + c * mw + 1, v.marginM * scale + r * ml + 1, mw - 2, ml - 2, 'module');
        o.append(resultList([{ label: 'Fits', value: `${l.columns} × ${l.rows} = ${l.modules} modules (${l.usedAreaM2} m²)${kw !== null ? ` ≈ ${kw} kW` : ''}` }, { label: 'Orientation factor', value: `×${of} vs optimum`, ok: of >= 0.9 }]), svg, row(saveButton(ctx, 'Save layout', () => ({ layoutColumns: l.columns, layoutRows: l.rows, layoutModules: l.modules, tiltDeg: v.tiltDeg, azimuthDeg: v.azimuthDeg, orientationFactor: of })))); });
}

export const FEATURES = [
    { id: 'win.spell.strings', title: 'String sizing calculator with live results', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'strings' }); const ok = /Max modules per string/.test(b.textContent) && qa(b, '.result').length >= 8; t.done(); return ok; } },
    { id: 'win.spell.stringsPrefill', title: 'Prefills from the job design products', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { moduleId: 'PV-A440', inverterId: 'INV-G10' }); const b = openWindow(t.ctx, def(t.ctx), { tab: 'strings' }); const ok = /Prefilled from Alpha Solar A-440M and Gamma G10 Three/.test(b.textContent) && q(b, 'input').value === '49.5'; t.done(); return ok; } },
    { id: 'win.spell.stringsSave', title: 'Save string design into the job', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'strings' }); qa(b, 'button').find((x) => x.textContent === 'Save string design').click(); const d = t.ctx.design(t.job.id); const ok = d.modulesPerString > 0 && d.arrayKwDc > 0 && d.arrayVocV > 0; t.done(); return ok; } },
    { id: 'win.spell.stringsLive', title: 'Editing an input recalculates', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'strings' }); const before = b.textContent; const i = qa(b, 'input')[6]; i.value = '1000'; fire(i); const ok = b.textContent !== before && /1000 V/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.spell.acrise', title: 'Voltage rise with automatic cable selection', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'acrise' }); const ok = /Auto-selected cable/.test(b.textContent) && /Total voltage rise/.test(b.textContent); qa(b, 'button').find((x) => x.textContent === 'Save a.c. cable design').click(); const d = t.ctx.design(t.job.id); t.done(); return ok && d.acCableMm2 > 0 && d.voltageRisePct <= 2; } },
    { id: 'win.spell.dccable', title: 'DC cable selection with drop table', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'dccable' }); const ok = qa(b, 'tbody tr').length === 4 && /Selected cable/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.spell.batteryLocation', title: 'Battery location assessment flags restricted locations', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'battery' }); const pass = /PASS/.test(q(b, '.status-line').textContent); const sel = qa(b, 'select')[1]; sel.value = 'habitable_room'; fire(sel, 'change'); const fail = /FAIL/.test(q(b, '.status-line').textContent) && /Restricted location/.test(b.textContent); t.done(); return pass && fail; } },
    { id: 'win.spell.batterySizing', title: 'Battery sizing, backup runtime and battery STCs', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'battery' }); const ok = /Usable capacity required/.test(b.textContent) && /Battery STCs/.test(b.textContent) && /Backup runtime/.test(b.textContent); qa(b, 'button').find((x) => x.textContent === 'Save battery sizing').click(); const d = t.ctx.design(t.job.id); t.done(); return ok && d.batteryStcs > 0; } },
    { id: 'win.spell.stc', title: 'Solar STC estimate with state programs', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'stc' }); const ok = /Zone 3/.test(b.textContent) && /certificates/.test(b.textContent) && /NSW/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.spell.yield', title: 'Yield, self-consumption, NPV/IRR/LCOE and monthly chart', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'yield' }); const ok = /Annual generation/.test(b.textContent) && /Simple payback/.test(b.textContent) && qa(b, '.bar-col').length === 12; qa(b, 'button').find((x) => x.textContent === 'Save yield & finance').click(); const d = t.ctx.design(t.job.id); t.done(); return ok && d.annualKwh > 5000; } },
    { id: 'win.spell.phases', title: 'Phase balance, main switch rule and export limit checks', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'phases' }); const i = qa(b, 'input')[4]; i.value = '3'; fire(i); const ok = /master switch isolating all inverters is required/.test(b.textContent) && /Phase imbalance/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.spell.layout', title: 'Roof layout drawing with orientation factor', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'layout' }); const ok = qa(b, 'svg.roof rect.module').length > 10 && /Orientation factor/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.spell.tabs', title: 'Eight calculator tabs', test: () => TABS.length === 8 }
];
